import { ActivityIndicator, View } from 'react-native';
import { color } from '../theme';

// The landing page for links in confirmation and reset emails. The root layout reads the tokens from the URL, then moves on.
export default function AuthCallback() {
  return <View style={{ flex: 1, backgroundColor: color.violet, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={color.paper} /></View>;
}
