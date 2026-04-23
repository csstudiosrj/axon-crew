import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https://ebakpqrespckucqwfdok.supabase.co;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;

export const supabase = createClient(supabaseUrl, supabaseKey);