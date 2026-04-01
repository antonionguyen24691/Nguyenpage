import FundAdvisorWorkspace from "@/components/FundAdvisorWorkspace";
import { buildAdvisorUniverse } from "@/lib/fundAdvisor";
import { getFundDataset } from "@/lib/fundDataStore";

export const dynamic = "force-dynamic";

export default async function AdvisorPage() {
  const dataset = await getFundDataset();
  const funds = buildAdvisorUniverse(dataset);

  return <FundAdvisorWorkspace funds={funds} />;
}
