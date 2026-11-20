import Image from "next/image";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/rbs-logo.png"
      alt="Rural Building Solutions"
      width={1375}
      height={663}
      priority
      className={className}
    />
  );
}
