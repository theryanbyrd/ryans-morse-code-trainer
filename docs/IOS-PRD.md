# Ditdah for iPhone — PRD

> Ship the existing Ditdah web app as a native iPhone app on the App Store,
> using the Capacitor shell approach proven on Hymn Dictionary (submitted
> 2026-08-02). Written 2026-08-16.
>
> Structured Question → Research → Spec → Plan.
> Companions: [PROJECT-STATE.md](PROJECT-STATE.md), [NEXT.md](NEXT.md).
> Reference implementation: `~/hymndictionary` (`APP_STORE.md`, `PROJECT_STATE.md`).

---

# 1. Question

Product-shaping decisions, settled before the spec was written.

| Question | Decision | Why |
|---|---|---|
| Accounts on iOS? | **Guest-only in v1** | Sidesteps Guideline 4.8 (Sign in with Apple) and 5.1.1(v) (in-app account deletion) entirely. Costs nothing: the Get/Load progress code already moves progress between devices. |
| Gaze input (WebGazer)? | **Cut from v1** | No camera permission, no camera privacy label, no reviewer asking why a Morse trainer watches your face, ~1.2MB smaller. It is still untested on real hardware (NEXT.md item C). |
| Price? | **Free, no ads, no IAP** | Smallest review surface. No StoreKit, no restore-purchases flow. Matches the Hymn Dictionary precedent. |

### Resolved (2026-10-25)

All four are now settled. Nothing in this PRD is open.

**1. The App Store name — RESOLVED: `Dit Dah Me`.**

Accepted by App Store Connect on 2026-10-25; app record created, App ID
`6826897455`, version 1.0 at "Prepare for Submission".

Connect rejected both `Ditdah` and `Ditdah: Morse Code Trainer` first, because
**four** apps already use the mark (Ditdah CW: Morse Code Trainer; DitDah Daily;
Ditdah - Learn & Chat Morse; DitDah Decoder - Morse Code CW). Apple blocks
confusingly-similar names, not only exact duplicates.

This changes the store listing only. The domain stays ditdah.me, the in-app
wordmark stays Ditdah, and the bundle id stays `com.ryanbyrd.ditdah`. See
`APP_STORE.md` for how the listing ties the two names together for a 2.3.8
metadata check.

**2. Age rating — RESOLVED: 9+, and answer the questionnaire honestly.**

The content was audited rather than guessed at. Signal Squadron's invaders are
blocky shapes you "blast"; Cave of Echoes' monsters are "Dit Sprite", "Signal
Wraith" and "The Static". A grep for blood, gore, gun, weapon, corpse and murder
across all game content and data returns **nothing**.

So: answer **Infrequent/Mild** to *Cartoon or Fantasy Violence*, and **No** to
everything else. That lands at **9+**. Do not answer 4+ reflexively, as Hymn
Dictionary could; under-rating invites a forced re-rating after launch, while
over-rating costs nothing.

**3. Google Analytics in the shell — RESOLVED: no.** The gtag snippet in
`index.html` is gated on `capacitor:`/`ionic:` protocol, so it never loads in
the app. This keeps the privacy labels to two rows and keeps a third-party
tracker out of an app aimed partly at children. Verified in the shipped bundle.

**4. Playback haptics — RESOLVED: deferred, and the UI tells the truth.**
iOS has no Vibration API, and `@capacitor/haptics` fires discrete impacts that
cannot hold a 60ms dit. Haptics drive the learner's own key presses, where they
work; the "Flash & vibrate" toggle renames itself to "Flash" on iOS rather than
promising a buzz that never arrives. Core Haptics patterning stays out of v1.

---

# 2. Research

## 2.1 What Hymn Dictionary proved (reuse directly)

Everything here is already validated on this exact Mac, this Apple team, and
this toolchain. It is the reason this project is small.

- **Capacitor 8 with Swift Package Manager, not CocoaPods.** CocoaPods is not
  installed on this Mac. `npx cap add ios` defaults correctly; do not let any
  guide talk you into Pods.
- **`CapacitorHttp: { enabled: true }`** routes `window.fetch` through native
  `URLSession`, which sidesteps WKWebView CORS. **No server or API changes were
  needed** for Hymn Dictionary, and none are needed here.
- **A `native.ts`-style shell detector** (`capacitor:` protocol) that switches
  `/api/*` calls from relative to absolute. Keep it pure and unit-test it; the
  Playwright `page.route` stubs depend on the web path staying relative.
- **`@capacitor/splash-screen` held until first paint** kills the black flash
  between launch and webview paint. `launchShowDuration: 5000` is only a
  fail-safe for a JS boot that never happens.
- **App icon must be 1024px, flattened, no alpha.** iOS rejects alpha channels.
- **`ITSAppUsesNonExemptEncryption = NO`** in Info.plist skips the
  export-compliance question on every single upload.
- **The `ios/` directory is committed**, with its own `.gitignore` for build
  products.
- **Workflow after any web change:** `npm run build && npx cap sync ios`, then
  rebuild in Xcode.
- **Team `W82VG376HK`**, already in the paid Apple Developer Program.
- **`gh auth switch --user theryanbyrd` before pushing.** The default
  `punkgenius` account fails with a misleading "Repository not found".

## 2.2 The expensive lesson from Hymn Dictionary

> Going full-screen surfaced **two production web bugs** that Safari's chrome had
> been hiding: a closed share sheet parked visibly over the hero because its
> `position: absolute` anchored to a relative ancestor, and an inline `padding`
> shorthand silently overriding `.safe-top`'s `padding-top` — invisible in
> Safari where `env(safe-area-inset-top)` is 0, but headers sat under the status
> bar in standalone/native.

**This is the single most transferable finding.** Ditdah has eight overlays
(settings, stats, about, attributions, get-code, load-code, morse board, badges)
plus the mode menu and the alphabet bar, none of which have ever been rendered
without browser chrome above them. Expect the same class of bug. §4 Phase 2
budgets for it explicitly rather than treating it as a surprise.

## 2.3 What is different about Ditdah, and therefore new risk

Hymn Dictionary is a reference app: text, search, a little speech. Ditdah is an
**audio instrument with millisecond timing**. That moves the risk.

### Audio is the product, and iOS treats web audio as disposable

| Risk | Detail | Mitigation |
|---|---|---|
| **Hardware mute switch** | WKWebView audio defaults to a category the ring/silent switch silences. A Morse trainer that goes mute when the side switch is flipped is not shippable, and the user will read it as "the app is broken". | Set `AVAudioSession` category to `.playback` in `AppDelegate`. **Verify on a physical device with the switch flipped — this cannot be tested in the Simulator.** |
| **Interruptions** | A phone call, an alarm, or another app taking the audio session can leave the context suspended. `playMorse` schedules the whole message ahead on the timeline, so an interrupted playback would resume mid-word or not at all. | Handle interruption notifications; stop playback and reset on interruption end. |
| **Context unlock** | Already handled: `unlockMorse()` / `unlockAudio()` run on mode entry from a user gesture. | Confirm it still fires on every entry path in the shell. |
| **118 audio files, 4.2MB** | All bundled, so no network. Fine. | None. |

### `navigator.vibrate` does nothing on iOS

`src/lib/morsePlayer.ts` builds a `vibe` array of on/off durations and calls
`navigator.vibrate(vibe)`. **iOS Safari and WKWebView have never supported the
Vibration API.** The Settings toggle that offers haptics will appear to work and
silently do nothing — precisely the class of silent failure this project spent
today fixing elsewhere.

Options, honestly ranked in §3.4.

### No screen wake lock

Ditdah has no wake-lock code at all. In Hear letters, Hear words, and the Koch
course the learner listens without touching the screen, so iOS dims and locks
mid-lesson. Hymn Dictionary never hit this because reading keeps you tapping.

### No privacy policy page

Hymn Dictionary shipped `public/privacy.html` and it is a **required field** in
App Store Connect. Ditdah's `public/` has no privacy page. One must be written.

### Sign-in switches off for free

`src/lib/supabase.ts` sets `supabaseEnabled = Boolean(url && anonKey)`, and
`Account.tsx:10` is `if (!enabled) return null;`. **Omitting the two
`VITE_SUPABASE_*` variables from the iOS build removes the entire account layer
with zero code change** — the same mechanism Hymn Dictionary used to keep Google
sign-in dormant on iOS. Verified by reading the code, not assumed.

### Google sign-in could not have shipped anyway

Recorded for the day someone reconsiders: Google Identity Services **blocks
embedded webviews** (`disallowed_useragent`), so the web sign-in flow cannot work
inside WKWebView regardless of Guideline 4.8. Enabling it later means
`ASWebAuthenticationSession`, plus Sign in with Apple beside it, plus an in-app
account-deletion flow.

## 2.4 Guideline 4.2 (minimum functionality) — the main rejection risk

Any Capacitor app risks being read as a repackaged website. Ditdah's defense is
unusually strong: nine modes, two games, a full Koch course, and **everything
works offline** because the entire app, all 118 sounds and all mnemonic art are
bundled. With sign-in off, the app makes no required network call at all.

Draft review note in §3.8.

---

# 3. Spec

## 3.1 Identity

| Field | Value |
|---|---|
| Bundle id | `com.ryanbyrd.ditdah` |
| Team | `W82VG376HK` |
| Display name | `Ditdah` (home screen) · store listing `Dit Dah Me` |
| Version | `1.0 (1)` |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`) |
| Orientation | Portrait only |
| Minimum iOS | 15.0 |
| Encryption | `ITSAppUsesNonExemptEncryption = NO` |

## 3.2 Scope

**In:** Learn, Numbers & symbols, Koch course, Hear letters, Hear words, On the
air, Signal Squadron, Cave of Echoes, Translator. Settings, stats, badges,
progress codes, the Morse board, About and attributions. One-switch scanning and
Single Key input.

**Out of v1:** Gaze input, all sign-in and cloud sync, Google Analytics
(see §3.6), any purchase.

## 3.3 Build configuration

The iOS bundle is the normal web build with the account layer switched off:

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build && npx cap sync ios
```

**Acceptance check** (the same technique used to verify today's deploy):

```bash
grep -c "supabase.co" dist/assets/*.js   # must be 0
```

Wrap it as `npm run build:ios` so it cannot be forgotten. Gaze is excluded the
same way, by the existing default-off setting plus removing the mode card from
the shell build.

`capacitor.config.ts`:

```ts
{
  appId: 'com.ryanbyrd.ditdah',
  appName: 'Ditdah',
  webDir: 'dist',
  backgroundColor: '#14152a',          // matches theme-color, avoids a white flash
  ios: { contentInset: 'never' },
  plugins: {
    CapacitorHttp: { enabled: true },
    SplashScreen: { launchShowDuration: 5000, launchAutoHide: true,
                    backgroundColor: '#14152a', showSpinner: true,
                    spinnerColor: '#ffb020' },
  },
}
```

## 3.4 Audio and haptics requirements

**A1 — Audio must ignore the ring/silent switch.** `AVAudioSession` category
`.playback`, set at launch. Acceptance: on a physical iPhone with the silent
switch engaged, Hear letters plays audibly.

**A2 — Playback survives interruption.** After a phone call, playback stops
cleanly and the next play works. No half-scheduled tones.

**A3 — Screen stays awake during listening modes.** `@capacitor-community/keep-awake`
held while a Receive, Koch, or QSO session is active and released on exit. The
Screen Wake Lock web API may work in modern WKWebView, but the plugin is the
reliable path; verify whichever is chosen on device.

**H1 — Haptics on the learner's own keying.** `@capacitor/haptics`
`impact({ style: Light })` on key-down for a dit and `Medium` for a dah. This is
immediate, gesture-driven, and reliable.

**H2 — Playback haptics are deferred, deliberately.** Vibrating *along with*
received Morse needs precise sub-100ms patterning (a dit at 20 WPM is 60ms).
Capacitor's Haptics plugin fires discrete impacts and will not hold that timing;
doing it properly means a small Core Haptics (`CHHapticEngine`) plugin playing a
generated pattern. That is real native work and is out of v1 scope.

**The Settings toggle must tell the truth.** Today it offers haptics that iOS
silently ignores. In the shell it must either drive H1 only, with copy that says
so, or be hidden. Shipping a toggle that does nothing is the exact failure mode
this project just spent a day eliminating.

## 3.5 Shell integration

- **`src/lib/native.ts`** — pure, unit-tested shell detection plus `apiUrl()`,
  returning `https://ditdah.me` in the shell and a relative path on the web.
  Applied to the `/api/pulse` and `/api/error` calls.
- **Status bar** — the app is dark throughout, so `@capacitor/status-bar` in
  light-content mode. Simpler than Hymn Dictionary, which flipped per theme.
- **Safe areas** — `viewport-fit=cover` and the `apple-mobile-web-app-*` meta
  tags are already in `index.html`. `black-translucent` status bar means content
  renders under the clock, so every overlay needs auditing (§2.2).
- **No service worker.** Ditdah has no PWA plugin, and the shell does not need
  one; Capacitor serves the bundle from disk.

## 3.6 Analytics and privacy

**Recommendation: no Google Analytics in the shell.** GA is loaded by an
unconditional inline script in `index.html`. Keeping it means declaring
Identifiers in the privacy labels and carrying a third-party tracker into a
children-adjacent app for very little value. Gate the gtag snippet on
`!isNative()`.

Keep `/api/pulse` (aggregate, no identifiers) and `/api/error` (operational,
scrubbed — see PROJECT-STATE). Consent-gated `/api/track` follows the existing
default-off setting.

**Privacy labels**, each *not linked to identity* and *not used for tracking*:

| Data type | Why |
|---|---|
| Usage Data → Product Interaction | First-party `/api/pulse` counters |
| Diagnostics → Crash Data | `/api/error` reports |

Everything else **not collected**. With sign-in off there is no email, no name,
no user id.

**`PrivacyInfo.xcprivacy`** — Apple requires a privacy manifest declaring
required-reason API use. Capacitor 8 ships manifests for its own plugins; the
app target needs one covering `UserDefaults` (reason `CA92.1`). Confirm before
the first upload; a missing manifest is an automated rejection at processing
time, not a human review issue.

**`public/privacy.html`** — must be written and deployed to
`https://ditdah.me/privacy.html`. Content: no account, no ads, no third-party
tracking in the app; aggregate counts and scrubbed error reports only; all
progress stored on the device.

## 3.7 Age rating

Do not reflexively answer 4+. Signal Squadron is an arcade shooter and Cave of
Echoes has combat, so the **Cartoon or Fantasy Violence** question in the
questionnaire is arguably in scope and the honest answer is likely "Infrequent /
Mild", landing at 9+.

Over-rating costs nothing. Under-rating invites a rejection or a forced
re-rating after launch, so answer the questionnaire honestly and accept whatever
it returns.

## 3.8 Listing copy (paste-ready)

| Field | Value |
|---|---|
| Name (30) | `Ditdah: Learn Morse Code` |
| Subtitle (30) | `Morse code, one dit at a time` |
| Category | Primary: Education · Secondary: Games |
| Support URL | `https://ditdah.me` |
| Privacy Policy URL | `https://ditdah.me/privacy.html` |
| Copyright | `© 2026 M. Ryan Byrd` |
| SKU | `ditdah-ios` |

**Promotional text (170):**

> Learn Morse code by ear and by hand: 26 letters, numbers, the Koch course,
> real on-air conversations, and two games. Works completely offline.

**Keywords (100):**

> morse,code,cw,ham,radio,telegraph,koch,amateur,learn,practice,dit,dah,sos,licence,operator

**Description:**

> Ditdah teaches Morse code one dit at a time. Start with a single letter, hear
> it, key it back, and build from there until you are holding a conversation in
> code.
>
> LEARN BY SENDING
> Every letter comes with a picture and a sound-alike hook, then you key it
> yourself. Hints adapt to what you keep missing.
>
> LEARN BY LISTENING
> Hear letters and whole words at real speed, with the Koch method's full
> 39-lesson course when you are ready to get serious about copying.
>
> GO ON THE AIR
> Twenty scripted CW conversations, both sides, with a guide to the shorthand
> real operators use.
>
> PLAY
> Signal Squadron is an arcade shooter where you key an invader's letter to
> fire. Cave of Echoes is a dungeon crawl where you key your way through the
> dark and duel monsters in Morse.
>
> TRANSLATE
> Type text to get Morse or Morse to get text, then play it aloud or flash it
> as light.
>
> BUILT FOR EVERYONE
> One-switch scanning, a single-key mode where short is a dit and long is a
> dah, and full VoiceOver support throughout.
>
> WORKS OFFLINE
> Everything is on your phone. No account, no ads, nothing to sign up for.
>
> Ditdah is a remake of Ace Centre's Morse Learn, used under Apache 2.0.

**Review notes (Guideline 4.2 defense):**

> This is not a repackaged website. All nine learning modes, the full 39-lesson
> Koch course, 20 scripted CW conversations, two games, and every audio sample
> and mnemonic image are bundled in the app and work with no network connection
> at all. The app has no sign-in and makes no required network request. Audio is
> synthesised on-device at the learner's chosen speed with correct Morse
> timing, including Farnsworth spacing.

**Screenshots** (6.9", 1320x2868, iPhone 17 Pro Max simulator, into
`appstore/screenshots/`): Learn with a mnemonic, Koch course mid-lesson, Hear
letters with the HUD, Signal Squadron mid-game, Translator.

---

# 4. Plan

## Phase 0 — Prerequisites (Ryan, ~15 min)

1. Confirm `Ditdah` is available in App Store Connect; if not, use
   `Ditdah: Morse Code Trainer`.
2. Register bundle id `com.ryanbyrd.ditdah` under team `W82VG376HK` (Xcode does
   this automatically on first signed build).

## Phase 1 — Shell up and running

1. `npm i @capacitor/core @capacitor/cli @capacitor/ios` and
   `npx cap init` → `npx cap add ios` (SPM, no CocoaPods).
2. `capacitor.config.ts` per §3.3.
3. `src/lib/native.ts` + `apiUrl()`, unit-tested, wired into `/api/pulse` and
   `/api/error`. Gate the gtag snippet on `!isNative()`.
4. `npm run build:ios` script with the acceptance grep from §3.3.
5. App icon: 1024px, flattened, **no alpha**. Splash on `#14152a`.
6. **Exit criteria:** app launches in the Simulator with no black flash, no
   Sign in button anywhere, all nine modes reachable.

## Phase 2 — Full-screen QA (budget real time here)

Audit every overlay and screen without browser chrome, on a device with a
notch. Hymn Dictionary found two real production bugs at this step, and Ditdah
has more overlays than Hymn Dictionary does.

Checklist: mode menu · alphabet bar · settings · stats · badges · about ·
attributions · get-code · load-code · morse board · the two games at full
height · Translator with the keyboard raised.

Anything found here is a **web bug too** — fix it in `src/`, redeploy the site,
and add the E2E coverage. Do not patch it in the shell.

## Phase 3 — Audio, haptics, wake lock

Implement A1, A2, A3, H1 from §3.4. **A1 requires a physical device**; the
Simulator has no ring/silent switch. Resolve the haptics toggle copy.

## Phase 4 — Store assets

`public/privacy.html` written and deployed · `PrivacyInfo.xcprivacy` confirmed ·
`ITSAppUsesNonExemptEncryption` · iPhone-only, portrait-only · five screenshots
captured · `docs/APP_STORE.md` written in the Hymn Dictionary shape.

## Phase 5 — Submission (Ryan)

Mirrors `~/hymndictionary/APP_STORE.md` step for step:

1. Create the app record in App Store Connect (name, SKU, bundle id).
2. Xcode → scheme **App** → destination **Any iOS Device (arm64)** → Product →
   **Archive** → Distribute App → App Store Connect → Upload. Processing ~15 min.
3. Paste the listing copy from §3.8; upload screenshots.
4. Answer App Privacy per §3.6 and the age questionnaire per §3.7.
5. Paste the 4.2 review note. No demo account needed — nothing is gated.
6. TestFlight to family first, then submit. Reviews typically take 1-3 days.

## Effort

| Phase | Estimate |
|---|---|
| 0 Prerequisites | 15 min (Ryan) |
| 1 Shell | half a day |
| 2 Full-screen QA | **half to a full day** — the unknown |
| 3 Audio/haptics/wake | half a day, plus device testing |
| 4 Store assets | half a day |
| 5 Submission | an hour (Ryan) + review wait |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Silent-switch audio | **High** if unaddressed | A1, verified on a physical device |
| Safe-area/overlay bugs | **High** | Phase 2 is budgeted, not hoped for |
| Guideline 4.2 rejection | Low | Genuinely offline, nine modes, review note |
| Name unavailable | Medium | Fallback name ready |
| Haptics toggle lies | Certain if ignored | §3.4 makes the toggle honest |
| Age rating pushback | Low | Answer honestly, accept 9+ |

## Explicitly deferred

Sign in with Apple and cloud sync · Core Haptics playback patterns · gaze input ·
iPad · Android (the same shell would mostly work; `navigator.vibrate` actually
works there) · any purchase.
