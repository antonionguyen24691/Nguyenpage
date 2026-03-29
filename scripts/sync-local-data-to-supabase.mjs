import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();

async function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
  }
}

async function readJson(relativePath, fallback) {
  const filePath = path.join(rootDir, relativePath);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function upsertInChunks(client, table, rows, onConflict, chunkSize = 500) {
  if (!rows.length) {
    return 0;
  }

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await client.from(table).upsert(chunk, {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw error;
    }
  }

  return rows.length;
}

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const siteConfig = await readJson("data/site-config.json", {});
  const fundDataset = await readJson("data/fund-intelligence.json", {
    funds: [],
    nav: [],
    holdings: [],
  });

  const configRows = Object.entries(siteConfig).map(([config_key, config_value]) => ({
    config_key,
    config_value,
    updated_at: new Date().toISOString(),
  }));

  const fundRows = (fundDataset.funds ?? []).map((fund) => ({
    code: fund.code,
    name: fund.name,
    company: fund.company,
  }));

  const navRows = (fundDataset.nav ?? []).map((row) => ({
    fund_code: row.fund_code,
    nav: row.nav,
    date: row.date,
    source: row.source ?? null,
  }));

  const holdingsRows = (fundDataset.holdings ?? []).map((row) => ({
    fund_code: row.fund_code,
    stock_code: row.stock_code,
    weight: row.weight,
    date: row.date,
  }));

  const configCount = await upsertInChunks(
    supabase,
    "site_config",
    configRows,
    "config_key",
    50,
  );
  const fundsCount = await upsertInChunks(supabase, "funds", fundRows, "code");
  const navCount = await upsertInChunks(supabase, "fund_nav", navRows, "fund_code,date");
  const holdingsCount = await upsertInChunks(
    supabase,
    "fund_holdings",
    holdingsRows,
    "fund_code,stock_code,date",
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        config: configCount,
        funds: fundsCount,
        nav: navCount,
        holdings: holdingsCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
