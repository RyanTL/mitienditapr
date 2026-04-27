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
  const sharedStyle = {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    minWidth: `${sizePx}px`,
    minHeight: `${sizePx}px`,
    maxWidth: `${sizePx}px`,
    maxHeight: `${sizePx}px`,
    flex: `0 0 ${sizePx}px`,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    overflow: "hidden",
    display: "block",
  } as const;

  if (trimmed) {
    return (
      <Image
        src={trimmed}
        alt={vendorName}
        width={sizePx}
        height={sizePx}
        sizes={`${sizePx}px`}
        className="object-cover"
        style={sharedStyle}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-bold ${fallbackClassName}`}
      style={sharedStyle}
    >
      <span className={textClassName}>{vendorName.charAt(0).toUpperCase()}</span>
    </div>
  );
}
