import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_300Light_Italic, FiraSans_700Bold_Italic } from '@expo-google-fonts/fira-sans';
import { color, space } from './src/theme';
import { useApp } from './src/store';
import * as Linking from 'expo-linking';
import { handleAuthUrl, hasSession, initSession, refreshMe } from './src/api';
import { startSync } from './src/sync';
import { IconButton } from './src/components/ui';
import { Processing } from './src/components/Processing';
import { MenuDrawer } from './src/components/MenuDrawer';
import { AuthScreen, NewPasswordScreen } from './src/screens/AuthScreen';
import { Record } from './src/screens/Record';
import { Ideas } from './src/screens/Ideas';
import { Result } from './src/screens/Result';
import { Settings } from './src/screens/Settings';

export default function App() {
  const [fontsLoaded] = useFonts({ FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_300Light_Italic, FiraSans_700Bold_Italic });
  const { user, route, setMenu, processing, recovery } = useApp();
  const hydrated = useApp.persist.hasHydrated();
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const signedIn = !!user;

  // Read the Keychain session once; a saved profile without a session means the person must sign in again.
  useEffect(() => {
    if (!hydrated) return;
    initSession().then(() => {
      if (useApp.getState().user && !hasSession()) useApp.getState().signedOut();
      setTokenLoaded(true);
    });
  }, [hydrated]);

  // Links from confirmation and password-reset emails open the app (idealizator:// scheme).
  useEffect(() => {
    if (!tokenLoaded) return;
    Linking.getInitialURL().then((u) => { if (u) handleAuthUrl(u).catch(() => {}); });
    const sub = Linking.addEventListener('url', ({ url }) => { handleAuthUrl(url).catch(() => {}); });
    return () => sub.remove();
  }, [tokenLoaded]);

  useEffect(() => {
    if (!signedIn || !tokenLoaded) return;
    refreshMe().catch(() => {});
    return startSync();
  }, [signedIn, tokenLoaded]);

  if (!fontsLoaded || !hydrated || !tokenLoaded) {
    return <View style={{ flex: 1, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={color.paper} /></View>;
  }
  if (recovery) return <SafeAreaProvider><StatusBar style="dark" /><NewPasswordScreen /></SafeAreaProvider>;
  if (!user) return <SafeAreaProvider><StatusBar style="dark" /><AuthScreen /></SafeAreaProvider>;

  const onViolet = route === 'record';
  return (
    <SafeAreaProvider>
      <StatusBar style={onViolet || processing ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1, backgroundColor: onViolet ? color.violet : color.paper }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[2] }}>
          <IconButton name="menu" label="Open menu" tint={onViolet ? color.paper : color.violet} onPress={() => setMenu(true)} />
        </View>
        {route === 'record' && <Record />}
        {route === 'ideas' && <Ideas />}
        {route === 'analyzed' && <Ideas analyzedOnly />}
        {route === 'result' && <Result />}
        {route === 'settings' && <Settings />}
      </SafeAreaView>
      <MenuDrawer />
      {processing ? <Processing label={processing} /> : null}
    </SafeAreaProvider>
  );
}
