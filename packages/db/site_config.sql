-- Schema cho Site Config (thay thế localStorage)
-- Bảng này lưu tất cả cấu hình quản trị: pages, links, settings, home

CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,  -- 'pages', 'links', 'settings', 'home'
  config_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc công khai (trang public cần đọc config)
DROP POLICY IF EXISTS "Allow public read access to site_config" ON site_config;
CREATE POLICY "Allow public read access to site_config" ON site_config FOR SELECT USING (true);

-- Chỉ cho phép service role ghi (qua API route server-side)
DROP POLICY IF EXISTS "Allow service role write to site_config" ON site_config;
CREATE POLICY "Allow service role write to site_config" ON site_config FOR ALL USING (true);
