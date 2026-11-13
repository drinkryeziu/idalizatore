import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, PageTitle, ScoreChip } from '../components/ui';
import { color, radius, space, type } from '../theme';
import { useApp } from '../store';
import { analyzeIdea } from '../api';
import { MAX_IMAGES, deleteImageFiles, imageUri, importImages } from '../images';
import { isStale } from '../ai/types';

const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export function Ideas({ analyzedOnly = false }: { analyzedOnly?: boolean }) {
  const { ideas, updateTranscript, removeIdea, setReport, openResult, addImages, removeImage } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null), [err, setErr] = useState('');
  async function analyze(id: string) {
    const idea = useApp.getState().ideas.find((x) => x.id === id);
    if (!idea || busyId) return;
    setBusyId(id); setErr(''); useApp.getState().setProcessing('Analyzing');
    try { setReport(id, await analyzeIdea(idea)); openResult(id); } catch (e: any) { setErr(e.message); } finally { setBusyId(null); useApp.getState().setProcessing(null); }
  }
  async function attach(id: string, source: 'library' | 'camera') {
    const idea = useApp.getState().ideas.find((x) => x.id === id);
    if (!idea) return;
    setErr('');
    const r = await importImages(source, MAX_IMAGES - idea.images.length);
    if (r.images.length) addImages(id, r.images);
    if (r.error) setErr(r.error);
  }
  function addImageMenu(id: string) {
    Alert.alert('Add image', undefined, [
      { text: 'Choose from photos', onPress: () => attach(id, 'library') },
      { text: 'Take a photo', onPress: () => attach(id, 'camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  const [q, setQ] = useState(''), [open, setOpen] = useState<string | null>(null), [edit, setEdit] = useState<string | null>(null), [draft, setDraft] = useState('');
  const list = ideas.filter((i) => (!analyzedOnly || i.report) && (i.title + i.transcript).toLowerCase().includes(q.toLowerCase()));

  return (
    <View style={{ flex: 1, paddingHorizontal: space[4] }}>
      <PageTitle>{analyzedOnly ? 'Analyzed Ideas' : 'Recorded Ideas'}</PageTitle>
      <TextInput accessibilityLabel="Search ideas" placeholder="Search" placeholderTextColor={color.inkSoft} value={q} onChangeText={setQ}
        style={{ height: 44, marginVertical: space[3], borderRadius: radius.full, backgroundColor: color.field, textAlign: 'center', fontFamily: 'FiraSans_400Regular', fontSize: 17, color: color.ink }} />
      {err ? <Text accessibilityRole="alert" style={[type.meta, { color: color.danger, marginBottom: space[2] }]}>{err}</Text> : null}
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
                  {i.images.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                      {i.images.map((m) => (
                        <View key={m.id}>
                          <Image accessibilityLabel="Attached image" source={{ uri: imageUri(m.uri) }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: color.field }} />
                          <Pressable accessibilityRole="button" accessibilityLabel="Remove image" hitSlop={8}
                            onPress={() => { removeImage(i.id, m.id); deleteImageFiles([m]); }}
                            style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="x" size={14} color={color.paper} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
                    {edit === i.id
                      ? <Button label="Done" tone="ghost" onPress={() => { updateTranscript(i.id, draft.trim() || i.transcript); setEdit(null); }} />
                      : <Button label="Edit" tone="ghost" onPress={() => { setDraft(i.transcript); setEdit(i.id); }} />}
                    {i.images.length < MAX_IMAGES ? <Button label="Add image" tone="ghost" onPress={() => addImageMenu(i.id)} /> : null}
                    {i.report && !stale ? <Button label="View report" tone="ghost" onPress={() => openResult(i.id)} /> : null}
                    <Button label={busyId === i.id ? 'Analyzing…' : stale ? 'Re-analyze Idea' : 'Analyze Idea'} disabled={!!busyId} onPress={() => analyze(i.id)} />
                    <Button label="Delete" tone="ghost" onPress={() => { deleteImageFiles(i.images); removeIdea(i.id); }} />
                  </View>
                </View>
              )}
            </View>
          );
        }} />
    </View>
  );
}
