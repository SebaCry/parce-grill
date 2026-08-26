import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "ember" | "ghost";

const BASE =
  "group relative inline-flex items-center gap-3 rounded-full px-7 py-3.5 font-display text-sm tracking-tight uppercase transition-colors duration-300 ease-[var(--ease-out-expo)]";

const VARIANTS: Record<Variant, string> = {
  ember: "bg-ember text-carbon hover:bg-amarillo",
  ghost: "border border-hueso/25 text-hueso hover:border-amarillo hover:text-amarillo",
};

type Props = {
  href: string;
  /** Los destinos externos (DoorDash, WhatsApp, Instagram) salen de la SPA. */
  external?: boolean;
  variant?: Variant;
} & Omit<ComponentProps<"a">, "href">;

export function CtaLink({
  href,
  external = false,
  variant = "ember",
  className = "",
  children,
  ...rest
}: Props) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  const arrow = (
    <span
      aria-hidden="true"
      className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
    >
      →
    </span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {children}
        {arrow}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
      {arrow}
    </Link>
  );
}
