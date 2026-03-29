import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import * as cheerio from "cheerio";

const execAsync = promisify(exec);
const cwd = process.cwd();
const localDataPath = path.join(cwd, "data", "fund-intelligence.json");
const envPath = path.join(cwd, ".env.local");

const SSIAM_PAGES = {
  VLGF: "https://ssiam.com.vn/en/ssiam/fund-information-vlgf",
  SSISCA: "https://ssiam.com.vn/en/fund-information-ssi-sca",
  SSIBF: "https://ssiam.com.vn/en/ssiam/fund-information-ssibf",
};

const DRAGON_CODES = ["DCDS", "DCDE", "DCBF", "DCIP"];
const VINA_CODES = ["VEOF", "VESAF", "VFF", "VIBF", "VDEF", "VLBF"];
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const VINA_PDF_DAYS = ["08", "10", "12", "14", "15", "18", "20", "25"];
const STOP_TICKERS = new Set([
  "NAV",
  "YTD",
  "AUM",
  "VND",
  "PIT",
  "PWC",
  "ETF",
  "USD",
  "VINA",
  "INDEX",
  "CASH",
  "BANK",
  "BANKS",
  "FUND",
  "SECTOR",
  "TOTAL",
  "JUN",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]);

loadEnv();

function loadEnv() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

function parseMonthDate(value) {
  const normalized = value.replace(/\u00a0/g, " ").replace(/\./g, "/").replace(/\s+/g, " ").trim();
  const dayMonthYear = normalized.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (dayMonthYear) return `${dayMonthYear[3]}-${String(dayMonthYear[2]).padStart(2, "0")}-01`;
  const monthYearSlash = normalized.match(/(\d{1,2})\/(20\d{2})/);
  if (monthYearSlash) return `${monthYearSlash[2]}-${String(monthYearSlash[1]).padStart(2, "0")}-01`;
  const englishMonth = normalized.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (englishMonth) {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthIndex = months.indexOf(englishMonth[1].toLowerCase());
    if (monthIndex >= 0) return `${englishMonth[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  }
  return null;
}

function parseWeight(value) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function padMonth(value) {
  return String(value).padStart(2, "0");
}

function shiftMonth(date, offset) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function toMonthLabel(date) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${labels[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function getRecentReportMonths(limit = 4) {
  const now = new Date();
  const start = shiftMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
  return Array.from({ length: limit }, (_, index) => shiftMonth(start, -index));
}

function buildVinaFactsheetCandidates(fundCode, reportMonth) {
  const reportLabel = toMonthLabel(reportMonth);
  const publicationMonths = [shiftMonth(reportMonth, 1), reportMonth, shiftMonth(reportMonth, 2)];
  const urls = [];

  for (const publicationMonth of publicationMonths) {
    const year = publicationMonth.getUTCFullYear();
    const month = publicationMonth.getUTCMonth() + 1;
    for (const day of VINA_PDF_DAYS) {
      urls.push(
        `https://wm.vinacapital.com/wp-content/uploads/${year}/${padMonth(month)}/${year}${padMonth(month)}${day}-VINACAPITAL-${fundCode}_Monthly-Factsheet_${reportLabel}-EN.pdf`,
      );
      urls.push(
        `https://wm.vinacapital.com/wp-content/uploads/${year}/${padMonth(month)}/${year}${padMonth(month)}${day}-VINACAPITAL-${fundCode}_Monthly-Factsheet_${reportLabel}-VN.pdf`,
      );
    }
  }

  return [...new Set(urls)];
}

async function resolveReachableUrl(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
      });
      if (response.ok) {
        return url;
      }
    } catch {
      // continue
    }
  }

  return null;
}

function mergeRows(existingRows, newRows) {
  const unique = new Map();
  for (const row of [...existingRows, ...newRows]) {
    unique.set(`${row.fund_code}::${row.stock_code}::${row.date}`, row);
  }
  return [...unique.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function extractPdfText(url) {
  const command =
    process.platform === "win32"
      ? `"${path.join(cwd, "node_modules", ".bin", "pdf-parse.cmd")}" text "${url}" --pages 1-5`
      : `"${path.join(cwd, "node_modules", ".bin", "pdf-parse")}" text "${url}" --pages 1-5`;
  const { stdout } = await execAsync(command, {
    cwd,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

async function llmExtract(fundCode, reportDate, text) {
  const heuristic = extractHoldingsHeuristically(fundCode, text);
  if (heuristic.length > 0) {
    return heuristic;
  }

  if (!process.env.OPENAI_API_KEY) {
    return [];
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `Bạn là bộ trích xuất dữ liệu quỹ.
Trích xuất danh sách top holdings từ factsheet của quỹ ${fundCode} kỳ ${reportDate}.
Chỉ trả JSON dạng {"holdings":[{"stock_code":"FPT","weight":17.01}]}.
Nếu không thấy holdings thì trả {"holdings":[]}.

TEXT:
${text.slice(0, 18000)}`,
        },
      ],
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{"holdings":[]}';
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.holdings) ? parsed.holdings : [];
  } catch {
    return [];
  }
}

function normalizeText(pdfText) {
  return pdfText
    .replace(/\r/g, "")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú");
}

function getSecondPageText(pdfText) {
  const normalized = normalizeText(pdfText);
  const pages = normalized.split(/--\s+\d+\s+of\s+\d+\s+--/i).map((part) => part.trim()).filter(Boolean);
  return pages.length > 1 ? pages[pages.length - 1] : normalized;
}

function extractWeightBlock(lines) {
  const blocks = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^-?\d{1,2}(?:\.\d{1,2})?%?$/.test(line)) {
      const value = Number(line.replace("%", ""));
      if (Number.isFinite(value) && value > 0 && value <= 100) {
        current.push(value);
        continue;
      }
    }

    if (current.length >= 5) {
      blocks.push([...current]);
    }
    current = [];
  }

  if (current.length >= 5) {
    blocks.push(current);
  }

  return blocks.sort((left, right) => right.length - left.length)[0] || [];
}

function extractTickerCandidates(sectionText, fundCode) {
  const unique = new Set();
  const tickers = [];

  for (const rawLine of sectionText.split("\n")) {
    const token = rawLine.trim().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z][A-Z0-9]{1,5}$/.test(token)) {
      continue;
    }
    if (token === fundCode || token.startsWith("VINACAPITAL")) {
      continue;
    }
    if (STOP_TICKERS.has(token) || unique.has(token)) {
      continue;
    }

    unique.add(token);
    tickers.push(token);
  }

  return tickers;
}

function extractHoldingsHeuristically(fundCode, pdfText) {
  const secondPageText = getSecondPageText(pdfText);
  const lines = secondPageText.split("\n").map((line) => line.trim()).filter(Boolean);
  const monthLineIndex = lines.findIndex((line) => /Jan\s+Feb\s+Mar/i.test(line));
  const weightLines = extractWeightBlock(monthLineIndex > 0 ? lines.slice(0, monthLineIndex) : lines);

  if (weightLines.length === 0) {
    return [];
  }

  const topHoldingsIndex = secondPageText.search(/Top holdings/i);
  const sectionStart = topHoldingsIndex >= 0 ? Math.max(0, topHoldingsIndex - 4000) : 0;
  const sectionEnd =
    topHoldingsIndex >= 0 ? Math.min(secondPageText.length, topHoldingsIndex + 1800) : secondPageText.length;
  const tickerCandidates = extractTickerCandidates(secondPageText.slice(sectionStart, sectionEnd), fundCode);
  const pairCount = Math.min(weightLines.length, tickerCandidates.length, 10);

  if (pairCount < 5) {
    return [];
  }

  return Array.from({ length: pairCount }, (_, index) => ({
    stock_code: tickerCandidates[index],
    weight: weightLines[index],
  }));
}

async function collectSSIAM() {
  const rows = [];
  for (const [fundCode, pageUrl] of Object.entries(SSIAM_PAGES)) {
    let html;
    try {
      html = await fetchHtml(pageUrl);
    } catch {
      continue;
    }
    const $ = cheerio.load(html);
    const currentDate = parseMonthDate($(".assetDistribution__content__note").first().text().trim());
    if (currentDate) {
      $(".assetDistribution_table table tbody tr").each((_, element) => {
        const cells = $(element)
          .find("td")
          .map((__, cell) => $(cell).text().trim())
          .get();
        if (cells.length >= 4) {
          const stockCode = cells[0].toUpperCase();
          const weight = parseWeight(cells[3]);
          if (stockCode && weight !== null) {
            rows.push({ fund_code: fundCode, stock_code: stockCode, weight, date: currentDate });
          }
        }
      });
    }

    const docLinks = $(".formDocument__document_item")
      .map((_, element) => {
        const title = $(element).find(".formDocument__document_title").text().trim();
        const href = $(element).find('a[title="Download"]').attr("href");
        return { title, href };
      })
      .get()
      .filter((item) => item.href && /monthly report/i.test(item.title))
      .slice(0, 4);

    for (const doc of docLinks) {
      const reportDate = parseMonthDate(doc.title);
      if (!doc.href || !reportDate) continue;
      if (rows.some((row) => row.fund_code === fundCode && row.date === reportDate)) continue;
      const pdfUrl = new URL(doc.href, pageUrl).toString();
      let text = "";
      try {
        text = await extractPdfText(pdfUrl);
      } catch {
        continue;
      }
      const holdings = await llmExtract(fundCode, reportDate, text);
      for (const item of holdings) {
        const stockCode = String(item.stock_code || "").trim().toUpperCase();
        const weight = Number(item.weight);
        if (stockCode && Number.isFinite(weight)) {
          rows.push({ fund_code: fundCode, stock_code: stockCode, weight, date: reportDate });
        }
      }
    }
  }
  return rows;
}

function parseDragonArticleDate(url, html) {
  const fromUrl = url.match(/thang-(\d{1,2})[.-](20\d{2})/i);
  if (fromUrl) return `${fromUrl[2]}-${String(Number(fromUrl[1])).padStart(2, "0")}-01`;
  const fromText = html.match(/tháng\s+(\d{1,2})[./-](20\d{2})/i);
  if (fromText) return `${fromText[2]}-${String(Number(fromText[1])).padStart(2, "0")}-01`;
  return null;
}

function parseDragonTable(fundCode, html, reportDate) {
  const $ = cheerio.load(html);
  const rows = [];
  $("table").each((_, table) => {
    const header = $(table).find("th").map((__, th) => $(th).text().trim()).get().join(" | ");
    if (!/Mã Cổ Phiếu|Ticker/i.test(header) || !/% NAV|Tỷ trọng/i.test(header)) return;
    $(table)
      .find("tbody tr")
      .each((__, tr) => {
        const cells = $(tr).find("td").map((___, td) => $(td).text().trim()).get();
        if (cells.length >= 3) {
          const stockCode = cells[0].replace(/\s+/g, "").toUpperCase();
          const weight = parseWeight(cells[cells.length - 1]);
          if (stockCode && weight !== null) {
            rows.push({ fund_code: fundCode, stock_code: stockCode, weight, date: reportDate });
          }
        }
      });
  });
  return rows;
}

async function collectDragon() {
  let sitemap = "";
  try {
    sitemap = await fetchHtml("https://dautu.dragoncapital.com.vn/sitemap.xml");
  } catch {
    return [];
  }
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  const rows = [];
  for (const fundCode of DRAGON_CODES) {
    const candidates = urls
      .filter((url) => /tin-tuc\//.test(url) && new RegExp(fundCode, "i").test(url))
      .filter((url) => /(cap-nhat-danh-muc|bao-cao-hoat-dong)/i.test(url))
      .slice(0, 6);
    const seenPeriods = new Set();
    for (const url of candidates) {
      let html = "";
      try {
        html = await fetchHtml(url);
      } catch {
        continue;
      }
      const reportDate = parseDragonArticleDate(url, html);
      if (!reportDate || seenPeriods.has(reportDate)) continue;
      let parsedRows = parseDragonTable(fundCode, html, reportDate);
      if (parsedRows.length === 0) {
        const pdfUrl = html.match(/https:\/\/[^"' ]+\.pdf/gi)?.[0];
        if (pdfUrl) {
          let text = "";
          try {
            text = await extractPdfText(pdfUrl);
          } catch {
            continue;
          }
          const holdings = await llmExtract(fundCode, reportDate, text);
          parsedRows = holdings
            .map((item) => ({
              fund_code: fundCode,
              stock_code: String(item.stock_code || "").trim().toUpperCase(),
              weight: Number(item.weight),
              date: reportDate,
            }))
            .filter((item) => item.stock_code && Number.isFinite(item.weight));
        }
      }
      if (parsedRows.length > 0) {
        parsedRows.forEach((row) => rows.push(row));
        seenPeriods.add(reportDate);
      }
      if (seenPeriods.size >= 4) break;
    }
  }
  return rows;
}

async function collectVina() {
  const rows = [];
  for (const fundCode of VINA_CODES) {
    for (const reportMonth of getRecentReportMonths()) {
      const reportDate = `${reportMonth.getUTCFullYear()}-${padMonth(reportMonth.getUTCMonth() + 1)}-01`;
      const pdfUrl = await resolveReachableUrl(buildVinaFactsheetCandidates(fundCode, reportMonth));
      if (!pdfUrl) {
        continue;
      }

      let text = "";
      try {
        text = await extractPdfText(pdfUrl);
      } catch {
        continue;
      }

      const holdings = await llmExtract(fundCode, reportDate, text);
      for (const item of holdings) {
        const stockCode = String(item.stock_code || "").trim().toUpperCase();
        const weight = Number(item.weight);
        if (stockCode && Number.isFinite(weight)) {
          rows.push({ fund_code: fundCode, stock_code: stockCode, weight, date: reportDate });
        }
      }
    }
  }
  return rows;
}

async function main() {
  const data = fs.existsSync(localDataPath)
    ? JSON.parse(fs.readFileSync(localDataPath, "utf8"))
    : { funds: [], nav: [], holdings: [], updatedAt: new Date(0).toISOString() };

  const [ssiamRows, dragonRows, vinaRows] = await Promise.all([collectSSIAM(), collectDragon(), collectVina()]);
  const mergedHoldings = mergeRows(data.holdings || [], [...ssiamRows, ...dragonRows, ...vinaRows]);
  const output = {
    ...data,
    holdings: mergedHoldings,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(localDataPath, JSON.stringify(output, null, 2), "utf8");
  const summary = {};
  for (const row of mergedHoldings) {
    summary[row.fund_code] ||= new Set();
    summary[row.fund_code].add(row.date);
  }
  console.log(
    JSON.stringify(
      {
        holdingsCount: mergedHoldings.length,
        byFund: Object.fromEntries(
          Object.entries(summary).map(([fund, dates]) => [fund, [...dates].sort().reverse()]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
