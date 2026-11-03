"""Generate TTS samples via sherpa-onnx. Run: python3 -I gen_sherpa.py <models_root> <out_dir>"""
import json, os, sys, time
import numpy as np
import sherpa_onnx, soundfile as sf

MODELS, OUT = sys.argv[1], sys.argv[2]
THREADS = 4
KO = {"K1": "파스타 1분 남았어요. 버섯 다 됐는지 확인해 주세요.", "K2": "오른쪽으로 돌아서 이백 미터 직진하세요.",
      "K3": "좋아요, 다음 블록은 후렴 두 번 반복이에요. 준비되면 말씀해 주세요.", "K4": "3분 지났어요."}
EN = {"E1": "One minute left on the pasta. Could you check whether the mushrooms are done?",
      "E2": "Turn right, then go straight for two hundred meters.",
      "E3": "Nice. The next block repeats the chorus twice. Tell me when you're ready.",
      "E4": "Three minutes have passed."}

def d(name):
    p = os.path.join(MODELS, name)
    return os.path.join(p, os.listdir(p)[[x != "size.txt" for x in os.listdir(p)].index(True)] if False else
                        [x for x in os.listdir(p) if x != "size.txt"][0])

def supertonic():
    m = d("supertonic")
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=f"{m}/duration_predictor.int8.onnx", text_encoder=f"{m}/text_encoder.int8.onnx",
            vector_estimator=f"{m}/vector_estimator.int8.onnx", vocoder=f"{m}/vocoder.int8.onnx",
            tts_json=f"{m}/tts.json", unicode_indexer=f"{m}/unicode_indexer.bin", voice_style=f"{m}/voice.bin"),
        num_threads=THREADS, provider="cpu"))
    def gen(tts, text, sid, lang):
        g = sherpa_onnx.GenerationConfig(); g.sid = sid; g.num_steps = 8; g.speed = 1.0; g.extra["lang"] = lang
        return tts.generate(text, g)
    return cfg, gen

def kitten(name):
    m = d(name)
    f = "model.int8.onnx" if os.path.exists(f"{m}/model.int8.onnx") else "model.onnx"
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kitten=sherpa_onnx.OfflineTtsKittenModelConfig(model=f"{m}/{f}", voices=f"{m}/voices.bin",
                                                       tokens=f"{m}/tokens.txt", lexicon=os.path.join(MODELS, "lexicon-en-us", "lexicon-en-us.txt")),
        num_threads=THREADS, provider="cpu"))
    def gen(tts, text, sid, lang):
        g = sherpa_onnx.GenerationConfig(); g.sid = sid; g.speed = 1.0
        return tts.generate(text, g)
    return cfg, gen

def kokoro():
    m = d("kokoro")
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=f"{m}/model.int8.onnx", voices=f"{m}/voices.bin",
            tokens=f"{m}/tokens.txt", data_dir=f"{m}/espeak-ng-data", dict_dir=f"{m}/dict",
            lexicon=os.path.join(MODELS, "lexicon-en-us", "lexicon-en-us.txt")),
        num_threads=THREADS, provider="cpu"))
    def gen(tts, text, sid, lang):
        g = sherpa_onnx.GenerationConfig(); g.sid = sid; g.speed = 1.0
        return tts.generate(text, g)
    return cfg, gen

# (file model tag, builder, model dir for size, [(voice label, sid)], languages)
JOBS = [
    ("supertonic3", supertonic, "supertonic", [("f1", 0), ("m1", 5)], ["ko", "en"]),
    ("kitten-nano", lambda: kitten("kitten-nano"), "kitten-nano", [("bella", 1), ("jasper", 0)], ["en"]),
    ("kitten-mini", lambda: kitten("kitten-mini"), "kitten-mini", [("bella", 1), ("jasper", 0)], ["en"]),
    ("kokoro", kokoro, "kokoro", [("af-heart", 3), ("am-michael", 16)], ["en"]),
]
results = []
for tag, build, mdir, voices, langs in JOBS:
    t0 = time.time(); cfg, gen = build()
    assert cfg.validate(), tag
    tts = sherpa_onnx.OfflineTts(cfg); load_s = time.time() - t0
    size = int(open(os.path.join(MODELS, mdir, "size.txt")).read())
    gen(tts, "Warm up.", voices[0][1], "en")  # untimed warm-up
    for lang in langs:
        for vname, sid in voices:
            for sid_txt, text in (KO if lang == "ko" else EN).items():
                t = time.time(); a = gen(tts, text, sid, lang); el = time.time() - t
                dur = len(a.samples) / a.sample_rate
                fn = f"{lang}_{tag}_{vname}_{sid_txt}.wav"
                sf.write(os.path.join(OUT, fn), a.samples, a.sample_rate, subtype="PCM_16")
                results.append(dict(file=fn, model=tag, voice=vname, sid=sid, id=sid_txt, dur=round(dur, 3),
                                    gen_s=round(el, 3), rtf=round(el / dur, 3), sr=a.sample_rate,
                                    download_bytes=size, load_s=round(load_s, 2)))
                print(results[-1], flush=True)
json.dump(results, open(os.path.join(OUT, "results.json"), "w"), indent=1)
