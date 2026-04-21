'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Props {
  onSend: (message: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, onFileSelect, disabled, placeholder }: Props) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    e.target.value = '';
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      {/* ファイル添付ボタン */}
      {onFileSelect && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*,video/*,image/*,.pdf,.txt,.md"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* テキスト入力 */}
      <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'メッセージを入力...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 resize-none focus:outline-none text-sm leading-relaxed max-h-32 disabled:opacity-50"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          text.trim() && !disabled
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-100 text-gray-400'
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
