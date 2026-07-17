// Client-only native helpers (Capacitor). Everything here no-ops gracefully on
// the web (regular browser) and only activates inside the installed APK, where
// Capacitor injects its bridge into the WebView. Dynamic imports keep this out
// of the server bundle.

export async function isNativeApp(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type HapticKind = "light" | "medium" | "heavy" | "success";

export async function haptic(kind: HapticKind = "light"): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      navigator.vibrate?.(kind === "success" ? 28 : 10);
      return;
    }
    if (kind === "success") {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      const style =
        kind === "heavy"
          ? ImpactStyle.Heavy
          : kind === "medium"
            ? ImpactStyle.Medium
            : ImpactStyle.Light;
      await Haptics.impact({ style });
    }
  } catch {
    /* haptics are best-effort — never block UX */
  }
}
