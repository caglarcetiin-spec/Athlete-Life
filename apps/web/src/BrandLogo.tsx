import { Activity, Dumbbell } from "lucide-react";
import { brand } from "./brand";
export function BrandLogo() {
  const Icon =
    ({ activity: Activity, dumbbell: Dumbbell } as const)[
      brand.logo as "activity" | "dumbbell"
    ] || Activity;
  return <Icon aria-hidden="true" />;
}
