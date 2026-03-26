/**
 * AI phân tích quỹ nội bộ bằng logic hoặc tích hợp Open AI.
 */
export async function analyzeFund(fundData: any[]) {
    if (!fundData || fundData.length < 2) {
      return "Chưa có đủ dữ liệu lịch sử để phân tích.";
    }
  
    // Sắp xếp mốc thời gian gần nhất lên đầu (nếu đầu vào chưa sort)
    // fundData = fundData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const latest = fundData[0].nav;
    const previous = fundData[1].nav;
    const change = latest - previous;
    const changePercent = ((change / previous) * 100).toFixed(2);
  
    // Nếu có dữ liệu 7 ngày, thêm tính toán
    const weekOld = fundData.length >= 7 ? fundData[6].nav : null;
    let weekInsight = '';
    if (weekOld) {
        const weekChange = latest - weekOld;
        const weekChangePercent = ((weekChange / weekOld) * 100).toFixed(2);
        weekInsight = `So với tuần trước, NAV ${weekChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(Number(weekChangePercent))}%. `;
    }

    if (change > 0) {
      return `Quỹ đang có dấu hiệu tăng trưởng ngắn hạn (+${changePercent}% so với phiên liền trước). ${weekInsight}`;
    } else if (change < 0) {
      return `Quỹ đang điều chỉnh giảm (${changePercent}% so với phiên liền trước). ${weekInsight}`;
    } else {
      return `NAV quỹ đi ngang trong phiên gần nhất. ${weekInsight}`;
    }
}
