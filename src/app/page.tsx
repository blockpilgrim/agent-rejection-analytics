import { getAllBuyerProfiles } from "@/db/queries";
import { MainDashboard } from "@/components/dashboard/MainDashboard";

export default function Home() {
  const profiles = getAllBuyerProfiles();

  return <MainDashboard profiles={profiles} />;
}
