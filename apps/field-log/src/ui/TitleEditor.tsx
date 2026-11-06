import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MAX_TITLE_CHARS } from '../core';
import { useT } from '../i18n';
import { setMemoTitle } from '../memo/actions';
import { colors } from './theme';

/** Tap the title (or the pencil) to edit; saves on submit or blur, once, and only when changed. */
export function TitleEditor(props: { memoId: string; title: string | null; placeholder: string }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.title ?? '');
  const saved = useRef(props.title ?? '');

  useEffect(() => {
    if (!editing) {
      setText(props.title ?? '');
      saved.current = props.title ?? '';
    }
  }, [props.title, editing]);

  const commit = () => {
    setEditing(false);
    if (text.trim() === saved.current.trim()) return; // submit then blur: save once
    saved.current = text;
    void setMemoTitle(props.memoId, text);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
      {editing ? (
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={commit}
          onBlur={commit}
          maxLength={MAX_TITLE_CHARS + 20}
          returnKeyType="done"
          placeholder={props.placeholder}
          placeholderTextColor={colors.muted}
          style={{ flex: 1, minHeight: 52, fontSize: 24, fontWeight: '700', color: colors.text, borderBottomWidth: 2, borderColor: colors.primary }}
        />
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('editTitle')} onPress={() => setEditing(true)} style={{ flex: 1, minHeight: 52, justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: props.title ? colors.text : colors.muted }} numberOfLines={2}>
            {props.title ?? props.placeholder}
          </Text>
        </Pressable>
      )}
      {!editing && (
        <Pressable accessibilityRole="button" accessibilityLabel={t('editTitle')} onPress={() => setEditing(true)} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, color: colors.primary }}>✎</Text>
        </Pressable>
      )}
    </View>
  );
}
