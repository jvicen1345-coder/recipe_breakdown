"use client";

import { useEffect } from "react";

import { useToast } from "./ToastProvider";

// Fires once per app load: fetches any unread "someone loved your X 💕" style
// notifications and surfaces each as a toast. Silently does nothing for guests/
// signed-out visitors (the endpoint just 401s, which is fine to ignore here).
export function NotificationToaster() {
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/unread")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.messages?.length) return;
        data.messages.forEach((message: string, i: number) => {
          setTimeout(() => showToast(message), i * 3000);
        });
      })
      .catch(() => {
        // Notifications are a nice-to-have — never worth surfacing an error for.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per app load
  }, []);

  return null;
}
