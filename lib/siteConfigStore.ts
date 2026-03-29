import path from "node:path";
import { promises as fs } from "node:fs";
import { db } from "@/packages/db";

const localConfigPath = path.join(process.cwd(), "data", "site-config.json");

type ConfigRecord = Record<string, unknown>;

async function readLocalConfig(): Promise<ConfigRecord> {
  try {
    const raw = await fs.readFile(localConfigPath, "utf8");
    return JSON.parse(raw) as ConfigRecord;
  } catch {
    return {};
  }
}

async function writeLocalConfig(config: ConfigRecord) {
  await fs.mkdir(path.dirname(localConfigPath), { recursive: true });
  await fs.writeFile(localConfigPath, JSON.stringify(config, null, 2), "utf8");
}

function canWriteLocalConfig() {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1";
}

export async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await db
      .from("site_config")
      .select("config_value")
      .eq("config_key", key)
      .single();

    if (!error && data?.config_value !== undefined && data?.config_value !== null) {
      return data.config_value as T;
    }
  } catch {
    // fall through to local config
  }

  const localConfig = await readLocalConfig();
  if (localConfig[key] !== undefined && localConfig[key] !== null) {
    return localConfig[key] as T;
  }

  return fallback;
}

export async function getAllConfigValues(): Promise<ConfigRecord> {
  const localConfig = await readLocalConfig();

  try {
    const { data, error } = await db
      .from("site_config")
      .select("config_key, config_value");

    if (!error && Array.isArray(data)) {
      const dbConfig: ConfigRecord = {};
      for (const row of data) {
        dbConfig[row.config_key] = row.config_value;
      }
      return { ...localConfig, ...dbConfig };
    }
  } catch {
    // fall back to local config
  }

  return localConfig;
}

export async function saveConfigValue(key: string, value: unknown) {
  let databaseError: string | null = null;
  let persistedToLocalFile = false;
  let localFileError: string | null = null;

  try {
    const { error } = await db
      .from("site_config")
      .upsert(
        { config_key: key, config_value: value, updated_at: new Date().toISOString() },
        { onConflict: "config_key" },
      );

    if (error) {
      databaseError = error.message;
    }
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Unknown database error";
  }

  if (canWriteLocalConfig()) {
    try {
      const localConfig = await readLocalConfig();
      localConfig[key] = value;
      await writeLocalConfig(localConfig);
      persistedToLocalFile = true;
    } catch (error) {
      localFileError = error instanceof Error ? error.message : "Unknown local file error";
    }
  } else {
    localFileError = "Local file persistence is unavailable on Vercel production";
  }

  if (databaseError !== null && !persistedToLocalFile) {
    throw new Error(databaseError);
  }

  return {
    persistedToDatabase: databaseError === null,
    persistedToLocalFile,
    databaseError,
    localFileError,
    localPath: localConfigPath,
  };
}

export { localConfigPath };
