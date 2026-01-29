// lib/supabase.ts
import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 모든 파일에서 에러 없이 쓸 수 있도록 createClient라는 이름으로 내보냅니다.
export const createClient = () => {
  return supabaseCreateClient(supabaseUrl, supabaseAnonKey)
}