import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json().catch(()=>({}));
  const ok = !!process.env.ADMIN_KEY && password === process.env.ADMIN_KEY;

  if (!ok) {
    return NextResponse.json({ error: '잘못된 비밀번호' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // httpOnly 쿠키로 세션 발급 (단순 토큰)
  res.cookies.set('admin_session', 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 , // 7일시간
     secure: process.env.NODE_ENV === 'production', // 🔐
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', '', { httpOnly: true, sameSite:'lax', path:'/', maxAge: 0 });
  return res;
}
