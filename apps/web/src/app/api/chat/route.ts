import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { REQUIREMENTS_SYSTEM_PROMPT } from '@/lib/claude/prompts';
import { getDemoResponse } from '@/lib/demo/responses';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'demo',
});

function createStreamTransformer() {
  let buffer = '';
  let insideDataExtraction = false;
  let collectedExtraction = '';
  let requirementsSummary = '';

  return {
    transform(chunk: string): string {
      buffer += chunk;
      let output = '';

      while (buffer.length > 0) {
        if (insideDataExtraction) {
          const endTag = '</data_extraction>';
          const endIdx = buffer.indexOf(endTag);
          if (endIdx !== -1) {
            collectedExtraction += buffer.slice(0, endIdx);
            buffer = buffer.slice(endIdx + endTag.length);
            insideDataExtraction = false;
          } else {
            const safeLen = Math.max(0, buffer.length - endTag.length);
            collectedExtraction += buffer.slice(0, safeLen);
            buffer = buffer.slice(safeLen);
            break;
          }
        } else {
          const startDataTag = '<data_extraction>';
          const startReqTag = '<requirements_summary>';
          const endReqTag = '</requirements_summary>';

          const reqStartIdx = buffer.indexOf(startReqTag);
          const reqEndIdx = buffer.indexOf(endReqTag);
          const dataStartIdx = buffer.indexOf(startDataTag);

          if (reqStartIdx !== -1 && reqEndIdx !== -1 && reqEndIdx > reqStartIdx) {
            output += buffer.slice(0, reqStartIdx + startReqTag.length);
            requirementsSummary = buffer.slice(reqStartIdx + startReqTag.length, reqEndIdx);
            output += requirementsSummary + endReqTag;
            buffer = buffer.slice(reqEndIdx + endReqTag.length);
          } else if (dataStartIdx !== -1) {
            output += buffer.slice(0, dataStartIdx);
            buffer = buffer.slice(dataStartIdx + startDataTag.length);
            insideDataExtraction = true;
          } else {
            const safeLen = Math.max(0, buffer.length - startDataTag.length);
            output += buffer.slice(0, safeLen);
            buffer = buffer.slice(safeLen);
            break;
          }
        }
      }

      return output;
    },
    flush(): string {
      const output = insideDataExtraction ? '' : buffer;
      buffer = '';
      return output;
    },
    getExtraction(): string { return collectedExtraction; },
    getRequirementsSummary(): string { return requirementsSummary; },
  };
}

// デモモード: 文字単位でストリーミングをシミュレート
async function* streamDemoResponse(text: string) {
  for (const char of text) {
    yield char;
    await new Promise((r) => setTimeout(r, 18));
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const isDemoMode = cookieStore.get('demo_session')?.value === 'true';

    // ─── デモモード ───────────────────────────────────────
    if (isDemoMode) {
      const { turnIndex = 0, message } = await request.json();
      if (!message) return new Response('Bad Request', { status: 400 });

      const responseText = getDemoResponse(turnIndex as number);
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          for await (const char of streamDemoResponse(responseText)) {
            controller.enqueue(encoder.encode(char));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // ─── 通常モード (Supabase + Claude) ──────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { projectId, message, phase = 'requirements' } = await request.json();
    if (!projectId || !message) return new Response('Bad Request', { status: 400 });

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) return new Response('Project not found', { status: 404 });

    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .order('created_at', { ascending: true })
      .limit(20);

    await supabase.from('messages').insert({
      project_id: projectId,
      role: 'user',
      content: message,
      phase,
    });

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(historyMessages ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const encoder = new TextEncoder();
    const transformer = createStreamTransformer();
    let fullAssistantMessage = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: REQUIREMENTS_SYSTEM_PROMPT,
            messages,
          });

          for await (const chunk of claudeStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const filtered = transformer.transform(chunk.delta.text);
              fullAssistantMessage += chunk.delta.text;
              if (filtered) controller.enqueue(encoder.encode(filtered));
            }
          }

          const flushed = transformer.flush();
          if (flushed) controller.enqueue(encoder.encode(flushed));

          const cleanedMessage = fullAssistantMessage
            .replace(/<data_extraction>[\s\S]*?<\/data_extraction>/g, '')
            .trim();

          await supabase.from('messages').insert({
            project_id: projectId,
            role: 'assistant',
            content: cleanedMessage,
            phase,
            metadata: {
              extracted_data: transformer.getExtraction() || null,
              has_requirements_summary: !!transformer.getRequirementsSummary(),
            },
          });

          const summaryJson = transformer.getRequirementsSummary();
          if (summaryJson) {
            try {
              const parsed = JSON.parse(summaryJson);
              await supabase
                .from('projects')
                .update({ requirements_json: parsed, status: 'requirements_confirmed' })
                .eq('id', projectId);
            } catch { /* ignore */ }
          }

          controller.close();
        } catch (err) {
          console.error('Claude stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
