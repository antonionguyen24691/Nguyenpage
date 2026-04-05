import { listAlerts as listFromStore } from "./stock-store";

export async function listAlerts(_userId: string) {
  return listFromStore();
}
