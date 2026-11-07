import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { FrameEvent, MonitorStateEvent } from '../../modules/vc-audio/src/VcAudio.types';
import { RingBuffer } from './ringBuffer';

/** Focus and foreground own monitoring; recording and graph rendering are independent. */
export function useMonitor() {
  const frames = useRef(new RingBuffer<FrameEvent>(500));
  const [state, setState] = useState<MonitorStateEvent>({ running: false, silenced: false });
  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let serial = Promise.resolve();
      const update = () => {
        serial = serial
          .then(async () => {
            if (focused && AppState.currentState === 'active') {
              try {
                await VcAudio.startMonitor();
              } catch (error) {
                const value = error as { code?: string; message?: string };
                setState({
                  running: false,
                  silenced: false,
                  reason: value.code === 'ERR_PERMISSION' ? 'permission' : 'error',
                  error: value.message,
                });
              }
            } else await VcAudio.stopMonitor();
          })
          .catch((error: unknown) =>
            setState({ running: false, silenced: false, reason: 'error', error: String(error) }),
          );
      };
      const frame = VcAudio.addListener('onFrame', (value) => frames.current.push(value));
      const monitor = VcAudio.addListener('onMonitorState', setState);
      const app = AppState.addEventListener('change', update);
      update();
      return () => {
        focused = false;
        app.remove();
        frame.remove();
        monitor.remove();
        update();
      };
    }, []),
  );
  return { frames, state };
}
