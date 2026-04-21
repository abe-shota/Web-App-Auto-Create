import { ChatInterface } from '@/components/chat/ChatInterface';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// デモモード専用ページ - 認証・DBなしでUIを体験できる
export default function DemoPage() {
  return (
    <div className="flex flex-col h-svh bg-gray-50">
      <header className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/login" className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-800">在庫管理アプリ（デモ）</h1>
            <p className="text-xs text-gray-400">要件定義 · デモモード</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-xs text-gray-500">デモ</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden max-w-lg mx-auto w-full">
        <ChatInterface
          projectId="demo"
          initialMessages={[]}
          phase="requirements"
          isDemo={true}
        />
      </div>
    </div>
  );
}
