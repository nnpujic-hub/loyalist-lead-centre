import Image from "next/image";

const size = { width: 2343, height: 706 };

export function BrandMark({
  tone,
  className,
}: {
  tone: "light" | "dark";
  className?: string;
}) {
  const onDark = tone === "dark";
  return (
    <Image
      src={onDark ? "/logo-dark.png" : "/logo-light.png"}
      alt="Loyalist Homes & Restoration"
      width={size.width}
      height={size.height}
      priority
      className={className}
    />
  );
}
