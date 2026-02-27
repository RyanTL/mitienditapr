import type { ComponentPropsWithoutRef } from "react";

type IconProps = ComponentPropsWithoutRef<"svg">;

export function FavoriteIcon({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12.1 20.3c-.1 0-.2 0-.3-.1C7.1 16 4 13.2 4 9.7 4 7.7 5.6 6 7.7 6c1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2C16.8 6 18.5 7.7 18.5 9.7c0 3.5-3.1 6.3-7.8 10.5-.2.1-.4.1-.6.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SearchIcon({ className = "h-7 w-7", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function HomeIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.8v-6h-4.4v6H5a1 1 0 0 1-1-1v-8.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function OrdersIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 9.3 5.6 5h12.8L20 9.3M4 9.3V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.3M4 9.3h16M9 13h6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CartIcon({ className = "h-7 w-7", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M3 5h2l1.8 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L19 8H7.1M9 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SettingsIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7 3.5a7.9 7.9 0 0 0-.1-1.3l1.4-1.1-1.6-2.7-1.8.7c-.7-.5-1.4-.9-2.2-1.2L14.5 4h-3l-.3 2.3c-.8.3-1.6.7-2.2 1.2l-1.8-.7-1.6 2.7 1.4 1.1a8.8 8.8 0 0 0 0 2.6l-1.4 1.1 1.6 2.7 1.8-.7c.7.5 1.4.9 2.2 1.2l.3 2.3h3l.3-2.3c.8-.3 1.6-.7 2.2-1.2l1.8.7 1.6-2.7-1.4-1.1c.1-.4.1-.9.1-1.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function MenuIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function BackIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ShareIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 15V5M12 5l-4 4M12 5l4 4M6 12.5V18a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function LinkIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M10.7 13.3 13.3 10.7M8.4 15.6l-1.9 1.9a3.2 3.2 0 0 1-4.5-4.5l1.9-1.9a3.2 3.2 0 0 1 4.5 0M15.6 8.4l1.9-1.9a3.2 3.2 0 0 1 4.5 4.5l-1.9 1.9a3.2 3.2 0 0 1-4.5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QrCodeIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 2h2m2 0h2m-6 4h2m4-2h-2m0-4v2m-4-2h2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

type HeartIconProps = IconProps & {
  filled?: boolean;
};

export function HeartIcon({
  className = "h-6 w-6",
  filled = false,
  ...props
}: HeartIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12.1 20.2c-.1 0-.2 0-.3-.1-4.8-4.2-7.8-6.9-7.8-10.3C4 7.7 5.7 6 7.8 6c1.6 0 3 .8 3.8 2.1C12.4 6.8 13.8 6 15.4 6c2.1 0 3.8 1.7 3.8 3.8 0 3.4-3 6.1-7.8 10.3-.1.1-.2.1-.3.1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ChevronIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ChevronDownIcon({
  className = "h-4 w-4",
  ...props
}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function DotsIcon({ className = "h-7 w-7", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function TrashIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4.5 7h15M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7m-7 0 1 11a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l1-11"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function InfoIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.2v6.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon({ className = "h-8 w-8", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="m5 12 5 5L19 8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
