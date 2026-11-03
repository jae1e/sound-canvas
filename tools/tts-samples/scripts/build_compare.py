"""Build ko_compare.wav / en_compare.wav (0.7 s silence + model's K1/E1 clip, per model). Run: python3 -I build_compare.py <out_dir>"""
import sys, os
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
out = sys.argv[1]; SR = 24000
ORDER = {"ko": ["ko_supertonic3_f1_K1", "ko_moss-tts-nano_ava_K1"],
         "en": ["en_supertonic3_f1_E1", "en_moss-tts-nano_ava_E1", "en_kitten-nano_bella_E1",
                "en_kitten-mini_bella_E1", "en_kokoro_af-heart_E1"]}
for lang, names in ORDER.items():
    parts = []
    for n in names:
        x, sr = sf.read(os.path.join(out, n + ".wav"))
        if x.ndim > 1: x = x[:, 0]
        g = np.gcd(sr, SR); x = resample_poly(x, SR // g, sr // g)
        x = x / max(1e-9, np.abs(x).max()) * 0.8  # peak-normalise so levels are comparable
        parts += [np.zeros(int(0.7 * SR)), x]
    sf.write(os.path.join(out, f"{lang}_compare.wav"), np.concatenate(parts), SR, subtype="PCM_16")
