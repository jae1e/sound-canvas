# 12. 음성을 텍스트로: 인식기는 어떻게 동작하는가, CTC부터 Whisper, Qwen3-ASR, 스트리밍 모델까지

> 영어 원문(English original): [12-speech-to-text.md](../12-speech-to-text.md)

우리의 음성 중심 현장 기록 앱은 휴대폰에서 녹음하고, 오디오를 우리 자체 RTX 4090 서버로 보내 텍스트로 바꿉니다. 말은 한국어, 영어, 또는 한 문장 안에 두 언어가 섞인 것이고, 시끄러운 지하철에서 녹음되는 일이 많습니다. 이 강의는 후보 목록(shortlist)에 오른 인식기들이 어떻게 동작하는지, 어떻게 채점하는지, 우리 녹음으로 어떻게 골라야 하는지를 설명합니다. 범위: [MVP 요구사항](../../../products/industrial-voice-logging/mvp-requirements.md). 모델 관련 사실: 우리의 [ASR 리서치 노트](../../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md)(2026-11-05)이며, 전체 출처가 거기 있습니다.

**레이블(label)**은 리서치 노트와 같습니다. **[F]** 1차 자료(모델 카드, 코드, 논문)에서 검증됨(verified); **[V]** 업체 주장(vendor claim: 모델 제작사가 직접 낸 벤치마크); **[P]** 제3자 보고(third-party report); **[A]** 일화(anecdote); **[E]** 우리의 추정(estimate); **[H]** 우리의 가설(hypothesis). 사실은 2026-11-05 기준입니다. 현재 사실로 인용하기 전에 다시 확인하세요.

**이번 강의에서 만나는 용어** (각 용어는 처음 나올 때 다시 설명합니다):

| 용어 | 쉬운 뜻 |
|---|---|
| 음성 인식(ASR) | 자동 음성 인식(automatic speech recognition): 오디오를 넣으면 텍스트가 나옴. 음성-텍스트 변환(STT, speech-to-text)이라고도 함 |
| 정답 / 가설(reference / hypothesis) | 사람이 쓴 올바른 전사(transcript) / 인식기가 만든 결과 |
| 토큰(token) | 모델이 출력하는 단위. 수천 개 조각으로 된 고정 목록에서 나온 단어 조각인 경우가 많음(BPE, byte-pair encoding: 자주 나오는 글자 묶음을 한 조각으로 합치는 방식) |
| WER, CER, MER | 단어·문자·혼합 오류율(word, character, mixed error rate): 정답 단위 중 인식기가 틀린 비율 |
| 정규화(normalisation) | 채점 전에 두 텍스트를 하나의 표준 형태(숫자, 문장부호, 띄어쓰기)로 다시 쓰는 일 |
| 인코더 / 디코더(encoder / decoder) | 오디오 특징을 벡터로 바꾸는 네트워크 부분 / 벡터를 토큰으로 바꾸는 부분 |
| 언어 모델(LM, language model) | 어떤 단어열이 그럴듯한지에 대한 모델. LLM(대형 언어 모델, large language model)은 Qwen3처럼 아주 큰 것 |
| CTC | 연결주의 시간 분류(connectionist temporal classification): 오디오 프레임마다 출력 하나, 그리고 "빈칸(blank)" 기호 |
| 트랜스듀서(transducer: RNN-T, TDT) | 작은 언어 모델을 내장한 CTC 비슷한 모델. 자연스럽게 스트리밍됨 |
| AED | 어텐션 인코더-디코더(attention encoder–decoder): 오디오를 되돌아보며 토큰을 하나씩 씀. Whisper가 이 방식 |
| 탐욕 탐색 / 빔 탐색(greedy / beam search) | 매 단계 가장 좋은 토큰 하나만 고름 / 가장 좋은 부분 전사 k개를 유지하며 모두 이어 나감 |
| 스트리밍 / 오프라인(streaming / offline) | 말하는 동안 텍스트가 나타남(임시 *부분 결과(partial)* 뒤에 확정 *최종 결과(final)*) / 녹음 전체가 준비된 뒤 텍스트를 만듦 |
| RTF, RTFx | 실시간 계수(real-time factor) = 처리 시간 / 오디오 길이(강의 07). RTFx = 1 / RTF, "실시간보다 몇 배 빠른가" |
| VAD | 음성 구간 검출(voice activity detection): 어느 순간에 말이 있는지 판단(강의 07) |
| 환각(hallucination) | 실제로 말한 적 없는 유창한 텍스트. 주로 무음이나 잡음에서 생김 |
| 강제 정렬(forced alignment) | 오디오와 이미 아는 텍스트가 주어졌을 때, 각 단어가 언제 발화되었는지 찾는 일 |
| 편향, 핫워드(biasing, hotwords) | 인식기가 주어진 단어 목록 쪽으로 기울도록 살짝 미는 일 |
| 코드 스위칭(code-switching) | 한 문장 안에서 언어를 바꿔 말하기: "밸브 pressure 확인했어요" |
| 양자화, VRAM(quantisation, VRAM) | 가중치를 더 적은 비트로 저장(16비트 부동소수점 대신 int8) / GPU 자체 메모리(우리 4090은 24 GB) |

## 1. 인식기는 무엇을 출력하고, 어떻게 채점하는가

**출력(output).** 텍스트입니다. 보통 시작·끝 시각이 붙은 **세그먼트(segment)**(문장 비슷한 조각)로 나뉘고, 단어 시각과 신뢰도(confidence) 숫자가 함께 오는 경우가 많습니다. 내부적으로 텍스트는 **토큰**의 열입니다. 영어에서는 단어 조각("valv" + "e")인 경우가 많고, 한국어에서는 음절 블록 하나(밸)나 단어 조각(확인)인 경우가 많습니다.

**WER, 단어 오류율(word error rate).** 가설을 정답과 단어 단위로 맞춰 놓고 세 종류의 오류를 셉니다. **S** 대체(substitution: 맞는 단어 자리에 틀린 단어), **D** 삭제(deletion: 빠진 정답 단어), **I** 삽입(insertion: 말한 적 없는 단어가 추가됨). WER = (S + D + I) / N이며, N은 정답의 단어 수입니다.

**편집 거리(edit distance)는 동적 계획법(dynamic programming)입니다.** 격자 위의 최단 경로 찾기와 같습니다. 칸 d[i][j]는 정답의 처음 i 단어를 가설의 처음 j 단어로 바꾸는 최소 비용입니다. 각 칸은 세 가지 이동 중 최솟값을 택합니다. 대각선은 d[i−1][j−1] + (단어가 같으면 0, 다르면 1); 아래는 d[i−1][j] + 1(삭제); 오른쪽은 d[i][j−1] + 1(삽입).

**계산 예 1.** 정답 "open valve three"(N = 3), 가설 "open the valve tree":

| | – | open | the | valve | tree |
|---|---|---|---|---|---|
| **–** | 0 | 1 | 2 | 3 | 4 |
| **open** | 1 | **0** | **1** | 2 | 3 |
| **valve** | 2 | 1 | 1 | **1** | 2 |
| **three** | 3 | 2 | 2 | 2 | **2** |

오른쪽 아래 칸이 2입니다. 굵은 경로를 거꾸로 따라가면 삽입 하나("the")와 대체 하나(three → tree)가 나옵니다. WER = 2/3 = 66.7%.

**계산 예 2.** 정답 "the left valve on pump three is leaking"(N = 8), 가설 "the valve on bump three is leaking now": D = 1("left"), S = 1(pump → bump), I = 1("now")이므로 WER = 3/8 = 37.5%. **WER은 100%를 넘을 수 있습니다.** 삽입에는 상한이 없기 때문입니다. "okay"가 환각된 "thank you for watching"으로 나오면 S = 1, I = 3, WER = 400%입니다.

채점 코드입니다(`~/audio-learn`에 `asr_metrics.py`로 저장하세요. 표준 라이브러리만 있으면 됩니다):

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

**한국어용 CER, 문자 오류율(character error rate).** 한국어 단어(어절: 띄어쓰기로 나뉜 덩어리)는 길고 문법 어미가 붙으며, 사람마다 띄어쓰기가 들쭉날쭉합니다. 그래서 한국어는 문자(음절 블록) 단위로 채점하고, 보통 공백을 먼저 지웁니다. **계산 예 3:** 정답 "작업 완료했습니다", 가설 "작업완료 했습니다". 공백 위치만 바뀌었습니다. WER: 두 단어가 모두 달라 S = 2이고 WER = **100%**. 공백을 남긴 CER: 공백 하나 삭제와 하나 삽입으로 9글자 중 2개 오류 = **22%**. 공백을 지운 CER: **0%**이며, 사람이 읽고 느끼는 것과 일치합니다.

**정규화가 모델보다 점수를 더 크게 흔들 수 있습니다.** Zeroth-Korean 코퍼스(우리 랩 데이터에 있는 한국어 낭독 음성)는 숫자를 소리 나는 대로 적습니다. 실제 정답 문장 하나(`104_003_0664`):

> 작년 십 이 월 천 이백 십 원대까지 올랐던 원 달러 환율은 최근 천 백 오십 원대로 오 퍼센트가량 떨어지면서 외국인 자금 유입에 도움을 주고 있다

요즘 인식기라면 "작년 12월 1,210원대까지 … 1,150원대로 5%가량 …"처럼 쓸 가능성이 큽니다(우리가 만든 예시이며, 실제 모델 실행 결과가 아닙니다). 단어는 모두 맞았는데도 공백을 지운 CER은 57글자 중 18개 오류 = **31.6%**입니다. 숫자를 한자어 읽기로 바꾸고(12 → 십이, 1,210 → 천이백십, % → 퍼센트) 문장부호를 지우는 정규화기(normaliser)를 거치면 CER은 **0%**가 됩니다. 그러니 두 한국어 CER은 같은 정규화기를 썼을 때만 비교할 수 있습니다. 리서치 노트는 이 이유로 업체별 FLEURS-ko 수치를 서로 비교할 수 없다고 경고하며, Nemotron의 모델 카드는 자기 정규화 방식이 오류율을 부풀릴 수 있다고 직접 경고합니다 [F].

**코드 스위칭 음성용 MER, 혼합 오류율(mixed error rate):** 한국어는 문자 단위, 영어는 단어 단위로 세어 하나의 열로 다룹니다(HiKE 벤치마크가 쓰는 정의 [F]). **계산 예 4:** "밸브 pressure 확인 완료"는 7개 단위(밸, 브, pressure, 확, 인, 완, 료)입니다. 가설 "밸브 프레셔 확인 완료"는 pressure 자리에 프를 대체하고 레와 셔를 삽입하므로 MER = 3/7 = **42.9%**입니다. 한국어 화자는 둘 다 알아듣는데도 그렇습니다. 그래서 HiKE는 외래어의 두 표기를 모두 정답으로 인정합니다 [F]. 우리 정규화기도 동치 목록(프레셔 = pressure)으로 똑같이 해야 합니다.

## 2. 표 하나로 보는 역사

| 시기 | 접근 방식 | 쉽게 말한 동작 원리 | 밀려난 이유 |
|---|---|---|---|
| 1980년대–2000년대 | **HMM-GMM** | 말은 숨은 상태(hidden state: 음소(phone, 말소리의 기본 단위)의 하위 부분)의 사슬이며, 이산 상태 추정기(discrete-state estimator)와 비슷합니다. 가우스 혼합 모델(GMM, Gaussian mixture model)이 10 ms 프레임마다 각 상태에 얼마나 맞는지 점수를 매깁니다. 발음 사전과 n-gram 언어 모델(단어열 통계)을 함께 탐색합니다(Kaldi, 2011) | 사람이 만든 부품이 많고, GMM은 프레임을 잘 모델링하지 못함 |
| 약 2010–2015 | **하이브리드 DNN-HMM** | 심층 신경망(DNN, deep neural network)이 GMM 대신 프레임 점수를 매기고, HMM·사전·언어 모델은 그대로 둠 | 여전히 사전, 예전 시스템이 만든 정렬, 전문가의 튜닝이 필요 |
| 2014–2021 | **엔드투엔드(end-to-end)** | 특징에서 글자나 토큰까지 네트워크 하나로: CTC(2006년; Baidu의 Deep Speech가 2014년에 대규모로 키움), 어텐션 인코더-디코더(Listen, Attend and Spell, 2015), 트랜스듀서(2012년; 2019년 Google 온디바이스 키보드에 탑재). 2020년에 Conformer 인코더와 자기 지도 사전학습(self-supervised pre-training: wav2vec 2.0)이 등장 | 언어마다 정성껏 전사한 오디오가 수천 시간 필요 |
| 2022– | **대규모 약지도 학습(large weakly supervised)** | Whisper: 불완전한 웹 전사가 붙은 오디오 약 68만 시간, 여러 언어, 모델 하나 [F] | 드문 단어에 약함; 환각이 생길 수 있음 |
| 2023–2026 | **LLM 디코더 ASR** | 오디오 인코더가 사전학습된 LLM에 입력을 넣고, LLM이 텍스트를 쓰며 텍스트 맥락(context)도 읽을 수 있음(Qwen3-ASR, 2026년 1월) | 현재 최고 수준; 더 무겁고, LLM 특유의 실패 양상이 있음 |

## 3. 프런트엔드: 파형에서 벡터의 열로

**특징(feature).** 거의 모든 모델은 **로그 멜 스펙트로그램(log-mel spectrogram)**([강의 03](03-spectral-analysis.md))에서 시작합니다. 25 ms 창(window)을 10 ms 홉(hop)으로 옮기며 80개 또는 128개 멜 대역으로 묶은 뒤 로그를 취합니다. 16 kHz에서는 400샘플 창을 160샘플씩 옮기는 것이고, 초당 100프레임입니다. Whisper의 설정이 정확히 이렇습니다 [F: 코드]. 30초 오디오(480,000샘플)는 Whisper large-v3에서 3,000프레임 × 128대역이 됩니다.

**서브샘플링(subsampling).** 말은 초당 100번보다 느리게 변하므로, 인코더의 첫 합성곱(convolution) 층들이 이웃 프레임을 합칩니다. 벡터 수가 줄면 어텐션이 싸집니다. 어텐션 비용은 열 길이의 제곱으로 늘기 때문입니다([강의 06](06-deep-learning-separation.md)).

| 인코더 | 합치는 비율 | 출력 벡터 간격 | 쓰이는 곳 |
|---|---|---|---|
| Whisper | 2× | 20 ms (30초에 1,500개 벡터) [F] | Whisper |
| Conformer | 4× | 40 ms (25 Hz) [F] | 많은 CTC·트랜스듀서 모델 |
| FastConformer, AuT | 8× | 80 ms (12.5 Hz) [F] | Nemotron, Parakeet, Qwen3-ASR |

**계산 예 5: 출력 단위가 프레임 속도에 맞는가?** CTC(다음 절)는 출력 단위 하나에 프레임이 적어도 하나 필요합니다. 우리 Zeroth 테스트 클립(발화 457개, 71.5분, 쉼 포함)에서 측정하니 평균 초당 4.5음절(90번째 백분위수에서 5.3)이고, 자모(jamo: 한글 낱글자)로는 초당 11.1개였습니다. 가장 빠른 클립은 초당 7.4음절, 자모로 약 18개입니다. 80 ms 프레임(초당 12.5개)에서 음절은 넉넉히 들어가지만 자모는 들어가지 않습니다. 한국어 모델이 낱글자가 아니라 음절이나 단어 조각을 출력하는 이유 중 하나입니다.

## 4. 엔드투엔드 모델의 세 가족

### 4.1 CTC: 프레임마다 한 번 추측, 그리고 빈칸

**아이디어.** 인코더가 프레임마다 벡터 하나를 냅니다. 분류기가 각 벡터를 어휘 전체와 추가 기호 하나에 대한 확률로 바꿉니다. 추가 기호가 **빈칸(blank, `_`)**이며 "여기엔 새것 없음"이라는 뜻입니다. **접기 규칙(collapse rule):** 반복된 기호를 합친 다음 빈칸을 지웁니다.
- `hh_e_ll_lo` → 반복 합치기 → `h_e_l_lo` → 빈칸 지우기 → **hello**.
- `h_eell_o` → **helo**: 두 l 사이에 빈칸이 없으면 하나로 합쳐집니다. 빈칸 덕분에 CTC가 겹글자를 쓸 수 있습니다.

**학습은 모든 정렬(alignment)을 더합니다.** 텍스트는 알지만 각 글자가 어느 프레임에 속하는지는 모릅니다. 그래서 CTC는 올바른 텍스트로 접히는 모든 프레임 경로의 확률을 더합니다. "hello"는 10프레임에서 그런 경로가 1,001개, 50프레임(40 ms 프레임으로 2초)에서는 약 240억 개입니다. **전방 알고리즘(forward algorithm)**은 격자를 채워 가며 약 50 × 11단계만에 이를 모두 더합니다. 1절의 편집 거리 표와 똑같습니다. 다시 동적 계획법입니다.

**계산 예 6: 가장 좋은 경로가 가장 좋은 텍스트는 아닙니다.** 프레임 두 개, 각각 P(_) = 0.5, P(a) = 0.4, P(b) = 0.1. **탐욕 디코딩(greedy decoding)**은 프레임마다 가장 좋은 기호를 골라 `__`가 되고, 이는 확률 0.25로 빈 텍스트로 접힙니다. 그런데 "a"는 `aa`, `a_`, `_a`에서 나올 수 있습니다: 0.16 + 0.20 + 0.20 = **0.56**. 가장 그럴듯한 *텍스트*는 "a"입니다. 접힌 접두어(prefix) 위의 빔 탐색은 이것을 찾지만, 탐욕 디코딩은 못 찾습니다.

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

**약점: 조건부 독립(conditional independence).** 각 프레임의 추측은 다른 추측을 보지 않고 만들어지므로, 모델은 "방금 'pump'라고 썼으니 'tree'보다 'three'일 가능성이 크다"고 추론하지 못합니다. 실제로는 빔 탐색 중에 외부 언어 모델을 더합니다. **강점:** 빠릅니다(모든 프레임을 한 번에 디코딩). 자유롭게 글을 이어 쓰는 생성기가 없어서 횡설수설이 훨씬 적습니다(음성이 없는 잡음에서 Conformer-CTC 모델은 클립의 13.52%에서 환각했고, Whisper large-v3는 99.97%였습니다 [P, Calm-Whisper 논문]). 그리고 프레임 단위 출력이 강제 정렬의 바탕이 됩니다(7절).

### 4.2 트랜스듀서(RNN-T, TDT): 자기가 쓴 것을 기억하는 CTC

**세 부분.** **인코더**(오디오 → 벡터); **예측 네트워크(prediction network)**: 지금까지 낸 토큰을 읽고 상태를 유지하는 작은 언어 모델(입력이 지금까지의 텍스트인, 학습된 상태공간 모델(state-space model)입니다. RNN 비유는 [강의 07](07-speech-diarization-av.md)에 있습니다); **조이너(joiner)**: 현재 오디오 벡터와 텍스트 상태를 합쳐 "이 토큰을 낸다" 또는 "빈칸: 다음 프레임으로"의 확률을 만듭니다.

**왜 자연스럽게 스트리밍되는가.** 현재 프레임까지의 오디오와 이미 쓴 텍스트만 있으면 됩니다. 인과적(causal)이고 청크 단위인 인코더를 붙이면 말하는 동안 텍스트가 나옵니다. 이전 토큰을 기억하므로 CTC의 독립성 약점도 사라집니다.

**우리 목록에 있는 변형들:**
- **TDT**(token-and-duration transducer, 토큰-길이 트랜스듀서, NVIDIA, 2023)는 몇 프레임을 건너뛸지도 함께 예측해서 디코더 단계 수가 줄어듭니다. Parakeet-TDT-0.6B-v3는 RTFx 3,332를 주장하지만 한국어가 없습니다 [V/F].
- **Zipformer**(k2-fsa 팀)는 가운데 층들이 더 낮은 프레임 속도(최저 6.25 Hz)로 동작하는 인코더로, 시간축의 U-Net과 비슷합니다 [F]. sherpa-onnx는 한국어 모델을 포함한 스트리밍 Zipformer 트랜스듀서를 제공합니다(학습 데이터 라이선스가 불확실함; 10절).
- **Nemotron 3.5 ASR Streaming 0.6B**: 캐시 인식(cache-aware) FastConformer 인코더와 RNN-T 디코더 [F]. "캐시 인식"은 새 청크마다 지난 오디오를 다시 계산하지 않고 저장해 둔 내부 상태를 재사용한다는 뜻입니다. 80 ms 프레임 기준으로 과거 56프레임(4.5초)과 미래 0–13프레임을 보며, 청크 크기는 80 ms에서 1.12초까지입니다 [F].

### 4.3 어텐션 인코더-디코더: Whisper

**쓰는 방식.** 인코더가 오디오를 벡터로 바꿉니다. 디코더는 토큰을 하나씩 씁니다(자기회귀(autoregressive): 각 토큰이 앞의 모든 토큰에 의존). **교차 어텐션(cross-attention)** 덕분에 오디오의 어느 부분이든 볼 수 있습니다. 디코더는 소리를 조건으로 하는 완전한 언어 모델입니다.

**Whisper의 세부 사항** [F: 저장소, 논문, 모델 카드]:
- 항상 **30초 창**을 받습니다. 짧은 오디오는 무음으로 채우고(padding), 긴 오디오는 창 단위로 처리합니다. large-v2까지는 멜 대역 80개, large-v3는 128개입니다.
- **데이터:** 초기 모델은 *약지도(weakly supervised)* 오디오 약 68만 시간입니다. 웹에서 모은 전사라서 양은 많지만 불완전하다는 뜻입니다. large-v3는 약하게 레이블된 오디오 100만 시간에 large-v2가 레이블한 400만 시간을 더 썼습니다.
- **크기:** small 2억 4,400만(244M) 매개변수, large 15억 5,000만(1,550M). turbo(809M)는 large-v3 인코더를 그대로 두고 디코더를 32층에서 4층으로 줄였습니다.
- **특수 토큰(special token)**이 동작을 조종합니다: `<|startoftranscript|><|ko|><|transcribe|>` 다음에 `<|notimestamps|>`, 또는 20 ms 격자 위의 `<|0.00|>` … `<|2.48|>` 같은 타임스탬프 토큰이 옵니다. 언어 토큰은 강제할 수도 있고(언어를 알면 `ko`로 강제) 예측하게 할 수도 있습니다.
- **프롬프트(prompt):** 이 토큰들 앞에 놓는 텍스트(`initial_prompt`)는 "앞에서 했던 말" 역할을 합니다. 약 224토큰만 들어가며, 참조 코드는 마지막 223토큰을 남깁니다 [F: 코드].

**약점.** 강한 언어 모델인 디코더는 오디오에 말이 없어도 유창한 텍스트를 씁니다. 이것이 환각입니다(6절).

### 4.4 LLM 디코더 ASR: Qwen3-ASR

Qwen3-ASR-1.7B의 **구조** [F: 기술 보고서]: **AuT 오디오 인코더**(3억(300M) 매개변수; 128대역 특징을 8배 서브샘플링해 초당 12.5개 벡터로 만듦), **프로젝터(projector)**(그 벡터를 LLM 입력 공간으로 옮기는 작은 층), 디코더 역할의 **Qwen3-1.7B LLM**. 오디오 벡터는 마치 단어인 것처럼 LLM에 들어갑니다.

**맥락(context).** 디코더가 LLM이므로 **시스템 프롬프트(system prompt)**(오디오 앞에 주는 텍스트)에 이름, 전문 용어, 직전 메모 같은 배경지식을 담을 수 있습니다. Qwen은 모델이 그 맥락을 배경으로만 쓰고 그 안에 적힌 지시는 *따르지 않도록* 학습시켜 프롬프트 주입(prompt injection)에 대비했습니다 [F]. 말이 들리지 않으면 "language None"과 빈 텍스트로 답하도록 학습되어 있어 [F], 우리 앱의 무음 표시(no-speech flag)에 바로 대응합니다.

**실무상 한계.** 스트리밍은 vLLM 백엔드(빠른 LLM 서빙 엔진)에서만 되고, 배치(batching)와 타임스탬프가 없습니다. 단어 시각은 별도의 Qwen3-ForcedAligner가 줍니다 [F]. **Cohere Transcribe(2B)**는 FastConformer 인코더를 쓴 인코더-디코더입니다. 언어 태그가 필요하고 코드 스위칭으로 학습되지 않았습니다 [V].

| 가족 | 스트리밍? | 환각 위험 | 편향 방식 | 우리 후보 |
|---|---|---|---|---|
| CTC | 가능 | 낮음 | 외부 언어 모델, 부스팅 | wav2vec2 정렬기, Meta Omnilingual |
| 트랜스듀서 | 자연스럽게 가능 | 낮음 | 핫워드, 구문 부스팅 | Nemotron 3.5, Zipformer, Parakeet |
| AED | 어색함(30초 창) | 무음·잡음에서 높음 | 프롬프트 | Whisper large-v3, Cohere |
| LLM 디코더 | 제한적으로 가능 | 중간 [H]; "말 없음"으로 답하도록 학습됨 | 자유 텍스트 맥락 | Qwen3-ASR-1.7B |

## 5. 스트리밍 대 오프라인

**스트리밍 용어.** **청크 크기(chunk size):** 모델이 한 단계에 받는 새 오디오의 양. **선행 참조(lookahead):** 결과를 확정하기 전에 엿볼 수 있는 *미래* 오디오의 양으로, 정확도를 얻는 대신 지연이 생깁니다. **부분 결과(partial)**는 오디오가 들어올수록 다시 쓰이고, **최종 결과(final)**는 **끝점(endpoint)**, 보통 일정 길이의 무음에서 확정됩니다.

**계산 예 7: 스트리밍 지연 [E].** 560 ms 청크의 Nemotron 3.5에서, 단어는 청크 안의 임의의 순간에 끝나므로 청크가 끝날 때까지 평균 280 ms(최악 560 ms)를 기다리고, RTF 0.05의 계산이 약 28 ms를 더합니다. 따라서 부분 텍스트는 말보다 약 0.3–0.6초 늦게 나오고, 최종 줄은 끝점 무음까지 더 기다립니다.

**낮은 지연은 정확도로 값을 치릅니다 [V].** Nemotron의 한국어 FLEURS CER은 80 ms 청크에서 7.59, 1.12초에서 7.12입니다. Qwen3-ASR-1.7B는 오프라인 2.69에서 스트리밍 3.33으로 오릅니다(영어·중국어 세트 세 개의 평균). 오프라인 Qwen3-ASR-1.7B의 FLEURS-ko는 2.57이며, 앞에서 말한 정규화 주의 사항이 적용됩니다.

**계산 예 8: 서버에서 RTF가 뜻하는 것.** 처리 시간 = RTF × 오디오 길이.
- RTF 0.01이면 오디오 1시간은 3,600 × 0.01 = **36초** 걸립니다.
- Qwen3-ASR-1.7B는 동시 처리 1건에서 오프라인 RTF 0.01482를 주장합니다. 1시간을 약 53초에 처리합니다 [V; GPU 미기재].
- faster-whisper large-v2는 RTX 3070 Ti에서 13분(780초)을 17초에 전사했습니다. RTF 0.022, 즉 실시간의 46배입니다 [F].
- **우리 부하 [E]:** 하루 30초짜리 메모 30개면 오디오 900초이고, RTF 0.02에서 GPU 시간 18초입니다. 처리량은 우리의 제약이 아니고, 정확도가 제약입니다.

**MVP가 서버에서 오프라인으로 전사하는 이유**(결정 3). 오프라인 모델은 메모 전체, 즉 과거와 미래를 다 보므로, 리서치 노트는 한국어에서 스트리밍 모델보다 CER이 3–5포인트 좋을 것으로 예상합니다 [H]. 휴대폰에 모델을 넣을 필요가 없고, 앱을 다시 배포하지 않고 모델을 바꿀 수 있습니다. 대가는 오프라인일 때 텍스트가 없다는 점입니다. 사용자는 동기화 후에 텍스트를 봅니다. 30초 메모는 약 0.96 MB로, 5 Mbit/s에서 업로드에 약 1.5초 [E], 계산은 1초도 안 걸립니다.

## 6. 긴 녹음, 구간 나누기, 환각

**청크 나누기(chunking).** Whisper는 한 번에 30초를 읽습니다. 더 긴 오디오에서는 창을 옮겨 가며, 기본적으로 이전 창의 텍스트를 프롬프트로 다시 넣습니다(`condition_on_previous_text`). 이름 표기가 일관되게 유지되지만, 환각 하나가 창마다 반복될 수도 있습니다.

**VAD 기반 청크 나누기가 낫습니다.** Silero VAD(MIT, 약 2 MB, CPU 스레드 하나에서 30 ms 청크당 1 ms 미만 [F])가 말 구간을 표시하고, 오디오를 무음에서 자른 뒤 말만 전사합니다. faster-whisper의 VAD 기본값은 말 판정 임계값 0.5, 2초 이상의 무음에서만 자르기, 양쪽 400 ms 여유(padding)입니다. 이 필터는 일반 `WhisperModel.transcribe`에서는 기본으로 꺼져 있고, 배치 파이프라인에서는 켜져 있습니다 [F: 코드].

**경계 오류(boundary error).** 단어 중간을 자르면 그 단어는 두 번 망가집니다. 한 청크의 끝과 다음 청크의 시작입니다. 우리 앱은 충돌 안전을 위해 오디오를 30초 이하 세그먼트로 저장합니다(A3). **이 저장용 절단은 말의 경계가 아닙니다.** ASR 워커는 메모의 세그먼트를 먼저 이어 붙이고 VAD 무음에서 다시 잘라야 합니다 [H].

**무음과 잡음에서의 환각.**
- UrbanSound8K(거리 소리, 말 없음)에서 Whisper large-v3는 클립의 99.97%에 텍스트를 냈습니다 [P].
- VAD도 잡음에 속습니다. Silero v5는 ESC-50 잡음 클립의 61%만 올바르게 분류했습니다 [P]. 한국 논문 하나는 Whisper가 잡음 클립 3,429개 전부에서 환각했고, Silero 필터링으로 0.73%까지 떨어졌다고 보고합니다 [P, 재인용].
- 전형적인 출력은 자막 학습 데이터에 흔한 문구로, "Thank you for watching" 같은 것입니다(이른바 "환각 문구 묶음(bag of hallucinations)" [P]). 한국어 영상의 마무리 인사도 나올 것으로 예상합니다 [H].
- **Whisper의 내장 안전장치** [F: faster-whisper 기본값]: 무음 확률(no-speech probability)이 0.6을 넘고 *동시에* 평균 토큰 로그 확률이 −1.0 미만이면 그 창을 무음으로 봅니다. gzip 압축률이 2.4를 넘는 텍스트는 반복 루프로 보고(반복된 텍스트는 유난히 잘 압축됨), 더 높은 샘플링 온도(temperature), 즉 무작위성을 키워 다시 디코딩합니다.

**누르고 말하기(push-to-talk)가 크게 도움이 됩니다.** 대부분의 메모는 짧고 의도적이며 말로 시작하므로, 디코더가 채울 무음이 거의 없습니다. 사용자가 켜 둔 핸즈프리 세션에서는 VAD가 대신 판단하므로 지하철에서 오작동이 더 많을 것입니다. 앱은 신뢰도가 낮은 구간과 말이 없는 구간을 텍스트가 아니라 표시(flag)로 보여 줍니다(A11).

## 7. 타임스탬프

**세그먼트 수준** 시각은 Whisper의 타임스탬프 토큰으로 공짜로 나옵니다("0.00–4.20 s: 3번 펌프 점검 완료"). **단어 수준** 시각은 일이 더 필요합니다:
- **교차 어텐션 정렬**(faster-whisper `word_timestamps=True`): 디코더가 각 단어를 쓰는 동안 어느 오디오 프레임에 주목했는지 봅니다.
- **CTC 강제 정렬**(WhisperX): CTC 모델(wav2vec2)을 오디오에 돌리고, *이미 아는* 텍스트를 쓰는 트렐리스(trellis) 경로 중 가장 좋은 하나를 찾습니다. 4.1절의 전방 알고리즘에서 "합" 대신 "최댓값"을 쓴 것(비터비 알고리즘, Viterbi algorithm)입니다. WhisperX의 기본 표에는 한국어 정렬기 `kresnik/wav2vec2-large-xlsr-korean`(Apache-2.0, Zeroth로 학습)이 들어 있습니다 [F: 코드, 모델 카드].
- **전용 정렬기:** Qwen3-ForcedAligner-0.6B는 한국어에서 평균 37.2 ms 어긋남을 주장합니다 [V]. 우리가 측정한 초당 4.5음절에서 한 음절은 약 220 ms이므로, 음절의 6분의 1 정도입니다.

**검토 화면에 필요한 이유.** A11은 "전사 줄을 탭하면 그 오디오가 재생된다"고 합니다. 세그먼트 시각만 있으면 긴 줄을 탭했을 때 몇 초 일찍 시작합니다. 단어 시각이 있으면 탭한 단어부터 재생하고 재생 중 단어를 강조할 수 있습니다. 사용자가 잘못 들린 부품 번호를 고칠 때 가장 중요합니다.

## 8. 우리 단어를 알아듣게 만들기

이름, 제품 코드, 영어 전문 용어는 학습 데이터에 드물어서, 인식기는 이것들을 흔한 단어로 바꿔 버립니다. **편향(biasing)**은 두 가지 방식으로 인식기를 주어진 목록 쪽으로 밉니다. **얕은 융합(shallow fusion)**(sherpa-onnx, NeMo)은 목록에 있는 구문을 써 나가는 부분 전사의 빔 탐색 점수에 가산점을 줍니다: 점수 = log P(모델) + λ · 가산점. 최적화 목적 함수에 사전(prior) 항을 더하는 것과 같습니다. **프롬프팅(prompting)**(Whisper, Qwen3-ASR)은 디코더가 쓰기 시작하기 전에 읽는 텍스트에 단어를 넣습니다.

| 도구 | 단어를 주는 방법 | 한계 |
|---|---|---|
| sherpa-onnx 핫워드 | 가중치를 붙일 수 있는 구문 파일, 예: `컨베이어 :2.0` | 트랜스듀서 모델과 `modified_beam_search`에서만 [F]. 한국어 BPE와 Nemotron 3.5에서는 확인되지 않음 |
| NeMo 구문 부스팅(GPU-PB) | 디코딩 시점의 구문 목록, 재학습 불필요 | 발화별 목록은 탐욕 RNN-T/TDT에서만 [F] |
| Whisper `initial_prompt` | "앞에서 했던 말"처럼 보이는 텍스트: "참석: 박지훈, Conveyor C-3, P-203B" | 약 224토큰. 표기와 문체를 살짝 밀 뿐 보장은 없음. 불분명한 오디오에서는 프롬프트의 단어를 출력에 베껴 넣을 수 있음 [H] |
| Qwen3-ASR 맥락 | 시스템 프롬프트의 자유 텍스트 | Alibaba API 문서 기준 최대 10,000토큰 [V]; 앞쪽 단어가 더 크게 작용 [P]; 공개 `qwen-asr` 패키지의 매개변수 이름은 미확인 |

**코드와 숫자를 위한 결정론적 정규화기(deterministic normaliser)**는 인식 뒤에 AI 없이 단순한 규칙으로 돌아갑니다. 작업자가 "피 이공삼 비"라고 읽으면, 규칙이 *코드 패턴 안에 있는* 한글 알파벳 이름과 숫자 단어를 "P-203B"로 바꿉니다. 패턴이 중요합니다. 이는 흔한 단어("이것")이기도 하므로, 패턴이나 사용자 어휘 목록(A12)이 맞을 때만 다시 씁니다. 규칙은 시험할 수 있고, 반복 가능하며, 아무것도 지어낼 수 없습니다.

**선택 사항인 로컬 LLM 사후 교정(post-correction)**(MVP에서는 보류): 로컬 LLM이 어휘 목록을 기준으로 전사를 다시 읽습니다. **위험:** LLM은 유창한 텍스트를 쓰기 때문에, 맞지만 드문 단어를 흔한 틀린 단어로 "고치거나" 빈틈을 말하지 않은 단어로 채울 수 있습니다. **도입한다면:** 원래 ASR 텍스트를 기록으로 보존하고, 사전 항목으로의 대체만 허용하고, 모든 변경을 강조된 제안으로 보여 주고, 사용자의 확인을 새 개정(revision)으로 남깁니다(A9).

## 9. 한국어와 코드 스위칭의 특수성

**음절 블록과 자모.** 한글 블록 하나는 자모 2–3개로 이루어집니다. 초성, 중성, 그리고 있을 수도 있는 종성입니다. 가능한 블록은 19 × 21 × 28 = 11,172개이며, 각각 고유한 유니코드 코드 포인트를 가집니다(한 = ㅎ + ㅏ + ㄴ). 채점 단위가 숫자를 바꿉니다. "갔다"를 "갓다"로 잘못 들으면 블록 2개 중 1개 오류(CER 50%)지만 자모로는 5개 중 1개(20%)입니다.

**띄어쓰기(spacing).** 규칙이 복잡하고 정답에서도 자주 틀리므로, CER은 공백을 지우고 계산하고(1절) 한국어 WER은 보조 수치로만 봅니다.

**숫자에는 세 가지 형태가 있습니다:**
- **한자어 수사(Sino-Korean)**(일, 이, 삼): 날짜, 금액, 분, 번호. "삼 번 펌프";
- **고유어 수사(native Korean)**(하나, 둘, 셋; 단위 명사 앞에서는 한, 두, 세): 개수 세기와 시. "펌프 두 대", "세 시";
- 글로 쓸 때의 **아라비아 숫자(digits)**: "3시 30분"은 "세 시 삼십 분"으로 읽습니다. 시는 고유어, 분은 한자어입니다.

정규화기는 채점 전에 이 셋을 하나의 형태로 맞춰야 합니다. 그러지 않으면 숫자가 오류 수를 지배합니다.

**한국어 속의 영어.** 화자는 "밸브 체크하고 pressure 확인"처럼 말합니다. 인식기는 "pressure"를 로마자로 쓸 수도, 한글로 프레셔라고 쓸 수도 있습니다. 우리 후보들이 어느 쪽을 선호하는지는 아직 모릅니다(리서치 노트의 빈틈).

**HiKE, 한국어-영어 코드 스위칭 벤치마크**(자연스러운 말 약 2.2시간, MER은 1절의 정의) [F/P]:

| 모델 | 전체 MER | 한국어 CER (FLEURS) | 영어 WER (FLEURS) |
|---|---|---|---|
| GPT-4o-transcribe (클라우드) | 21.8 | 2.5 | 3.3 |
| Whisper large | 26.1 | 3.2 | 4.4 |
| Whisper medium | 31.3 | 3.4 | 4.6 |
| SenseVoice-Small | 32.5 | 6.4 | 7.6 |
| Whisper small | 43.5 | 4.5 | 8.3 |

- **섞인 말은 각 언어 단독보다 훨씬 어렵습니다:** Whisper large는 각 언어에서는 3–4% 오류지만 섞인 말에서는 26%입니다.
- **미세 조정(fine-tuning)이 크게 도움이 됩니다:** 자연스러운 코드 스위칭 음성으로 미세 조정한 Whisper medium은 MER이 31.3에서 **9.0**으로 내려갔고, 한국어 단독 CER은 3.4에서 6.0으로 올랐습니다 [F]. 합성한 섞인 데이터만으로는 22.1에 그쳤습니다. 그러니 사용자가 고친 섞인 메모는 시험 데이터일 뿐 아니라 미래의 학습 데이터입니다.
- Qwen3-ASR은 HiKE에서 시험되지 않았으므로, 코드 스위칭 수치가 없습니다.

## 10. 실제로 돌리기

**메모리 ≈ 매개변수 수 × 매개변수당 바이트 수**에 작업 메모리가 더해집니다. 작업 메모리는 활성값(activation)과 **KV 캐시(KV cache)**(디코더가 이미 쓴 토큰의 키와 값을 저장해 둔 것으로, 텍스트 길이와 배치 크기에 따라 커짐)입니다.

| 모델 | 매개변수 | 16비트 가중치 | int8 | 비고 |
|---|---|---|---|---|
| Whisper small (실습용) | 244M | 약 0.5 GB (다운로드 486 MB [F]) | 약 0.25 GB | CPU에서 동작 |
| Whisper large-v3 | 1.55B | 3.1 GB (다운로드 3.09 GB [F]) | 약 1.6 GB | faster-whisper large-v2, 배치 8: fp16 6.1 GB, int8 4.5 GB [F] |
| Whisper large-v3-turbo | 809M | 1.6 GB | 약 0.8 GB | 더 빠르고, 정확도는 약간 낮음 |
| Qwen3-ASR-1.7B | 약 2.0B (LLM 1.7B + 인코더 0.3B) | 약 4 GB (다운로드 4.7 GB [F]) | — | 4–6 GB에 KV 캐시 추가 [E] |

모두 24 GB 4090 한 장에 들어갑니다. MVP 규칙은 그대로입니다. **무거운 작업은 한 번에 하나**, `systemd-run --user --scope -p MemoryMax=…` 상한 안에서, 분리 데모를 멈춘 상태로 돌립니다.

**속도 도구.**
- **CTranslate2**는 트랜스포머(transformer) 모델용 C++ 추론 엔진이고, **faster-whisper**는 그 위에서 Whisper를 돌립니다(MIT [F]).
- **int8 양자화**는 각 가중치를 8비트 정수와 배율(scale factor)로 저장해 16비트 부동소수점보다 메모리를 절반으로 줄입니다. 정확도 손실은 보통 작지만, 우리 데이터로 측정해야 합니다.
- **배치(batching)**는 여러 세그먼트를 GPU에 함께 통과시킵니다. faster-whisper 벤치마크에서 13분 오디오가 한 세그먼트씩(빔 크기 5) 63초, 배치 크기 8에서 17초 걸렸습니다 [F]. Qwen3-ASR과 Cohere는 **vLLM**으로 서빙합니다.

**휴대폰에서는 나중에**(MVP에 포함되지 않음). **ONNX**(Open Neural Network Exchange)는 학습된 네트워크를 담는 파일 형식이고, ONNX Runtime이 휴대폰의 CPU나 NPU에서 이를 실행합니다. **sherpa-onnx**(k2-fsa "차세대 Kaldi(next-generation Kaldi)" 팀)는 모델, 스트리밍 디코더, VAD, 핫워드를 Android용으로 묶어 줍니다. 후보: Nemotron 3.5 스트리밍 int8(약 650 MB, 한국어·영어), Qwen3-ASR-0.6B int8(약 937 MB, 오프라인), 그리고 앱 크기를 전혀 늘리지 않는 휴대폰 내장 인식기 [F].

**라이선스(licence)** (상업적 사용은 필수 조건이고, 외부 클라우드 AI는 금지):

| 구성 요소 | 라이선스 | MVP에 쓰는가? |
|---|---|---|
| Whisper 코드와 가중치, faster-whisper, Silero VAD | MIT [F] | 예 |
| WhisperX; 그 한국어 wav2vec2 정렬기 | BSD-2-Clause; Apache-2.0 [F] | 예. 정렬기의 학습 데이터인 Zeroth(CC BY 4.0)의 출처를 밝힘 |
| Qwen3-ASR, Qwen3-ForcedAligner | Apache-2.0 [F] | 예 |
| Cohere Transcribe | Apache-2.0, 게이트(gated) 다운로드 [V/P] | 선택 |
| Nemotron 3.5 스트리밍 | OpenMDW-1.1, "상업적 사용 준비 완료(ready for commercial use)" [F]; 한 커뮤니티 포트는 다른 라이선스라고 주장 | 나중에, 휴대폰에서 |
| SenseVoice-Small | FunASR 라이선스; 상업적 사용을 명시적으로 다루지 않음 [F] | 명확해질 때까지 아니오 |
| Moonshine 한국어 모델 | Moonshine Community License: 등록 후에만 상업적 사용 가능, 연 매출 미화 100만 달러 초과 시 종료, 고지 필요 [F] | **서면으로 해소될 때까지 제외** |
| AI Hub 데이터(KsponSpeech)로 학습한 가중치, 예: sherpa 한국어 Zipformer | AI Hub는 조건부로 영리 목적 연구·개발을 허용; 학습된 모델의 배포는 다루지 않음 [F] | **서면으로 해소될 때까지 제외** |

## 우리 앱에서: 모델 비교 시험(bake-off)

MVP는 **Qwen3-ASR-1.7B**와 **Whisper large-v3**(faster-whisper + Silero VAD)를 비교하고, 선택적으로 Cohere Transcribe를 더합니다(S-2). 모두 우리 서버에서 돌립니다.

1. **시험 세트(test set).** 첫 주의 메모 최소 30개: 한국어와 섞인 말, 지하철과 조용한 곳, 휴대폰 마이크와 이어버드(MVP 3.3). 입력 경로(route)는 세그먼트마다 기록되고(A3), 메모마다 환경 태그(지하철, 거리, 조용함)를 붙입니다. 환각을 재기 위해 순수 잡음 클립(아무도 말하지 않는 지하철) 약 20개를 더합니다.
2. **정답(reference).** 앱에서 사용자가 고친 결과가 정답이 됩니다(S-3). **앵커링(anchoring)에 주의하세요:** 사용자가 늘 모델 A의 출력을 고치면, 정답이 A의 표기 습관 쪽으로 기웁니다. 편집용으로 보여 주는 모델을 번갈아 바꾸거나, 일부 메모는 오디오만 듣고 고칩니다 [H].
3. **모든 모델과 정답에 정규화기 하나:** 유니코드 NFC(한글을 하나의 표준 바이트 형태로), 문장부호 제거, 영어 소문자화, 숫자를 한 형태로, 외래어 동치 목록, CER용 공백 제거. 버전을 붙이고, 비교 도중에 절대 바꾸지 마세요.
4. **지표(metric), 모델별·경로별·환경별로:**
   - CER(한국어), WER(영어), MER(섞인 말);
   - **핵심 토큰 정확도(critical-token accuracy):** 어휘 목록(A12)에 있는 숫자, 코드, 이름 중 정확히 맞은 비율. 기록에서는 숫자 하나 틀린 것이 조사 열 개 틀린 것보다 중요합니다;
   - **환각률(hallucination rate):** 잡음 클립과 사용자가 "말 없음"으로 표시한 구간에서 텍스트가 나온 비율;
   - **지연(latency):** 30초 메모의 업로드부터 전사까지(목표 10초 이하 [E]), 그리고 오디오 1분당 GPU 초.
5. **차이가 진짜인가?** 같은 메모에서 메모별로 모델을 비교합니다. **계산 예 9 [E]:** 메모별 CER 차이의 표준편차가 4포인트라면, 30개 메모에 대한 평균 차이의 표준오차는 4 / √30 ≈ 0.73포인트이고, 95% 구간은 약 ±1.4포인트입니다. 30개 메모에서 1포인트 우세는 잡음이고, 5포인트 우세는 진짜입니다.
6. **MVP의 "충분히 좋음"** [E; 사용자가 확인할 제안]: 정규화 후 한국어 CER이 조용한 곳에서 5% 이하, 지하철 세트에서 10% 이하; 섞인 말 MER 15% 이하; 핵심 토큰 정확도 90% 이상; 잡음 클립 100개 중 최소 99개에서 텍스트 없음; 업로드 후 10초 안에 전사. CER 10%의 감을 잡자면, 60음절 메모에 틀린 음절이 약 6개입니다. 숫자에 걸리지 않는 한 대개 읽을 만하며, 그래서 핵심 토큰을 따로 추적합니다.

## 읽거나 볼 자료

- Hugging Face Audio Course: CTC와 sequence-to-sequence 페이지, 그다음 ASR 단원과 평가(evaluation) 페이지: https://huggingface.co/learn/audio-course/chapter3/ctc, https://huggingface.co/learn/audio-course/chapter3/seq2seq, https://huggingface.co/learn/audio-course/chapter5/introduction, https://huggingface.co/learn/audio-course/chapter5/evaluation
- Awni Hannun, *Sequence Modeling with CTC* (distill.pub, 인터랙티브; 접기 규칙과 전방 알고리즘에 대한 최고의 설명): https://distill.pub/2017/ctc/
- Loren Lugosch, *Sequence-to-sequence learning with Transducers* (코드가 있는 블로그 글): https://lorenlugosch.github.io/posts/2020/11/transducer/
- Stanford 강의 *End-to-End Models for Speech Processing* (YouTube, 2017; CTC, Listen-Attend-Spell과 그것들이 동작하는 이유): https://www.youtube.com/watch?v=3MjIkWxXigM
- Whisper 저장소(모델 크기, 30초 창, 라이선스): https://github.com/openai/whisper, 그리고 *Robust Speech Recognition via Large-Scale Weak Supervision* *(paper)*: https://arxiv.org/abs/2212.04356
- Qwen3-ASR 모델 카드(맥락, 스트리밍, 강제 정렬기): https://huggingface.co/Qwen/Qwen3-ASR-1.7B, 그리고 기술 보고서 *(paper)*: https://arxiv.org/abs/2601.21337
- NVIDIA의 Parakeet-TDT 블로그(길이 예측 기법이 트랜스듀서를 어떻게 빠르게 하는가): https://developer.nvidia.com/blog/turbocharge-asr-accuracy-and-speed-with-nvidia-nemo-parakeet-tdt/, 그리고 NeMo 단어 부스팅 문서: https://docs.nvidia.com/nemo/speech/3.0.0/asr/asr_customization/word_boosting.html
- sherpa-onnx 문서(온디바이스 런타임)와 핫워드 페이지: https://k2-fsa.github.io/sherpa/onnx/index.html, https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html
- 벤치마크: Open ASR Leaderboard(영어와 유럽 언어 5개; 한국어 없음): https://huggingface.co/spaces/hf-audio/open_asr_leaderboard, 그리고 한국어-영어 코드 스위칭 벤치마크 HiKE *(paper)*: https://arxiv.org/abs/2509.24613

## 실습 (1–1.5시간)

**(a) 손으로 채점하고, 코드로 확인하기 (30분).** 각 쌍에 대해 S, D, I를 손으로 센 다음, 1절의 `asr_metrics.py`로 확인하세요.

| # | 정답 | 가설 | 점수 |
|---|---|---|---|
| 1 | set the pressure to five bar | set pressure to five bars | WER |
| 2 | 삼 번 펌프 점검 완료 | 3번 펌프 점검완료 | WER; CER; 3을 삼으로 쓴 뒤의 CER |
| 3 | 컨베이어 belt 속도 확인 | 컨베이어 벨트 속도 확인 | MER |
| 4 | 네 알겠습니다 | 네 알겠습니다 시청해 주셔서 감사합니다 | CER |

답: (1) 2/6 = 33.3%. (2) WER 4/5 = 80%, CER 1/8 = 12.5%, 그다음 0%. (3) 2/9 = 22.2%. (4) 11/6 = 183%: 짧은 메모에 지어낸 마무리 인사가 붙으면 오류 수가 메모 글자 수의 거의 두 배가 됩니다.

**(b) 선택 사항인 무거운 실습 (45분): CPU에서 Whisper small로 한국어 클립 5개 전사하기.**

**메모리 경고.** 이 컴퓨터의 RAM 29 GiB는 다른 작업과 공유되며, 예전에 메모리가 바닥나 세션이 강제 종료된 적이 있습니다. 먼저 `free -h`를 실행하고, "available"이 몇 GB 이상일 때만 진행하세요. 무거운 작업은 한 번에 하나만 돌리세요. 분리 데모나 다른 모델이 돌고 있을 때, 큰 다운로드 중에는 실행하지 마세요. 반드시 아래의 메모리 상한 안에서만 실행하세요. 이 실습을 건너뛰고 우리 서버 비교 시험을 기다려도 됩니다. 그 시험이 여러분의 메모로 같은 종류의 표를 만들어 줍니다.

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

그다음: (1) 클립 `104_003_0253`의 정답은 연도를 "이천 십 팔 년"으로 적습니다. CER 중 얼마가 숫자 표기 차이일 뿐인가요? (2) 작은 정규화기(숫자를 한자어 읽기로, 문장부호 제거)를 만들어 다섯 개를 다시 채점하세요. (3) 남은 오류를 띄어쓰기, 외래어, 진짜로 잘못 들은 것으로 분류하세요. Zeroth 데이터는 CC BY 4.0입니다. 결과를 공유한다면 Zeroth Project의 출처를 밝히세요.
