# 📱 Get the Loopback APK — step by step (cloud-compiled, zero local setup)

No Android Studio, no SDK install. Everything compiles on **GitHub Actions** and
hands you a downloadable `.apk` that runs **like a native app**.

The app is already wired with real native behavior (see checklist below). You just
need to: **deploy → point → build → install**.

---

## ✅ What makes it feel native (already built in)

| Feature | What it does |
|---|---|
| 🟢 **Splash screen** | Branded forest + logo on every cold start — **never a white flash** |
| 🟢 **Status bar** | Merges into the forest header for a seamless look |
| 🟢 **Haptics** | Subtle vibration when you flip a card & on each review rating |
| 🟢 **External links** | Reel URLs open in the **real app/browser** (YouTube/TikTok), not trapped in-app |
| 🟢 **Back button** | Goes back through screens, exits cleanly from Home |
| 🟢 **Offline overlay** | If the connection drops you get a friendly “you’re offline” screen — **never a frozen blank page** |
| 🟢 **No zoom / no bounce** | Pinch-zoom & rubber-band scroll disabled = app feel |

---

## ⚠️ The one rule: your phone can’t reach `localhost`

The notes/cards live in Postgres and the AI key runs server-side — none of that
fits inside an APK. So the APK is a **native shell that loads your live web app
from a URL**. **You must deploy the backend first**, or the app will only show the
green placeholder screen.

```
Phone APK  ──HTTPS──►  Your deployed Next.js app  ──►  Postgres + OpenCode Zen AI
```

---

## Step 1 — Deploy the backend (once)

Pick any host with Postgres. **Railway** or **Render** are easiest.

1. Create a new **Web Service** from your GitHub repo (Framework: Next.js).
2. Add a **PostgreSQL** database; copy its connection string.
3. Set these **environment variables** (same as your local `.env`):

```
DATABASE_URL=postgresql://...your-hosted-postgres...
OPENCODE_ZEN_API_KEY=sk-glBTC...your-key...
OPENCODE_ZEN_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_ZEN_MODEL=deepseek-v4-flash-free
```

4. Deploy, then open `https://<your-app>.onrender.com/api/health` → must show
   `{"ok":true}`. (First deploy may need a minute to start.)

> ⚡ **Quick smoke test only (not for real use):** you *can* temporarily point the
> APK at this project's live preview URL to see it run, but sandbox URLs sleep and
> the DB resets — use it just to confirm the APK builds & boots, then switch to a
> real deploy.

---

## Step 2 — Push the code to GitHub

```bash
git add .
git commit -m "native Android: splash, haptics, status bar, offline"
git push
```

---

## Step 3 — Tell the APK where your backend lives

In your GitHub repo: **Settings → Secrets and variables → Actions → Variables →
New repository variable**

- **Name:** `LOOPBACK_APP_URL`
- **Value:** `https://<your-app>.onrender.com` ← your deployed HTTPS URL, **no trailing `/`**

> It must be a **Variable** (not a Secret) — the workflow reads it as
> `${{ vars.LOOPBACK_APP_URL }}`.

---

## Step 4 — Cloud-compile the APK

The workflow `.github/workflows/build-android.yml` already exists. Run it:

**GitHub → Actions tab → “Build Android APK” → Run workflow → green Run button.**

In the cloud it will: install Node/JDK17/Android SDK → generate the native
project + icons + splash → run Gradle → upload the APK. **~6–10 min** first time.

---

## Step 5 — Download & install

1. Open the finished run → scroll to **Artifacts** → download **`loopback-debug-apk`**.
2. **Unzip** it → you get `app-debug.apk`.
3. Get it onto your phone (email yourself, Google Drive, USB…).
4. Open the `.apk` on the phone → allow **“Install unknown apps”** for your
   browser/files app → **Install**.
5. Open **Loopback** 🎉

---

## 🧪 First-run checks (confirm it’s truly native)

- [ ] Cold start shows the **forest splash with the loop logo**, then the app
- [ ] Status bar is **dark forest** (not white)
- [ ] Tap **“show answer”** — feels a tiny **vibration** (haptics)
- [ ] Paste a reel → notes & cards appear (backend is live ✅)
- [ ] Open a reel → tap its **link** → opens in the **YouTube/TikTok app or browser**, not inside Loopback
- [ ] Press the **hardware back** button → navigates; from Home → exits the app
- [ ] Turn on **airplane mode** mid-session → you see the **“you’re offline”** screen (not a crash/blank)

If all seven pass, it’s behaving exactly like a native app. 🚀

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Green placeholder card** instead of the app | `LOOPBACK_APP_URL` missing/wrong → redo Step 3, rebuild |
| **Blank screen** after splash | backend not deployed, URL not HTTPS, or `/api/health` failing |
| `net::ERR_CLEARTEXT_NOT_PERMITTED` | you used `http://` — production requires **HTTPS** |
| Cards empty but web works | the phone hits your *deployed* DB, not your local one — confirm data is in the deployed DB |
| APK build fails in Actions | open the failed run’s logs; ensure JDK 17 + android-34 (already set in workflow) |
| Vibration/status bar missing | the plugins register at `cap sync` — make sure the workflow’s plugin `npm install` line is intact |

---

## Optional: signed release for Google Play

Debug APKs sideload fine. For the Play Store you need a signed **AAB**. Append this
job to `.github/workflows/build-android.yml`, after creating keystore secrets
(`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`):

```yaml
  build-release:
    if: github.event_name == 'workflow_dispatch'
    needs: build-apk
    runs-on: ubuntu-latest
    env:
      LOOPBACK_APP_URL: ${{ vars.LOOPBACK_APP_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: android-actions/setup-android@v3
        with: { packages: "platforms;android-34 build-tools;34.0.0" }
      - name: Install Capacitor + plugins
        run: |
          npm install --no-save @capacitor/cli@6 @capacitor/core@6 @capacitor/android@6
          npm install --no-save @capacitor/app@6 @capacitor/haptics@6 @capacitor/browser@6 \
            @capacitor/network@6 @capacitor/status-bar@6 @capacitor/splash-screen@6 @capacitor/assets@latest
      - run: npx cap add android
      - run: npx @capacitor/assets generate --android || true
      - run: npx cap sync android
      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/loopback.keystore
      - name: Configure signing
        working-directory: android
        run: |
          cat > app/signing.properties <<EOF
          storeFile=loopback.keystore
          storePassword=${{ secrets.KEYSTORE_PASSWORD }}
          keyAlias=${{ secrets.KEY_ALIAS }}
          keyPassword=${{ secrets.KEY_PASSWORD }}
          EOF
      - name: Build release AAB
        working-directory: android
        run: chmod +x ./gradlew && ./gradlew bundleRelease --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: loopback-release-aab
          path: android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` in the **Google Play Console**. (Want a signed `.apk` instead?
Swap `bundleRelease` → `assembleRelease`.)

---

## Want 100% native (non-WebView) screens?

This Capacitor build is a **real native APK** (installable, Play-ready, device APIs
via plugins) whose UI renders in a system WebView. If you ever want fully native
components, the upgrade path is a **React Native / Expo** rewrite of the screens —
the API routes and database stay exactly as-is. Say the word and I’ll scaffold it.
