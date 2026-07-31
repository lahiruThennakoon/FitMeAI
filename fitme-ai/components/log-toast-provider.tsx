"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_DURATION_MS = 3500;
const UNDO_DURATION_MS = 6000;

export type LogToastVariant = "success" | "error";

export type LogToastInput = {
  message: string;
  variant?: LogToastVariant;
  undo?: () => void;
  undoLabel?: string;
  durationMs?: number;
};

type ToastState = {
  id: number;
  message: string;
  variant: LogToastVariant;
  undo?: () => void;
  undoLabel: string;
};

type LogToastContextValue = {
  showLogToast: (input: LogToastInput | string) => void;
};

const LogToastContext = createContext<LogToastContextValue | null>(null);

export function useLogToast(): LogToastContextValue {
  const ctx = useContext(LogToastContext);
  if (!ctx) {
    throw new Error("useLogToast must be used within LogToastProvider");
  }
  return ctx;
}

export function LogToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showLogToast = useCallback(
    (input: LogToastInput | string) => {
      const opts = typeof input === "string" ? { message: input } : input;
      const variant = opts.variant ?? "success";
      const duration =
        opts.durationMs ?? (opts.undo ? UNDO_DURATION_MS : DEFAULT_DURATION_MS);

      if (timerRef.current) clearTimeout(timerRef.current);

      idRef.current += 1;
      setToast({
        id: idRef.current,
        message: opts.message,
        variant,
        undo: opts.undo,
        undoLabel: opts.undoLabel ?? "Undo",
      });

      timerRef.current = setTimeout(dismiss, duration);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function handleUndo() {
    toast?.undo?.();
    dismiss();
  }

  return (
    <LogToastContext.Provider value={{ showLogToast }}>
      {children}
      {toast ? (
        <div
          className={`log-toast log-toast--${toast.variant}`}
          role={toast.variant === "error" ? "alert" : "status"}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="log-toast-message">{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="log-toast-undo"
              onClick={handleUndo}
            >
              {toast.undoLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </LogToastContext.Provider>
  );
}
