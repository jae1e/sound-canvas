"""MOSS-TTS-Nano ONNX CPU samples. Run: python3 -I gen_moss.py <moss_repo_dir> <moss_onnx_models_dir> <out_dir>
Imports the (read-reviewed) upstream runtime from <moss_repo_dir>; PyTorch CPU wheel is only needed because
upstream onnx_tts_runtime.py imports torch/torchaudio."""
import json, os, sys, time
repo, models, out = sys.argv[1:4]
sys.path.insert(0, repo)
import soundfile as sf
from onnx_tts_runtime import OnnxTtsRuntime

KO = {"K1": "파스타 1분 남았어요. 버섯 다 됐는지 확인해 주세요.", "K2": "오른쪽으로 돌아서 이백 미터 직진하세요.",
      "K3": "좋아요, 다음 블록은 후렴 두 번 반복이에요. 준비되면 말씀해 주세요.", "K4": "3분 지났어요."}
EN = {"E1": "One minute left on the pasta. Could you check whether the mushrooms are done?",
      "E2": "Turn right, then go straight for two hundred meters.",
      "E3": "Nice. The next block repeats the chorus twice. Tell me when you're ready.",
      "E4": "Three minutes have passed."}
size = sum(os.path.getsize(os.path.join(dp, f)) for d in os.listdir(models) for dp, _, fs in os.walk(os.path.join(models, d)) for f in fs
           if f.endswith((".onnx", ".data", ".model")))
rt = OnnxTtsRuntime(model_dir=models, thread_count=4, max_new_frames=375, do_sample=True, sample_mode="fixed",
                    execution_provider="cpu")
def run(text, voice, path):
    t = time.time()
    rt.synthesize(text=text, voice=voice, prompt_audio_path=None, output_audio_path=path, sample_mode="fixed",
                  do_sample=True, streaming=True, max_new_frames=375, voice_clone_max_text_tokens=75,
                  enable_wetext=False, enable_normalize_tts_text=True, seed=1234)
    return time.time() - t
run("Warm up.", "Ava", "/tmp/claude-1000/-home-jaeil-dev-sound-canvas/c370a185-d494-498f-a01b-6700062d37a3/scratchpad/tts/warm.wav")
res = []
for lang, texts in (("ko", KO), ("en", EN)):
    for voice in ("Ava", "Adam"):
        for k, text in texts.items():
            fn = f"{lang}_moss-tts-nano_{voice.lower()}_{k}.wav"; p = os.path.join(out, fn)
            el = run(text, voice, p); x, sr = sf.read(p); dur = len(x) / sr
            res.append(dict(file=fn, model="moss-tts-nano", voice=voice.lower(), id=k, dur=round(dur, 3), gen_s=round(el, 3),
                            rtf=round(el / dur, 3), sr=sr, download_bytes=size))
            print(res[-1], flush=True)
json.dump(res, open(os.path.join(out, "results_moss.json"), "w"), indent=1)
