import Link from "next/link";
import { btnClass } from "@/lib/ui/buttons";

type Variant = "primary" | "secondary" | "outline-brand" | "solid-blue" | "danger";

type SharedProps = {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  flex1?: boolean;
  className?: string;
};

type ButtonProps = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  };

type LinkProps = SharedProps &
  React.ComponentProps<typeof Link> & {
    children: React.ReactNode;
  };

export function AppButton({
  variant = "primary",
  size = "md",
  block,
  flex1,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={btnClass(variant, { size, block, flex1, className })}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppLinkButton({
  variant = "outline-brand",
  size = "md",
  block,
  flex1,
  className,
  children,
  href,
  ...props
}: LinkProps) {
  return (
    <Link
      href={href}
      className={btnClass(variant, { size, block, flex1, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
