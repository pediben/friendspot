export default {
  expo: {
    name: "Friendspot",
    slug: "friendspot",
    owner: "pediben1986",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.friendspot.app",
      buildNumber: "2",
      associatedDomains: ["applinks:friendspot.online"],
      infoPlist: {
        NSMicrophoneUsageDescription:
          "Friendspot uses your microphone to record voice notes for your friend circles.",
        NSContactsUsageDescription:
          "Friendspot checks your contacts to show which friends are already on the app. Nothing is uploaded without your permission.",
        NSPhotoLibraryUsageDescription:
          "Friendspot accesses your photos to share moments with your circles.",
        NSCameraUsageDescription:
          "Friendspot uses your camera to capture moments.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0C0D0B",
      },
      package: "com.friendspot.app",
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
            "Allow Friendspot to access your contacts to find friends already on the app.",
        },
      ],
    ],
    scheme: "friendspot",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "59303b6b-1e01-43ec-a9c9-4593716bdd2b",
      },
    },
  },
};
