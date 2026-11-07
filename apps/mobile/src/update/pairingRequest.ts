export type PairingDevice = {
  model: string;
  manufacturer: string;
  os_version: string;
  app_version: string;
  install_id: string;
};

export function shapePairingRequest(code: string, device: PairingDevice) {
  return {
    pairing_code: code.trim().toUpperCase(),
    device: {
      ...device,
      app_package: 'com.jae1e.voicelifecompanion',
    },
  };
}
