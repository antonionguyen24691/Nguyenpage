import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
      return NextResponse.json(
        { error: "Server chưa cấu hình tài khoản admin." },
        { status: 500 }
      );
    }

    if (username === validUsername && password === validPassword) {
      // Generate a simple session token
      const token =
        Date.now().toString(36) +
        Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2);

      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json(
      { error: "Sai tên đăng nhập hoặc mật khẩu." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 400 }
    );
  }
}
