import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const MIN_SPLASH_TIME = 1600;
const ENV_WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL || "").trim();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash screen is already handled.
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("intro");
  const [webError, setWebError] = useState("");
  const [webKey, setWebKey] = useState(0);

  const webBaseUrl = useMemo(() => {
    if (ENV_WEB_BASE_URL) {
      return ENV_WEB_BASE_URL.replace(/\/$/, "");
    }

    const hostUri = Constants.expoConfig?.hostUri || "";
    const host = hostUri.split(":")[0] || "";

    if (!host) {
      return "";
    }

    return `http://${host}:5173`;
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setReady(true);
      await SplashScreen.hideAsync();
    }, MIN_SPLASH_TIME);

    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return null;
  }

  if (currentScreen === "staffLogin" || currentScreen === "customerLogin") {
    const isStaff = currentScreen === "staffLogin";
    const loginPath = isStaff ? "/staff-login" : "/customer-login";
    const targetUrl = webBaseUrl ? `${webBaseUrl}${loginPath}` : "";

    const retryLoad = () => {
      setWebError("");
      setWebKey((prev) => prev + 1);
    };

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <StatusBar barStyle="dark-content" backgroundColor="#f9f5ef" />
          <View style={styles.webHeader}>
            <Pressable style={styles.smallBackButton} onPress={() => setCurrentScreen("landing")}>
              <Text style={styles.smallBackButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.webTitle}>{isStaff ? "Staff Login" : "Customer Login"}</Text>
            <View style={styles.webHeaderSpacer} />
          </View>

          {!targetUrl ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Web URL not configured</Text>
              <Text style={styles.errorText}>
                Set EXPO_PUBLIC_WEB_BASE_URL in mobile/.env to your laptop LAN address, example:
                http://192.168.x.x:5173
              </Text>
            </View>
          ) : webError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Cannot connect to server</Text>
              <Text style={styles.errorText}>Open this URL in your phone browser to test: {targetUrl}</Text>
              <Pressable style={styles.primaryButton} onPress={retryLoad}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              key={webKey}
              source={{ uri: targetUrl }}
              style={styles.webView}
              onError={(event) => {
                const description = event.nativeEvent?.description || "Unknown network error";
                setWebError(description);
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (currentScreen === "landing") {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <StatusBar barStyle="dark-content" backgroundColor="#f9f5ef" />
          <View style={styles.container}>
            <Text style={styles.landingTitle}>Welcome to Saranya Store</Text>
            <Text style={styles.landingSubtitle}>Browse products, check offers, and shop like normal.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setWebError("");
                setCurrentScreen("customerLogin");
              }}
            >
              <Text style={styles.primaryButtonText}>Shop Now</Text>
            </Pressable>
            <Pressable
              style={styles.secondarySolidButton}
              onPress={() => {
                setWebError("");
                setCurrentScreen("staffLogin");
              }}
            >
              <Text style={styles.secondarySolidButtonText}>Staff</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setCurrentScreen("intro")}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f5ef" />
        <View style={styles.container}>
          <Image source={require("./assets/SaranyaLOGO.jpg")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Saranya Jewellery</Text>
          <Text style={styles.subtitle}>Trusted craftsmanship. Timeless beauty.</Text>
          <Pressable style={styles.primaryButton} onPress={() => setCurrentScreen("landing")}>
            <Text style={styles.primaryButtonText}>Enter Store</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f5ef",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f9f5ef",
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    color: "#8b6b27",
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 30,
    fontSize: 16,
    color: "#4d4538",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#b88a2a",
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  landingTitle: {
    fontSize: 28,
    color: "#8b6b27",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  landingSubtitle: {
    fontSize: 16,
    color: "#4d4538",
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
    lineHeight: 22,
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#b88a2a",
  },
  secondaryButtonText: {
    color: "#8b6b27",
    fontSize: 15,
    fontWeight: "600",
  },
  secondarySolidButton: {
    marginTop: 12,
    backgroundColor: "#3e2f14",
    paddingVertical: 11,
    paddingHorizontal: 42,
    borderRadius: 999,
  },
  secondarySolidButtonText: {
    color: "#fff8e8",
    fontSize: 15,
    fontWeight: "600",
  },
  webHeader: {
    height: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e7dcc6",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9f5ef",
  },
  smallBackButton: {
    borderWidth: 1,
    borderColor: "#b88a2a",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  smallBackButtonText: {
    color: "#8b6b27",
    fontSize: 14,
    fontWeight: "600",
  },
  webHeaderSpacer: {
    width: 56,
  },
  webTitle: {
    color: "#8b6b27",
    fontSize: 18,
    fontWeight: "700",
  },
  webView: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f9f5ef",
    gap: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#8b6b27",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4d4538",
    textAlign: "center",
  },
});
