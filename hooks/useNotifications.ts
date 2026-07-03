/**
 * useNotifications
 * - Requests push notification permissions
 * - Gets Expo push token
 * - Saves token to Supabase push_tokens table
 * - Sets up foreground notification handler
 *
 * Gracefully no-ops in Expo Go where expo-device native module is unavailable.
 */
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";

// expo-device uses a native module not available in Expo Go — guard it
let Device: { isDevice: boolean } = { isDevice: false };
try {
  Device = require("expo-device");
} catch {
  console.warn("[Notifications] expo-device not available (Expo Go). Push notifications disabled.");
}

// How foreground notifications appear while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const { session } = useAuthStore();
  const listenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    registerForPushNotifications(session.user.id);

    listenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        console.log("[Notifications] tapped:", data);
      }
    );

    return () => {
      listenerRef.current?.remove();
    };
  }, [session?.user.id]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.warn("[Notifications] Push notifications require a physical device with native build.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Notifications] Permission not granted.");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    const token = tokenData.data;

    await supabase
      .from("push_tokens")
      .upsert(
        { user_id: userId, token, platform: Platform.OS },
        { onConflict: "user_id,token" }
      );

    console.log("[Notifications] Push token registered:", token.slice(0, 20) + "…");
  } catch (e) {
    console.warn("[Notifications] Failed to get push token:", e);
  }
}
