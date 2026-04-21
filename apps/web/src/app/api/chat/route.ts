import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { REQUIREMENTS_SYSTEM_PROMPT } from '@/lib/claude/prompts';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// data_extractionタグとrequirements_summaryタグをストリームから除去しつつ、
// 構造化データはサーバー側で収集する
function createStreamTransformer() {
  let buffer = '';
  let insideDataExtraction = false;
  let collectedExtraction = '';
  let requirementsSummary = '';

  return {
    transform(chunk: string): string {
      buffer += chunk;
      let output = '';

      // data_extractionタグを検出・除去
      while (buffer.length > 0) {
        if (insideDataExtraction) {
          const endTag = '</data_extraction>';
          const endIdx = buffer.indexOf(endTag);
          if (endIdx !== -1) {
            collectedExtraction += buffer.slice(0, endIdx);
            buffer = buffer.slice(endIdx + endTag.length);
            insideDataExtraction = false;
          } else {
            // まだ終了タグが来ていない
            const safeLen = Math.max(0, buffer.length - endTag.length);
            collectedExtraction += buffer.slice(0, safeLen);
            buffer = buffer.slice(safeLen);
            break;
          }
        } else {
          const startDataTag = '<data_extraction>';
          const startReqTag = '<requirements_summary>';
          const endReqTag = '</requirements_summary>';

          // requirements_summaryタグの検索
          const reqStartIdx = buffer.indexOf(startReqTag);
          const reqEndIdx = buffer.indexOf(endReqTag);
          const dataStartIdx = buffer.indexOf(startDataTag);

          if (reqStartIdx !== -1 && reqEndIdx !== -1 && reqEndIdx > reqStartIdx) {
            // requirements_summaryを抽出して保持（ユーザーには表示）
            output += buffer.slice(0, reqStartIdx + startReqTag.length);
            requirementsSummary = buffer.slice(reqStartIdx + startReqTag.length, reqEndIdx);
            output += requirementsSummary + endReqTag;
            buffer = buffer.slice(reqEndIdx + endReqTag.length);
          } else if (dataStartIdx !== -1) {
            output += buffer.slice(0, dataStartIdx);
            buffer = buffer.slice(dataStartIdx + startDataTag.length);
            insideDataExtraction = true;
          } else {
            // 安全な部分を出力
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
    getExtraction(): string {
      return collectedExtraction;
    },
    getRequirementsSummary(): string {
      return requirementsSummary;
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { projectId, message, phase = 'requirements' } = await request.json();

    if (!projectId || !message) {
      return new Response('Bad Request', { status: 400 });
    }

    // プロジェクトの所有権確認
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // 過去のメッセージを取得
    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .order('created_at', { ascending: true })
      .limit(20);

    // ユーザーメッセージを保存
    await supabase.from('messages').insert({
      project_id: projectId,
      role: 'user',
      content: message,
      phase,
    });

    // Claude APIに送るメッセージリストを構築
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(historyMessages ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const systemPrompt = REQUIREMENTS_SYSTEM_PROMPT;

    // Streaming レスポンスを返す
    const encoder = new TextEncoder();
    const transformer = createStreamTransformer();
    let fullAssistantMessage = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages,
          });

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const filtered = transformer.transform(chunk.delta.text);
              fullAssistantMessage += chunk.delta.text;
              if (filtered) {
                controller.enqueue(encoder.encode(filtered));
              }
            }
          }

          // フラッシュ
          const flushed = transformer.flush();
          if (flushed) {
            controller.enqueue(encoder.encode(flushed));
          }

          // AIの返答をDBに保存
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

          // requirements_summaryがあればプロジェクトの要件JSONを更新
          const summaryJson = transformer.getRequirementsSummary();
          if (summaryJson) {
            try {
              const parsed = JSON.parse(summaryJson);
              await supabase
                .from('projects')
                .update({
                  requirements_json: parsed,
                  status: 'requirements_confirmed',
                })
                .eq('id', projectId);
            } catch {
              // JSON解析エラーは無視
            }
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
