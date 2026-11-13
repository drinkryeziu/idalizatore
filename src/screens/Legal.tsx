import { ScrollView, Text, View } from 'react-native';
import { Screen, TopBar } from '../components/chrome';
import { IconBtn, PageTitle, ResAct } from '../components/ui';
import { LEGAL_UPDATED, LegalDoc } from '../legal';
import { color, font, space, typo } from '../theme';

/** Terms of Use / Privacy Policy. Signed out it only has Back; signed in it also has the menu. */
export function Legal({ doc, onBack, signedOut }: { doc: LegalDoc; onBack: () => void; signedOut?: boolean }) {
  return (
    <Screen tone="paper">
      {signedOut ? <View style={{ minHeight: 44, paddingTop: 4, alignItems: 'flex-start' }}><IconBtn name="arrow-left" label="Back" onPress={onBack} /></View> : <TopBar onBack={onBack} />}
      <ScrollView style={{ flex: 1, marginHorizontal: -space[4] }} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }}>
        <PageTitle>{doc.title}</PageTitle>
        <Text style={[typo.body14, { color: color.inkSoft, marginTop: space[1], marginBottom: space[3] }]}>Last updated {LEGAL_UPDATED}</Text>
        <View style={{ marginBottom: space[4], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: color.demoBg }}>
          <Text style={[typo.label13m, { lineHeight: 20, color: color.warning }]}>Sample text. Have a lawyer review it before launch.</Text>
        </View>
        <View style={{ gap: space[5] }}>
          {doc.sections.map(([h, paras], n) => (
            <View key={h}>
              <Text accessibilityRole="header" style={{ fontFamily: font.semi, fontSize: 18, lineHeight: 24, color: color.violetDeep, marginBottom: space[2] }}>{n + 1}. {h}</Text>
              {paras.map((p, k) => <Text key={k} style={[typo.body15, { color: color.ink, marginBottom: space[2] }]}>{p}</Text>)}
            </View>
          ))}
        </View>
        <ResAct primary label="Back" onPress={onBack} style={{ marginTop: space[6] }} />
      </ScrollView>
    </Screen>
  );
}
