import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Standard client — used in client components and mutations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// No-cache client — used in server components so Next.js never caches the fetch
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (input, init) =>
      fetch(input as RequestInfo, { ...init, cache: 'no-store' }),
  },
})
