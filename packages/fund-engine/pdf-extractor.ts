// Dynamic import inside function instead
import * as cheerio from 'cheerio';
import { extractHoldingsFromText } from '../ai/holdings-extraction';
import { db } from '../db';

/**
 * Hàm tìm link PDF báo cáo mới nhất của quỹ (Giả lập logic tìm HTML).
 * Trong thực tế mỗi quỹ sẽ có 1 pattern HTML riêng.
 */
async function findLatestFactsheetUrl(fundCode: string): Promise<string | null> {
  try {
    // Ví dụ mẫu với VinaCapital. Lên trang tài liệu của họ tìm link PDF có chữ 'Factsheet'
    // Nếu fundCode là VEOF, v.v...
    const docUrl = 'https://vinacapital.com/vi/tai-lieu-quy/';
    const res = await fetch(docUrl, { cache: 'no-store' });
    const html = await res.text();
    const $ = cheerio.load(html);

    let pdfLink: string | null = null;
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.toLowerCase().includes('.pdf') && href.includes(fundCode)) {
            pdfLink = href;
        }
    });

    // Cung cấp một Mock PDF an toàn cho mục đích minh họa nếu Crawler không bắt được HTML tĩnh
    // Để gọi qua API OpenAI test hoạt động
    return pdfLink || `https://vinacapital.com/wp-content/uploads/2024/02/${fundCode}-Factsheet-VN.pdf`;
  } catch (error) {
    console.error(`Error finding PDF for ${fundCode}:`, error);
    return null;
  }
}

/**
 * Quy trình chuẩn bị Tải PDF -> Đọc Text -> Đưa AI bóc tách -> Lưu Database
 */
export async function processFundHoldings(fundCode: string) {
  try {
    const pdfUrl = await findLatestFactsheetUrl(fundCode);
    if (!pdfUrl) return { success: false, error: 'No PDF found' };

    console.log(`Downloading PDF for ${fundCode} from ${pdfUrl}`);
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Parsing PDF for ${fundCode}...`);
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);

    console.log(`AI Extracting holdings for ${fundCode}...`);
    // Cắt ngày ngày 1 đầu tháng hiện tại
    const dateObj = new Date();
    const reportDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-01`; 
    
    const holdings = await extractHoldingsFromText(fundCode, pdfData.text, reportDate);

    console.log(`Saving ${holdings.length} holdings to DB for ${fundCode}...`);
    // Lưu vào Supabase Database
    for (const h of holdings) {
        await db.from('fund_holdings').upsert({
            fund_code: fundCode,
            stock_code: h.stock_code,
            weight: h.weight,
            date: reportDate
        }, { onConflict: 'fund_code,stock_code,date', ignoreDuplicates: false });
    }

    return { success: true, fund: fundCode, holdings_extracted: holdings.length };
  } catch (error: any) {
    console.error(`Failed to process holdings for ${fundCode}:`, error);
    return { success: false, error: error.message };
  }
}

export async function syncAllHoldings() {
    // Chạy mẫu nghiệm thu 1 số quỹ chính
    const results = [];
    results.push(await processFundHoldings('VEOF'));
    results.push(await processFundHoldings('VESAF'));
    results.push(await processFundHoldings('DCBC'));
    return results;
}
