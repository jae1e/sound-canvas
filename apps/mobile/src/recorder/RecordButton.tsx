import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

export function RecordButton({
  recording,
  theme,
  onPress,
  disabled,
  label,
}: {
  recording: boolean;
  theme: 'dark' | 'light';
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  const progress = useRef(new Animated.Value(recording ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: recording ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [progress, recording]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ring,
        {
          borderColor: theme === 'dark' ? '#F4F5F7' : '#1B1D22',
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Animated.View
        style={{
          backgroundColor: '#FF3B30',
          width: progress.interpolate({ inputRange: [0, 1], outputRange: [58, 30] }),
          height: progress.interpolate({ inputRange: [0, 1], outputRange: [58, 30] }),
          borderRadius: progress.interpolate({ inputRange: [0, 1], outputRange: [29, 7] }),
        }}
      />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  ring: {
    width: 80,
    height: 80,
    borderWidth: 4,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
