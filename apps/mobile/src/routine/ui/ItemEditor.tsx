import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { type Lang, type RoutineItem } from '@vlc/session-engine';

import { Button, Chip } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { colors, shared, space } from '../../theme';

function NumField({ label, value, onChange, decimal }: { label: string; value: number; onChange: (n: number) => void; decimal?: boolean }) {
  const [text, setText] = useState(String(value));
  return (
    <View style={{ minWidth: 76, flexGrow: 1 }}>
      <Text style={shared.muted}>{label}</Text>
      <TextInput
        style={shared.input}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        value={text}
        accessibilityLabel={label}
        onChangeText={(v) => {
          setText(v);
          const n = Number(v.replace(',', '.'));
          if (Number.isFinite(n) && n > 0) onChange(n);
        }}
      />
    </View>
  );
}

/** Edits one routine item in place (name, counts, tempo, rest). Poomsae movements are fixed; only repeat and tempo change. */
export function ItemEditor({
  item,
  onChange,
  onRemove,
  onMove,
}: {
  item: RoutineItem;
  onChange: (it: RoutineItem) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: space.md, gap: space.sm, backgroundColor: colors.card }}>
      <TextInput style={shared.input} value={item.name} accessibilityLabel={t('routine.item.name')} onChangeText={(name) => onChange({ ...item, name })} />
      <View style={[shared.row, { flexWrap: 'wrap' }]}>
        {item.kind === 'exercise' ? (
          <>
            <NumField label={t('routine.item.reps')} value={item.reps} onChange={(reps) => onChange({ ...item, reps: Math.round(reps) })} />
            <NumField label={t('routine.item.sets')} value={item.sets} onChange={(sets) => onChange({ ...item, sets: Math.round(sets) })} />
            <NumField label={t('routine.item.secPerRep')} value={item.secPerRep} decimal onChange={(secPerRep) => onChange({ ...item, secPerRep, pattern: undefined })} />
            <NumField label={t('routine.item.rest')} value={item.restSec} onChange={(restSec) => onChange({ ...item, restSec })} />
          </>
        ) : null}
        {item.kind === 'hold' ? (
          <>
            <NumField label={t('routine.item.holdSec')} value={item.holdSec} onChange={(holdSec) => onChange({ ...item, holdSec })} />
            <NumField label={t('routine.item.sets')} value={item.sets} onChange={(sets) => onChange({ ...item, sets: Math.round(sets) })} />
            <NumField label={t('routine.item.rest')} value={item.restSec} onChange={(restSec) => onChange({ ...item, restSec })} />
            <Chip label={t('routine.item.perSide')} selected={item.perSide} onPress={() => onChange({ ...item, perSide: !item.perSide })} />
          </>
        ) : null}
        {item.kind === 'rest' ? <NumField label={t('routine.item.sec')} value={item.sec} onChange={(sec) => onChange({ ...item, sec })} /> : null}
        {item.kind === 'poomsae' ? (
          <>
            <NumField label={t('routine.item.repeat')} value={item.repeat} onChange={(repeat) => onChange({ ...item, repeat: Math.round(repeat) })} />
            <NumField label={t('routine.item.secPerCount')} value={item.secPerCount} decimal onChange={(secPerCount) => onChange({ ...item, secPerCount })} />
            <Text style={shared.muted}>{t('routine.item.poomsaeMoves', { count: item.movements.length })}</Text>
          </>
        ) : null}
      </View>
      <View style={shared.row}>
        <Button label={t('routine.item.up')} onPress={() => onMove(-1)} />
        <Button label={t('routine.item.down')} onPress={() => onMove(1)} />
        <Button label={t('routine.item.remove')} kind="danger" onPress={onRemove} />
      </View>
    </View>
  );
}

export function newItem(kind: 'exercise' | 'hold' | 'rest', lang: Lang, id: string): RoutineItem {
  const ko = lang === 'ko';
  if (kind === 'exercise') return { kind, id, name: ko ? '운동' : 'Exercise', reps: 10, sets: 3, secPerRep: 3, restSec: 30 };
  if (kind === 'hold') return { kind, id, name: ko ? '버티기' : 'Hold', holdSec: 30, sets: 1, perSide: false, restSec: 30 };
  return { kind, id, name: ko ? '휴식' : 'Rest', sec: 30 };
}
