import Image from "next/image";

type VendorShopAvatarProps = {
  vendorName: string;
  logoUrl: string | null;
  /** Width and height in pixels for next/image and layout */
  sizePx: number;
  textClassName: string;
  fallbackClassName?: string;
};

export function VendorShopAvatar({
  vendorName,
  logoUrl,
  sizePx,
  textClassName,
  fallbackClassName = "bg-[var(--color-carbon)] text-[var(--color-white)]",
}: VendorShopAvatarProps) {
  const trimmed = logoUrl?.trim();
  if (trimmed) {
    return (
      <Image
        src={trimmed}
        alt={vendorName}
        width={sizePx}
        height={sizePx}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${fallbackClassName}`}
      style={{ width: sizePx, height: sizePx }}
    >
      <span className={textClassName}>{vendorName.charAt(0).toUpperCase()}</span>
    </div>
  );
}
