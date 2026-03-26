import { NextResponse } from 'next/server';
import { syncAllHoldings } from '../../../../packages/fund-engine/pdf-extractor';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // LƯU Ý: Ở môi trường thật, nhớ bảo mật endpoint này (ví dụ check Header Authorization == process.env.CRON_SECRET)
    const result = await syncAllHoldings();

    return NextResponse.json({
      success: true,
      message: 'Đồng bộ báo cáo danh mục quỹ (Holdings) hoàn tất',
      data: result
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi đồng bộ data holdings PDF',
        error: error.message
      },
      { status: 500 }
    );
  }
}
