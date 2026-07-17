"use client";

import { useEffect, useState } from "react";

/**
 * Activates native features inside the installed APK and renders an offline
 * overlay so the app never shows a blank/broken screen. On a normal web browser
 * this component renders nothing and does nothing — so the web build is unaffected.
 */
export function NativeBridge() {
  const [native, setNative] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      setNative(true);

      // 1) Status bar — forest background + light icons.
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#0a3625" });
      } catch {
        /* ignore */
      }

      // 2) Hide splash once the React app has mounted (real UI is on screen).
      setTimeout(async () => {
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide({ fadeOutDuration: 250 });
        } catch {
          /* ignore */
        }
      }, 500);

      // 3) Network — drive the offline overlay.
      try {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        setOnline(status.connected);
        const handle = await Network.addListener("networkStatusChange", (s) =>
          setOnline(s.connected),
        );
        cleanups.push(() => handle.remove());
      } catch {
        /* ignore */
      }

      // 4) External links (reel URLs) open in the system browser / native app,
      //    instead of being trapped inside the WebView.
      const onClick = async (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const a = target?.closest?.("a");
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (!/^https?:\/\//i.test(href)) return; // internal nav
        let url: URL;
        try {
          url = new URL(href);
        } catch {
          return;
        }
        if (url.hostname === window.location.hostname) return; // same-origin
        e.preventDefault();
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: href, presentationStyle: "fullscreen" });
        } catch {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      };
      window.addEventListener("click", onClick, true);
      cleanups.push(() => window.removeEventListener("click", onClick, true));

      // 5) Hardware back button — go back in history, exit when at the root.
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (!canGoBack || window.location.pathname === "/") {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
        cleanups.push(() => handle.remove());
      } catch {
        /* ignore */
      }
    })();

    return () => cleanups.forEach((fn) => fn());
  }, []);

  if (!native || online) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-forest p-6">
      <div className="clay-lime flex max-w-sm flex-col items-center gap-4 p-8 text-center pop-in">
        <div className="clay-puff grid h-16 w-16 place-items-center bg-forest text-3xl text-lime">
          ⚡
        </div>
        <h2 className="display text-2xl text-forest">you&apos;re offline</h2>
        <p className="text-sm text-forest-soft">
          Loopback needs a connection to reach your notes &amp; deck. Reconnect to
          keep the knowledge flowing.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-forest w-full"
        >
          try again
        </button>
      </div>
    </div>
  );
}
