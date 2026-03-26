"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CloseIcon, QrCodeIcon, ShareIcon } from "@/components/icons";
import { useBodyScrollLock, useEscapeKey } from "@/hooks/use-overlay-behaviors";
import {
  fetchOwnerShopShare,
  fetchPublicShopShare,
} from "@/lib/share/client";
import type {
  OwnerShopShareResponse,
  PublicShopShareResponse,
} from "@/lib/share/types";

import { QrPreview } from "./qr-preview";

type ShopSharePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  shopSlug?: string;
  ownerMode?: boolean;
};

type SharePayload = PublicShopShareResponse | OwnerShopShareResponse;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function ShopSharePopup({
  isOpen,
  onClose,
  shopSlug,
  ownerMode = false,
}: ShopSharePopupProps) {
  const [showQr, setShowQr] = useState(false);
  const [shareData, setShareData] = useState<SharePayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  const canUseNativeShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setShowQr(false);
      setShareData(null);
      setIsLoading(false);
      setErrorMessage(null);
      setActionMessage(null);
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;

    async function loadSharePayload() {
      setIsLoading(true);
      setErrorMessage(null);
      setActionMessage(null);

      try {
        let nextShareData: SharePayload;

        if (ownerMode) {
          nextShareData = await fetchOwnerShopShare();
        } else if (shopSlug) {
          nextShareData = await fetchPublicShopShare(shopSlug);
        } else {
          throw new Error("Falta el slug de la tienda para compartir.");
        }

        if (!isMounted) {
          return;
        }

        setShareData(nextShareData);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo preparar la opción de compartir.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSharePayload();

    return () => {
      isMounted = false;
    };
  }, [isOpen, ownerMode, shopSlug]);

  const handleNativeShare = useCallback(async () => {
    if (!shareData) {
      return;
    }

    if (!canUseNativeShare) {
      setActionMessage("Tu navegador no soporta compartir directamente.");
      return;
    }

    try {
      await navigator.share({
        title: shareData.vendorName,
        text: `Mira mi tienda: ${shareData.vendorName}`,
        url: shareData.shareUrl,
      });

      setActionMessage("Enlace compartido.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setActionMessage("No se pudo compartir el enlace.");
    }
  }, [canUseNativeShare, shareData]);


  const handleDownloadQr = useCallback(() => {
    if (!shareData || !qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${shareData.shopSlug}.png`;
    link.click();
    setActionMessage("Código QR descargado.");
  }, [qrDataUrl, shareData]);

  const handlePrintQr = useCallback(() => {
    if (!shareData || !qrDataUrl) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=520,height=680");
    if (!printWindow) {
      setActionMessage("Permite popups para imprimir el código QR.");
      return;
    }
    const safeShopName = escapeHtml(shareData.vendorName);
    const safeShareUrl = escapeHtml(shareData.shareUrl);
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>QR ${safeShopName}</title><style>:root{color-scheme:light}body{margin:0;padding:28px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#fff}.sheet{max-width:360px;margin:0 auto;text-align:center}.title{margin:0 0 8px;font-size:22px;font-weight:700}.subtitle{margin:0 0 18px;font-size:13px;line-height:1.4}.qr{width:260px;height:260px;border:1px solid #e4e4e7;border-radius:14px;padding:10px;box-sizing:border-box}.url{margin-top:14px;font-size:12px;word-break:break-all}</style></head><body><main class="sheet"><h1 class="title">${safeShopName}</h1><p class="subtitle">Escanea para ver la tienda en línea</p><img class="qr" src="${qrDataUrl}" alt="QR"/><p class="url">${safeShareUrl}</p></main><script>window.addEventListener("load",()=>{window.focus();window.print()})<\/script></body></html>`);
    printWindow.document.close();
    setActionMessage("Abriendo vista de impresión...");
  }, [qrDataUrl, shareData]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay-black-015)] backdrop-blur-[1px]"
        aria-label="Cerrar popup de compartir"
        onClick={onClose}
      />

      <section
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-[var(--color-gray)] bg-[var(--color-white)] p-5 pb-28 text-[var(--color-carbon)] shadow-[0_-8px_40px_var(--shadow-black-018)] md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-5 md:shadow-[0_22px_54px_var(--shadow-black-018)]"
        role="dialog"
        aria-label="Compartir tienda"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold leading-none">Compartir tienda</h2>
            <p className="mt-1 text-xs text-[var(--color-gray-500)]">
              Comparte el enlace de tu tienda.
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-gray)] text-[var(--color-carbon)]"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-8 text-center text-sm text-[var(--color-gray-500)]">
              Cargando...
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] px-3 py-3 text-sm text-[var(--color-danger)]">
              {errorMessage}
            </div>
          ) : shareData ? (
            <>
              {/* Link field */}
              <div className="rounded-2xl border border-[var(--color-gray)] bg-[var(--color-gray-100)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-gray-500)]">
                  Enlace público
                </p>
                <input
                  type="text"
                  readOnly
                  value={shareData.shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 w-full bg-transparent text-sm text-[var(--color-carbon)] outline-none"
                />
              </div>

              {/* Two action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand)] px-3 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  onClick={() => void handleNativeShare()}
                >
                  <ShareIcon className="h-4 w-4" />
                  Compartir
                </button>
                {ownerMode && (
                  <button
                    type="button"
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                      showQr
                        ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                        : "border-[var(--color-gray)] bg-[var(--color-white)] text-[var(--color-carbon)]",
                    ].join(" ")}
                    onClick={() => setShowQr((v) => !v)}
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    QR
                  </button>
                )}
              </div>

              {/* QR preview — shown when toggled */}
              {ownerMode && showQr && (
                <div className="space-y-2">
                  <QrPreview
                    shareUrl={shareData.shareUrl}
                    shopName={shareData.vendorName}
                    onReady={setQrDataUrl}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handlePrintQr}
                      disabled={!qrDataUrl}
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2.5 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-40"
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      disabled={!qrDataUrl}
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-gray)] bg-[var(--color-white)] px-3 py-2.5 text-sm font-semibold text-[var(--color-carbon)] transition hover:bg-[var(--color-gray-100)] disabled:opacity-40"
                    >
                      Descargar PNG
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {actionMessage ? (
          <p className="mt-3 text-xs text-[var(--color-gray-500)]">{actionMessage}</p>
        ) : null}
      </section>
    </div>
  );
}

