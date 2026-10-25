# App Store Submission Guide — Ditdah

> Everything technical is done in-repo; this file is the paste-ready listing
> copy plus the App Store Connect steps only Ryan can perform.
> Prepared 2026-08-21. Companions: [IOS-PRD.md](IOS-PRD.md),
> [PROJECT-STATE.md](PROJECT-STATE.md).

## Technical state (done)

- Bundle `com.ryanbyrd.ditdah`, team `W82VG376HK`, version **1.0 (1)**,
  home-screen name **Dit Dah Me** (matches the listing exactly),
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
- Privacy policy at **https://ditdah.me/privacy.html**, and reachable **from
  inside the app** on the About screen, not only from the store listing. The
  policy names "Dit Dah Me" outright so the required URL visibly covers the app
  under review.
- **External links escape to Safari, verified on device.** Tapping a share
  channel or the privacy link opens the real Safari with a "Ditdah" back
  affordance. These are `<a target="_blank">`, which Capacitor hands to the
  system browser. (Gibberish Gym needed a native-share fix because it used
  `window.open(url, '_self')`, which navigates in place inside the webview;
  Ditdah never had that bug. Checked, not assumed.)
- **Six** store screenshots (6.9", 1320x2868, iPhone 17 Pro Max simulator) in
  `appstore/screenshots/`, recaptured 2026-10-25 from the current build:
  start (leads with the Dit Dah Me wordmark), mode menu, Learn, Koch course,
  Signal Squadron mid-play, Translator.
- **Support page at https://ditdah.me/support.html** with a real contact email,
  because Guideline 1.5 wants the Support URL to carry up-to-date contact
  information and the site root had none. Linked from About beside the privacy
  policy.

## Pre-submission reviewer pass (2026-10-25)

Checked rather than assumed, so the first submission is the only one:

| Guideline | Check | Result |
|---|---|---|
| 2.1 completeness | Every outbound URL in the app resolved | 12/12 return 200 |
| 1.5 support URL | Contact info reachable from the Support URL | **Was missing** — site root had none; added `/support.html` |
| 2.3.8 metadata | Store name, home screen, wordmark, share text | All now say Dit Dah Me |
| 2.3.3 screenshots | Real captures of the app in use | 6/6, recaptured from the current build |
| 5.1.1 privacy | Policy reachable in-app and from the listing | About screen + listing URL, names the app |
| 5.1.1 camera | Gaze mode reachable in the shell? | No — gated twice; no `NSCameraUsageDescription` needed |
| 2.1 placeholders | Placeholder text or emails shipped? | No — only in tests and the unreachable Account form |
| 4.8 / 5.1.1(v) | Sign-in present? | No account layer in the bundle; verified by the build guard |
| 2.5.1 private API | External links trap the user in the webview? | No — verified on device, they open real Safari |

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

## The name — settled: **Dit Dah Me**

App Store Connect accepted `Dit Dah Me` on 2026-10-25. The app record exists
(App ID `6826897455`), version 1.0 is at "Prepare for Submission".

Kept here because it explains the listing and will matter at renewal time:
Connect rejected both `Ditdah` and `Ditdah: Morse Code Trainer`, because **four**
apps already use the mark.

| Existing app | Developer |
|---|---|
| Ditdah CW: Morse Code Trainer | Mustafa Sucu |
| DitDah Daily | Marc Walsh |
| Ditdah - Learn & Chat Morse | DongEun Shin |
| DitDah Decoder - Morse Code CW | Made by Tim LLC |

Apple blocks confusingly-similar names, not only exact duplicates, so any
"Ditdah + generic Morse descriptor" would have kept bouncing. `Dit Dah Me`
clears it: three words, ending in "Me", and it is the domain spoken aloud.

**Store name, home screen, and in-app wordmark.** The listing and the home
screen both say `Dit Dah Me` (set 2026-10-25, verified on the springboard: it
fits with no truncation). The splash and in-app wordmark still say **Ditdah**,
and the domain is **ditdah.me** — a deliberate pairing, since "ditdah.me" reads
aloud as "dit dah me". The description opens by tying the two together, so a
reviewer checking Guideline 2.3.8 (metadata accuracy) sees the connection
without having to infer it.

## Listing copy (paste into App Store Connect)

| Field | Value |
|---|---|
| Name (30) | `Dit Dah Me` — **chosen and accepted 2026-10-25** |
| Subtitle (30) | `Learn Morse by ear and by hand` |
| Category | Primary: Education · Secondary: Games |
| Support URL | `https://ditdah.me/support.html` |
| Privacy Policy URL | `https://ditdah.me/privacy.html` |
| Copyright | `© 2026 M. Ryan Byrd` |
| SKU | `ditdah-ios` · App ID `6826897455` |

**Promotional text (170):**

> Learn Morse code by ear and by hand: 26 letters, numbers, the Koch course,
> real on-air conversations, and two games. Works completely offline.

**Keywords (100):**

> morse,code,cw,ham,radio,telegraph,koch,amateur,learn,practice,dit,dah,sos,licence,operator

**Description:**

> Dit Dah Me is Ditdah, the Morse trainer at ditdah.me, on your phone. It
> teaches Morse code one dit at a time: start with a single letter, hear it, key
> it back, and build from there until you are holding a conversation in code.
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

## Age rating — 9+, confirmed

Answer **Infrequent/Mild** to *Cartoon or Fantasy Violence*, **No** to
everything else. That lands at 9+.

This is an audit, not a guess. Signal Squadron's invaders are blocky shapes you
"blast"; Cave of Echoes' monsters are "Dit Sprite", "Signal Wraith" and "The
Static". Grepping all game content and data for blood, gore, gun, weapon, corpse
and murder returns nothing.

Ryan's call (2026-10-25): take 9+ rather than risk a resubmit. That is the right
trade. Under-rating risks App Review flagging the rating as inaccurate, and each
rejection costs a full 1-3 day review cycle; 9+ costs essentially nothing in
discoverability for a learning app.

## Ryan's checklist (in order)

1. ~~Pick the name.~~ **Done** — `Dit Dah Me`, App ID `6826897455`, record
   created and version 1.0 is at "Prepare for Submission".
2. **Test on a real iPhone, with the silent switch ON.** This is the one thing
   the Simulator cannot check, and it is the highest-likelihood defect: if the
   `AVAudioSession` category did not take, the app is silent for anyone whose
   phone is on silent, which reads as "the app is broken."
3. ~~Create the app record.~~ **Done** — bundle `com.ryanbyrd.ditdah`.
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
