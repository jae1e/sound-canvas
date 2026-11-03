import { Text } from 'react-native';
import { parseTarget } from '@vlc/voice-analysis';
import type { PracticeBlock } from './types';
import type { T } from './strings';
import { Button, Card, Field, Row, s } from './ui';

export function newBlock(): PracticeBlock {
  return { id: `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, name: 'Block', durationS: 20, repeats: 3, restS: 10, target: '', mode: 'practice' };
}

interface Props {
  blocks: PracticeBlock[];
  onChange: (blocks: PracticeBlock[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: T;
  locked: boolean;
}

/** Block editor: name, duration, repeats, rest, optional target, practice/speech mode. */
export function SetupPanel({ blocks, onChange, selectedId, onSelect, t, locked }: Props) {
  const update = (id: string, patch: Partial<PracticeBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const num = (v: string, fallback: number) => {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return (
    <Card title={t('setup')}>
      {blocks.map((b) => {
        const selected = b.id === selectedId;
        const invalid = b.target.trim() !== '' && parseTarget(b.target) === null;
        return (
          <Card key={b.id}>
            <Row>
              <Button label={selected ? `✓ ${t('select')}` : t('select')} onPress={() => onSelect(b.id)} active={selected} />
              <Field label={t('blockName')} value={b.name} onChangeText={(v) => update(b.id, { name: v })} editable={!locked} />
            </Row>
            <Row>
              <Field label={t('duration')} value={String(b.durationS)} keyboardType="numeric" editable={!locked} onChangeText={(v) => update(b.id, { durationS: num(v, b.durationS) })} />
              <Field label={t('repeats')} value={String(b.repeats)} keyboardType="numeric" editable={!locked} onChangeText={(v) => update(b.id, { repeats: Math.round(num(v, b.repeats)) })} />
              <Field label={t('rest')} value={String(b.restS)} keyboardType="numeric" editable={!locked} onChangeText={(v) => update(b.id, { restS: num(v, b.restS) })} />
            </Row>
            <Field label={t('target')} value={b.target} autoCapitalize="characters" editable={!locked} onChangeText={(v) => update(b.id, { target: v })} />
            {invalid ? <Text style={{ color: '#c0392b' }}>{t('targetInvalid')}</Text> : null}
            <Row>
              <Button label={t('modePractice')} active={b.mode === 'practice'} onPress={() => update(b.id, { mode: 'practice' })} disabled={locked} />
              <Button label={t('modeSpeech')} active={b.mode === 'speech'} onPress={() => update(b.id, { mode: 'speech' })} disabled={locked} />
              {blocks.length > 1 ? <Button label={t('remove')} onPress={() => onChange(blocks.filter((x) => x.id !== b.id))} disabled={locked} /> : null}
            </Row>
            {b.mode === 'speech' ? <Text style={s.muted}>{t('transcriptNote')}</Text> : null}
          </Card>
        );
      })}
      <Button label={t('addBlock')} onPress={() => onChange([...blocks, newBlock()])} disabled={locked} />
    </Card>
  );
}
