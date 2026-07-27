import { z } from "zod";

export const startFastingSessionSchema = z.object({
  plannedDurationMin: z
    .number()
    .finite()
    .int()
    .positive()
    .max(7 * 24 * 60, "Keep planned duration under 7 days")
    .optional()
    .nullable(),
  protocolLabel: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  startedAt: z.string().datetime().optional(),
});

export const endFastingSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
  endedAt: z.string().datetime().optional(),
});

export type StartFastingSessionInput = z.infer<
  typeof startFastingSessionSchema
>;
export type EndFastingSessionInput = z.infer<typeof endFastingSessionSchema>;
