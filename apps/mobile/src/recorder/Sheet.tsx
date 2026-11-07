import { useRef, type ReactNode } from 'react';
import { useTranslation } from '../i18n';
import { Modal, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
export function Sheet({
  visible,
  onClose,
  theme,
  title,
  children,
  headerRight,
}: {
  visible: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  const { t } = useTranslation();
  const close = useRef(onClose);
  close.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) close.current();
      },
    }),
  ).current;
  const dark = theme === 'dark';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: '#0009' }}
        />
        <View
          style={{
            maxHeight: '80%',
            backgroundColor: dark ? '#171C25' : '#FFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 18,
            paddingBottom: 24,
          }}
        >
          <View {...pan.panHandlers} style={{ alignItems: 'center', padding: 12 }}>
            <View
              style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: dark ? '#3A4457' : '#D9D6CE' }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: dark ? '#E8EBF1' : '#1B1D22', fontSize: 18, fontWeight: '800' }}>
              {title}
            </Text>
            {headerRight}
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
