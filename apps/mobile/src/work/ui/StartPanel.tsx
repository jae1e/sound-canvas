import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { builtinTemplates, type PlanTemplate } from '@vlc/session-engine';

import { Button, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { useSettings } from '../../settings/store';
import { shared, space } from '../../theme';
import { workController } from '../instance';
import { useTemplates } from './useTemplates';

function TemplateCard({ tpl, onStart, onDelete }: { tpl: PlanTemplate; onStart: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  const total = tpl.steps.reduce((sum, s) => sum + (s.estimateMs ?? 0), 0);
  return (
    <Card>
      <Text style={shared.h2}>{tpl.name}</Text>
      <Text style={shared.muted}>
        {t('work.start.steps', { count: tpl.steps.length })}
        {total > 0 ? ` · ${t('work.start.totalMin', { count: Math.round(total / 60_000) })}` : ''}
      </Text>
      <Text style={shared.muted} numberOfLines={2}>
        {tpl.steps.map((s) => s.label).join(' → ')}
      </Text>
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Button label={t('work.start.use')} onPress={onStart} kind="primary" />
        </View>
        {onDelete ? <Button label={t('common.delete')} onPress={onDelete} kind="danger" /> : null}
      </View>
    </Card>
  );
}

/** Shown when there is no session: pick a built-in or saved template, or start with an empty plan. */
export function StartPanel() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const { templates, remove } = useTemplates();
  const [name, setName] = useState('');

  const start = (tpl?: PlanTemplate) => {
    try {
      workController.createDraft({ lang, title: name.trim() || tpl?.name || null, steps: tpl?.steps });
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    }
  };
  const confirmDelete = (tpl: PlanTemplate) =>
    Alert.alert(t('work.start.deleteTemplate'), tpl.name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove(tpl.id) },
    ]);

  return (
    <View style={{ gap: space.md }}>
      <Text style={shared.h1}>{t('work.start.title')}</Text>
      <Text style={shared.muted}>{t('work.start.hint')}</Text>
      <TextInput style={shared.input} value={name} onChangeText={setName} placeholder={t('work.start.titleLabel')} accessibilityLabel={t('work.start.titleLabel')} />
      <Button label={t('work.start.empty')} onPress={() => start()} kind="primary" big />
      <Text style={shared.h2}>{t('work.start.templates')}</Text>
      {builtinTemplates(lang).map((tpl) => (
        <TemplateCard key={tpl.id} tpl={tpl} onStart={() => start(tpl)} />
      ))}
      {templates.length > 0 ? <Text style={shared.h2}>{t('work.start.saved')}</Text> : null}
      {templates.map((tpl) => (
        <TemplateCard key={tpl.id} tpl={tpl} onStart={() => start(tpl)} onDelete={() => confirmDelete(tpl)} />
      ))}
    </View>
  );
}
