import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if splash was already prevented from auto hiding.
});

const FALLBACK_WEB_URL = 'http://localhost:3000';
const TAB_HOME = 'home';
const TAB_SEARCH = 'search';
const TAB_PROFILE = 'profile';
const HOME_ROUTE = '/';
const SEARCH_ROUTE = '/customer-shop';
const CUSTOMER_LOGIN_ROUTE = '/customer-login';
const STAFF_LOGIN_ROUTE = '/staff-login';
const STAFF_ROUTE_PREFIXES = [
  '/staff-login',
  '/staff-register',
  '/admin-dashboard',
  '/product-management-dashboard',
  '/order-management-dashboard',
  '/inventory-dashboard',
  '/customer-care-dashboard',
  '/loyalty-management-dashboard'
]
const CUSTOMER_BOTTOM_ROUTES = [
  '/customer-dashboard',
  '/customer-shop',
  '/customer-cart',
  '/customer-orders',
  '/customer-support',
  '/customer-loyalty'
];
const CUSTOMER_AUTH_ROUTES = [
  '/customer-login',
  '/customer-register',
  '/customer-reset-password'
];

const tabConfig = {
  [TAB_HOME]: { label: 'Home', route: HOME_ROUTE },
  [TAB_SEARCH]: { label: 'Search', route: SEARCH_ROUTE },
  [TAB_PROFILE]: { label: 'Profile', route: null },
};

function getLanWebUrl() {
  const expoUrl = Linking.createURL('/');
  const match = expoUrl.match(/^[a-z]+:\/\/([^/:]+)/i);
  const host = match?.[1];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return process.env.EXPO_PUBLIC_WEB_URL || FALLBACK_WEB_URL;
  }

  return process.env.EXPO_PUBLIC_WEB_URL || `http://${host}:3000`;
}

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function isStaffRoute(pathname) {
  return STAFF_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isCustomerBottomRoute(pathname) {
  return CUSTOMER_BOTTOM_ROUTES.includes(pathname);
}

function isCustomerAuthRoute(pathname) {
  return CUSTOMER_AUTH_ROUTES.includes(pathname);
}

function isCustomerPage(pathname) {
  return pathname === '/customer-dashboard'
    || pathname === '/customer-shop'
    || pathname === '/customer-cart'
    || pathname === '/customer-orders'
    || pathname === '/customer-support'
    || pathname === '/customer-loyalty';
}

function getHideCustomerHeaderScript(pathname) {
  if (!isCustomerPage(pathname)) {
    return 'true;';
  }

  const css = [
    '.top-bar,',
    '.header .nav,',
    '.header .header-icons,',
    '.header .logo,',
    '.header-icons,',
    '.nav {',
    '  display: none !important;',
    '  visibility: hidden !important;',
    '}',
    '.header {',
    '  min-height: 0 !important;',
    '  height: 0 !important;',
    '  padding: 0 !important;',
    '  margin: 0 !important;',
    '  border: 0 !important;',
    '  overflow: hidden !important;',
    '}',
    'main, .main, .dashboard-container, .container {',
    '  margin-top: 0 !important;',
    '  padding-top: 0 !important;',
    '}',
  ].join('\n');

  return `
    (function () {
      try {
        var existing = document.getElementById('saranya-mobile-customer-header-hide');
        if (!existing) {
          var style = document.createElement('style');
          style.id = 'saranya-mobile-customer-header-hide';
          style.textContent = ${JSON.stringify(css)};
          document.head.appendChild(style);
        }
      } catch (error) {
        console.warn('Failed to inject mobile customer styles', error);
      }
    })();
    true;
  `;
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_HOME);
  const [webRoute, setWebRoute] = useState(HOME_ROUTE);
  const [isProfileScreen, setIsProfileScreen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [pageTitle, setPageTitle] = useState('Home');
  const [currentPath, setCurrentPath] = useState(HOME_ROUTE);
  const [isCustomerSession, setIsCustomerSession] = useState(false);
  const webViewRef = useRef(null);
  const webUrl = useMemo(() => getLanWebUrl(), []);
  const currentWebUrl = useMemo(() => joinUrl(webUrl, webRoute), [webRoute, webUrl]);
  const shouldShowCustomerBar = isCustomerBottomRoute(currentPath);
  const shouldShowGenericBar = !shouldShowCustomerBar && !isStaffRoute(currentPath) && !isCustomerAuthRoute(currentPath);
  const injectedMobileCss = useMemo(() => getHideCustomerHeaderScript(currentPath), [currentPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {
        // Ignore hide errors if splash is already hidden.
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || hasLoadedOnce || hasLoadError) {
      return;
    }

    const loadTimeout = setTimeout(() => {
      setHasLoadError(true);
    }, 12000);

    return () => clearTimeout(loadTimeout);
  }, [isReady, hasLoadedOnce, hasLoadError, webViewKey]);

  const openTab = (tab) => {
    setActiveTab(tab);
    setHasLoadError(false);
    setHasLoadedOnce(false);
    setCanGoBack(false);

    if (tab === TAB_PROFILE) {
      setIsProfileScreen(true);
      setWebRoute(HOME_ROUTE);
      setCurrentPath(HOME_ROUTE);
      setWebViewKey((prev) => prev + 1);
      setPageTitle('Profile');
      return;
    }

    setIsProfileScreen(false);
    setWebRoute(tabConfig[tab].route);
    setCurrentPath(tabConfig[tab].route);
    setWebViewKey((prev) => prev + 1);
    setPageTitle(tabConfig[tab].label);
  };

  const openCustomerRoute = (route, title) => {
    setActiveTab(route);
    setHasLoadError(false);
    setHasLoadedOnce(false);
    setCanGoBack(false);
    setIsCustomerSession(true);
    setIsProfileScreen(false);
    setWebRoute(route);
    setCurrentPath(route);
    setWebViewKey((prev) => prev + 1);
    setPageTitle(title);
  };

  const openProfileLogin = (route, title) => {
    setActiveTab(TAB_PROFILE);
    setIsProfileScreen(false);
    setHasLoadError(false);
    setHasLoadedOnce(false);
    setCanGoBack(false);
    setIsCustomerSession(false);
    setWebRoute(route);
    setCurrentPath(route);
    setWebViewKey((prev) => prev + 1);
    setPageTitle(title);
  };

  const handleBackPress = () => {
    if (!isProfileScreen && canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }

    if (!isProfileScreen && activeTab === TAB_PROFILE) {
      setIsProfileScreen(true);
      setWebRoute(HOME_ROUTE);
      setPageTitle('Profile');
      setWebViewKey((prev) => prev + 1);
      return true;
    }

    if (activeTab !== TAB_HOME) {
      openTab(TAB_HOME);
      return true;
    }

    return false;
  };

  if (!isReady) {
    return null;
  }

  if (hasLoadError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Unable to load website</Text>
        <Text style={styles.errorBody}>Make sure your phone and computer are on the same Wi-Fi and the backend server is running.</Text>
        <Text style={styles.errorBody}>Current URL: {webUrl}</Text>
        <Text style={styles.errorBody}>If needed, set EXPO_PUBLIC_WEB_URL to your LAN URL, for example: http://192.168.1.10:3000</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setHasLoadError(false);
            setHasLoadedOnce(false);
            setWebViewKey((prev) => prev + 1);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {isProfileScreen ? (
          <ScrollView contentContainerStyle={styles.profileContainer}>
            <Text style={styles.profileTitle}>Account</Text>
            <Text style={styles.profileSubtitle}>Choose how you want to continue.</Text>

            <Pressable style={styles.primaryCard} onPress={() => openProfileLogin(CUSTOMER_LOGIN_ROUTE, 'Customer Login')}>
              <Text style={styles.cardTitle}>Customer Login</Text>
              <Text style={styles.cardText}>Open customer sign in and continue to shopping, orders, and support.</Text>
            </Pressable>

            <Pressable style={styles.secondaryCard} onPress={() => openProfileLogin(STAFF_LOGIN_ROUTE, 'Staff Login')}>
              <Text style={styles.cardTitle}>Staff Login</Text>
              <Text style={styles.secondaryCardText}>Open staff sign in for dashboard, inventory, and order management.</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ uri: currentWebUrl }}
            style={styles.webview}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScriptBeforeContentLoaded={injectedMobileCss}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              const nextPath = getPathname(navState.url);
              if (nextPath) {
                setCurrentPath(nextPath);
                if (nextPath === '/customer-dashboard' || nextPath === '/customer-shop' || nextPath === '/customer-cart' || nextPath === '/customer-orders' || nextPath === '/customer-support' || nextPath === '/customer-loyalty') {
                  setIsCustomerSession(true);
                }
                if (isStaffRoute(nextPath)) {
                  setIsProfileScreen(false);
                }

                if (webViewRef.current && isCustomerPage(nextPath)) {
                  webViewRef.current.injectJavaScript(getHideCustomerHeaderScript(nextPath));
                }
              }
            }}
            onLoadEnd={() => setHasLoadedOnce(true)}
            onHttpError={() => setHasLoadError(true)}
            onError={() => setHasLoadError(true)}
          />
        )}
      </View>

      {shouldShowCustomerBar && isCustomerSession ? (
        <View style={styles.customerBottomBar}>
          {[
            { label: 'Shop', route: '/customer-shop', icon: 'shopping-bag', title: 'Shop' },
            { label: 'Cart', route: '/customer-cart', icon: 'shopping-cart', title: 'Cart' },
            { label: 'Orders', route: '/customer-orders', icon: 'clipboard', title: 'My Orders' },
            { label: 'Support', route: '/customer-support', icon: 'life-buoy', title: 'Support' },
            { label: 'Account', route: '/customer-dashboard', icon: 'user', title: 'Account' },
          ].map((item) => (
            <NavButton
              key={item.route}
              label={item.label}
              active={currentPath === item.route}
              onPress={() => openCustomerRoute(item.route, item.title)}
              icon={item.icon}
              compact
            />
          ))}
        </View>
      ) : shouldShowGenericBar ? (
        <View style={styles.bottomBar}>
          <NavButton
            label="Home"
            active={activeTab === TAB_HOME && !isProfileScreen && webRoute === HOME_ROUTE}
            onPress={() => openTab(TAB_HOME)}
            icon="home"
            compact
          />
          <NavButton
            label="Search"
            active={activeTab === TAB_SEARCH && !isProfileScreen}
            onPress={() => openTab(TAB_SEARCH)}
            icon="search"
            compact
          />
          <NavButton
            label="Profile"
            active={activeTab === TAB_PROFILE}
            onPress={() => openTab(TAB_PROFILE)}
            icon="user"
            compact
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function NavButton({ label, active, onPress, icon, compact }) {
  return (
    <Pressable style={[styles.tabButton, compact ? styles.tabButtonCompact : styles.tabButtonWide, active && styles.tabButtonActive]} onPress={onPress}>
      <Feather name={icon} size={18} color={active ? '#b08d3b' : '#6b7280'} />
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: '#111827',
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingBottom: 10,
    paddingTop: 8,
  },
  customerBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingBottom: 2,
    paddingTop: 2,
    minHeight: 54,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabButtonCompact: {
    flex: 1,
  },
  tabButtonWide: {
    width: 86,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fff7e6',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 3,
  },
  tabButtonTextActive: {
    color: '#b08d3b',
  },
  profileContainer: {
    padding: 20,
    gap: 14,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
  },
  profileSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    marginBottom: 8,
  },
  primaryCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
  },
  secondaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#d1d5db',
  },
  secondaryCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
  },
  errorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1f2937',
  },
  errorBody: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    color: '#374151',
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
