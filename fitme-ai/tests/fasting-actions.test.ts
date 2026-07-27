import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  endFastingSessionAction,
  startFastingSessionAction,
} from "@/app/actions/fasting";
import { ActiveFastExistsError } from "@/lib/dal/fasting-session";

const start = vi.fn();
const end = vi.fn();

const session = async () =>
  ({ id: "u1", email: "a@b.com", name: null }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  start.mockResolvedValue({
    id: "f1",
    startedAt: new Date().toISOString(),
    endedAt: null,
    plannedDurationMin: 960,
    protocolLabel: "16:8",
    notes: null,
    durationMs: 0,
    isActive: true,
  });
  end.mockResolvedValue({
    id: "f1",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    plannedDurationMin: 960,
    protocolLabel: "16:8",
    notes: null,
    durationMs: 3_600_000,
    isActive: false,
  });
});

describe("startFastingSessionAction (Story 7.1)", () => {
  it("starts a fast", async () => {
    const result = await startFastingSessionAction(
      { protocolLabel: "16:8", plannedDurationMin: 960 },
      { requireSession: session, startFastingSession: start },
    );

    expect(result.ok).toBe(true);
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        protocolLabel: "16:8",
        plannedDurationMin: 960,
      }),
    );
  });

  it("maps ActiveFastExistsError to a calm message", async () => {
    start.mockRejectedValue(new ActiveFastExistsError());

    const result = await startFastingSessionAction(
      {},
      { requireSession: session, startFastingSession: start },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already have a fast/i);
    }
  });

  it("requires sign-in", async () => {
    const result = await startFastingSessionAction(
      {},
      {
        requireSession: async () => {
          throw new Error("no");
        },
        startFastingSession: start,
      },
    );
    expect(result.ok).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });
});

describe("endFastingSessionAction (Story 7.1)", () => {
  it("ends the active fast", async () => {
    const result = await endFastingSessionAction(
      { sessionId: "f1" },
      { requireSession: session, endFastingSession: end },
    );

    expect(result.ok).toBe(true);
    expect(end).toHaveBeenCalled();
  });
});
