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
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PackageIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M20 7.5 12 3 4 7.5v9L12 21l8-4.5v-9ZM12 3v18M4 7.5l8 4.5 8-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocumentIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M8 3.5h6l4 4V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M9.5 12h5M9.5 15.5h5M9.5 19H13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TruckIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M3 7h11v9H3V7ZM14 10h3.4l2.6 3V16h-6v-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M3 16h2.5M20 16h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7.5" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function ImageIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m6 17 4.5-4.5 3 3 4.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 4.5 20 19H4L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1" fill="currentColor" />
    </svg>
  );
}

export function StoreIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M3 9.5 5 4h14l2 5.5M3 9.5h18M3 9.5V20h18V9.5M9 13.5h6M12 9.5v10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
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

export function UserIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function AthMovilIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 15h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
