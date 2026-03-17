import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Understand why AI shopping agents reject your store and what to do
          about it.
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Simulate AI shopping agent visits to your storefront and discover why
            agents are rejecting your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Simulate 100 Agent Visits</Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your storefront and buyer profiles first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
