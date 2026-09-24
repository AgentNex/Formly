"use client";

import { useEffect, useState } from "react";

const USER_ID_KEY = "formly_user_id";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") {
    return "usr_server_guest";
  }

  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36).substring(4);
      id = `usr_${randomPart}_${timePart}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return "usr_fallback_anon";
  }
}

export function useUserId(): { userId: string; isReady: boolean } {
  const [userId, setUserId] = useState<string>("usr_loading");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    setIsReady(true);
  }, []);

  return { userId, isReady };
}
