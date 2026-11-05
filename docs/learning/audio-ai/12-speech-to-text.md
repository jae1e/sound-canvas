# 12. Speech-to-text: how recognisers work, from CTC to Whisper, Qwen3-ASR and streaming models

Our voice-first field logging app records on the phone and sends the audio to our own RTX 4090 server, which turns it into text: Korean, English, or both in one sentence, often recorded on a noisy subway. This lecture explains how the recognisers on our shortlist work, how they are scored, and how to choose between them on our own recordings. Scope: the [MVP requirements](../../products/industrial-voice-logging/mvp-requirements.md). Model facts: our [ASR research note](../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md) (2026-11-05), which has the full sources.

**Labels**, as in the research note: **[F]** verified on a primary source (model card, code, paper); **[V]** vendor claim (a model maker's own benchmark); **[P]** third-party report; **[A]** anecdote; **[E]** our estimate; **[H]** our hypothesis. Facts are as of 2026-11-05; recheck them before quoting them as current.

**Words you will meet in this lecture** (each is explained again where it first appears):

| Term | Plain meaning |
|---|---|
| ASR | Automatic speech recognition: audio in, text out. Also called speech-to-text (STT) |
| Reference / hypothesis | The correct transcript, written by a person / what the recogniser produced |
| Token | The unit a model outputs: often a piece of a word from a fixed list of thousands of pieces (BPE, byte-pair encoding, merges frequent letter groups into one piece) |
| WER, CER, MER | Word, character and mixed error rate: the fraction of reference units the recogniser got wrong |
| Normalisation | Rewriting both texts into one standard form (digits, punctuation, spacing) before scoring |
| Encoder / decoder | The part of the network that turns audio features into vectors / the part that turns vectors into tokens |
| Language model (LM) | A model of which word sequences are likely. An LLM (large language model) is a very big one, such as Qwen3 |
| CTC | Connectionist temporal classification: one output per audio frame, with a "blank" symbol |
| Transducer (RNN-T, TDT) | A CTC-like model with a small language model built in. It streams naturally |
| AED | Attention encoder–decoder: writes text one token at a time while looking back at the audio. Whisper is one |
| Greedy / beam search | Take the single best token at every step / keep the k best partial transcripts and extend them all |
| Streaming / offline | Text appears while you speak (provisional *partials*, then a committed *final*) / text is produced after the whole recording is available |
| RTF, RTFx | Real-time factor = processing time / audio duration (lecture 07). RTFx = 1 / RTF, "times faster than real time" |
| VAD | Voice activity detection: deciding which moments contain speech (lecture 07) |
| Hallucination | Fluent text that was never spoken, typically produced on silence or noise |
| Forced alignment | Given audio and its known text, finding when each word was said |
| Biasing, hotwords | Nudging the recogniser towards a supplied list of words |
| Code-switching | Changing language inside a sentence: "밸브 pressure 확인했어요" |
| Quantisation, VRAM | Storing weights with fewer bits (int8 instead of 16-bit floats) / the GPU's own memory (24 GB on our 4090) |

## 1. What a recogniser outputs, and how it is scored

**Output.** Text, usually split into **segments** (sentence-like pieces) with start and end times, often with word times and a confidence number. Internally the text is a sequence of **tokens**: for English often a word piece ("valv" + "e"), for Korean often one syllable block (밸) or a word piece (확인).

**WER, word error rate.** Line up the hypothesis against the reference word by word and count three kinds of error: **S**ubstitutions (a wrong word in place of a right one), **D**eletions (a reference word that is missing) and **I**nsertions (an extra word that was never said). WER = (S + D + I) / N, where N is the number of reference words.

**Edit distance is dynamic programming**, like a shortest path through a grid. Cell d[i][j] is the cheapest way to turn the first i reference words into the first j hypothesis words. Each cell takes the minimum of three moves: diagonal, d[i−1][j−1] + (0 if the words match, else 1); down, d[i−1][j] + 1 (a deletion); right, d[i][j−1] + 1 (an insertion).

**Worked example 1.** Reference "open valve three" (N = 3), hypothesis "open the valve tree":

| | – | open | the | valve | tree |
|---|---|---|---|---|---|
| **–** | 0 | 1 | 2 | 3 | 4 |
| **open** | 1 | **0** | **1** | 2 | 3 |
| **valve** | 2 | 1 | 1 | **1** | 2 |
| **three** | 3 | 2 | 2 | 2 | **2** |

The corner cell is 2. Tracing the bold path back gives one insertion ("the") and one substitution (three → tree): WER = 2/3 = 66.7%.

**Worked example 2.** Reference "the left valve on pump three is leaking" (N = 8), hypothesis "the valve on bump three is leaking now": D = 1 ("left"), S = 1 (pump → bump), I = 1 ("now"), so WER = 3/8 = 37.5%. **WER can exceed 100%**, because insertions are not capped: "okay" heard as a hallucinated "thank you for watching" is S = 1, I = 3, WER = 400%.

The scoring code (save it as `asr_metrics.py` in `~/audio-learn`; it needs only the standard library):

```python
import re

def edit_ops(ref, hyp):
    """Levenshtein alignment of two token lists. Returns (S, D, I)."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]   # d[i][j]: ref[:i] -> hyp[:j]
    for i in range(n + 1): d[i][0] = i          # delete everything
    for j in range(m + 1): d[0][j] = j          # insert everything
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i-1][j-1] + (ref[i-1] != hyp[j-1]),  # match or substitute
                          d[i-1][j] + 1, d[i][j-1] + 1)          # delete, insert
    S = D = I = 0; i, j = n, m                  # walk back to count each kind
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i-1][j-1] + (ref[i-1] != hyp[j-1]):
            S += ref[i-1] != hyp[j-1]; i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i-1][j] + 1: D += 1; i -= 1
        else: I += 1; j -= 1
    return S, D, I

def rate(ref_units, hyp_units):
    S, D, I = edit_ops(ref_units, hyp_units)
    return (S + D + I) / len(ref_units), (S, D, I)

def wer(ref, hyp): return rate(ref.split(), hyp.split())
def cer(ref, hyp): return rate(list(ref.replace(" ", "")), list(hyp.replace(" ", "")))
def mer(ref, hyp):  # one unit per Hangul syllable, one per Latin word
    unit = lambda s: re.findall(r"[A-Za-z0-9']+|[^\sA-Za-z0-9']", s)
    return rate(unit(ref), unit(hyp))

print(wer("open valve three", "open the valve tree"))   # (0.667, (1, 0, 1))
print(cer("작업 완료했습니다", "작업완료 했습니다"))       # (0.0, (0, 0, 0))
```

**CER, character error rate, for Korean.** Korean words (어절, the space-separated chunks) are long and carry grammatical endings, and people space them inconsistently (띄어쓰기). So Korean is scored per character (syllable block), usually with spaces removed. **Worked example 3:** reference "작업 완료했습니다", hypothesis "작업완료 했습니다", where only the space moved. WER: both words differ, so S = 2 and WER = **100%**. CER with spaces kept: one space deleted and one inserted, 2 errors in 9 characters = **22%**. CER with spaces removed: **0%**, which matches what a reader would say.

**Normalisation can swing the score more than the model does.** The Zeroth-Korean corpus (the Korean read speech in our lab data) writes numbers as spoken. A real reference line (`104_003_0664`):

> 작년 십 이 월 천 이백 십 원대까지 올랐던 원 달러 환율은 최근 천 백 오십 원대로 오 퍼센트가량 떨어지면서 외국인 자금 유입에 도움을 주고 있다

A modern recogniser would more likely write "작년 12월 1,210원대까지 … 1,150원대로 5%가량 …" (our illustration, not a real model run). Every word is right, yet CER with spaces removed is 18 errors in 57 characters = **31.6%**. After a normaliser turns digits into their Sino-Korean reading (12 → 십이, 1,210 → 천이백십, % → 퍼센트) and drops punctuation, CER is **0%**. So two Korean CERs are comparable only if they used the same normaliser. The research note warns that vendors' FLEURS-ko numbers are not comparable for this reason; Nemotron's model card even warns that its normalisation may inflate its error rates [F].

**MER, mixed error rate, for code-switched speech:** Korean counted per character and English per word, in one sequence (the definition used by the HiKE benchmark [F]). **Worked example 4:** "밸브 pressure 확인 완료" has 7 units (밸, 브, pressure, 확, 인, 완, 료). The hypothesis "밸브 프레셔 확인 완료" substitutes 프 for pressure and inserts 레 and 셔: MER = 3/7 = **42.9%**, though a Korean reader understands both. HiKE therefore accepts either spelling of a loanword [F]; our normaliser should do the same with an equivalence list (프레셔 = pressure).

## 2. A history in one table

| Era | Approach | How it works, in plain words | Why it was replaced |
|---|---|---|---|
| 1980s–2000s | **HMM-GMM** | Speech is a chain of hidden states (sub-parts of phones, the basic speech sounds), like a discrete-state estimator. A Gaussian mixture model (GMM) scores how well each 10 ms frame fits each state. A pronunciation dictionary and an n-gram LM (word-sequence statistics) are searched together (Kaldi, 2011) | Many hand-built parts; GMMs model frames poorly |
| ~2010–2015 | **Hybrid DNN-HMM** | A deep neural network replaces the GMM as the frame scorer; the HMM, dictionary and LM stay | Still needs the dictionary, alignments from an older system, and expert tuning |
| 2014–2021 | **End-to-end** | One network from features to letters or tokens: CTC (2006; scaled up by Baidu's Deep Speech, 2014), attention encoder–decoders (Listen, Attend and Spell, 2015), transducers (2012; in Google's on-device keyboard in 2019). Conformer encoders and self-supervised pre-training (wav2vec 2.0) arrive in 2020 | Needs thousands of hours of carefully transcribed audio per language |
| 2022– | **Large weakly supervised** | Whisper: about 680,000 hours of audio with imperfect web transcripts, many languages, one model [F] | Weak on rare words; can hallucinate |
| 2023–2026 | **LLM-decoder ASR** | An audio encoder feeds a pre-trained LLM, which writes the text and can read a text context (Qwen3-ASR, January 2026) | Current state of the art; heavier, with the LLM's own failure modes |

## 3. The front end: from waveform to a sequence of vectors

**Features.** Almost every model starts from a **log-mel spectrogram** ([lecture 03](03-spectral-analysis.md)): 25 ms windows with a 10 ms hop, pooled into 80 or 128 mel bands, then the logarithm. At 16 kHz that is a 400-sample window moved by 160 samples, 100 frames per second; these are exactly Whisper's settings [F: code]. 30 s of audio (480,000 samples) becomes 3,000 frames × 128 bands for Whisper large-v3.

**Subsampling.** Speech changes more slowly than 100 times a second, so the encoder's first convolution layers merge neighbouring frames. Fewer vectors make attention cheaper, because its cost grows with the square of the sequence length ([lecture 06](06-deep-learning-separation.md)).

| Encoder | Merges | One output vector every | Used in |
|---|---|---|---|
| Whisper | 2× | 20 ms (1,500 vectors per 30 s) [F] | Whisper |
| Conformer | 4× | 40 ms (25 Hz) [F] | Many CTC and transducer models |
| FastConformer, AuT | 8× | 80 ms (12.5 Hz) [F] | Nemotron, Parakeet, Qwen3-ASR |

**Worked example 5: does the output unit fit the frame rate?** CTC (next section) needs at least one frame per output unit. On our Zeroth test clips (457 utterances, 71.5 min, pauses included) we measured 4.5 syllables per second on average (5.3 at the 90th percentile) and 11.1 jamo (individual Korean letters) per second. The fastest clip runs at 7.4 syllables/s, about 18 jamo/s. At 80 ms frames (12.5 per second), syllables fit easily but jamo do not, which is one reason Korean models output syllables or word pieces, not letters.

## 4. The three end-to-end families

### 4.1 CTC: one guess per frame, plus a blank

**Idea.** The encoder gives one vector per frame. A classifier turns each into probabilities over the vocabulary plus one extra symbol, the **blank** (`_`), meaning "nothing new here". **Collapse rule:** merge repeated symbols, then delete blanks.
- `hh_e_ll_lo` → merge repeats → `h_e_l_lo` → delete blanks → **hello**.
- `h_eell_o` → **helo**: without a blank between the two l's they merge. The blank is what lets CTC spell double letters.

**Training sums over every alignment.** We know the text but not which frame each letter belongs to, so CTC adds up the probability of every frame path that collapses to the right text. "hello" in 10 frames has 1,001 such paths; in 50 frames (2 s at 40 ms) about 24 billion. The **forward algorithm** sums them all in about 50 × 11 steps by filling a grid, exactly like the edit-distance table in section 1: dynamic programming again.

**Worked example 6: the best path is not the best text.** Two frames, each with P(_) = 0.5, P(a) = 0.4, P(b) = 0.1. **Greedy decoding** takes the best symbol per frame, `__`, which collapses to empty text with probability 0.25. But "a" can come from `aa`, `a_` or `_a`: 0.16 + 0.20 + 0.20 = **0.56**. The most likely *text* is "a"; a beam search over collapsed prefixes finds it, greedy decoding does not.

```python
import itertools, numpy as np
vocab = ["_", "h", "e", "l", "o"]             # index 0 is the blank
P = np.array([                                # 10 frames x 5 symbols, rows sum to 1
  [.1, .8, .05, .03, .02], [.2, .7, .05, .03, .02], [.8, .1, .05, .03, .02],
  [.1, .1, .7, .05, .05],  [.7, .1, .1, .05, .05],  [.1, .02, .03, .8, .05],
  [.2, .02, .03, .7, .05], [.6, .02, .03, .3, .05], [.1, .02, .03, .8, .05],
  [.1, .02, .03, .05, .8]])
def collapse(path, blank="_"):                # merge repeats, then drop blanks
    out, prev = [], None
    for c in path:
        if c != prev and c != blank: out.append(c)
        prev = c
    return "".join(out)

best = P.argmax(axis=1)                       # greedy: best symbol per frame
path = "".join(vocab[k] for k in best)
print(path, "->", collapse(path), P[np.arange(10), best].prod())  # hh_e_ll_lo -> hello 0.047

Q, v, totals = np.array([[.5, .4, .1], [.5, .4, .1]]), ["_", "a", "b"], {}
for p in itertools.product(range(3), repeat=2):                   # every 2-frame path
    text = collapse("".join(v[k] for k in p))
    totals[text] = totals.get(text, 0) + Q[0, p[0]] * Q[1, p[1]]
print(totals)                                 # '' 0.25, 'a' 0.56, 'b' 0.11, 'ab' 0.04, 'ba' 0.04
```

**Weakness: conditional independence.** Each frame's guess is made without seeing the other guesses, so the model cannot reason "I just wrote 'pump', so 'three' is likelier than 'tree'". In practice an external LM is added during beam search. **Strengths:** it is fast (all frames decoded at once); it rambles far less, having no free-running text generator (on non-speech noise a Conformer-CTC model hallucinated on 13.52% of clips against 99.97% for Whisper large-v3 [P, Calm-Whisper paper]); and its frame-level output is the basis of forced alignment (section 7).

### 4.2 Transducer (RNN-T, TDT): CTC with a memory of what it wrote

**Three parts.** The **encoder** (audio → vectors); a **prediction network**, a small LM that reads the tokens emitted so far and keeps a state (a learned state-space model whose input is the text so far; [lecture 07](07-speech-diarization-av.md) has the RNN analogy); and a **joiner**, which combines the current audio vector and the text state into probabilities for "emit this token" or "blank: move to the next frame".

**Why it streams naturally.** It only ever needs audio up to the current frame and the text already written. Give it a causal, chunked encoder and text comes out as you speak. Its memory of previous tokens also removes CTC's independence weakness.

**Variants on our list:**
- **TDT** (token-and-duration transducer, NVIDIA, 2023) also predicts how many frames to skip, so the decoder takes fewer steps. Parakeet-TDT-0.6B-v3 claims an RTFx of 3,332 but has no Korean [V/F].
- **Zipformer** (k2-fsa team) is an encoder whose middle layers run at lower frame rates, down to 6.25 Hz, like a U-Net in time [F]. sherpa-onnx ships streaming Zipformer transducers, including a Korean one (training-data licence in doubt; section 10).
- **Nemotron 3.5 ASR Streaming 0.6B**: a cache-aware FastConformer encoder with an RNN-T decoder [F]. "Cache-aware" means each new chunk reuses stored internal states instead of recomputing past audio. It sees 56 past frames (4.5 s) and 0–13 future frames of 80 ms, giving chunks of 80 ms to 1.12 s [F].

### 4.3 Attention encoder–decoder: Whisper

**How it writes.** The encoder turns audio into vectors. The decoder writes one token at a time (autoregressively: each token depends on all previous ones), and **cross-attention** lets it look at any part of the audio. The decoder is a full language model conditioned on sound.

**Whisper's specifics** [F: repository, paper, model card]:
- It always takes a **30 s window**: shorter audio is padded with silence, longer audio is processed window by window. 80 mel bands up to large-v2, 128 in large-v3.
- **Data:** about 680,000 hours of *weakly supervised* audio for the original models, meaning web transcripts, plentiful but imperfect. large-v3 used 1 million hours of weakly labelled audio plus 4 million hours labelled by large-v2.
- **Sizes:** small 244M parameters, large 1,550M; turbo (809M) keeps the large-v3 encoder but cuts the decoder from 32 layers to 4.
- **Special tokens** steer it: `<|startoftranscript|><|ko|><|transcribe|>`, then `<|notimestamps|>` or timestamp tokens such as `<|0.00|>` … `<|2.48|>` on a 20 ms grid. The language token can be forced (we force `ko` when we know it) or predicted.
- **Prompt:** text placed before these tokens (`initial_prompt`) acts as "what was said before". Only about 224 tokens fit; the reference code keeps the last 223 [F: code].

**Weakness.** A decoder that is a strong LM writes fluent text even when the audio has none: hallucination (section 6).

### 4.4 LLM-decoder ASR: Qwen3-ASR

**Structure** of Qwen3-ASR-1.7B [F: tech report]: the **AuT audio encoder** (300M parameters; subsamples 128-band features 8× to 12.5 vectors per second), a **projector** (a small layer mapping those vectors into the LLM's input space) and the **Qwen3-1.7B LLM** as decoder. The audio vectors enter the LLM as if they were words.

**Context.** Because the decoder is an LLM, a **system prompt** (text given before the audio) can carry background knowledge: names, jargon, the previous memo. Qwen trained the model to use that context as background and *not* to follow instructions written in it, to resist prompt injection [F]. When it hears no speech it is trained to answer "language None" with empty text [F], which maps directly onto our no-speech flag.

**Practical limits.** Streaming works only with the vLLM backend (a fast LLM-serving engine), without batching or timestamps; word times come from the separate Qwen3-ForcedAligner [F]. **Cohere Transcribe (2B)** is an encoder–decoder with a FastConformer encoder; it needs a language tag and was not trained on code-switching [V].

| Family | Streams? | Hallucination risk | Biasing | Our candidates |
|---|---|---|---|---|
| CTC | Yes | Low | External LM, boosting | wav2vec2 aligners, Meta Omnilingual |
| Transducer | Yes, naturally | Low | Hotwords, phrase boosting | Nemotron 3.5, Zipformer, Parakeet |
| AED | Awkward (30 s windows) | High on silence or noise | Prompt | Whisper large-v3, Cohere |
| LLM-decoder | Yes, with limits | Medium [H]; trained to say "no speech" | Free-text context | Qwen3-ASR-1.7B |

## 5. Streaming vs offline

**Streaming terms.** **Chunk size:** how much new audio the model takes per step. **Lookahead:** how much *future* audio it may peek at before committing; it buys accuracy and costs delay. **Partial** results are rewritten as audio arrives; a **final** result is committed at an **endpoint**, usually a stretch of silence.

**Worked example 7: streaming delay [E].** Nemotron 3.5 at 560 ms chunks: a word ends at a random moment inside a chunk, so it waits on average 280 ms (at worst 560 ms) for the chunk to finish, and compute at RTF 0.05 adds about 28 ms. Partial text therefore trails speech by about 0.3–0.6 s, and the final line also waits for the endpoint silence.

**Accuracy pays for low delay [V].** Nemotron's Korean FLEURS CER goes from 7.59 at 80 ms chunks to 7.12 at 1.12 s. Qwen3-ASR-1.7B rises from 2.69 offline to 3.33 streaming (average of three English and Chinese sets). Offline Qwen3-ASR-1.7B reports 2.57 on FLEURS-ko, with the normalisation caveat above.

**Worked example 8: what RTF means for the server.** Processing time = RTF × audio duration.
- At RTF 0.01, one hour of audio takes 3,600 × 0.01 = **36 s**.
- Qwen3-ASR-1.7B claims an offline RTF of 0.01482 at concurrency 1: one hour in about 53 s [V; GPU not stated].
- faster-whisper large-v2 transcribed 13 min (780 s) in 17 s on an RTX 3070 Ti: RTF 0.022, or 46× real time [F].
- **Our load [E]:** 30 memos of 30 s a day is 900 s of audio, which is 18 s of GPU time at RTF 0.02. Throughput is not our constraint; accuracy is.

**Why the MVP transcribes offline on the server** (decision 3). Offline models see the whole memo, past and future, and the research note expects them to beat streaming models on Korean by 3–5 CER points [H]. There is no model to fit on the phone, and the model can change without an app release. The cost is no text while offline: the user sees it after sync. A 30 s memo is about 0.96 MB, roughly 1.5 s to upload at 5 Mbit/s [E], plus well under a second of compute.

## 6. Long recordings, segmentation and hallucination

**Chunking.** Whisper reads 30 s at a time. For longer audio it moves its window along and, by default, feeds the previous window's text back in as a prompt (`condition_on_previous_text`). That keeps names consistent, but one hallucination can then repeat window after window.

**VAD-based chunking is better.** Silero VAD (MIT, about 2 MB, under 1 ms per 30 ms chunk on one CPU thread [F]) marks speech regions; the audio is cut at silences and only speech is transcribed. faster-whisper's VAD defaults are a speech threshold of 0.5, cuts only at silences of 2 s or more, and 400 ms of padding on each side. The filter is off by default in the plain `WhisperModel.transcribe` and on in the batched pipeline [F: code].

**Boundary errors.** A cut through a word damages it twice: the end of one chunk and the start of the next. Our app stores audio in segments of 30 s or less for crash safety (A3). **Those storage cuts are not speech boundaries**: the ASR worker should join a memo's segments first and then cut at VAD silences [H].

**Hallucination on silence and noise.**
- On UrbanSound8K (street sounds, no speech), Whisper large-v3 produced text for 99.97% of clips [P].
- VADs are fooled by noise too: Silero v5 classified only 61% of ESC-50 noise clips correctly [P]. A Korean paper reports Whisper hallucinating on 100% of 3,429 noise clips, falling to 0.73% with Silero filtering [P, second-hand].
- Typical outputs are phrases common in subtitle training data, such as "Thank you for watching" (a "bag of hallucinations" [P]). Expect Korean video sign-offs too [H].
- **Whisper's built-in guards** [F: faster-whisper defaults]: a window counts as silent if its no-speech probability exceeds 0.6 *and* its average token log-probability is below −1.0. Text whose gzip compression ratio exceeds 2.4 is treated as a repetition loop (repeated text compresses unusually well) and decoded again at a higher sampling temperature, that is, with more randomness.

**Push-to-talk helps a lot.** Most memos are short, deliberate and start with speech, so there is little silence for a decoder to fill. In an armed hands-free session the VAD decides instead, so expect more false triggers on the subway. The app shows low-confidence and no-speech segments as flagged, not as text (A11).

## 7. Timestamps

**Segment-level** times come free with Whisper's timestamp tokens ("0.00–4.20 s: 3번 펌프 점검 완료"). **Word-level** times need more work:
- **Cross-attention alignment** (faster-whisper `word_timestamps=True`): see which audio frames the decoder attended to while writing each word.
- **CTC forced alignment** (WhisperX): run a CTC model (wav2vec2) over the audio and find the single best trellis path that spells the *known* text. This is section 4.1's forward algorithm with "max" instead of "sum" (the Viterbi algorithm). WhisperX's default table includes a Korean aligner, `kresnik/wav2vec2-large-xlsr-korean` (Apache-2.0, trained on Zeroth) [F: code, model card].
- **A dedicated aligner:** Qwen3-ForcedAligner-0.6B claims an average shift of 37.2 ms on Korean [V]. At our measured 4.5 syllables/s a syllable lasts about 220 ms, so that is a sixth of a syllable.

**Why the review screen needs them.** A11 says "tapping a transcript line plays that audio". With segment times only, a tap on a long line starts seconds early. With word times the app can start at the tapped word and highlight words during playback, which matters most when the user corrects a misheard part number.

## 8. Making it know your words

Names, product codes and English jargon are rare in training data, so recognisers swap them for common words. **Biasing** pushes the recogniser towards a list you supply, in one of two ways. **Shallow fusion** (sherpa-onnx, NeMo) adds a bonus to the beam-search score of any partial transcript that is spelling out a listed phrase: score = log P(model) + λ · bonus, like adding a prior term to an optimisation objective. **Prompting** (Whisper, Qwen3-ASR) puts the words into the text the decoder reads before it starts writing.

| Tool | How you give the words | Limits |
|---|---|---|
| sherpa-onnx hotwords | A file of phrases with optional weights, e.g. `컨베이어 :2.0` | Transducer models with `modified_beam_search` only [F]. Not confirmed for Korean BPE or Nemotron 3.5 |
| NeMo phrase boosting (GPU-PB) | A phrase list at decode time, no retraining | Per-utterance lists only for greedy RNN-T/TDT [F] |
| Whisper `initial_prompt` | Text that looks like "what was said before": "참석: 박지훈, Conveyor C-3, P-203B" | About 224 tokens. Nudges spelling and style, guarantees nothing; in unclear audio the model may copy prompt words into the output [H] |
| Qwen3-ASR context | Free text in the system prompt | Up to 10,000 tokens in Alibaba's API docs [V]; earlier words weigh more [P]; parameter name in the open `qwen-asr` package unverified |

**A deterministic normaliser for codes and numbers** runs after recognition, as plain rules with no AI. A worker reads "피 이공삼 비"; the rules turn Korean letter names and digit words *inside a code pattern* into "P-203B". The pattern matters, because 이 is also a common word ("this"): only rewrite when the pattern or the user's vocabulary list (A12) matches. Rules are testable, repeatable, and cannot invent anything.

**Optional local-LLM post-correction** (deferred in the MVP): a local LLM rereads the transcript against the vocabulary list. **The risk:** an LLM writes fluent text, so it may "correct" a right but rare word into a common wrong one, or fill a gap with words never said. **If we add it:** keep the raw ASR text as the record, allow only substitutions to dictionary entries, show each change as a highlighted suggestion, and make the user's confirmation a new revision (A9).

## 9. Korean and code-switching specifics

**Syllable blocks and jamo.** Each Hangul block is built from 2–3 jamo (letters): initial consonant, vowel and optional final; 19 × 21 × 28 = 11,172 possible blocks, each its own Unicode code point (한 = ㅎ + ㅏ + ㄴ). The scoring unit changes the number: "갔다" misheard as "갓다" is 1 error in 2 blocks (50% CER) but 1 in 5 jamo (20%).

**Spacing (띄어쓰기).** The rules are complex and often broken, even in references, so compute CER with spaces removed (section 1) and treat Korean WER as a secondary number.

**Numbers have three forms:**
- **Sino-Korean** (일, 이, 삼) for dates, money, minutes and numbering: "삼 번 펌프";
- **native Korean** (하나, 둘, 셋; 한, 두, 세 before counters) for counting and hours: "펌프 두 대", "세 시";
- **digits** in writing: "3시 30분" is read "세 시 삼십 분", a native hour with Sino-Korean minutes.

The normaliser must map all three to one form before scoring, or numbers dominate the error count.

**English inside Korean.** Speakers say "밸브 체크하고 pressure 확인". A recogniser may write "pressure" in Latin letters or as 프레셔 in Hangul; which our candidates prefer is still unknown (a gap in the research note).

**HiKE, the Korean–English code-switching benchmark** (about 2.2 hours of natural speech, MER as in section 1) [F/P]:

| Model | Overall MER | Korean CER (FLEURS) | English WER (FLEURS) |
|---|---|---|---|
| GPT-4o-transcribe (cloud) | 21.8 | 2.5 | 3.3 |
| Whisper large | 26.1 | 3.2 | 4.4 |
| Whisper medium | 31.3 | 3.4 | 4.6 |
| SenseVoice-Small | 32.5 | 6.4 | 7.6 |
| Whisper small | 43.5 | 4.5 | 8.3 |

- **Mixing is far harder than either language alone:** Whisper large makes 3–4% errors on each language but 26% on mixed speech.
- **Fine-tuning helps a lot:** Whisper medium fine-tuned on natural code-switched speech went from 31.3 to **9.0** MER, while Korean-only CER rose from 3.4 to 6.0 [F]. Synthetic mixed data alone reached only 22.1. So the user's corrected mixed memos are future training data, not just test data.
- Qwen3-ASR was not tested on HiKE, so we have no code-switching number for it.

## 10. Running it

**Memory ≈ parameters × bytes per parameter**, plus working memory: activations and the **KV cache** (the decoder's stored keys and values for tokens already written, growing with text length and batch size).

| Model | Parameters | 16-bit weights | int8 | Note |
|---|---|---|---|---|
| Whisper small (exercise) | 244M | ~0.5 GB (486 MB download [F]) | ~0.25 GB | Runs on a CPU |
| Whisper large-v3 | 1.55B | 3.1 GB (3.09 GB download [F]) | ~1.6 GB | faster-whisper large-v2, batch 8: 6.1 GB fp16, 4.5 GB int8 [F] |
| Whisper large-v3-turbo | 809M | 1.6 GB | ~0.8 GB | Faster, slightly less accurate |
| Qwen3-ASR-1.7B | ~2.0B (1.7B LLM + 0.3B encoder) | ~4 GB (4.7 GB download [F]) | — | 4–6 GB plus KV cache [E] |

All fit on one 24 GB 4090. The MVP rule still applies: **one heavy job at a time**, inside a `systemd-run --user --scope -p MemoryMax=…` cap, with the separation demo stopped.

**Speed tools.**
- **CTranslate2** is a C++ inference engine for transformer models; **faster-whisper** runs Whisper on it (MIT [F]).
- **int8 quantisation** stores each weight as an 8-bit integer plus a scale factor, halving memory against 16-bit floats, usually with little accuracy loss (measure it on our data).
- **Batching** runs several segments through the GPU together: in the faster-whisper benchmark, 13 min of audio took 63 s one segment at a time (beam size 5) and 17 s at batch size 8 [F]. Qwen3-ASR and Cohere are served with **vLLM**.

**On the phone, later** (not in the MVP). **ONNX** (Open Neural Network Exchange) is a file format for trained networks; ONNX Runtime executes it on a phone's CPU or NPU. **sherpa-onnx** (from the k2-fsa "next-generation Kaldi" team) packages models, streaming decoders, VAD and hotwords for Android. Candidates: Nemotron 3.5 streaming int8 (about 650 MB, Korean and English), Qwen3-ASR-0.6B int8 (about 937 MB, offline), and the phone's built-in recogniser, which adds nothing to the app's size [F].

**Licences** (commercial use is a hard constraint; no external cloud AI):

| Component | Licence | In our MVP? |
|---|---|---|
| Whisper code and weights, faster-whisper, Silero VAD | MIT [F] | Yes |
| WhisperX; its Korean wav2vec2 aligner | BSD-2-Clause; Apache-2.0 [F] | Yes; credit Zeroth (CC BY 4.0), the aligner's training data |
| Qwen3-ASR, Qwen3-ForcedAligner | Apache-2.0 [F] | Yes |
| Cohere Transcribe | Apache-2.0, gated download [V/P] | Optional |
| Nemotron 3.5 streaming | OpenMDW-1.1, "ready for commercial use" [F]; one community port claims another licence | Later, on the phone |
| SenseVoice-Small | FunASR licence; commercial use not expressly addressed [F] | No, until clarified |
| Moonshine Korean models | Moonshine Community License: commercial use only after registering, ends above US$1M annual revenue, notice required [F] | **Excluded until cleared in writing** |
| Weights trained on AI Hub data (KsponSpeech), e.g. the sherpa Korean Zipformer | AI Hub allows for-profit R&D with conditions; deploying trained models is not addressed [F] | **Excluded until cleared in writing** |

## In our app: the bake-off

The MVP compares **Qwen3-ASR-1.7B** with **Whisper large-v3** (faster-whisper plus Silero VAD), optionally adding Cohere Transcribe (S-2), all on our own box.

1. **Test set.** At least 30 memos from the first week: Korean and mixed, subway and quiet, phone mic and earbuds (MVP 3.3). The input route is logged per segment (A3); each memo gets an environment tag (subway, street, quiet). Add about 20 clips of pure noise (the subway, nobody speaking) to measure hallucination.
2. **References.** The user's corrections in the app become the references (S-3). **Watch for anchoring:** if the user always edits model A's output, the references lean towards A's spelling choices. Alternate which model's text is offered for editing, or correct some memos from the audio alone [H].
3. **One normaliser for every model and reference:** Unicode NFC (one standard byte form for Hangul), punctuation removed, English lower-cased, numbers mapped to one form, the loanword equivalence list, spaces removed for CER. Version it, and never change it mid-comparison.
4. **Metrics, per model, per route and per environment:**
   - CER (Korean), WER (English), MER (mixed);
   - **critical-token accuracy:** the share of numbers, codes and names from the vocabulary list (A12) that come out exactly right. One wrong digit matters more in a log than ten wrong particles;
   - **hallucination rate:** text produced on the noise clips and on segments the user marked "no speech";
   - **latency:** upload-to-transcript for a 30 s memo (target 10 s or less [E]), and GPU seconds per audio minute.
5. **Is a difference real?** Compare models memo by memo on the same memos. **Worked example 9 [E]:** if the per-memo CER differences have a standard deviation of 4 points, the standard error of their mean over 30 memos is 4 / √30 ≈ 0.73 points, so the 95% interval is about ±1.4 points. A 1-point win on 30 memos is noise; a 5-point win is real.
6. **"Good enough" for the MVP** [E; proposals for the user to confirm]: normalised Korean CER of 5% or less in quiet and 10% or less on the subway set; mixed MER of 15% or less; critical-token accuracy of 90% or more; no text on at least 99 of 100 noise clips; transcripts within 10 s of upload. For a feel of 10% CER: a 60-syllable memo has about 6 wrong syllables, usually still readable unless they land on the numbers, which is why critical tokens are tracked separately.

## Read or watch

- Hugging Face Audio Course, the CTC and sequence-to-sequence pages, then the ASR unit and its evaluation page: https://huggingface.co/learn/audio-course/chapter3/ctc, https://huggingface.co/learn/audio-course/chapter3/seq2seq, https://huggingface.co/learn/audio-course/chapter5/introduction, https://huggingface.co/learn/audio-course/chapter5/evaluation
- Awni Hannun, *Sequence Modeling with CTC* (distill.pub, interactive; the best explanation of the collapse rule and the forward algorithm): https://distill.pub/2017/ctc/
- Loren Lugosch, *Sequence-to-sequence learning with Transducers* (blog post with code): https://lorenlugosch.github.io/posts/2020/11/transducer/
- Stanford lecture *End-to-End Models for Speech Processing* (YouTube, 2017; CTC, Listen-Attend-Spell and why they work): https://www.youtube.com/watch?v=3MjIkWxXigM
- Whisper repository (model sizes, the 30 s window, licence): https://github.com/openai/whisper, and *Robust Speech Recognition via Large-Scale Weak Supervision* *(paper)*: https://arxiv.org/abs/2212.04356
- Qwen3-ASR model card (context, streaming, forced aligner): https://huggingface.co/Qwen/Qwen3-ASR-1.7B, and tech report *(paper)*: https://arxiv.org/abs/2601.21337
- NVIDIA blog on Parakeet-TDT (how the duration trick speeds up a transducer): https://developer.nvidia.com/blog/turbocharge-asr-accuracy-and-speed-with-nvidia-nemo-parakeet-tdt/, and NeMo word-boosting docs: https://docs.nvidia.com/nemo/speech/3.0.0/asr/asr_customization/word_boosting.html
- sherpa-onnx docs (on-device runtime) and its hotwords page: https://k2-fsa.github.io/sherpa/onnx/index.html, https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html
- Benchmarks: the Open ASR Leaderboard (English and five European languages; no Korean): https://huggingface.co/spaces/hf-audio/open_asr_leaderboard, and HiKE, the Korean–English code-switching benchmark *(paper)*: https://arxiv.org/abs/2509.24613

## Exercise (1–1.5 h)

**(a) Scoring by hand, then by code (30 min).** For each pair, count S, D and I by hand, then check with `asr_metrics.py` from section 1.

| # | Reference | Hypothesis | Score |
|---|---|---|---|
| 1 | set the pressure to five bar | set pressure to five bars | WER |
| 2 | 삼 번 펌프 점검 완료 | 3번 펌프 점검완료 | WER; CER; CER after writing 3 as 삼 |
| 3 | 컨베이어 belt 속도 확인 | 컨베이어 벨트 속도 확인 | MER |
| 4 | 네 알겠습니다 | 네 알겠습니다 시청해 주셔서 감사합니다 | CER |

Answers: (1) 2/6 = 33.3%. (2) WER 4/5 = 80%, CER 1/8 = 12.5%, then 0%. (3) 2/9 = 22.2%. (4) 11/6 = 183%: an invented sign-off on a short memo gives almost twice as many errors as the memo has characters.

**(b) Optional heavy part (45 min): Whisper small on five Korean clips, on the CPU.**

**Memory warning.** This box has 29 GiB of RAM shared with other work, and an earlier session was killed when memory ran out. Run `free -h` first and continue only if several GB are "available". Run one heavy job at a time: not while the separation demo or any other model is running, and not during a large download. Run it only inside the memory cap below. You can also skip this part and wait for our server bake-off, which will produce the same kind of table on your own memos.

```bash
free -h
source ~/audio-learn/bin/activate && cd ~/audio-learn   # asr_metrics.py and zeroth_whisper.py live here
uv pip install faster-whisper      # the model (about 490 MB) downloads on first use
systemd-run --user --scope -p MemoryMax=6G -p MemorySwapMax=0 python zeroth_whisper.py
```

```python
# zeroth_whisper.py, next to asr_metrics.py from section 1
import os
from faster_whisper import WhisperModel
from asr_metrics import cer
root = os.path.expanduser("~/dev/sound-canvas/tools/separation-lab/data/zeroth/test_data_01/003/104")
refs = dict(l.strip().split(" ", 1) for l in open(f"{root}/104_003.trans.txt", encoding="utf-8"))
model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
for uid in sorted(refs)[:5]:
    segs, info = model.transcribe(f"{root}/{uid}.flac", language="ko", beam_size=5,
                                  condition_on_previous_text=False)
    hyp = " ".join(s.text.strip() for s in segs)
    print(f"{uid}  CER {cer(refs[uid], hyp)[0]:.1%}\n  REF {refs[uid]}\n  HYP {hyp}")
```

Then: (1) in clip `104_003_0253` the reference spells a year as "이천 십 팔 년"; how much of its CER is only number formatting? (2) Write a small normaliser (digits to Sino-Korean, punctuation removed) and rescore all five. (3) Sort the remaining errors into spacing, loanwords and real mishearings. The Zeroth data is CC BY 4.0: credit the Zeroth Project if you share results.
