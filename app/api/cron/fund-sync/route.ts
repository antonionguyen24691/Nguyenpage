import { NextResponse } from 'next/server';
import { syncFunds } from '../../../../packages/fund-engine';

// Ngăn Next.js build route này dưới dạng static
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Bảo mật: Đảm bảo chỉ Vercel Cron mới gọi được API này (bạn cần cấu hình CRON_SECRET trong env trên Vercel)
    // Tạm tắt Auth để test local dễ dàng. Trong Production nên bật đoạn code dưới lên:
    /*
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }
    */

    const result = await syncFunds();

    return NextResponse.json({
      success: true,
      message: 'Đồng bộ dữ liệu quỹ hoàn tất',
      data: result
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi đồng bộ dữ liệu quỹ',
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}
