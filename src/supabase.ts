import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables (Secrets panel in AI Studio).';
  console.error(errorMsg);
  // We throw a more descriptive error than the library's default
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required to initialize Supabase.');
  if (!supabaseAnonKey) throw new Error('VITE_SUPABASE_ANON_KEY is required to initialize Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
