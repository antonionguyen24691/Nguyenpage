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
export async function crawlVinaCapital(fundName: string): Promise<FundData[]> {
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
    // VinaCapital trả về mảng log dữ liệu, lấy toàn bộ lịch sử
    if (data && Array.isArray(data)) {
      return data.map((item: any) => ({
        fund: fundName,
        nav: parseFloat(item[1]),
        date: new Date(item[0]).toISOString().split('T')[0],
        source: 'VinaCapital',
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error crawling VinaCapital ${fundName}:`, error);
    return [];
  }
}

const FMARKET_FUNDS: Record<string, number> = {
  'DCIP': 67,
  'DCBF': 27,
  'DCDS': 28,
  'SSIBF': 8,
  'SSISCA': 11
};

async function fetchFmarketNav(fundName: string, source: string): Promise<FundData[]> {
  const fundId = FMARKET_FUNDS[fundName];
  if (!fundId) return []; // DCBC hoặc các quỹ không có mặt

  try {
    const res = await fetch('https://api.fmarket.vn/res/product/get-nav-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        isAllData: 1, 
        productId: fundId,
        searchField: "", 
        sortBy: "", 
        sortOrder: "" 
      })
    });
    const data = await res.json();
    if (data && data.status === 200 && Array.isArray(data.data)) {
      return data.data.map((item: any) => {
        let dateVal = item.navDate;
        let formattedDate = new Date().toISOString().split('T')[0];
        
        if (dateVal) {
          if (typeof dateVal === 'string') {
            const yyyymmddRegex = /^(\d{4})(\d{2})(\d{2})$/;
            const match = dateVal.match(yyyymmddRegex);
            if (match) {
              formattedDate = `${match[1]}-${match[2]}-${match[3]}`;
            } else {
              // Try standard parse
              formattedDate = new Date(dateVal).toISOString().split('T')[0];
            }
          } else if (typeof dateVal === 'number') {
            formattedDate = new Date(dateVal).toISOString().split('T')[0];
          }
        }

        return {
          fund: fundName,
          nav: parseFloat(item.nav),
          date: formattedDate,
          source: source,
        };
      });
    }
  } catch (error) {
    console.error(`Error crawling Fmarket ${fundName}:`, error);
  }
  return [];
}

/**
 * Crawl DragonCapital (DCBC, DCDS)
 * Sử dụng Cheerio cào HTML trang web của họ do không có JSON API.
 */
export async function crawlDragonCapital(fundName: string): Promise<FundData[]> {
  try {
    return await fetchFmarketNav(fundName, 'DragonCapital(Fmarket)');
  } catch (error) {
    console.error(`Error crawling DragonCapital ${fundName}:`, error);
    return [];
  }
}

/**
 * Crawl SSIAM (SSISCA)
 * Sử dụng API mở của fmarket
 */
export async function crawlSSIAM(fundName: string): Promise<FundData[]> {
  try {
    return await fetchFmarketNav(fundName, 'SSIAM(Fmarket)');
  } catch (error) {
    console.error(`Error crawling SSIAM ${fundName}:`, error);
    return [];
  }
}

export async function crawlAllFunds(): Promise<FundData[]> {
  const results: FundData[] = [];
  
  // VinaCapital
  const vinaFunds = ['VEOF', 'VESAF', 'VLGF', 'VFF', 'VIBF'];
  for (const fund of vinaFunds) {
    const data = await crawlVinaCapital(fund);
    results.push(...data);
  }

  // DragonCapital
  const dcFunds = ['DCBC', 'DCDS', 'DCIP', 'DCBF'];
  for (const fund of dcFunds) {
    const data = await crawlDragonCapital(fund);
    results.push(...data);
  }

  // SSIAM
  const ssiFunds = ['SSISCA', 'SSIBF'];
  for (const fund of ssiFunds) {
    const data = await crawlSSIAM(fund);
    results.push(...data);
  }

  return results;
}
