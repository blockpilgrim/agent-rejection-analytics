import { getAllBuyerProfiles } from "@/db/queries";
import { MainDashboard } from "@/components/dashboard/MainDashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  const profiles = getAllBuyerProfiles();

  return <MainDashboard profiles={profiles} />;
}
