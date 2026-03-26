import * as cheerio from 'cheerio';

type FundData = {
  fund: string;
  nav: number;
  date: string; // YYYY-MM-DD
  source: string;
};

/**
 * Crawl VinaCapital (VEOF, VESAF, VLGF)
 * Họ có API công khai trả về JSON thông qua admin-ajax.
 */
export async function crawlVinaCapital(fundName: string): Promise<FundData | null> {
  try {
    const response = await fetch('https://vinacapital.com/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'getchartfundnav',
        fundname: fundName,
      }),
	  // Cache no-store đảm bảo luôn lấy data mới nhất
	  cache: 'no-store'
    });
    
    const data = await response.json();
    // VinaCapital trả về mảng log dữ liệu, phần tử cuối cùng là mới nhất [timestamp, value]
    if (data && data.length > 0) {
      const latest = data[data.length - 1];
      return {
        fund: fundName,
        nav: parseFloat(latest[1]),
        date: new Date(latest[0]).toISOString().split('T')[0],
        source: 'VinaCapital',
      };
    }
    return null;
  } catch (error) {
    console.error(`Error crawling VinaCapital ${fundName}:`, error);
    return null;
  }
}

/**
 * Crawl DragonCapital (DCBC, DCDS)
 * Sử dụng Cheerio cào HTML trang web của họ do không có JSON API.
 */
export async function crawlDragonCapital(fundName: string): Promise<FundData | null> {
  try {
    // URL thật trang web NAV của DragonCapital
    const url = 'https://dragoncapital.com.vn/'; 
    // Trong thực tế sẽ fetch website và parse HTML:
    // const response = await fetch(url, { cache: 'no-store' });
    // const html = await response.text();
    // const $ = cheerio.load(html);
    // const navText = $(`td:contains("${fundName}")`).next().text();
    
    // Fallback: Trả về dữ liệu ngẫu nhiên cho mục đích minh họa chạy template.
    // Nếu bạn có link HTML API chính xác, có thể thay đổi DOM selector ở trên.
    return {
      fund: fundName,
      nav: 25000 + Math.random() * 500, // Mock
      date: new Date().toISOString().split('T')[0],
      source: 'DragonCapital',
    };
  } catch (error) {
    console.error(`Error crawling DragonCapital ${fundName}:`, error);
    return null;
  }
}

/**
 * Crawl SSIAM (SSISCA)
 * Dùng Fetch + Cheerio tương tự
 */
export async function crawlSSIAM(fundName: string): Promise<FundData | null> {
  try {
    const url = 'https://www.ssiam.com.vn/vi/funds.html';
    // fetch, load cheerio, jQuery selectors...

    return {
      fund: fundName,
      nav: 18000 + Math.random() * 300, // Mock
      date: new Date().toISOString().split('T')[0],
      source: 'SSIAM',
    };
  } catch (error) {
    console.error(`Error crawling SSIAM ${fundName}:`, error);
    return null;
  }
}

export async function crawlAllFunds(): Promise<FundData[]> {
  const results: FundData[] = [];
  
  // VinaCapital (Real JSON API)
  const veof = await crawlVinaCapital('VEOF');
  const vesaf = await crawlVinaCapital('VESAF');
  const vlgf = await crawlVinaCapital('VLGF');
  if (veof) results.push(veof);
  if (vesaf) results.push(vesaf);
  if (vlgf) results.push(vlgf);

  // DragonCapital (Mocked HTML Parsing)
  const dcbc = await crawlDragonCapital('DCBC');
  const dcds = await crawlDragonCapital('DCDS');
  if (dcbc) results.push(dcbc);
  if (dcds) results.push(dcds);

  // SSIAM (Mocked HTML Parsing)
  const ssisca = await crawlSSIAM('SSISCA');
  if (ssisca) results.push(ssisca);

  return results;
}
