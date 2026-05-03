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

  return process.env.EXPO_PUBLIC_WEB_URL || `http://${host}:5173`;
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

const STAFF_PAGE_TITLES = {
  '/staff-login': 'Staff Login',
  '/staff-register': 'Staff Register',
  '/admin-dashboard': 'Admin Dashboard',
  '/product-management-dashboard': 'Product Management',
  '/order-management-dashboard': 'Order Management',
  '/inventory-dashboard': 'Inventory',
  '/customer-care-dashboard': 'Customer Care',
  '/loyalty-management-dashboard': 'Loyalty Management'
};

function getStaffPageTitle(pathname) {
  if (!pathname) return null;
  if (STAFF_PAGE_TITLES[pathname]) return STAFF_PAGE_TITLES[pathname];
  const match = Object.keys(STAFF_PAGE_TITLES).find((prefix) => pathname.startsWith(`${prefix}/`));
  return match ? STAFF_PAGE_TITLES[match] : null;
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
  const css = [
    '.top-bar { display: none !important; }',
    '.header { display: none !important; }',
    'header { display: none !important; }',
    'footer { display: none !important; }',
    '.footer { display: none !important; }',
    '.footer-content { display: none !important; }',
    '.footer-section { display: none !important; }',
    '.footer-links { display: none !important; }',
    '.footer-bottom { display: none !important; }',
    '.nav { display: none !important; }',
    '.header-icons { display: none !important; }',
  ].join('\n');

  return `
    (function () {
      function hideHeaderFooter() {
        try {
          var style = document.getElementById('saranya-mobile-header-footer-hide');
          if (style) {
            style.remove();
          }
          var newStyle = document.createElement('style');
          newStyle.id = 'saranya-mobile-header-footer-hide';
          newStyle.textContent = ${JSON.stringify(css)};
          document.head.appendChild(newStyle);
          
          document.querySelectorAll('.top-bar, .header, header, footer, .footer, .footer-content, .footer-section, .footer-links, .footer-bottom, .nav, .header-icons').forEach(function (el) {
            if (el && el.style) {
              el.style.setProperty('display', 'none', 'important');
            }
          });
        } catch (error) {
          console.warn('Failed to inject mobile header/footer styles', error);
        }
      }

      function postCartCount() {
        try {
          if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
            return;
          }
          var cartRaw = localStorage.getItem('saranyaCart') || '[]';
          var cart = JSON.parse(cartRaw);
          var count = Array.isArray(cart)
            ? cart.reduce(function (sum, item) {
                return sum + Number((item && item.quantity) || 0);
              }, 0)
            : 0;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cartCount', count: count }));
        } catch (_error) {
          // Ignore parse and storage access errors.
        }
      }

      function postCustomerAuth() {
        try {
          if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
            return;
          }
          fetch('/api/customer/me', { credentials: 'same-origin' })
            .then(function (response) {
              var ok = response && response.ok;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'customerAuth', authenticated: !!ok }));
            })
            .catch(function () {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'customerAuth', authenticated: false }));
            });
        } catch (_error) {
          // Ignore.
        }
      }

      hideHeaderFooter();
      postCartCount();
      postCustomerAuth();
      setTimeout(hideHeaderFooter, 100);
      setTimeout(hideHeaderFooter, 500);
      setTimeout(hideHeaderFooter, 1000);
      setTimeout(postCartCount, 100);
      setTimeout(postCartCount, 500);
      setTimeout(postCartCount, 1000);
      setTimeout(postCustomerAuth, 300);

      if (window.__saranyaCartCountInterval) {
        clearInterval(window.__saranyaCartCountInterval);
      }
      window.__saranyaCartCountInterval = setInterval(postCartCount, 1000);

      window.addEventListener('storage', postCartCount);

      document.addEventListener('DOMContentLoaded', hideHeaderFooter);
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
  const [cartCount, setCartCount] = useState(0);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const webViewRef = useRef(null);
  const webUrl = useMemo(() => getLanWebUrl(), []);
  const currentWebUrl = useMemo(() => joinUrl(webUrl, webRoute), [webRoute, webUrl]);
  const shouldShowBottomBar = !isStaffRoute(currentPath) && !isCustomerAuthRoute(currentPath);
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

  const openProfileLogin = (route, title) => {
    setActiveTab(TAB_PROFILE);
    setIsProfileScreen(false);
    setHasLoadError(false);
    setHasLoadedOnce(false);
    setCanGoBack(false);
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
        {currentPath !== HOME_ROUTE && (
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
        )}
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
              <Text style={styles.secondaryCardTitle}>Staff Login</Text>
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
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data || '{}');
                if (data.type === 'cartCount') {
                  setCartCount(Number(data.count || 0));
                }
                if (data.type === 'customerAuth') {
                  setIsCustomerLoggedIn(Boolean(data.authenticated));
                }
              } catch (_error) {
                // Ignore unrelated WebView messages.
              }
            }}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              const nextPath = getPathname(navState.url);
              if (nextPath) {
                setCurrentPath(nextPath);
                if (isStaffRoute(nextPath)) {
                  setIsProfileScreen(false);
                  const staffTitle = getStaffPageTitle(nextPath);
                  if (staffTitle) {
                    setPageTitle(staffTitle);
                  }
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

      {shouldShowBottomBar ? (
        isCustomerLoggedIn ? (
          <View style={styles.customerBottomBar}>
            <NavButton
              label="Home"
              active={activeTab === TAB_HOME && !isProfileScreen && webRoute === HOME_ROUTE}
              onPress={() => openTab(TAB_HOME)}
              icon="home"
              compact
            />
            <NavButton
              label="Shop"
              active={currentPath === '/customer-shop'}
              onPress={() => {
                setActiveTab(TAB_SEARCH);
                setIsProfileScreen(false);
                setWebRoute('/customer-shop');
                setCurrentPath('/customer-shop');
                setWebViewKey((prev) => prev + 1);
                setPageTitle('Shop');
              }}
              icon="shopping-bag"
              compact
            />
            <NavButton
              label="Cart"
              active={currentPath === '/customer-cart'}
              onPress={() => {
                setActiveTab(TAB_SEARCH);
                setIsProfileScreen(false);
                setWebRoute('/customer-cart');
                setCurrentPath('/customer-cart');
                setWebViewKey((prev) => prev + 1);
                setPageTitle('Cart');
              }}
              icon="shopping-cart"
              compact
              badge={cartCount}
            />
            <NavButton
              label="Orders"
              active={currentPath === '/customer-orders'}
              onPress={() => {
                setActiveTab(TAB_SEARCH);
                setIsProfileScreen(false);
                setWebRoute('/customer-orders');
                setCurrentPath('/customer-orders');
                setWebViewKey((prev) => prev + 1);
                setPageTitle('My Orders');
              }}
              icon="clipboard"
              compact
            />
            <NavButton
              label="Account"
              active={currentPath === '/customer-dashboard'}
              onPress={() => {
                setActiveTab(TAB_PROFILE);
                setIsProfileScreen(false);
                setWebRoute('/customer-dashboard');
                setCurrentPath('/customer-dashboard');
                setWebViewKey((prev) => prev + 1);
                setPageTitle('Account');
              }}
              icon="user"
              compact
            />
          </View>
        ) : (
          <View style={styles.bottomBar}>
            <NavButton
              label="Home"
              active={activeTab === TAB_HOME && !isProfileScreen && webRoute === HOME_ROUTE}
              onPress={() => openTab(TAB_HOME)}
              icon="home"
              compact
            />
            <NavButton
              label="Shop"
              active={activeTab === TAB_SEARCH && !isProfileScreen}
              onPress={() => openTab(TAB_SEARCH)}
              icon="search"
              compact
              badge={cartCount}
            />
            <NavButton
              label="Profile"
              active={activeTab === TAB_PROFILE}
              onPress={() => openTab(TAB_PROFILE)}
              icon="user"
              compact
            />
          </View>
        )
      ) : null}
    </SafeAreaView>
  );
}

function NavButton({ label, active, onPress, icon, compact, badge }) {
  return (
    <Pressable style={[styles.tabButton, compact ? styles.tabButtonCompact : styles.tabButtonWide, active && styles.tabButtonActive]} onPress={onPress}>
      <View style={{ position: 'relative' }}>
        <Feather name={icon} size={18} color={active ? '#b08d3b' : '#6b7280'} />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
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
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#b08d3b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
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
  secondaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
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
