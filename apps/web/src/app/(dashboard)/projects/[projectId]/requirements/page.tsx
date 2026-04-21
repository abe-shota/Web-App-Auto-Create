import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function RequirementsPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase', 'requirements')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col h-svh bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-800 truncate">{project.title}</h1>
            <p className="text-xs text-gray-400">要件定義 · AIコンシェルジュ</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-gray-500">オンライン</span>
          </div>
        </div>
      </header>

      {/* チャット */}
      <div className="flex-1 overflow-hidden max-w-lg mx-auto w-full">
        <ChatInterface
          projectId={projectId}
          initialMessages={messages ?? []}
          phase="requirements"
        />
      </div>
    </div>
  );
}
