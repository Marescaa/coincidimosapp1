"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  useEffect(() => {
    let handler;

    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        handler = await App.addListener("backButton", () => {
          router.back();
        });
      } catch (e) {}
    };

    setup();

    return () => {
      if (handler) handler.remove();
    };
  }, []);

  return null;
}







