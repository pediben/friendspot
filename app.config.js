export default {
  expo: {
    name: "Friendzone",
    slug: "friendzone",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0F0F1A",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.friendzone.app",
      buildNumber: "1",
      infoPlist: {
        NSMicrophoneUsageDescription:
          "Friendzone uses your microphone to record voice notes for your friend circles.",
        NSContactsUsageDescription:
          "Friendzone checks your contacts to show which friends are already on the app. Nothing is uploaded without your permission.",
        NSPhotoLibraryUsageDescription:
          "Friendzone accesses your photos to share moments with your circles.",
        NSCameraUsageDescription:
          "Friendzone uses your camera to capture moments.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F0F1A",
      },
      package: "com.friendzone.app",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#7C3AED",
        },
      ],
      [
        "expo-contacts",
        {
          contactsPermission:
            "Allow Friendzone to access your contacts to find friends already on the app.",
        },
      ],
    ],
    scheme: "friendzone",
    experiments: {
      typedRoutes: true,
    },
  },
};
