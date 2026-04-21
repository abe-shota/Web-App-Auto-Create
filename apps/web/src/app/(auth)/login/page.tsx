'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Play } from 'lucide-react';

// Supabaseクライアントはボタン操作時に遅延生成する
function getSupabaseClient() {
  const { createBrowserClient } = require('@supabase/ssr');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setError('メール送信に失敗しました。もう一度お試しください。');
      } else {
        setSent(true);
      }
    } catch {
      setError('エラーが発生しました。');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setError('Googleログインに失敗しました。');
        setLoading(false);
      }
    } catch {
      setError('エラーが発生しました。');
      setLoading(false);
    }
  }

  async function handleDemoMode() {
    setLoading(true);
    await fetch('/api/demo-auth', { method: 'POST' });
    router.push('/demo');
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">メールを確認してください</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong>{email}</strong> にログインリンクを送りました。
          </p>
          <button onClick={() => setSent(false)} className="text-indigo-600 text-sm underline">
            別のメールアドレスで試す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* ロゴ */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">AppMaker AI</h1>
          <p className="text-gray-500 text-sm">会話するだけでアプリが完成します</p>
        </div>

        {/* デモボタン (常に表示) */}
        <button
          onClick={handleDemoMode}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-2xl transition-colors shadow-sm disabled:opacity-50 text-base"
        >
          <Play className="w-5 h-5" />
          登録なしでデモを試す
        </button>

        {/* Supabase未設定の場合はログインフォームを非表示 */}
        {hasSupabase ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-xs">または登録してすべての機能を使う</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-400 text-xs">または</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '送信中...' : 'ログインリンクを送る'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-blue-600 text-sm">
              本番環境では、Supabaseを設定するとログイン機能が使えます。
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          ログインすることで、利用規約とプライバシーポリシーに同意したことになります。
        </p>
      </div>
    </div>
  );
}
