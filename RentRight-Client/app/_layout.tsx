import "@/global.css";
import { useCallback } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Entypo, FontAwesome, Ionicons } from "@expo/vector-icons";
import { AuthProvider } from "../_context/AuthContext";
import { CartProvider } from "../_context/CartContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Entypo.font,
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  const onLayoutRootView = useCallback(() => {
    // Keep the root layout stable while fonts load.
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* First screen */}
          <Stack.Screen name="index" />

          {/* Auth screens */}
          <Stack.Screen name="(auth)" />

          {/* Tabs folder */}
          <Stack.Screen name="(tabs)" />

          {/* Product details - query parameters */}
          <Stack.Screen name="details/index" options={{ animationEnabled: true }} />

          {/* Member management screens */}
          <Stack.Screen name="post-product" options={{ animationEnabled: true }} />
          <Stack.Screen name="my-posts" options={{ animationEnabled: true }} />

          {/* Bookings screen */}
          <Stack.Screen name="bookings/index" options={{ animationEnabled: true }} />

          {/* Checkout screen */}
          <Stack.Screen name="checkout" options={{ animationEnabled: true }} />

          {/* Message screen - dynamic route */}
          <Stack.Screen name="message/[id]" options={{ animationEnabled: true }} />

          {/* Call screen - dynamic route */}
          <Stack.Screen name="call/[id]" options={{ animationEnabled: true }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}