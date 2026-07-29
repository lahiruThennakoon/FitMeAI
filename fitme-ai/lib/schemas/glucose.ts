import { z } from "zod";
import {
  GLUCOSE_FUTURE_MESSAGE,
  GLUCOSE_RANGE_MESSAGE,
  isFutureMeasurement,
  isGlucoseInRange,
} from "@/lib/domain/glucose/units";

const glucoseContextValues = [
  "fasting",
  "before_meal",
  "after_meal",
  "bedtime",
  "other",
] as const;

export const glucoseDisplayUnitSchema = z.enum(["mg_dl", "mmol_l"]);

function checkValueInRange(
  data: { value: number; unit: "mg_dl" | "mmol_l" },
  ctx: z.RefinementCtx,
): void {
  if (!isGlucoseInRange(data.value, data.unit)) {
    ctx.addIssue({
      code: "custom",
      path: ["value"],
      message: GLUCOSE_RANGE_MESSAGE,
    });
  }
}

function checkNotFuture(
  measuredAt: string | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!measuredAt) return;
  if (isFutureMeasurement(new Date(measuredAt).getTime())) {
    ctx.addIssue({
      code: "custom",
      path: ["measuredAt"],
      message: GLUCOSE_FUTURE_MESSAGE,
    });
  }
}

export const createGlucoseEntrySchema = z
  .object({
    value: z.number().finite().positive(),
    unit: glucoseDisplayUnitSchema.default("mg_dl"),
    context: z.enum(glucoseContextValues).default("other"),
    measuredAt: z.string().datetime().optional(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    checkValueInRange(data, ctx);
    checkNotFuture(data.measuredAt, ctx);
  });

export const updateGlucoseEntrySchema = z
  .object({
    id: z.string().min(1),
    value: z.number().finite().positive(),
    unit: glucoseDisplayUnitSchema.default("mg_dl"),
    context: z.enum(glucoseContextValues),
    measuredAt: z.string().datetime(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    checkValueInRange(data, ctx);
    checkNotFuture(data.measuredAt, ctx);
  });

export const deleteGlucoseEntrySchema = z.object({
  id: z.string().min(1),
});

export type CreateGlucoseEntryInput = z.infer<typeof createGlucoseEntrySchema>;
export type UpdateGlucoseEntryInput = z.infer<typeof updateGlucoseEntrySchema>;
