import { autoSplitBudgets, type SpeechSection } from '@vlc/voice-analysis';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  const [plan, setPlan] = useState(initial);
  const [error, setError] = useState('');
  const updateSection = (index: number, patch: Partial<SpeechSection>) =>
    setPlan((p) => ({ ...p, sections: p.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  const button = (label: string, action: () => void, selected = false) => (
    <Pressable
      key={label}
      onPress={action}
      style={({ pressed }) => ({
        backgroundColor: selected ? '#4F46E5' : '#FFF',
        borderRadius: 12,
        padding: 11,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: selected ? '#FFF' : '#4F46E5', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#F6F5F1', paddingTop: 36 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 18,
          }}
        >
          {button(`‹ ${t('speak.editor')}`, onClose)}
          {button(t('speak.save'), () => {
            if (!plan.title.trim()) {
              setError(t('speak.titleRequired'));
              return;
            }
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
          })}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[0, 1, 2, 3, 5, 10].map((m) =>
              button(
                m ? t('speak.minutes', { count: m }) : t('speak.none'),
                () => setPlan({ ...plan, targetMs: m * 60000 }),
                plan.targetMs === m * 60000,
              ),
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#1B1D22', fontWeight: '800' }}>{t('speak.sections')}</Text>
            {button(t('speak.autoSplit'), () => setPlan(autoSplitBudgets(plan) as StoredSpeechPlan))}
          </View>
          {plan.sections.map((s, i) => (
            <View
              key={s.id}
              style={{
                backgroundColor: '#FFF',
                borderRadius: 20,
                borderColor: '#ECE9E2',
                borderWidth: 1,
                padding: 12,
              }}
            >
              <Text style={{ color: '#4F46E5', fontWeight: '800' }}>
                {i + 1} · {s.budgetMs === null ? t('speak.none') : formatDuration(s.budgetMs)}
              </Text>
              <TextInput
                accessibilityLabel={t('speak.sectionName')}
                value={s.name}
                onChangeText={(name) => updateSection(i, { name })}
                placeholder={t('speak.sectionName')}
                style={input}
              />
              <TextInput
                accessibilityLabel={t('speak.keyPoints')}
                value={s.keyPoints.join('\n')}
                onChangeText={(text) => updateSection(i, { keyPoints: text.split('\n') })}
                placeholder={t('speak.keyPoints')}
                multiline
                style={[input, { minHeight: 70, textAlignVertical: 'top' }]}
              />
              <TextInput
                accessibilityLabel={t('speak.sectionTime')}
                value={s.budgetMs === null ? '' : String(s.budgetMs / 1000)}
                onChangeText={(text) =>
                  updateSection(i, { budgetMs: text === '' ? null : Math.max(0, Number(text) || 0) * 1000 })
                }
                placeholder={t('speak.sectionTime')}
                keyboardType="numeric"
                style={input}
              />
              {button(t('speak.deleteSection'), () =>
                setPlan((p) => ({ ...p, sections: p.sections.filter((_, n) => n !== i) })),
              )}
            </View>
          ))}
          {button(t('speak.addSection'), () =>
            setPlan((p) => ({
              ...p,
              sections: [...p.sections, { id: id(), name: '', keyPoints: [], budgetMs: null }],
            })),
          )}
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
              button(
                t(lang === 'auto' ? 'speak.auto' : lang === 'ko' ? 'speak.korean' : 'speak.english'),
                () => setPlan({ ...plan, lang }),
                plan.lang === lang,
              ),
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
