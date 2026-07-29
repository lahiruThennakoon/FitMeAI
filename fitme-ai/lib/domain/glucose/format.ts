import type { GlucoseContext } from "@prisma/client";
import {
  displayFromMgDl,
  glucoseUnitLabel,
  type GlucoseDisplayUnit,
} from "@/lib/domain/glucose/units";

export function formatGlucoseContext(context: GlucoseContext): string {
  switch (context) {
    case "fasting":
      return "Fasting";
    case "before_meal":
      return "Before meal";
    case "after_meal":
      return "After meal";
    case "bedtime":
      return "Bedtime";
    default:
      return "Other";
  }
}

export function formatGlucoseValue(
  valueMgDl: number,
  unit: GlucoseDisplayUnit = "mg_dl",
): string {
  const v = displayFromMgDl(valueMgDl, unit);
  const rounded =
    unit === "mmol_l"
      ? v.toFixed(1)
      : String(Math.round(v));
  return `${rounded} ${glucoseUnitLabel(unit)}`;
}
