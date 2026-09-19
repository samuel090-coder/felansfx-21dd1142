import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.p76ac4beb48ff4e91b62c9071ff36c1ea",
  appName: "felansfx",
  webDir: "dist",
  // Live-reload against the Lovable sandbox while developing on a device.
  // Remove the `server` block before building for the stores.
  server: {
    url: "https://76ac4beb-48ff-4e91-b62c-9071ff36c1ea.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    // Deep links / app links are declared per platform after `npx cap add`.
    allowMixedContent: true,
  },
};

export default config;
