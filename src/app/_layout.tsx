import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FiraSans_300Light_Italic, FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_700Bold_Italic, useFonts } from '@expo-google-fonts/fira-sans';
import { color, space } from '../theme';
import { useApp } from '../store';
import { handleAuthUrl, hasSession, initSession, refreshMe } from '../api';
import { startSync } from '../sync';
import { IconButton } from '../components/ui';
import { Processing } from '../components/Processing';
import { MenuDrawer } from '../components/MenuDrawer';
import { AuthScreen, NewPasswordScreen } from '../screens/AuthScreen';

/** On the web the app is a phone-width column centred on the page; on the iPhone it fills the screen. */
function Shell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f1ecf3' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, overflow: 'hidden', backgroundColor: color.paper, boxShadow: '0 0 40px rgba(125, 0, 153, 0.18)' } as any}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_300Light_Italic, FiraSans_700Bold_Italic });
  const { user, setMenu, processing, recovery } = useApp();
  const hydrated = useApp.persist.hasHydrated();
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const signedIn = !!user;

  // Read the saved session once; a saved profile without a session means the person must sign in again.
  useEffect(() => {
    if (!hydrated) return;
    initSession().then(() => {
      if (useApp.getState().user && !hasSession()) useApp.getState().signedOut();
      setReady(true);
    });
  }, [hydrated]);

  // Links from confirmation and password-reset emails (idealizator:// on the iPhone, the /auth page on the web).
  useEffect(() => {
    if (!ready) return;
    const open = async (url: string | null) => {
      if (url) await handleAuthUrl(url).catch(() => null);
      if (url && /\/auth\b/.test(url)) router.replace('/');
    };
    open(Platform.OS === 'web' ? window.location.href : null);
    if (Platform.OS !== 'web') Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', ({ url }) => { open(url); });
    return () => sub.remove();
  }, [ready]);

  useEffect(() => {
    if (!signedIn || !ready) return;
    refreshMe().catch(() => {});
    return startSync();
  }, [signedIn, ready]);

  let body: React.ReactNode;
  if (!fontsLoaded || !hydrated || !ready) {
    body = <View style={{ flex: 1, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={color.paper} /></View>;
  } else if (recovery) {
    body = <NewPasswordScreen />;
  } else if (!user) {
    body = <AuthScreen />;
  } else {
    const onViolet = pathname === '/';
    body = (
      <>
        <StatusBar style={onViolet || processing ? 'light' : 'dark'} />
        <SafeAreaView style={{ flex: 1, backgroundColor: onViolet ? color.violet : color.paper }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[2] }}>
            <IconButton name="menu" label="Open menu" tint={onViolet ? color.paper : color.violet} onPress={() => setMenu(true)} />
          </View>
          <Slot />
        </SafeAreaView>
        <MenuDrawer />
        {processing ? <Processing label={processing} /> : null}
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <Shell>{body}</Shell>
    </SafeAreaProvider>
  );
}
