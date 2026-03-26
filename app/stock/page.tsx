import { getDashboardSnapshot } from "@/server/services/dashboard-service";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return <DashboardClient {...snapshot} />;
}
