import type { CapacitorConfig } from '@capacitor/cli';

// iOS shell config. See docs/IOS-PRD.md for the reasoning behind each choice.
const config: CapacitorConfig = {
  appId: 'com.ryanbyrd.ditdah',
  appName: 'Dit Dah Me',
  webDir: 'dist',
  // Matches the theme-color and the top of the twilight gradient, so there is
  // no white flash behind the webview before the app paints.
  backgroundColor: '#14152a',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    // Route window.fetch through native URLSession so calls to ditdah.me/api
    // are not blocked by WKWebView CORS. No server changes needed.
    CapacitorHttp: { enabled: true },
    // Hold the branded splash until main.tsx hides it after first paint,
    // otherwise a blank webview shows while the JS bundle boots.
    //
    // launchShowDuration is ONLY a fail-safe for a boot that never happens, so
    // it must sit above a real cold start. 5s did not: on Ryan's physical
    // iPhone (2026-10-27) WebContent took 2.37s and the GPU process 2.20s
    // before the bundle even parsed, so the splash auto-hid first and Capacitor
    // logged "SplashScreen was automatically hidden after default timeout".
    // The simulator never showed this because it boots faster than a device.
    SplashScreen: {
      launchShowDuration: 12000,
      launchAutoHide: true,
      backgroundColor: '#14152a',
      showSpinner: true,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffb020',
    },
  },
};

export default config;
