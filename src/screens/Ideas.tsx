import { useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { RecordButton, Screen, TopBar } from '../components/chrome';
import { Icon } from '../components/Icon';
import { Chip, PageTitle, Star } from '../components/ui';
import { color, font, radius, space, typo } from '../theme';
import { useApp } from '../store';
import { analyzeIdea, ApiError } from '../api';
import { isStale, type Idea } from '../ai/types';
import { MAX_IMAGES, deleteImageFiles, imageUri, importImages } from '../images';
import { stamp } from '../lib/format';
import { useVoice } from '../voice';

const web = (o: object) => (Platform.OS === 'web' ? (o as any) : null);

function IdeaCard({ idea, open, editing, analyzing, onToggle, onAdd, onEdit, onEndEdit, onChangeText, onAnalyze, onRemoveImage }: {
  idea: Idea; open: boolean; editing: boolean; analyzing: boolean; onToggle: () => void; onAdd: () => void; onEdit: () => void; onEndEdit: () => void; onChangeText: (t: string) => void; onAnalyze: () => void; onRemoveImage: (id: string) => void;
}) {
  const stale = isStale(idea);
  return (
    <View style={{ paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.lg, borderColor: open ? color.violetEdge : color.violetLine, backgroundColor: open ? color.paper : color.violetTint }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[typo.small12, { color: color.inkSoft, fontVariant: ['tabular-nums'] }]}>{stamp(idea.createdAt)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
            <Text style={[typo.h3, { color: color.violetDeep }]}>{idea.title}</Text>
            {idea.report ? <Chip score={idea.report.score} stale={stale} /> : null}
            {idea.report && idea.report.score > 80 ? <Star /> : null}
          </View>
        </View>
        <View style={{ marginRight: -10 }}><Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={color.violet} /></View>
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: space[4] }}>
          {editing ? (
            <TextInput accessibilityLabel="Edit idea text" multiline autoFocus value={idea.transcript} onChangeText={onChangeText} onBlur={onEndEdit}
              style={[{ minHeight: 140, padding: space[2], borderWidth: 1, borderColor: color.violet, borderRadius: radius.sm, backgroundColor: color.paper, color: color.ink, fontFamily: font.regular, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' }, web({ outlineStyle: 'none' })]} />
          ) : (
            <View style={{ gap: space[3] }}>
              {idea.transcript.split(/\n{2,}/).map((p, k) => <Text key={k} style={[typo.body16, { color: color.ink, writingDirection: 'auto' }]}>{p}</Text>)}
            </View>
          )}
          {idea.images.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
              {idea.images.map((m) => (
                <View key={m.id}>
                  <Image accessibilityLabel="Attached image" source={{ uri: imageUri(m.uri) }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: color.field }} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Remove image" hitSlop={8} onPress={() => onRemoveImage(m.id)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={14} color={color.paper} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          {stale ? <Text style={[typo.meta13, { marginTop: space[3], color: color.inkSoft }]}>Changed since the last report.</Text> : null}
        </View>
      ) : null}
      {open ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -14, paddingLeft: 4, paddingRight: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.violetLine }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add images" onPress={onAdd} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={color.inkSoft} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Done editing' : 'Edit idea'} onPress={onEdit} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="square-pen" size={22} color={editing ? color.violetDeep : color.inkSoft} /></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={stale ? 'Re-analyze Idea' : 'Analyze Idea'} accessibilityState={{ busy: analyzing }} onPress={onAnalyze}
            style={({ pressed }) => ({ height: 34, paddingLeft: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, backgroundColor: pressed ? color.violetDeep : color.violet, opacity: analyzing ? 0.6 : 1 })}>
            <Icon name="sparkles" size={18} color={color.paper} />
            <Text style={[typo.body14m, { color: color.paper }]}>{analyzing ? 'Analyzing…' : stale ? 'Re-analyze Idea' : 'Analyze Idea'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Recorded Ideas: accordion cards, add images, edit, analyze; the mic below records more into the chosen idea. */
export function Ideas() {
  const { ideas, openId, setOpenId, target, setTarget, updateTranscript, setReport, openResult, addImages, removeImage, say, go } = useApp();
  const [q, setQ] = useState(''), [editing, setEditing] = useState<string | null>(null), [busy, setBusy] = useState<string | null>(null);
  const v = useVoice(target);
  const query = q.trim().toLowerCase();
  const list = ideas.filter((i) => !query || `${i.title} ${i.transcript}`.toLowerCase().includes(query));
  const targetIdea = target ? ideas.find((i) => i.id === target) : undefined;

  async function analyze(i: Idea) {
    if (busy) return;
    if (i.report && !isStale(i)) return openResult(i.id);
    setBusy(i.id); useApp.getState().setProcessing('Processing');
    try { const r = await analyzeIdea(i); setReport(i.id, r); openResult(i.id); }
    catch (e: any) {
      const code = e instanceof ApiError ? e.status : 0;
      say(code === 402 ? 'You’ve used all your free analyzed ideas. Upgrade to continue.' : code === 429 ? 'Too many requests right now. Try the AI button again in a minute.' : code === 403 ? e.message : 'The analysis didn’t finish. Tap the AI button to try again.', true);
    } finally { setBusy(null); useApp.getState().setProcessing(null); }
  }
  async function attach(id: string, source: 'library' | 'camera') {
    const idea = useApp.getState().ideas.find((x) => x.id === id);
    if (!idea) return;
    const r = await importImages(source, MAX_IMAGES - idea.images.length);
    if (r.images.length) { addImages(id, r.images); say(`${r.images.length} ${r.images.length > 1 ? 'images' : 'image'} added to ${idea.title}.`); }
    if (r.error) say(r.error, true);
  }
  function addImageMenu(id: string) {
    if (Platform.OS === 'web') return void attach(id, 'library'); // the file picker must open straight from the click
    Alert.alert('Add images', undefined, [{ text: 'Choose from photos', onPress: () => attach(id, 'library') }, { text: 'Take a photo', onPress: () => attach(id, 'camera') }, { text: 'Cancel', style: 'cancel' }]);
  }

  return (
    <Screen tone="paper">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar onBack={() => go('record')} />
        <PageTitle>Recorded Ideas</PageTitle>
        <TextInput accessibilityLabel="Filter ideas" placeholder="Filter here" placeholderTextColor={color.inkSoft} value={q} onChangeText={setQ}
          style={[{ height: 44, marginTop: space[3], marginBottom: space[5], borderRadius: radius.full, backgroundColor: color.field, textAlign: 'center', fontFamily: font.regular, fontSize: 17, color: color.ink }, web({ outlineStyle: 'none' })]} />
        <FlatList data={list} keyExtractor={(i) => i.id} style={{ flex: 1, marginHorizontal: -space[4] }} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[4] }}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[typo.body19, { fontSize: 17, textAlign: 'center', color: color.inkSoft, marginVertical: space[6] }]}>{ideas.length ? `No ideas match “${q}”.` : 'No ideas yet. Press the mic below to record one.'}</Text>}
          renderItem={({ item: i }) => (
            <IdeaCard idea={i} open={openId === i.id} editing={editing === i.id} analyzing={busy === i.id}
              onToggle={() => { setOpenId(openId === i.id ? null : i.id); if (editing === i.id) setEditing(null); }}
              onAdd={() => addImageMenu(i.id)} onEdit={() => setEditing(editing === i.id ? null : i.id)} onEndEdit={() => setEditing(null)}
              onChangeText={(t) => updateTranscript(i.id, t)} onAnalyze={() => analyze(i)} onRemoveImage={(mid) => { const m = i.images.find((x) => x.id === mid); removeImage(i.id, mid); if (m) deleteImageFiles([m]); }} />
          )} />
        <View style={{ alignItems: 'center', justifyContent: 'center', marginHorizontal: -space[4], paddingVertical: space[5], borderTopWidth: 1, borderTopColor: color.track }}>
          <RecordButton tone="paper" recording={v.recording} label={v.recording ? 'Stop recording' : 'Start recording'} {...v.micProps} />
          {targetIdea && !v.recording ? (
            <Text accessibilityLiveRegion="polite" style={[typo.nav, { color: color.inkSoft, textAlign: 'center', marginTop: space[3] }]}>
              Press to add to {targetIdea.title} · <Text accessibilityRole="button" onPress={() => setTarget(null)} style={{ textDecorationLine: 'underline' }}>Cancel</Text>
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
