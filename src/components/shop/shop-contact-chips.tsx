"use client";

import { AthMovilIcon, FacebookIcon, InstagramIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { formatPhoneForDisplay } from "@/lib/formatters";
import type { VendorContactInfo } from "@/lib/supabase/shop-types";

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[13px] font-medium text-black transition-colors active:bg-[#e5e5ea]";

function buildWhatsAppUrl(raw: string) {
  const digits = raw.replace(/\D/g, "");
  // If 10 digits (no country code), prepend US/PR code 1
  return `https://wa.me/${digits.length === 10 ? `1${digits}` : digits}`;
}

function buildInstagramUrl(raw: string) {
  if (raw.startsWith("http")) return raw;
  return `https://instagram.com/${raw.replace(/^@/, "")}`;
}

function buildFacebookUrl(raw: string) {
  if (raw.startsWith("http")) return raw;
  return `https://facebook.com/${raw}`;
}

type ShopContactChipsProps = {
  contact: VendorContactInfo;
  /** Merged with the row layout (e.g. `ob3 mt-4` in ATH checkout, `mt-3` in shop menu). */
  className?: string;
};

/**
 * Teléfono → WhatsApp → Instagram → Facebook, same as ATH checkout.
 * Returns null if all four are empty.
 */
export function ShopContactChips({ contact, className }: ShopContactChipsProps) {
  if (!contact.phone && !contact.whatsapp && !contact.instagram && !contact.facebook) {
    return null;
  }

  return (
    <div
      className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}
    >
      {contact.phone && (
        <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className={CHIP_CLASS}>
          <PhoneIcon className="h-3.5 w-3.5 text-[#86868b]" />
          {formatPhoneForDisplay(contact.phone)}
        </a>
      )}
      {contact.whatsapp && (
        <a
          href={buildWhatsAppUrl(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className={CHIP_CLASS}
        >
          <WhatsAppIcon className="h-3.5 w-3.5 text-[#25d366]" />
          WhatsApp
        </a>
      )}
      {contact.instagram && (
        <a
          href={buildInstagramUrl(contact.instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className={CHIP_CLASS}
        >
          <InstagramIcon className="h-3.5 w-3.5 text-[#e4405f]" />
          @{contact.instagram.replace(/^@/, "")}
        </a>
      )}
      {contact.facebook && (
        <a
          href={buildFacebookUrl(contact.facebook)}
          target="_blank"
          rel="noopener noreferrer"
          className={CHIP_CLASS}
        >
          <FacebookIcon className="h-3.5 w-3.5 text-[#1877f2]" />
          Facebook
        </a>
      )}
    </div>
  );
}

type ShopContactExtraChipsProps = {
  /** Synthetic platform inbox, e.g. `hola+{slug}@mitienditapr.com` */
  platformEmail: string;
  /** Payment ATH number; shown as a chip with tel: link when set. */
  athMovilPhone: string | null;
  className?: string;
};

/**
 * Shop hamburger only: platform email and ATH in the same chip style as
 * `ShopContactChips`. Renders null if there is no email and no ATH number.
 */
export function ShopContactExtraChips({
  platformEmail,
  athMovilPhone,
  className,
}: ShopContactExtraChipsProps) {
  const emailTrim = platformEmail.trim();
  const athTrim = (athMovilPhone ?? "").trim();
  if (!emailTrim && !athTrim) {
    return null;
  }

  return (
    <div
      className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}
    >
      {emailTrim ? (
        <a href={`mailto:${emailTrim}`} className={CHIP_CLASS}>
          Email
        </a>
      ) : null}
      {athTrim ? (
        <a href={`tel:${athTrim.replace(/\D/g, "")}`} className={CHIP_CLASS}>
          <AthMovilIcon className="h-3.5 w-3.5 text-[#005468]" />
          {formatPhoneForDisplay(athTrim)}
        </a>
      ) : null}
    </div>
  );
}
