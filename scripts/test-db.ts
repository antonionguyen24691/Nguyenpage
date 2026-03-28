import { db } from "../packages/db";

async function test() {
  const { data, error } = await db
    .from("site_config")
    .upsert(
      { config_key: "test_key", config_value: { test: true }, updated_at: new Date().toISOString() },
      { onConflict: "config_key" }
    );
  
  if (error) {
    console.error("UPSERT ERROR:", error.message);
  } else {
    console.log("UPSERT SUCCESS:", data);
  }
}
test();
