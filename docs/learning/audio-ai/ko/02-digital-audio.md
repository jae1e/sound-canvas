# 02. 디지털 오디오

> 영어 원문(English original): [02-digital-audio.md](../02-digital-audio.md)

## 1. 샘플링과 에일리어싱

**샘플링 레이트(sampling rate)와 나이퀴스트 주파수(Nyquist frequency).** 아날로그-디지털 변환기(ADC)는 f_s로 샘플링합니다.
- **f_s/2(나이퀴스트)** 이상의 주파수는 가짜 저주파로 접혀 들어오며(**에일리어싱**, aliasing) 이는 마차 바퀴 효과(wagon-wheel effect)의 오디오 버전입니다.
- 아날로그 앤티 에일리어스 저역 통과 필터(anti-alias low-pass filter)가 샘플링 전에 이를 제거합니다.

**흔히 쓰는 레이트:**

| 레이트 | 대역폭 | 대표 용도 |
|---|---|---|
| 16 kHz | 8 kHz | 음성 모델, 전화 이상(telephony-plus). 대부분의 ASR(음성 인식)과 화자 분할(diarisation) 모델, 우리 LibriSpeech 클립 |
| 44.1 kHz | 22 kHz | CD와 대부분의 음악 |
| 48 kHz | 24 kHz | 영상과 방송. SAM Audio는 48 kHz로 동작 |

**리샘플링(resampling).** 레이트를 바꾸는 일은 샘플을 단순히 버리거나 반복하는 것이 아니라 필터링 문제입니다. 라이브러리는 폴리페이즈(polyphase) 또는 윈도 싱크(windowed-sinc) 필터로 처리합니다.

## 2. 양자화, 비트 깊이, 디더

**비트 깊이(bit depth).** 각 샘플은 N비트로 저장됩니다. 양자화(quantisation) 잡음 바닥(noise floor)에 의해 SNR ≈ 6.02·N + 1.76 dB입니다.
- 16비트는 약 98 dB.
- 24비트는 약 146 dB로, 어떤 마이크가 내놓는 것보다도 큽니다.

**디더(dither).** 아주 작은 잡음을 더해, 신호와 상관된 양자화 왜곡을 무해한 쉬익 소리(hiss)로 바꿉니다.

**부동소수점 형식(float formats).** 제작 환경에서는 32비트 float를 쓰므로 소프트웨어 내부에서 헤드룸(headroom)이 사실상 무제한입니다. **클리핑(clipping)**은 마지막 고정소수점(fixed-point) 내보내기 단계에서만 일어납니다.

Monty Montgomery의 *Digital Show & Dither*를 보세요. 대역 제한(band-limited)된 샘플 오디오가 연속 파형을 정확히 복원한다는 것을 가장 명쾌하게 보여 줍니다.

## 3. 파일과 코덱

**무손실(lossless):**
- WAV와 AIFF는 원시 PCM을 담습니다.
- FLAC는 압축되지만 무손실이며, 대부분의 데이터셋이 사용합니다.

**손실 압축 코덱(lossy codec):**
- MP3, AAC, Opus는 신호를 변환(MDCT)하고, 심리음향 모델(psychoacoustic model)로 마스킹되는 부분을 찾아, 들리는 부분에만 비트를 씁니다.
- YouTube 오디오는 Opus 또는 AAC입니다.

**손실 압축이 음원 분리에서 중요한 이유:**
- 코덱 아티팩트(artifact)와 대역 제한(보통 약 16 kHz 위에는 아무것도 없음)은 사용자 업로드 대부분에 이미 들어 있습니다. 깨끗한 오디오로만 학습한 모델은 이런 입력에서 이상하게 동작할 수 있습니다.
- **비디오 컨테이너(container)**(MP4, MOV, MKV)는 비디오 스트림과 오디오 스트림을 감쌉니다. 우리 데모는 비디오 스트림을 복사하고 오디오만 교체하므로("리먹스(remux)") 비디오는 재인코딩되지 않습니다.

## 4. 채널, 스테레오, 미드/사이드

**스테레오 패닝(panning).** 스테레오는 L, R 두 채널입니다. 중앙에 패닝된 음원은 양쪽 레벨이 같습니다. 믹서는 L/R 게인 비를 바꿔 악기를 패닝합니다(패닝 법칙, pan law은 지각되는 라우드니스(loudness)를 일정하게 유지).

**미드/사이드(mid/side) 변환:**

  M = (L + R) / 2,  S = (L − R) / 2,  and back: L = M + S, R = M − S.

- 중앙 패닝 음원(리드 보컬, 킥, 베이스)은 M에 있습니다.
- 넓게 퍼진 음원(스테레오 잔향, 좌우로 패닝된 기타)은 주로 S에 있습니다.

**옛 "노래방(karaoke)" 트릭.** L − R은 중앙 패닝된 보컬을 상쇄합니다. 베이스와 킥도 함께 상쇄되기 때문에 소리가 좋지 않습니다.

**우리와의 관련성.** SAM Audio의 프로세서는 채널을 평균내어 모노로 만들기 때문에 이 공간 정보를 버립니다. L/R과 M/S를 추가 단서(cue)로 쓰는 것이 우리의 차별화 후보 중 하나입니다.

## 5. 라우드니스: LUFS

**LUFS가 측정하는 것.**
- 피크 레벨(dBFS)은 소리가 *어떻게 들리는지*에 대해 아무것도 알려 주지 않습니다.
- **LUFS/LKFS**(ITU-R BS.1770)는 K-가중 필터(K-weighting filter, 대략 귀에 맞춘 것)와 무음을 무시하는 게이트(gate)를 적용한 뒤 평균을 냅니다.
- 미터는 **모멘터리(momentary, 400 ms)**, **쇼트 텀(short-term, 3 s)**, **인티그레이티드(integrated, 파일 전체)** 값을 보여 줍니다.
- **트루 피크(true peak, dBTP)**는 샘플 사이에 있는 피크를 잡아냅니다.

**목표값.** 스트리밍 플랫폼은 벤더 블로그에서 흔히 인용하는 약 −14 LUFS(인티그레이티드), −1 dBTP 상한 같은 목표에 맞춰 정규화(normalise)합니다. 수치는 플랫폼마다 다르므로 최신 문서를 확인하세요. 방송과 Netflix는 대사 게이트(dialogue-gated) 기준 약 −27 LKFS 목표를 씁니다.

**우리 제품에서.** 스템을 다시 믹스(mix)할 때는 라우드니스를 보고하거나 정규화해서, 사용자가 업로드한 파일보다 작은 소리의 파일을 받지 않도록 해야 합니다.

## 읽거나 볼 자료

- Xiph.org, *A Digital Media Primer for Geeks* (괴짜를 위한 디지털 미디어 입문, 영상): https://xiph.org/video/vid1.shtml
- Xiph.org, *Digital Show & Dither* (디지털 쇼 & 디더, 영상): https://xiph.org/video/vid2.shtml
- iZotope, *What is mid/side processing?* (미드/사이드 처리란?): https://www.izotope.com/en/learn/what-is-midside-processing.html, 심화 자료: https://www.izotope.com/en/learn/mid-side-deep-dive.html
- NUGEN Audio, *What are LUFS?* (LUFS란?): https://nugenaudio.com/what-are-lufs
- iZotope, *Mastering for streaming platforms* (스트리밍 플랫폼용 마스터링): https://www.izotope.com/en/learn/mastering-for-streaming-platforms.html
- DSP Guide, 3장 (ADC와 DAC): https://www.dspguide.com/

## 실습 (30분)

1. 아무 스테레오 음악 파일이나 가져와 M과 S를 계산하고 각각 들어 봅니다.
2. L − R을 계산해 "노래방" 효과와 그 부작용을 들어 봅니다.
3. 이것은 가장 값싼 분리기입니다. 무엇이 틀리는지 적어 두세요. 그 이유는 강의 05에서 설명합니다.
