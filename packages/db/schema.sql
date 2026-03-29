-- Schema cho Fund Intelligence Module

CREATE TABLE IF NOT EXISTS funds (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS fund_nav (
  id SERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  nav NUMERIC NOT NULL,
  date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (fund_code, date)
);

CREATE TABLE IF NOT EXISTS fund_holdings (
  id SERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  stock_code TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (fund_code, stock_code, date)
);

INSERT INTO funds (code, name, company)
VALUES
  ('VESAF', 'Quỹ Cổ phiếu Hưng thịnh VinaCapital', 'VinaCapital'),
  ('VEOF', 'Quỹ Cổ phiếu Tiếp cận Thị trường VinaCapital', 'VinaCapital'),
  ('VFF', 'Quỹ Trái phiếu Bảo thịnh VinaCapital', 'VinaCapital'),
  ('VIBF', 'Quỹ Cân bằng Tuệ sáng VinaCapital', 'VinaCapital'),
  ('VDEF', 'Quỹ VinaCapital VDEF', 'VinaCapital'),
  ('VLBF', 'Quỹ VinaCapital VLBF', 'VinaCapital'),
  ('SSISCA', 'Quỹ Cổ phiếu Trưởng thành SSI', 'SSIAM'),
  ('SSIBF', 'Quỹ Trái phiếu SSI', 'SSIAM'),
  ('VLGF', 'Vietnam Long-term Growth Fund', 'SSIAM'),
  ('SSI-EF', 'SSI-EF', 'SSIAM'),
  ('DCBC', 'Quỹ DCBC', 'DragonCapital'),
  ('DCDS', 'Quỹ Đầu tư Chứng khoán Năng động DC', 'DragonCapital'),
  ('DCIP', 'Quỹ Thu nhập Cố định Dragon Capital', 'DragonCapital'),
  ('DCBF', 'Quỹ Trái phiếu Dragon Capital', 'DragonCapital'),
  ('DCDE', 'Quỹ cổ phiếu DCDE', 'DragonCapital')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_nav ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to funds" ON funds;
CREATE POLICY "Allow public read access to funds" ON funds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to fund_nav" ON fund_nav;
CREATE POLICY "Allow public read access to fund_nav" ON fund_nav FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to fund_holdings" ON fund_holdings;
CREATE POLICY "Allow public read access to fund_holdings" ON fund_holdings FOR SELECT USING (true);
