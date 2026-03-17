import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/format";

// Profile icons as simple inline SVGs to avoid extra dependencies
const PROFILE_ICONS: Record<string, React.ReactNode> = {
  "Price-Sensitive": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  "Speed-Obsessed": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  ),
  "Brand-Loyal": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
  ),
  "Sustainability-First": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L2.28 22l1.32-6L7 14l2 2 4-4 2 2 6-6-4-4z" /><path d="M2 2l20 20" /></svg>
  ),
  "Spec-Comparator": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  ),
  "Return-Conscious": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
  ),
};

type BuyerProfile = {
  id: string;
  name: string;
  primaryConstraint: string;
  exampleMandate: string | null;
  defaultWeight: number;
  parameters: Record<string, unknown> | null;
};

export function BuyerProfileCards({
  profiles,
}: {
  profiles: BuyerProfile[];
}) {
  const totalWeight = profiles.reduce((s, p) => s + p.defaultWeight, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Buyer Profiles</h2>
        <Badge variant="secondary">{profiles.length} archetypes</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Each profile represents a distinct AI shopping agent archetype with
        unique priorities and constraints. Weights determine how many
        simulated visits each profile receives.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const pct = profile.defaultWeight / totalWeight;
          return (
            <Card key={profile.id} size="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {PROFILE_ICONS[profile.name] ?? null}
                  </span>
                  <CardTitle className="text-sm">{profile.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Primary Constraint
                  </span>
                  <p className="text-sm">{profile.primaryConstraint}</p>
                </div>
                {profile.exampleMandate && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Example Mandate
                    </span>
                    <p className="text-sm italic text-muted-foreground">
                      &ldquo;{profile.exampleMandate}&rdquo;
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Visit Weight
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {formatPercent(pct)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
