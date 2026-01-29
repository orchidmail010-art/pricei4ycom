export async function GET() {
  // 서버에서만 보이는 값 (절대 클라 노출 금지)
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAdminSecret = !!process.env.ADMIN_UPLOAD_SECRET;
  return new Response(
    JSON.stringify({ ok: true, hasServiceKey, hasAdminSecret }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
