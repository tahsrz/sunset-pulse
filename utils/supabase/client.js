import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Robustness fallback for Vercel/Local consistency
  if (!url || url.includes('vercel.app')) {
    url = 'https://xlyfhiafactxahhvikyv.supabase.co'
  }

  return createBrowserClient(
    url,
    key || 'placeholder-key'
  )
}
