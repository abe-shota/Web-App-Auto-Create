import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, MessageSquare, ChevronRight, LogOut } from 'lucide-react';
import { redirect } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  requirements_gathering: '要件定義中',
  requirements_confirmed: '要件確認済み',
  payment_pending: '決済待ち',
  paid: '決済完了',
  in_generation: '生成中',
  completed: '完成',
};

const STATUS_COLORS: Record<string, string> = {
  requirements_gathering: 'bg-blue-100 text-blue-700',
  requirements_confirmed: 'bg-yellow-100 text-yellow-700',
  payment_pending: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  in_generation: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
};

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const isTrialActive =
    profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.ceil(
        (new Date(profile.trial_ends_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800 text-lg">AppMaker AI</h1>
            <p className="text-xs text-gray-500">
              {user?.email?.split('@')[0] ?? 'ユーザー'}さん
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 無料トライアルバナー */}
        {isTrialActive && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-indigo-700 text-sm font-medium">
              無料トライアル中 🎉 残り {trialDaysLeft} 日
            </p>
            <p className="text-indigo-600 text-xs mt-1">
              この期間中はベーシックプランが無料でご利用いただけます
            </p>
          </div>
        )}

        {/* 新規プロジェクトボタン */}
        <Link
          href="/projects/new"
          className="flex items-center gap-3 w-full bg-indigo-600 text-white rounded-2xl p-5 shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-base">新しいアプリを作る</p>
            <p className="text-indigo-200 text-sm">AIと会話するだけで完成</p>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-300" />
        </Link>

        {/* プロジェクト一覧 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            作成中・完成したアプリ
          </h2>

          {!projects || projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                まだアプリがありません
                <br />
                上のボタンから始めましょう
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/requirements`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-indigo-200 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                    📱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {project.title}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {STATUS_LABELS[project.status] ?? project.status}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
