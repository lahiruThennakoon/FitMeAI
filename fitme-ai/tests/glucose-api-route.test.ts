import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createGlucoseEntryAction,
  updateGlucoseEntryAction,
  deleteGlucoseEntryAction,
  restoreGlucoseEntryAction,
} = vi.hoisted(() => ({
  createGlucoseEntryAction: vi.fn(),
  updateGlucoseEntryAction: vi.fn(),
  deleteGlucoseEntryAction: vi.fn(),
  restoreGlucoseEntryAction: vi.fn(),
}));

vi.mock("@/app/actions/glucose", () => ({
  createGlucoseEntryAction,
  updateGlucoseEntryAction,
  deleteGlucoseEntryAction,
  restoreGlucoseEntryAction,
}));

import { DELETE, PATCH, POST, PUT } from "@/app/api/glucose/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/glucose", () => {
  it("returns the create action result", async () => {
    createGlucoseEntryAction.mockResolvedValue({
      ok: true,
      data: {
        entry: {
          id: "g1",
          valueMgDl: 298,
          measuredAt: "2026-08-08T07:43:00.000Z",
          context: "other",
          note: null,
        },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/glucose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: 298,
          unit: "mg_dl",
          context: "other",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(createGlucoseEntryAction).toHaveBeenCalledWith(
      expect.objectContaining({ value: 298, unit: "mg_dl" }),
    );
  });

  it("maps sign-in failures to 401", async () => {
    createGlucoseEntryAction.mockResolvedValue({
      ok: false,
      error: "Please sign in to log glucose.",
    });

    const response = await POST(
      new Request("http://localhost/api/glucose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: 100, unit: "mg_dl", context: "other" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe("PATCH/DELETE/PUT /api/glucose", () => {
  it("routes update/delete/restore", async () => {
    updateGlucoseEntryAction.mockResolvedValue({ ok: true, data: { entry: {} } });
    deleteGlucoseEntryAction.mockResolvedValue({ ok: true, data: { ok: true } });
    restoreGlucoseEntryAction.mockResolvedValue({ ok: true, data: { ok: true } });

    await PATCH(
      new Request("http://localhost/api/glucose", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "g1", value: 100, unit: "mg_dl", context: "other", measuredAt: new Date().toISOString() }),
      }),
    );
    await DELETE(
      new Request("http://localhost/api/glucose", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "g1" }),
      }),
    );
    await PUT(
      new Request("http://localhost/api/glucose", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "g1" }),
      }),
    );

    expect(updateGlucoseEntryAction).toHaveBeenCalled();
    expect(deleteGlucoseEntryAction).toHaveBeenCalled();
    expect(restoreGlucoseEntryAction).toHaveBeenCalled();
  });
});
