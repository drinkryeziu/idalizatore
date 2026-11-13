import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { Button, PageTitle } from '../components/ui';
import { color, radius, space, type } from '../theme';
import { StorageChoice, useApp } from '../store';

const OPTS: { id: StorageChoice; icon: IconName; title: string; text: string; tag?: string }[] = [
  { id: 'device', icon: 'phone', title: 'On this iPhone', text: 'Stays on your phone. Private and works offline, but is lost if you delete the app or change phones.' },
  { id: 'server', icon: 'cloud', title: 'On our server', text: 'Backed up to your account, so you can open your ideas on any device. Needs an internet connection.' },
  { id: 'both', icon: 'layers', title: 'Both', tag: 'Recommended', text: 'Saved on your phone and backed up to your account. Works offline and syncs when you are back online.' },
];

export function StorageOptions({ value, onChange }: { value: StorageChoice; onChange: (v: StorageChoice) => void }) {
  return (
    <View style={{ gap: space[2] }}>
      {OPTS.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.id)}
            style={{ flexDirection: 'row', gap: space[3], padding: space[3], borderWidth: 1, borderRadius: 14, borderColor: on ? color.violet : color.violetLine, backgroundColor: on ? color.violetTint : color.paper }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color.violet : color.violetTint }}>
              <Icon name={o.icon} color={on ? color.paper : color.violetDeep} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.bodyStrong}>{o.title}{o.tag ? `  ·  ${o.tag}` : ''}</Text>
              <Text style={[type.meta, { color: color.inkSoft }]}>{o.text}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Settings() {
  const { user, setStorage, signOut } = useApp();
  if (!user) return null;
  return (
    <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
      <PageTitle>Settings</PageTitle>
      <Text style={[type.titleMd, { color: color.violetDeep }]}>Where ideas are kept</Text>
      <StorageOptions value={user.storage} onChange={setStorage} />
      <Text style={[type.titleMd, { color: color.violetDeep }]}>Account</Text>
      <Text style={type.body}>{user.name}{'\n'}<Text style={{ color: color.inkSoft }}>{user.email}</Text></Text>
      <Button label="Sign out" tone="ghost" onPress={signOut} />
    </ScrollView>
  );
}
