import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, PageTitle } from '../components/ui';
import { LEGAL_UPDATED, LegalDoc } from '../legal';
import { color, space, type } from '../theme';

/** Static legal text. Used signed out (from Welcome / Create account) and signed in (from Settings). */
export function Legal({ doc, onBack, inline = false }: { doc: LegalDoc; onBack: () => void; inline?: boolean }) {
  const body = (
    <>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[3] }}>
        <PageTitle>{doc.title}</PageTitle>
        <Text style={[type.meta, { color: color.inkSoft }]}>Last updated {LEGAL_UPDATED}</Text>
        <View style={{ padding: space[3], borderRadius: 12, borderWidth: 1, borderColor: color.amber }}>
          <Text style={type.meta}>Sample text. Have a lawyer review it before launch.</Text>
        </View>
        {doc.sections.map(([h, paras], n) => (
          <View key={h} style={{ gap: space[2], marginTop: space[3] }}>
            <Text accessibilityRole="header" style={[type.bodyStrong, { color: color.violetDeep }]}>{n + 1}. {h}</Text>
            {paras.map((p, k) => <Text key={k} style={[type.body, { fontSize: 16 }]}>{p}</Text>)}
          </View>
        ))}
      </ScrollView>
      <View style={{ padding: space[4], borderTopWidth: 1, borderTopColor: color.track }}><Button label="Back" tone="ghost" onPress={onBack} /></View>
    </>
  );
  return inline ? <View style={{ flex: 1 }}>{body}</View> : <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>{body}</SafeAreaView>;
}
