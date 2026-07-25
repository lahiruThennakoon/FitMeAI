import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DELETE_ACCOUNT_GENERIC_ERROR,
  type DeleteAccountDeps,
} from "@/lib/auth/actions-shared";
import { deleteAccountAction } from "@/app/actions/auth";

afterEach(() => {
  vi.restoreAllMocks();
});

const deleteDeps = (
  deleteUser: ReturnType<typeof vi.fn>,
): DeleteAccountDeps => ({
  deleteUser: deleteUser as NonNullable<DeleteAccountDeps["deleteUser"]>,
  getHeaders: async () => new Headers(),
});

describe("deleteAccountAction (Story 1.5 / FR-3)", () => {
  it("returns fieldErrors without calling API when consent invalid", async () => {
    const deleteUser = vi.fn();
    const result = await deleteAccountAction(
      { password: "securepass", confirmText: "NOPE" },
      deleteDeps(deleteUser),
    );
    expect(result.ok).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("redirects home on successful deletion", async () => {
    const deleteUser = vi.fn().mockResolvedValue({
      success: true,
      message: "User deleted",
    });
    const result = await deleteAccountAction(
      { password: "securepass", confirmText: "DELETE" },
      deleteDeps(deleteUser),
    );
    expect(result).toEqual({ ok: true, data: { redirectTo: "/" } });
    expect(deleteUser).toHaveBeenCalledWith({
      body: { password: "securepass", callbackURL: "/" },
      headers: expect.any(Headers),
    });
  });

  it("returns generic error when password is wrong", async () => {
    const deleteUser = vi.fn().mockRejectedValue({ code: "INVALID_PASSWORD" });
    const result = await deleteAccountAction(
      { password: "wrong", confirmText: "DELETE" },
      deleteDeps(deleteUser),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(DELETE_ACCOUNT_GENERIC_ERROR);
    }
  });
});
