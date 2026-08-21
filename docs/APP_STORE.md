# App Store Submission Guide — Ditdah

> Everything technical is done in-repo; this file is the paste-ready listing
> copy plus the App Store Connect steps only Ryan can perform.
> Prepared 2026-08-21. Companions: [IOS-PRD.md](IOS-PRD.md),
> [PROJECT-STATE.md](PROJECT-STATE.md).

## Technical state (done)

- Bundle `com.ryanbyrd.ditdah`, team `W82VG376HK`, version **1.0 (1)**,
  iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), portrait-only, iOS 15+.
- `ITSAppUsesNonExemptEncryption = NO` in Info.plist (standard HTTPS only), so
  uploads skip the export-compliance question.
- Capacitor 8 on **SPM, no CocoaPods**. Plugins: splash-screen, status-bar,
  haptics, keep-awake.
- **Guest-only build.** `npm run build:ios` clears the `VITE_SUPABASE_*`
  variables, which makes `supabaseEnabled` false and removes the entire account
  layer (`Account.tsx` returns null). `scripts/verify-ios-bundle.mjs` fails the
  build if a Supabase project URL or publishable key is ever found in `dist`,
  because shipping sign-in to iOS means Guideline 4.8 and 5.1.1(v).
- **Audio ignores the ring/silent switch** — `AVAudioSession` category
  `.playback` set in `AppDelegate`, plus interruption handling. **Still needs
  confirming on a physical device; the Simulator has no silent switch.**
- Screen stays awake during Hear letters / Hear words / Koch / On the air.
- Google Analytics is gated off in the shell; `/api/pulse` and `/api/error`
  still run and are pointed at `https://ditdah.me` via `src/lib/native.ts`.
- Gaze input (camera) is removed from the shell, so no camera permission and no
  camera privacy label.
- `PrivacyInfo.xcprivacy` in the app target, verified present in the built
  bundle.
- Privacy policy at **https://ditdah.me/privacy.html**.
- Store screenshots (6.9", 1320x2868, iPhone 17 Pro Max simulator) in
  `appstore/screenshots/`.

## Guideline 4.2 defense (put in App Review notes)

> This is not a repackaged website. All nine learning modes, the full 39-lesson
> Koch course, 20 scripted CW conversations, two games, and every audio sample
> and mnemonic image are bundled in the app and work with no network connection
> at all. The app has no sign-in and makes no required network request. Audio is
> synthesised on-device at the learner's chosen speed with correct Morse timing,
> including Farnsworth spacing.

## Guideline 4.8 (Sign in with Apple) story

The iOS app offers **no sign-in at all**, so 4.8 does not apply, and neither
does the 5.1.1(v) in-app account-deletion requirement. Progress moves between
devices with the existing Get/Load progress code.

If sign-in ever ships in the app: Sign in with Apple must ship beside Google as
an equivalent option, an in-app delete-account flow becomes mandatory, and note
that Google Identity Services **blocks embedded webviews**
(`disallowed_useragent`) so the web flow will not work in WKWebView regardless —
it needs `ASWebAuthenticationSession`.

## Listing copy (paste into App Store Connect)

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

## App privacy (Data Collection) answers

Declare, each **"Data is not linked to your identity"** and **"not used for
tracking"**:

| Data type | Why |
|---|---|
| Usage Data → Product Interaction | First-party `/api/pulse` visit counters |
| Diagnostics → Crash Data | `/api/error` reports, scrubbed of identifiers |

Everything else: **not collected.** There is no sign-in in the app, so no name,
email, or user id exists. Google Analytics runs on the website only.

## Age rating

**Do not reflexively answer 4+.** Signal Squadron is an arcade shooter and Cave
of Echoes has combat, so the **Cartoon or Fantasy Violence** question is
arguably in scope; the honest answer is likely "Infrequent/Mild", landing at 9+.
Over-rating costs nothing. Under-rating invites a rejection or a forced
re-rating after launch.

## Ryan's checklist (in order)

1. **Confirm the name is free.** If `Ditdah` is taken, use
   `Ditdah: Morse Code Trainer`.
2. **Test on a real iPhone, with the silent switch ON.** This is the one thing
   the Simulator cannot check, and it is the highest-likelihood defect: if the
   `AVAudioSession` category did not take, the app is silent for anyone whose
   phone is on silent, which reads as "the app is broken."
3. **Create the app record**: appstoreconnect.apple.com → My Apps → **+** →
   New App → iOS, name + SKU from the table, bundle `com.ryanbyrd.ditdah`.
4. **Upload the build**: Xcode → scheme **App** → destination **Any iOS Device
   (arm64)** → Product → **Archive** → Distribute App → App Store Connect →
   Upload. Processing takes ~15 min.
5. **Fill the listing**: paste from this file; upload the five screenshots from
   `appstore/screenshots/`.
6. **App Privacy**: answer per the table above.
7. **Age rating**: answer honestly, per the section above.
8. **Review notes**: paste the 4.2 defense. No demo account needed — nothing is
   gated.
9. **TestFlight** to family first, then submit. Reviews typically take 1-3 days.

## Releases after approval

```bash
# bump MARKETING_VERSION / CURRENT_PROJECT_VERSION in the Xcode project, then:
npm run build:ios     # clears Supabase env, verifies the bundle, cap sync
open ios/App/App.xcodeproj    # Archive → Distribute → Upload
```

Never ship an iOS build made with a plain `npm run build`: it would carry the
Supabase configuration and put sign-in back in the app. `build:ios` is the only
supported path, and the verify script enforces it.
