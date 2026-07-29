import { z } from "zod";
import { FUTURE_TIME_MESSAGE, isNotFutureIso } from "@/lib/domain/log-time";

const pastInstant = z
  .string()
  .datetime()
  .refine(isNotFutureIso, { message: FUTURE_TIME_MESSAGE });

const plannedDurationMin = z
  .number()
  .finite()
  .int()
  .positive()
  .max(7 * 24 * 60, "Keep planned duration under 7 days")
  .optional()
  .nullable();

const protocolLabel = z.string().trim().max(40).optional().nullable();
const notes = z.string().trim().max(500).optional().nullable();

export const startFastingSessionSchema = z.object({
  plannedDurationMin,
  protocolLabel,
  notes,
  startedAt: pastInstant.optional(),
});

export const endFastingSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
  endedAt: pastInstant.optional(),
});

export const deleteFastingSessionSchema = z.object({
  sessionId: z.string().min(1),
});

export const discardFastingSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
});

/** A fast that already finished — both ends are known and in the past. */
export const logPastFastingSessionSchema = z
  .object({
    startedAt: pastInstant,
    endedAt: pastInstant,
    plannedDurationMin,
    protocolLabel,
    notes,
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endedAt).getTime() <= new Date(data.startedAt).getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End must be after the start.",
        path: ["endedAt"],
      });
    }
  });

/** Correcting a session. `endedAt: null` means it's still running. */
export const updateFastingSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    startedAt: pastInstant,
    endedAt: pastInstant.nullable(),
    plannedDurationMin,
    protocolLabel,
    notes,
  })
  .superRefine((data, ctx) => {
    if (
      data.endedAt &&
      new Date(data.endedAt).getTime() <= new Date(data.startedAt).getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End must be after the start.",
        path: ["endedAt"],
      });
    }
  });

export type StartFastingSessionInput = z.infer<
  typeof startFastingSessionSchema
>;
export type EndFastingSessionInput = z.infer<typeof endFastingSessionSchema>;
export type LogPastFastingSessionInput = z.infer<
  typeof logPastFastingSessionSchema
>;
export type UpdateFastingSessionInput = z.infer<
  typeof updateFastingSessionSchema
>;
