export default ({ config }) => ({
  ...config,
  slug: "quicksecure",
  name: "QuickSecure",
  extra: {
    ...(config.extra || {}),
    eas: { projectId: "0ea411e0-05d1-47d2-894d-cee9ef860dac" }
  },
  ios: {
    ...(config.ios || {}),
    supportsTablet: true,
    bundleIdentifier: "com.quicksecurellc.mobile",
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          "api.quicksecurellc.com": {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionMinimumTLSVersion: "TLSv1.2"
          },
          "staging-api.quicksecurellc.com": {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionMinimumTLSVersion: "TLSv1.2"
          }
        }
      },
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    ...(config.android || {}),
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1a1a1a"
    },
    package: "com.quicksecurellc.mobile",
    permissions: [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.WAKE_LOCK",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION"
    ]
  },
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1a1a1a"
  },
  assetBundlePatterns: ["**/*"],
  web: {
    ...(config.web || {}),
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-local-authentication",
    "expo-location",
    "expo-notifications"
  ],
  doctor: {
    reactNativeDirectoryCheck: {
      listUnknownPackages: false
    }
  },
  owner: "ronkumar1212",
  version: "1.0.0",
  orientation: "portrait"
}); 