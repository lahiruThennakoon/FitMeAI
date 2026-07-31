// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogToastProvider, useLogToast } from "@/components/log-toast-provider";

function SuccessProbe() {
  const { showLogToast } = useLogToast();
  return (
    <button type="button" onClick={() => showLogToast("Logged 250 ml.")}>
      success
    </button>
  );
}

const undoSpy = vi.fn();

function UndoProbe() {
  const { showLogToast } = useLogToast();
  return (
    <button
      type="button"
      onClick={() =>
        showLogToast({ message: "Meal removed.", undo: undoSpy })
      }
    >
      remove
    </button>
  );
}

describe("LogToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a success toast", () => {
    render(
      <LogToastProvider>
        <SuccessProbe />
      </LogToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "success" }));

    expect(screen.getByRole("status").textContent).toBe("Logged 250 ml.");
  });

  it("auto-dismisses after the default duration", () => {
    vi.useFakeTimers();

    render(
      <LogToastProvider>
        <SuccessProbe />
      </LogToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "success" }));
    expect(screen.getByRole("status")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("calls undo when the undo action is pressed", () => {
    undoSpy.mockClear();

    render(
      <LogToastProvider>
        <UndoProbe />
      </LogToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(undoSpy).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
