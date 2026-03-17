import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BuyerProfileCards } from "@/components/simulation/buyer-profile-cards";
import { SimulationConfig } from "@/components/simulation/simulation-config";
import { getAllBuyerProfiles } from "@/db/queries";

export default function Home() {
  const profiles = getAllBuyerProfiles();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Understand why AI shopping agents reject your store and what to do
          about it.
        </p>
      </div>

      {/* Summary cards — placeholder until simulation data exists */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl">--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Run a simulation to see results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rejections</CardDescription>
            <CardTitle className="text-2xl">--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              No simulation data yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Revenue Lost</CardDescription>
            <CardTitle className="text-2xl">--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              No simulation data yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simulation config */}
      <SimulationConfig />

      {/* Buyer profiles */}
      {profiles.length > 0 ? (
        <BuyerProfileCards profiles={profiles} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No buyer profiles found. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                npm run db:seed
              </code>{" "}
              to set up the demo data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
