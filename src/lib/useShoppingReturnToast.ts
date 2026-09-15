"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ToastProvider";

/**
 * Arms a one-shot "welcome back" toast for when the user returns to this tab after
 * being sent off to a retailer/DoorDash. Call the returned `arm()` function right
 * before navigating away; the toast fires the next time the tab regains visibility
 * or focus, then disarms itself.
 */
export function useShoppingReturnToast(message = "Back from shopping? 🌸 Check off what you got!") {
  const showToast = useToast();
  const armed = useRef(false);

  useEffect(() => {
    function handleReturn() {
      if (!armed.current) return;
      if (document.visibilityState !== "visible") return;
      armed.current = false;
      showToast(message);
    }
    document.addEventListener("visibilitychange", handleReturn);
    window.addEventListener("focus", handleReturn);
    return () => {
      document.removeEventListener("visibilitychange", handleReturn);
      window.removeEventListener("focus", handleReturn);
    };
  }, [showToast, message]);

  return () => {
    armed.current = true;
  };
}
