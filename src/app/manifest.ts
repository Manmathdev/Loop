import type { MetadataRoute } from "next";

// PWA manifest — makes Loopback installable on Android/home screen and is the
// basis for wrapping it into a native APK (see ANDROID.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loopback — turn the scroll into knowledge you keep",
    short_name: "Loopback",
    description:
      "Paste a reel. Loopback distills it into study notes and spaced-repetition flashcards so the good stuff actually sticks.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1e4",
    theme_color: "#0a3625",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" },
    ],
  };
}
