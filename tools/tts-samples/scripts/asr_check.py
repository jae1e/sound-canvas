"""Round-trip intelligibility check with SenseVoice ASR. Run: python3 -I asr_check.py <asr_model_dir> <out_dir>"""
import glob, os, sys
import sherpa_onnx, soundfile as sf, numpy as np
m, out = sys.argv[1:3]
r = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=f"{m}/model.int8.onnx", tokens=f"{m}/tokens.txt",
                                                   num_threads=4, use_itn=True, language="auto")
for f in sorted(glob.glob(out + "/*_[KE][1-4].wav")):
    x, sr = sf.read(f, dtype="float32")
    if x.ndim > 1: x = x[:, 0]
    s = r.create_stream(); s.accept_waveform(sr, x); r.decode_stream(s)
    print(os.path.basename(f), "|", s.result.text)
