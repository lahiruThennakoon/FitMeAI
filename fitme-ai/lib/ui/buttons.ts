/** Shared FitMe button scale — md for page CTAs, sm for in-card row actions. */

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const disabled = "disabled:cursor-not-allowed disabled:opacity-60";

export const btnBase = `inline-flex items-center justify-center font-medium transition ${focus} ${disabled}`;

/** Page-level actions — auth, save, navigation (48px touch target). */
export const btnMd = `${btnBase} h-12 rounded-xl px-6 text-base`;
export const btnMdBlock = `${btnMd} w-full`;
export const btnMdFlex1 = `${btnMd} flex-1`;

/** In-card row actions — inline edit Save/Cancel (36px). */
export const btnSm = `${btnBase} h-9 rounded-lg px-4 text-sm`;

export const btnPrimary =
  "brand-gradient text-white shadow-sm hover:opacity-90 disabled:opacity-50";
export const btnSecondary =
  "text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 dark:text-neutral-200 dark:ring-neutral-600 dark:hover:bg-neutral-900";
export const btnOutlineBrand =
  "text-brand-blue ring-1 ring-inset ring-brand-blue/30 hover:bg-brand-blue/5 dark:text-blue-300 dark:hover:bg-brand-blue/10";
export const btnSolidBlue =
  "bg-brand-blue text-white shadow-sm hover:bg-brand-blue/90";
export const btnDanger =
  "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600";

export function btnClass(
  variant: "primary" | "secondary" | "outline-brand" | "solid-blue" | "danger",
  opts?: { size?: "md" | "sm"; block?: boolean; flex1?: boolean; className?: string },
): string {
  const size = opts?.size ?? "md";
  const sizeClass =
    size === "sm" ? btnSm : opts?.flex1 ? btnMdFlex1 : opts?.block ? btnMdBlock : btnMd;
  const variantClass = {
    primary: btnPrimary,
    secondary: btnSecondary,
    "outline-brand": btnOutlineBrand,
    "solid-blue": btnSolidBlue,
    danger: btnDanger,
  }[variant];
  return [sizeClass, variantClass, opts?.className].filter(Boolean).join(" ");
}
