import { NextResponse } from 'next/server';

// デモモード専用の認証ルート
// 実際のSupabaseを使わず、デモセッションCookieを設定する

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('demo_session', 'true', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24時間
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('demo_session');
  return response;
}
