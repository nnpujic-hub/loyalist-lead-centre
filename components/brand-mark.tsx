import Image from "next/image";

export function BrandMark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const onDark = tone === "dark";
  return (
    <Image
      src={onDark ? "/rbs-logo-dark-bg.png" : "/rbs-logo.png"}
      alt="Rural Building Solutions"
      width={1375}
      height={onDark ? 671 : 663}
      priority
      className={className}
    />
  );
}
