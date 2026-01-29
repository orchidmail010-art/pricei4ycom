import { supabase } from '@/lib/supabase'

export default async function TestPage() {
  const { data, error } = await supabase.from('providers').select('*').limit(5)

  if (error) return <pre style={{ color: 'red' }}>Error: {error.message}</pre>

  return (
    <div style={{ padding: 20 }}>
      <h1>✅ Supabase 연결 성공</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
