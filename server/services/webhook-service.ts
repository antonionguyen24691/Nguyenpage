import { listWebhooks as listFromStore } from "./stock-store";

export async function listWebhooks(_userId: string) {
  return listFromStore();
}
