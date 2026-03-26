import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder.supabase.co";
// Lưu ý: Đối với Cronjob/Crawler, nên dùng SERVICE_ROLE_KEY để bypass RLS (Row Level Security)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "placeholder";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase credentials in environment variables.");
}

// Khởi tạo Supabase client chuẩn backend (không lưu session)
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});
