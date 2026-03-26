-- Schema cho Fund Intelligence Module

-- 1. Bảng lưu thông tin định danh các quỹ
CREATE TABLE IF NOT EXISTS funds (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng lưu lịch sử NAV từng ngày của các quỹ
CREATE TABLE IF NOT EXISTS fund_nav (
  id SERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  nav NUMERIC NOT NULL,
  date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(fund_code, date) -- Đảm bảo không lưu trùng NAV của 1 quỹ trong cùng 1 ngày
);

-- 3. Bảng (Optional) lưu tỷ trọng cổ phiếu trong quỹ
CREATE TABLE IF NOT EXISTS fund_holdings (
  id SERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  stock_code TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(fund_code, stock_code, date)
);

-- Insert dữ liệu mẫu cho các quỹ sẽ crawl
INSERT INTO funds (code, name, company)
VALUES 
  ('VESAF', 'Quỹ Đầu tư Cổ phiếu Hưng thịnh VinaCapital', 'VinaCapital'),
  ('VEOF', 'Quỹ Đầu tư Cổ phiếu Tiếp cận Thị trường VinaCapital', 'VinaCapital'),
  ('VLGF', 'Quỹ Đầu tư Cổ phiếu Tập trung Cổ tức VinaCapital', 'VinaCapital'),
  ('SSISCA', 'Quỹ Đầu tư Cổ phiếu Trưởng thành SSI', 'SSIAM'),
  ('DCBC', 'Quỹ Đầu tư Cổ phiếu Năng động Dragon Capital', 'DragonCapital'),
  ('DCDS', 'Quỹ Đầu tư Cổ phiếu Tăng trưởng Dragon Capital', 'DragonCapital')
ON CONFLICT (code) DO NOTHING;

-- Bật Row Level Security (RLS) để bảo mật
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_nav ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_holdings ENABLE ROW LEVEL SECURITY;

-- Tạo policies cho phép đọc công khai (cho Next.js Client fetching nếu cần)
DROP POLICY IF EXISTS "Allow public read access to funds" ON funds;
CREATE POLICY "Allow public read access to funds" ON funds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to fund_nav" ON fund_nav;
CREATE POLICY "Allow public read access to fund_nav" ON fund_nav FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to fund_holdings" ON fund_holdings;
CREATE POLICY "Allow public read access to fund_holdings" ON fund_holdings FOR SELECT USING (true);
