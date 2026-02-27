"use client";

import { useEffect } from "react";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [locked]);
}

export function useEscapeKey(enabled: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [enabled, onEscape]);
}
