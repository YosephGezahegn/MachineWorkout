import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

// This is a server-side Supabase client specifically for use in server components
// and static site generation functions like generateStaticParams
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
}
