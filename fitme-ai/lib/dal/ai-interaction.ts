import "server-only";
import type { AiInteractionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AiRequestMeta } from "@/lib/ai/audit";

export type RecordAiInteractionInput = {
  userId: string;
  providerId: string;
  model?: string | null;
  purpose: string;
  status: AiInteractionStatus;
  errorCode?: string | null;
  confidence?: number | null;
  requestMeta: AiRequestMeta;
  responseSummary?: Prisma.InputJsonValue | null;
};

export type AiInteractionDto = {
  id: string;
  status: AiInteractionStatus;
  providerId: string;
  purpose: string;
};

/**
 * Persist an AI Interaction audit row (FR-19 / AD-8).
 * Call on success and failure — never store free-text prompts.
 */
export async function recordAiInteraction(
  input: RecordAiInteractionInput,
): Promise<AiInteractionDto> {
  const row = await prisma.aIInteraction.create({
    data: {
      userId: input.userId,
      providerId: input.providerId,
      model: input.model ?? null,
      purpose: input.purpose,
      status: input.status,
      errorCode: input.errorCode ?? null,
      confidence: input.confidence ?? null,
      requestMeta: input.requestMeta as Prisma.InputJsonValue,
      responseSummary: input.responseSummary ?? undefined,
    },
    select: {
      id: true,
      status: true,
      providerId: true,
      purpose: true,
    },
  });
  return row;
}
