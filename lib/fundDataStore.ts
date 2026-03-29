import path from "node:path";
import { promises as fs } from "node:fs";
import { db } from "@/packages/db";
import { fundCatalog } from "@/lib/fundCatalog";
import type { FundHoldingRecord, FundNavRecord } from "@/lib/fundAnalytics";

type StoredFund = {
  code: string;
  name: string;
  company: string;
  category?: string;
};

type FundDataset = {
  funds: StoredFund[];
  nav: FundNavRecord[];
  holdings: FundHoldingRecord[];
  updatedAt: string;
};

const localFundDataPath = path.join(process.cwd(), "data", "fund-intelligence.json");

const emptyDataset: FundDataset = {
  funds: fundCatalog.map((entry) => ({
    code: entry.code,
    name: entry.name,
    company: entry.company,
    category: entry.category,
  })),
  nav: [],
  holdings: [],
  updatedAt: new Date(0).toISOString(),
};

async function readLocalFundDataset(): Promise<FundDataset> {
  try {
    const raw = await fs.readFile(localFundDataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FundDataset>;
    return mergeDatasets(emptyDataset, {
      funds: parsed.funds ?? [],
      nav: parsed.nav ?? [],
      holdings: parsed.holdings ?? [],
      updatedAt: parsed.updatedAt ?? emptyDataset.updatedAt,
    });
  } catch {
    return emptyDataset;
  }
}

async function writeLocalFundDataset(dataset: FundDataset) {
  await fs.mkdir(path.dirname(localFundDataPath), { recursive: true });
  await fs.writeFile(localFundDataPath, JSON.stringify(dataset, null, 2), "utf8");
}

function mergeDatasets(...datasets: FundDataset[]): FundDataset {
  const funds = new Map<string, StoredFund>();
  const nav = new Map<string, FundNavRecord>();
  const holdings = new Map<string, FundHoldingRecord>();
  let updatedAt = emptyDataset.updatedAt;

  for (const dataset of datasets) {
    updatedAt = new Date(dataset.updatedAt) > new Date(updatedAt) ? dataset.updatedAt : updatedAt;

    for (const fund of dataset.funds) {
      funds.set(fund.code.toUpperCase(), {
        ...funds.get(fund.code.toUpperCase()),
        ...fund,
        code: fund.code.toUpperCase(),
      });
    }

    for (const row of dataset.nav) {
      nav.set(`${row.fund_code.toUpperCase()}::${row.date}`, {
        ...row,
        fund_code: row.fund_code.toUpperCase(),
      });
    }

    for (const row of dataset.holdings) {
      holdings.set(`${row.fund_code.toUpperCase()}::${row.date}::${row.stock_code}`, {
        ...row,
        fund_code: row.fund_code.toUpperCase(),
      });
    }
  }

  for (const entry of fundCatalog) {
    funds.set(entry.code, {
      ...funds.get(entry.code),
      code: entry.code,
      name: entry.name,
      company: entry.company,
      category: entry.category,
    });
  }

  return {
    funds: [...funds.values()].sort((left, right) => left.code.localeCompare(right.code)),
    nav: [...nav.values()].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
    ),
    holdings: [...holdings.values()].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    ),
    updatedAt,
  };
}

async function readDatabaseDataset(): Promise<FundDataset> {
  try {
    const [{ data: fundsData, error: fundsError }, { data: navData, error: navError }, { data: holdingsData, error: holdingsError }] =
      await Promise.all([
        db.from("funds").select("code, name, company").order("code"),
        db.from("fund_nav").select("fund_code, nav, date, source").order("date"),
        db.from("fund_holdings").select("fund_code, stock_code, weight, date").order("date", { ascending: false }),
      ]);

    if (fundsError || navError || holdingsError) {
      throw fundsError ?? navError ?? holdingsError;
    }

    return {
      funds:
        fundsData?.map((item) => ({
          code: item.code,
          name: item.name,
          company: item.company,
        })) ?? [],
      nav:
        navData?.map((item) => ({
          fund_code: item.fund_code,
          nav: Number(item.nav),
          date: item.date,
          source: item.source,
        })) ?? [],
      holdings:
        holdingsData?.map((item) => ({
          fund_code: item.fund_code,
          stock_code: item.stock_code,
          weight: Number(item.weight),
          date: item.date,
        })) ?? [],
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return emptyDataset;
  }
}

export async function getFundDataset() {
  const [localData, databaseData] = await Promise.all([
    readLocalFundDataset(),
    readDatabaseDataset(),
  ]);

  return mergeDatasets(databaseData, localData);
}

export async function persistFundData(input: {
  funds?: StoredFund[];
  nav?: FundNavRecord[];
  holdings?: FundHoldingRecord[];
}) {
  const localData = await readLocalFundDataset();
  const merged = mergeDatasets(localData, {
    funds: input.funds ?? [],
    nav: input.nav ?? [],
    holdings: input.holdings ?? [],
    updatedAt: new Date().toISOString(),
  });

  await writeLocalFundDataset(merged);

  let databaseError: string | null = null;

  try {
    if (input.funds?.length) {
      const { error } = await db.from("funds").upsert(
        input.funds.map((fund) => ({
          code: fund.code,
          name: fund.name,
          company: fund.company,
        })),
        { onConflict: "code" },
      );
      if (error) {
        throw error;
      }
    }

    if (input.nav?.length) {
      for (let index = 0; index < input.nav.length; index += 500) {
        const chunk = input.nav.slice(index, index + 500);
        const { error } = await db.from("fund_nav").upsert(chunk, {
          onConflict: "fund_code,date",
          ignoreDuplicates: false,
        });
        if (error) {
          throw error;
        }
      }
    }

    if (input.holdings?.length) {
      for (let index = 0; index < input.holdings.length; index += 500) {
        const chunk = input.holdings.slice(index, index + 500);
        const { error } = await db.from("fund_holdings").upsert(chunk, {
          onConflict: "fund_code,stock_code,date",
          ignoreDuplicates: false,
        });
        if (error) {
          throw error;
        }
      }
    }
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Unknown database error";
  }

  return {
    persistedToDatabase: databaseError === null,
    persistedToLocalFile: true,
    databaseError,
    localPath: localFundDataPath,
    counts: {
      funds: input.funds?.length ?? 0,
      nav: input.nav?.length ?? 0,
      holdings: input.holdings?.length ?? 0,
    },
  };
}

export { localFundDataPath };
