import { autoSplitBudgets, type SpeechSection } from '@vlc/voice-analysis';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';
import type { StoredSpeechPlan } from '../db/repos/speech';
import { formatDuration } from '../recorder/SingControls';

const input = {
  backgroundColor: '#FFF',
  borderColor: '#ECE9E2',
  borderWidth: 1,
  borderRadius: 14,
  padding: 12,
  color: '#1B1D22',
  marginVertical: 6,
} as const;
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function newPlan(kind: 'plan' | 'script' = 'plan'): StoredSpeechPlan {
  const now = Date.now();
  return {
    id: id(),
    title: '',
    kind,
    lang: 'auto',
    targetMs: 180000,
    sections: [],
    script: null,
    promptId: null,
    createdAt: now,
    updatedAt: now,
    practiceCount: 0,
  };
}
export function PlanEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: StoredSpeechPlan;
  onClose: () => void;
  onSave: (plan: StoredSpeechPlan) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState(initial);
  const [error, setError] = useState('');
  const [split, setSplit] = useState(false);
  const [timeIndex, setTimeIndex] = useState<number | null>(null);
  const updateSection = (index: number, patch: Partial<SpeechSection>) =>
    setPlan((p) => ({ ...p, sections: p.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  const close = () => {
    if (JSON.stringify(plan) === JSON.stringify(initial)) return onClose();
    Alert.alert(t('speak.discardTitle'), undefined, [
      { text: t('speak.keepEditing'), style: 'cancel' },
      { text: t('speak.discard'), style: 'destructive', onPress: onClose },
    ]);
  };
  const save = () => {
    if (!plan.title.trim()) return setError(t('speak.titleRequired'));
    try {
      onSave({
        ...plan,
        title: plan.title.trim(),
        updatedAt: Date.now(),
        sections: plan.sections.map((section) => ({
          ...section,
          name: section.name.trim(),
          keyPoints: section.keyPoints.map((point) => point.trim()).filter(Boolean),
        })),
      });
    } catch {
      setError(t('speak.error'));
    }
  };
  const chip = (label: string, action: () => void, selected = false) => (
    <Pressable
      key={label}
      onPress={action}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
        borderWidth: 1,
        borderColor: selected ? '#4F46E5' : '#E4E1DA',
        backgroundColor: selected ? '#4F46E5' : '#FFF',
        borderRadius: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: selected ? '#FFF' : '#454852', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#F6F5F1', paddingTop: insets.top + 8 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            alignItems: 'center',
          }}
        >
          <Pressable onPress={close} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: '#1B1D22', fontWeight: '800', fontSize: 18 }}>‹ {t('speak.editor')}</Text>
          </Pressable>
          <Pressable onPress={save} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: '#4F46E5', fontWeight: '800' }}>{t('speak.save')}</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 8 }}>
          <TextInput
            accessibilityLabel={t('speak.title')}
            value={plan.title}
            onChangeText={(title) => setPlan({ ...plan, title })}
            placeholder={t('speak.title')}
            style={input}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: '#C62828' }}>
              {error}
            </Text>
          )}
          <Text style={{ color: '#6C6F78', fontWeight: '700' }}>{t('speak.timer')}</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[0, 1, 2, 3, 5, 10].map((m) =>
              chip(
                m ? t('speak.minutes', { count: m }) : t('speak.none'),
                () => {
                  setSplit(false);
                  setPlan({ ...plan, targetMs: m * 60000 });
                },
                plan.targetMs === m * 60000,
              ),
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#6C6F78', fontWeight: '700' }}>{t('speak.sections')}</Text>
            <Pressable
              onPress={() => {
                setPlan(autoSplitBudgets(plan) as StoredSpeechPlan);
                setSplit(true);
              }}
              style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: '#4F46E5', fontWeight: '700' }}>
                {t('speak.autoSplit')}
                {split ? ' ✓' : ''}
              </Text>
            </Pressable>
          </View>
          {plan.sections.map((section, i) => (
            <View
              key={section.id}
              style={{
                backgroundColor: '#FFF',
                borderRadius: 20,
                borderColor: '#ECE9E2',
                borderWidth: 1,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    color: '#4F46E5',
                    backgroundColor: '#EEF0FF',
                    overflow: 'hidden',
                    borderRadius: 20,
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    fontWeight: '800',
                  }}
                >
                  {i + 1}
                </Text>
                <TextInput
                  accessibilityLabel={t('speak.sectionName')}
                  value={section.name}
                  onChangeText={(name) => updateSection(i, { name })}
                  placeholder={t('speak.sectionName')}
                  style={{ flex: 1, color: '#1B1D22', fontWeight: '800' }}
                />
                <Pressable
                  onPress={() => setTimeIndex(i)}
                  style={({ pressed }) => ({
                    backgroundColor: '#EEF0FF',
                    borderRadius: 10,
                    padding: 8,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: '#4F46E5', fontWeight: '700' }}>
                    {section.budgetMs === null ? t('speak.none') : formatDuration(section.budgetMs)}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', marginLeft: 38 }}>
                <Text style={{ color: '#1B1D22', lineHeight: 22, paddingTop: 8 }}>
                  {Array(Math.max(1, section.keyPoints.length)).fill('•').join('\n')}
                </Text>
                <TextInput
                  accessibilityLabel={t('speak.keyPoints')}
                  value={section.keyPoints.join('\n')}
                  onChangeText={(text) => updateSection(i, { keyPoints: text.split('\n') })}
                  placeholder={t('speak.keyPoints')}
                  multiline
                  style={{
                    flex: 1,
                    color: '#1B1D22',
                    minHeight: 44,
                    lineHeight: 22,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
              <Pressable
                onPress={() => setPlan((p) => ({ ...p, sections: p.sections.filter((_, n) => n !== i) }))}
                style={({ pressed }) => ({ alignSelf: 'flex-end', padding: 5, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: '#6C6F78', fontSize: 12 }}>{t('speak.deleteSection')}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() =>
              setPlan((p) => ({
                ...p,
                sections: [...p.sections, { id: id(), name: '', keyPoints: [], budgetMs: null }],
              }))
            }
            style={({ pressed }) => ({
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#D5D2CC',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: '#4F46E5', fontWeight: '700' }}>{t('speak.addSection')}</Text>
          </Pressable>
          <Text style={{ color: '#6C6F78', fontWeight: '700', marginTop: 10 }}>{t('speak.script')}</Text>
          <TextInput
            accessibilityLabel={t('speak.script')}
            value={plan.script ?? ''}
            onChangeText={(script) => setPlan({ ...plan, script: script || null })}
            placeholder={t('speak.scriptHint')}
            multiline
            style={[input, { minHeight: 120, textAlignVertical: 'top' }]}
          />
          <Text style={{ color: '#6C6F78', fontWeight: '700' }}>{t('speak.language')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['auto', 'ko', 'en'] as const).map((lang) =>
              chip(
                t(lang === 'auto' ? 'speak.auto' : lang === 'ko' ? 'speak.korean' : 'speak.english'),
                () => setPlan({ ...plan, lang }),
                plan.lang === lang,
              ),
            )}
          </View>
        </ScrollView>
        <View style={{ padding: 16, paddingBottom: Math.max(16, insets.bottom) }}>
          <Pressable
            onPress={save}
            style={({ pressed }) => ({
              backgroundColor: '#4F46E5',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: '#FFF', fontWeight: '800' }}>{t('speak.savePractice')}</Text>
          </Pressable>
        </View>
        <Modal
          visible={timeIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setTimeIndex(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 20, gap: 12 }}>
              <Text style={{ fontWeight: '800' }}>{t('speak.sectionTime')}</Text>
              <TextInput
                autoFocus
                keyboardType="numeric"
                accessibilityLabel={t('speak.sectionTime')}
                value={
                  timeIndex === null || plan.sections[timeIndex]?.budgetMs == null
                    ? ''
                    : String(plan.sections[timeIndex].budgetMs! / 1000)
                }
                onChangeText={(text) => {
                  if (timeIndex !== null)
                    updateSection(timeIndex, {
                      budgetMs: text ? Math.max(0, Number(text) || 0) * 1000 : null,
                    });
                }}
                style={input}
              />
              <Pressable
                onPress={() => setTimeIndex(null)}
                style={({ pressed }) => ({ padding: 12, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: '#4F46E5', textAlign: 'right', fontWeight: '700' }}>
                  {t('speak.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
