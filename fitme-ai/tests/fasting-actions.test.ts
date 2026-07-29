import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteFastingSessionAction,
  discardActiveFastAction,
  endFastingSessionAction,
  logPastFastAction,
  restoreFastingSessionAction,
  startFastingSessionAction,
  updateFastingSessionAction,
} from "@/app/actions/fasting";
import {
  ActiveFastExistsError,
  FastingOverlapError,
  FastingRangeError,
} from "@/lib/dal/fasting-session";

const start = vi.fn();
const end = vi.fn();
const softDelete = vi.fn();
const discard = vi.fn();
const restore = vi.fn();
const logPast = vi.fn();
const update = vi.fn();

const HOUR = 3_600_000;
const startedAt = new Date(Date.now() - 20 * HOUR).toISOString();
const endedAt = new Date(Date.now() - 4 * HOUR).toISOString();

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
  const completed = {
    id: "f2",
    startedAt,
    endedAt,
    plannedDurationMin: 960,
    protocolLabel: "16:8",
    notes: null,
    durationMs: 16 * HOUR,
    isActive: false,
  };
  logPast.mockResolvedValue(completed);
  update.mockResolvedValue(completed);
  discard.mockResolvedValue(undefined);
  restore.mockResolvedValue(undefined);
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

describe("deleteFastingSessionAction (Story 7.3)", () => {
  it("removes a completed fast from history", async () => {
    softDelete.mockResolvedValue(undefined);

    const result = await deleteFastingSessionAction(
      { sessionId: "f1" },
      { requireSession: session, softDeleteFastingSession: softDelete },
    );

    expect(result.ok).toBe(true);
    expect(softDelete).toHaveBeenCalledWith("u1", "f1");
  });
});

describe("discardActiveFastAction", () => {
  it("abandons the in-progress fast without recording it", async () => {
    const result = await discardActiveFastAction(
      {},
      { requireSession: session, discardActiveFastingSession: discard },
    );

    expect(result.ok).toBe(true);
    expect(discard).toHaveBeenCalledWith("u1", undefined);
  });
});

describe("restoreFastingSessionAction", () => {
  it("puts a removed fast back", async () => {
    const result = await restoreFastingSessionAction(
      { sessionId: "f2" },
      { requireSession: session, restoreFastingSession: restore },
    );

    expect(result.ok).toBe(true);
    expect(restore).toHaveBeenCalledWith("u1", "f2");
  });

  it("explains when restoring would overlap another fast", async () => {
    restore.mockRejectedValue(new FastingOverlapError());

    const result = await restoreFastingSessionAction(
      { sessionId: "f2" },
      { requireSession: session, restoreFastingSession: restore },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/overlaps/i);
  });
});

describe("logPastFastAction", () => {
  it("records a fast that already finished", async () => {
    const result = await logPastFastAction(
      { startedAt, endedAt, protocolLabel: "16:8" },
      { requireSession: session, logPastFastingSession: logPast },
    );

    expect(result.ok).toBe(true);
    expect(logPast).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" }),
    );
  });

  it("rejects an end before the start", async () => {
    const result = await logPastFastAction(
      { startedAt: endedAt, endedAt: startedAt },
      { requireSession: session, logPastFastingSession: logPast },
    );

    expect(result.ok).toBe(false);
    expect(logPast).not.toHaveBeenCalled();
  });

  it("rejects a future window", async () => {
    const soon = new Date(Date.now() + HOUR).toISOString();
    const later = new Date(Date.now() + 2 * HOUR).toISOString();

    const result = await logPastFastAction(
      { startedAt: soon, endedAt: later },
      { requireSession: session, logPastFastingSession: logPast },
    );

    expect(result.ok).toBe(false);
    expect(logPast).not.toHaveBeenCalled();
  });

  it("surfaces overlaps from the DAL", async () => {
    logPast.mockRejectedValue(new FastingOverlapError());

    const result = await logPastFastAction(
      { startedAt, endedAt },
      { requireSession: session, logPastFastingSession: logPast },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/overlaps/i);
  });
});

describe("updateFastingSessionAction", () => {
  it("corrects times and notes on a completed fast", async () => {
    const result = await updateFastingSessionAction(
      { sessionId: "f2", startedAt, endedAt, notes: "felt fine" },
      { requireSession: session, updateFastingSession: update },
    );

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      "u1",
      "f2",
      expect.objectContaining({ notes: "felt fine" }),
    );
  });

  it("keeps a session active when the end is explicitly null", async () => {
    await updateFastingSessionAction(
      { sessionId: "f1", startedAt, endedAt: null },
      { requireSession: session, updateFastingSession: update },
    );

    expect(update).toHaveBeenCalledWith(
      "u1",
      "f1",
      expect.objectContaining({ endedAt: null }),
    );
  });

  // Omitting the end would silently reopen a finished fast, so the caller has
  // to say which state it means.
  it("requires the end to be stated", async () => {
    const result = await updateFastingSessionAction(
      { sessionId: "f2", startedAt },
      { requireSession: session, updateFastingSession: update },
    );

    expect(result.ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("maps a bad range to plain copy", async () => {
    update.mockRejectedValue(new FastingRangeError());

    const result = await updateFastingSessionAction(
      { sessionId: "f2", startedAt, endedAt },
      { requireSession: session, updateFastingSession: update },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/after the start/i);
  });
});
