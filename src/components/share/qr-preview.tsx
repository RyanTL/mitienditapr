"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrPreviewProps = {
  shareUrl: string;
  shopName: string;
  onReady?: (dataUrl: string | null) => void;
};

export function QrPreview({ shareUrl, shopName, onReady }: QrPreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function buildQr() {
      setIsLoading(true);
      setErrorMessage(null);
      setQrDataUrl(null);
      onReady?.(null);

      try {
        const dataUrl = await QRCode.toDataURL(shareUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 720,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        if (!isMounted) {
          return;
        }

        setQrDataUrl(dataUrl);
        onReady?.(dataUrl);
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorMessage("No se pudo generar el codigo QR.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void buildQr();

    return () => {
      isMounted = false;
    };
  }, [onReady, shareUrl]);

  return (
    <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] p-3">
      {isLoading ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl bg-[var(--color-gray-100)] text-sm text-[var(--color-gray-500)]">
          Generando QR...
        </div>
      ) : errorMessage ? (
        <p className="rounded-xl bg-[var(--color-gray-100)] px-3 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      ) : qrDataUrl ? (
        <div className="mx-auto w-full max-w-[280px]">
          <Image
            src={qrDataUrl}
            alt={`Codigo QR para ${shopName}`}
            width={280}
            height={280}
            unoptimized
            className="h-auto w-full rounded-xl border border-[var(--color-gray)] bg-[var(--color-white)]"
          />
        </div>
      ) : null}
    </div>
  );
}
