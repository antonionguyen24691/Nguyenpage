import { listWatchlists as listFromStore } from "./stock-store";

export async function listWatchlists(_userId: string) {
  return listFromStore();
}
