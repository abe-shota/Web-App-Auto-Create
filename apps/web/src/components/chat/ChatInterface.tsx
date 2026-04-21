'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import type { ChatMessage } from '@/types/chat';
import type { Message } from '@/types/database';

interface Props {
  projectId: string;
  initialMessages: Message[];
  phase?: 'requirements' | 'guidance' | 'generation';
  isDemo?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'こんにちは！アプリ開発コンシェルジュです😊\n\nまず、どんなアプリを作りたいか教えてください。どんな小さなアイデアでも大丈夫です！',
  created_at: new Date().toISOString(),
};

export function ChatInterface({ projectId, initialMessages, phase = 'requirements', isDemo = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages.length === 0) return [WELCOME_MESSAGE];
    return initialMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      created_at: m.created_at,
    }));
  });
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  // ユーザーメッセージの送信回数（デモモードのターン管理用）
  const userTurnRef = useRef(
    initialMessages.filter((m) => m.role === 'user').length
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming) return;
      setError('');

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent('');

      try {
        const body = isDemo
          ? JSON.stringify({ projectId, message: text, turnIndex: userTurnRef.current })
          : JSON.stringify({ projectId, message: text, phase });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamingContent(accumulated);
        }

        userTurnRef.current += 1;

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulated,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamingContent('');
      } catch (err) {
        setError('送信に失敗しました。もう一度試してください。');
        console.error(err);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, projectId, phase, isDemo]
  );

  return (
    <div className="flex flex-col h-full">
      {/* デモバナー */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center flex-shrink-0">
          <p className="text-amber-700 text-xs font-medium">
            🎮 デモモード — APIキーなしでUI体験できます
          </p>
        </div>
      )}

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble role="assistant" content={streamingContent} isStreaming />
        )}

        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
              AI
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2 inline-block">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 pb-safe flex-shrink-0">
        <MessageInput
          onSend={sendMessage}
          disabled={isStreaming}
          placeholder={isDemo ? 'デモ: 何でも話しかけてみてください...' : 'AIに話しかける...'}
        />
      </div>
    </div>
  );
}
