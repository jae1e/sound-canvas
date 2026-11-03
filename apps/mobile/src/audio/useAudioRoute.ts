import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import VlcSessionService from '../../modules/vlc-session-service';
import type { SpeechOutputRoute } from '../../modules/vlc-session-service';
import { describeInput, type InputRoute } from './routeLabels';

export interface OutputRoute {
  label: string;
  ok: boolean;
  warning: string | null;
}

export interface AudioRoute {
  input: InputRoute;
  output: OutputRoute;
  refresh: () => void;
}

const INITIAL_INPUT: InputRoute = { label: 'Phone microphone', bluetooth: false };
const INITIAL_OUTPUT: OutputRoute = { label: '', ok: true, warning: null };

const toOutput = (r: SpeechOutputRoute): OutputRoute => ({ label: r.label, ok: r.ok, warning: r.warning });

/** Current speech output and microphone routes. Never throws; the native module may be unavailable. */
export function useAudioRoute(): AudioRoute {
  const [input, setInput] = useState<InputRoute>(INITIAL_INPUT);
  const [output, setOutput] = useState<OutputRoute>(INITIAL_OUTPUT);

  const refresh = useCallback(() => {
    try {
      VlcSessionService.getSpeechOutputRoute()
        .then((r) => setOutput(toOutput(r)))
        .catch(() => {});
    } catch {
      // Module unavailable.
    }
    try {
      Promise.all([VlcSessionService.sttSupport(), VlcSessionService.getRouteState()])
        .then(([support, route]) =>
          setInput(describeInput([support.bluetoothInput, route.recordRoutedDevice, route.communicationDevice, support.bluetoothCommunicationDevice])),
        )
        .catch(() => {});
    } catch {
      // Module unavailable.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    try {
      const subs = [
        VlcSessionService.addListener('speechOutputRoute', (e) => setOutput(toOutput(e))),
        VlcSessionService.addListener('routeChanged', () => refresh()),
        VlcSessionService.addListener('sttMicRoute', () => refresh()),
      ];
      return () => subs.forEach((s) => s.remove());
    } catch {
      return undefined;
    }
  }, [refresh]);

  return { input, output, refresh };
}
