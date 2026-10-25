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
    // otherwise a blank webview shows while the JS bundle boots. The 5s
    // launchShowDuration is only a fail-safe if JS never boots at all.
    SplashScreen: {
      launchShowDuration: 5000,
      launchAutoHide: true,
      backgroundColor: '#14152a',
      showSpinner: true,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffb020',
    },
  },
};

export default config;
