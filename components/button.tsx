import type { ButtonHTMLAttributes } from "react";

const styles = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  navy: "bg-navy text-white hover:bg-navy-dark",
  ghost: "border border-line bg-white text-ink hover:border-navy",
  quiet: "bg-paper text-ink hover:bg-line",
} as const;

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles }) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
