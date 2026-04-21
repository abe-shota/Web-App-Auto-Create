'use client';

import { cn } from '@/lib/utils/cn';
import type { RequirementsSummary } from '@/types/chat';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function parseRequirementsSummary(content: string): {
  summary: RequirementsSummary | null;
  before: string;
  after: string;
} {
  const startTag = '<requirements_summary>';
  const endTag = '</requirements_summary>';
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    return { summary: null, before: content, after: '' };
  }

  const jsonStr = content.slice(startIdx + startTag.length, endIdx);
  try {
    const summary = JSON.parse(jsonStr) as RequirementsSummary;
    return {
      summary,
      before: content.slice(0, startIdx).trim(),
      after: content.slice(endIdx + endTag.length).trim(),
    };
  } catch {
    return { summary: null, before: content, after: '' };
  }
}

function RequirementsSummaryCard({ summary }: { summary: RequirementsSummary }) {
  return (
    <div className="mt-3 bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm">
      <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
        <p className="text-indigo-700 font-semibold text-sm">📋 要件定義まとめ</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 font-medium">アプリの種類</p>
          <p className="text-gray-800 text-sm mt-0.5">{summary.app_type}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">使う人</p>
          <p className="text-gray-800 text-sm mt-0.5">{summary.target_users}</p>
        </div>
        {summary.current_method && (
          <div>
            <p className="text-xs text-gray-500 font-medium">今の方法</p>
            <p className="text-gray-800 text-sm mt-0.5">{summary.current_method}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 font-medium">主な機能</p>
          <ul className="mt-1 space-y-1">
            {summary.core_features?.map((f, i) => (
              <li key={i} className="text-gray-800 text-sm flex gap-2">
                <span className="text-indigo-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        {summary.nice_to_have && summary.nice_to_have.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-medium">あれば嬉しい機能</p>
            <ul className="mt-1 space-y-1">
              {summary.nice_to_have.map((f, i) => (
                <li key={i} className="text-gray-600 text-sm flex gap-2">
                  <span className="text-gray-400">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="bg-indigo-50 rounded-lg p-3">
          <p className="text-indigo-800 text-sm leading-relaxed">{summary.summary}</p>
        </div>
      </div>
    </div>
  );
}

export function MessageBubble({ role, content, isStreaming }: Props) {
  const isUser = role === 'user';
  const { summary, before, after } = parseRequirementsSummary(content);

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
          AI
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
        )}
      >
        {before && <p className="whitespace-pre-wrap">{before}</p>}
        {summary && <RequirementsSummaryCard summary={summary} />}
        {after && <p className="whitespace-pre-wrap mt-2">{after}</p>}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}
