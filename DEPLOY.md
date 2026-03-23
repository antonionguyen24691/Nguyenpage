# 🚀 Deploy banker-system lên Vercel

## Yêu cầu

- Node.js >= 18
- Tài khoản [Vercel](https://vercel.com) (miễn phí)
- Git đã cài đặt

---

## Bước 1: Khởi tạo Git (nếu chưa có)

```bash
cd banker-system
git init
git add .
git commit -m "Initial commit"
```

## Bước 2: Push lên GitHub

### Cách 1: Dùng GitHub CLI

```bash
# Cài GitHub CLI: https://cli.github.com
gh repo create banker-system --private --source=. --push
```

### Cách 2: Tạo repo thủ công

1. Truy cập [github.com/new](https://github.com/new)
2. Tạo repo tên `banker-system` (Private)
3. Kết nối và push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/banker-system.git
git branch -M main
git push -u origin main
```

## Bước 3: Import vào Vercel

1. Vào [vercel.com/new](https://vercel.com/new)
2. Chọn **Import Git Repository**
3. Chọn repo `banker-system`
4. Vercel tự nhận diện Next.js – giữ mặc định

## Bước 4: Cấu hình Environment Variables

Trong trang import (hoặc Settings > Environment Variables), thêm:

| Variable           | Giá trị                          | Môi trường              |
| ------------------ | -------------------------------- | ----------------------- |
| `GOOGLE_SCRIPT_URL` | URL Web App từ Google Apps Script | Production, Preview     |
| `SHEET_ID`          | ID Google Sheet (FAQ + pages)    | Production, Preview     |
| `OPENAI_API_KEY`    | API key từ OpenAI                | Production, Preview     |

> ⚠️ **Quan trọng**: Không commit các giá trị thực vào `.env.local`. File này đã được `.gitignore` loại trừ.

## Bước 5: Deploy

- Nhấn **Deploy** – Vercel sẽ tự build và cấp URL
- Mỗi lần push code lên `main`, Vercel sẽ **tự động re-deploy**
- Push lên branch khác → tạo **Preview deployment**

## Bước 6: Custom Domain (tùy chọn)

1. Vào **Settings > Domains**
2. Thêm tên miền (ví dụ: `banker.yourdomain.com`)
3. Cập nhật DNS theo hướng dẫn Vercel:
   - **CNAME**: `cname.vercel-dns.com`
   - Hoặc **A record**: `76.76.21.21`

---

## Deploy bằng CLI (thay thế)

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

---

## Troubleshooting

| Lỗi                             | Giải pháp                                           |
| -------------------------------- | --------------------------------------------------- |
| Build failed                     | Chạy `npm run build` local để kiểm tra lỗi         |
| API routes 500                   | Kiểm tra Environment Variables đã set chưa          |
| Chatbot không phản hồi           | Kiểm tra `OPENAI_API_KEY` hợp lệ                   |
| Sheet data không load            | Kiểm tra `SHEET_ID` và Sheet đã publish dạng Web    |
