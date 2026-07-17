// Capacitor config for the native Android build — now with native plugins.
// Written WITHOUT @capacitor/cli type imports on purpose so the web project's
// `tsc`/`next build` stays green (Capacitor isn't a build dep of the web app).

const appUrl = process.env.LOOPBACK_APP_URL?.replace(/\/$/, "") || undefined;

const config = {
  appId: "com.loopback.app",
  appName: "Loopback",
  // Local placeholder web assets (the real UI streams from `server.url`).
  webDir: "mobile/www",
  // REMOTE MODE: the WebView boots into your deployed Next.js backend so the
  // phone reaches the real API routes + Postgres + OpenCode Zen AI.
  // Set LOOPBACK_APP_URL in the GitHub Actions workflow (see ANDROID.md).
  server: appUrl
    ? {
        url: appUrl,
        cleartext: appUrl.startsWith("http://"),
        androidScheme: "https",
      }
    : undefined,
  android: {
    backgroundColor: "#0a3625", // branded forest — prevents any white flash
    allowMixedContent: appUrl ? appUrl.startsWith("http://") : false,
  },
  plugins: {
    // Branded splash on cold start (forest + logo). App hides it once React mounts.
    SplashScreen: {
      launchShowDuration: 4000, // safety net — never stuck on splash
      backgroundColor: "#0a3625",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      autoHide: true, // app also hides it early once React mounts
    },
    // Status bar matches the forest header for a seamless native look.
    StatusBar: {
      backgroundColor: "#0a3625",
      style: "LIGHT",
      overlaysWebView: false,
    },
  },
};

export default config;
