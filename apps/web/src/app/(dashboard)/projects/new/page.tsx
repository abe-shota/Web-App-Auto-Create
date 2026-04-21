'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: title.trim(),
        tier: 'basic',
        status: 'requirements_gathering',
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/projects/${data.id}/requirements`);
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-gray-800">新しいアプリを作る</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* 説明 */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            どんなアプリを作りますか？
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            アプリの名前を入力してください。
            その後、AIと会話しながら詳しい内容を決めていきます。
          </p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アプリ名
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 在庫管理アプリ、予約システム..."
              className="w-full text-gray-800 placeholder-gray-400 focus:outline-none text-lg"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
          >
            {loading ? '作成中...' : 'AIと話し始める →'}
          </button>
        </form>

        {/* ヒント */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-blue-700 text-sm font-medium mb-2">💡 ヒント</p>
          <ul className="text-blue-600 text-sm space-y-1">
            <li>• アプリ名はあとから変更できます</li>
            <li>• 詳細はAIが会話で聞いてくれます</li>
            <li>• ミーティングの録音やメモもアップロードできます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
