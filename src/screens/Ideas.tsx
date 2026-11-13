import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, PageTitle, ScoreChip } from '../components/ui';
import { color, radius, space, type } from '../theme';
import { useApp } from '../store';
import { isStale } from '../ai/types';

const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export function Ideas({ analyzedOnly = false }: { analyzedOnly?: boolean }) {
  const { ideas, updateTranscript, removeIdea } = useApp();
  const [q, setQ] = useState(''), [open, setOpen] = useState<string | null>(null), [edit, setEdit] = useState<string | null>(null), [draft, setDraft] = useState('');
  const list = ideas.filter((i) => (!analyzedOnly || i.report) && (i.title + i.transcript).toLowerCase().includes(q.toLowerCase()));

  return (
    <View style={{ flex: 1, paddingHorizontal: space[4] }}>
      <PageTitle>{analyzedOnly ? 'Analyzed Ideas' : 'Recorded Ideas'}</PageTitle>
      <TextInput accessibilityLabel="Search ideas" placeholder="Search" placeholderTextColor={color.inkSoft} value={q} onChangeText={setQ}
        style={{ height: 44, marginVertical: space[3], borderRadius: radius.full, backgroundColor: color.field, textAlign: 'center', fontFamily: 'FiraSans_400Regular', fontSize: 17, color: color.ink }} />
      <FlatList data={list} keyExtractor={(i) => i.id} ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
        ListEmptyComponent={<Text style={[type.body, { color: color.inkSoft, textAlign: 'center', marginTop: space[6] }]}>{analyzedOnly ? 'No analyzed ideas yet.' : 'No ideas yet. Record or type one.'}</Text>}
        renderItem={({ item: i }) => {
          const isOpen = open === i.id, stale = isStale(i);
          return (
            <View style={{ paddingHorizontal: 14, borderWidth: 1, borderRadius: 16, borderColor: isOpen ? color.violetEdge : color.violetLine, backgroundColor: isOpen ? color.paper : color.violetTint }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : i.id)}
                style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.meta, { fontSize: 12, color: color.inkSoft }]}>{when(i.createdAt)}</Text>
                  <Text style={[type.bodyStrong, { color: color.violetDeep }]}>{i.title} {i.report ? <ScoreChip score={i.report.score} stale={stale} /> : null}</Text>
                  {analyzedOnly && i.report?.verdict ? <Text style={type.meta}>{i.report.verdict}</Text> : null}
                </View>
                <Icon name={isOpen ? 'down' : 'right'} size={20} color={color.violet} />
              </Pressable>
              {isOpen && (
                <View style={{ paddingBottom: space[4], gap: space[3] }}>
                  {edit === i.id ? (
                    <TextInput multiline value={draft} onChangeText={setDraft}
                      style={{ padding: space[2], borderWidth: 1, borderColor: color.violet, borderRadius: 4, fontFamily: 'FiraSans_400Regular', fontSize: 16, lineHeight: 24, color: color.ink }} />
                  ) : <Text style={[type.body, { fontSize: 16 }]}>{i.transcript}</Text>}
                  <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                    {edit === i.id
                      ? <Button label="Done" tone="ghost" onPress={() => { updateTranscript(i.id, draft.trim() || i.transcript); setEdit(null); }} />
                      : <Button label="Edit" tone="ghost" onPress={() => { setDraft(i.transcript); setEdit(i.id); }} />}
                    {/* TODO(backend): Analyze Idea calls POST /analyze (prompt 5.2); label becomes "Re-analyze Idea" when stale. */}
                    <Button label={stale ? 'Re-analyze Idea' : 'Analyze Idea'} disabled onPress={() => {}} />
                    <Button label="Delete" tone="ghost" onPress={() => removeIdea(i.id)} />
                  </View>
                </View>
              )}
            </View>
          );
        }} />
    </View>
  );
}
