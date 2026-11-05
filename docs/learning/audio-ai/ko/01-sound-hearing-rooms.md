# 01. 소리, 청각, 방

> 영어 원문(English original): [01-sound-hearing-rooms.md](../01-sound-hearing-rooms.md)

## 1. 소리는 압력파다

**파동 방정식(wave equation)과 속도.** 소리는 대기압 위에 얹힌 작은 압력 변동 p(x, t)입니다. 이미 아는 파동 방정식을 따릅니다.

  ∂²p/∂t² = c² ∇²p,  with c ≈ 343 m/s in air at 20 °C.

**파장(wavelength).** λ = c / f이며, 그 범위가 많은 것을 설명해 줍니다.

| 주파수 | 파장 | 거동 |
|---|---|---|
| 100 Hz | 3.4 m | 머리와 가구를 돌아 휘어 들어가며, 룸 모드(room modes)가 지배적 |
| 1 kHz | 34 cm | |
| 10 kHz | 3.4 cm | 빔처럼 진행하고 머리에 가려짐(shadowed). 방향감과 "공기감(air)"에 중요 |

**데시벨(decibel).** 귀가 거의 로그적이기 때문에 레벨을 dB로 측정합니다.
- 음압 레벨(sound pressure level): L = 20 log₁₀(p_rms / 20 µPa).
- **+6 dB**은 진폭이 2배라는 뜻입니다.
- **+3 dB**은 같은 크기의 *비상관(uncorrelated)* 음원 두 개를 더할 때 나옵니다. 파워(power)가 더해지기 때문입니다.
- **+6 dB**은 같은 크기의 *동위상(in-phase), 상관(correlated)* 음원 두 개를 더할 때 나옵니다.

**역제곱 법칙(inverse-square law).** 자유장(free field)에서 레벨은 **거리가 2배가 될 때마다 6 dB씩** 떨어집니다. 그래서 휴대폰 영상에서 카메라 촬영자(camera holder)의 소리가 그렇게 큽니다. 30 cm 거리의 입은 2 m 거리에서 말하는 사람보다 약 16 dB 큽니다. 또한 그 목소리가 "건조(dry)"하게 들리는 이유이기도 합니다(3절 참조).

## 2. 피치, 배음, 음색: 다시 모드 해석

**배음(harmonics).** 진동하는 현이나 공기 기둥은 f_n ≈ n·f₀ 에 모드를 가지며(배음), 보(beam)의 모드와 똑같습니다.
- **피치(pitch)**는 주로 기본 주파수(f₀, fundamental frequency)로부터 지각됩니다.
- **음색(timbre)**, 즉 같은 음에서 기타와 피아노가 다르게 들리는 이유는 다음에서 옵니다.
  - *스펙트럼 포락선(spectral envelope)*, 즉 각 배음의 상대적 세기
  - *과도음(transients)*, 즉 어택(attack): 뜯기, 해머 타격, 숨소리

**목소리.** 목소리는 소스-필터(source-filter) 시스템입니다.
- **소스(source):** 성대(vocal folds)가 배음 펄스열(harmonic pulse train)을 만들며, 그 f₀가 피치입니다.
- **필터(filter):** 성도(vocal tract)는 **포먼트(formant)**라 불리는 공진을 가진 관이며, 모음을 만듭니다.
- **잡음성 소리:** s, f 같은 자음은 광대역 잡음(broadband noise)입니다.

**음원 분리(source separation)가 어려운 이유.** 같은 성별의 두 화자는 f₀ 범위와 포먼트 범위를 공유합니다. 기타 두 대는 배음과 포락선을 모두 공유합니다. 분리 모델은 바로 이런 특징에서 서로 비슷해 보이는 음원을 구별해야 합니다.

## 3. 방은 선형 필터다

**방은 LTI 시스템(선형 시불변 시스템, linear time-invariant system)이다.** 음원과 마이크 사이에서 방은 임펄스 응답 h(t)를 갖는 선형 시불변 시스템처럼 거동하며, 이를 **실내 임펄스 응답(RIR, room impulse response)**이라고 합니다.

  y(t) = (h * s)(t)  (합성곱, convolution)

**RIR에 들어 있는 것:**
- 직접음(direct sound)
- 초기 반사음(early reflections; 대략 50 ms 이내이며 음색에 색채를 입힘)
- 확산된 **잔향 꼬리(reverberant tail)**

**RT60**은 잔향 꼬리가 60 dB 감쇠하는 데 걸리는 시간입니다. 세이빈(Sabine) 공식으로 추정합니다.

  RT60 ≈ 0.161 · V / A,

여기서 V는 방 부피(m³), A는 총 흡음량(m² sabin)입니다.

**직접음 대 잔향음 비(DRR, direct-to-reverberant ratio).**
- 마이크에 가까우면 직접음이 지배적입니다(높은 DRR, "건조").
- 멀면 잔향(reverb)이 지배적입니다.

이 차이가 레벨과 함께 우리의 카메라 촬영자(camera holder) 휴리스틱(heuristic)이 사용하는 근거입니다.

**랩에서.** 랩의 합성 클립은 깨끗한 음성에 실제 RIR(OpenSLR SLR28)을 합성곱하고 잡음을 더해 만듭니다. 이는 분리 문제가 가정하는 "혼합 신호(mixture) = Σ 필터링된 음원"이라는 모델과 같습니다.

## 4. 청각: 지각 척도가 중요한 이유

**주파수 범위.** 대략 20 Hz ~ 20 kHz이며, 상한은 나이가 들수록 내려갑니다.

**등청감 곡선(equal-loudness contours).** 귀는 2–5 kHz 부근에서 가장 민감합니다. 저주파와 매우 높은 주파수는 같은 크기로 들리려면 더 많은 에너지가 필요합니다.

**임계 대역(critical bands).**
- 달팽이관(cochlea)은 겹치는 대역 통과 필터(band-pass filter) 뱅크처럼 동작하며, 저주파에서는 좁고 고주파에서는 넓습니다.
- **멜 척도(mel scale)**와 **바크 척도(Bark scale)**가 이를 근사하며, 예를 들어 m = 2595 log₁₀(1 + f / 700)입니다.
- 많은 신경망 분리기가 이 때문에 스펙트럼을 대역으로 나눕니다(강의 06).

**마스킹 효과(masking).** 큰 소리는 주파수와 시간에서 가까운 더 작은 소리를 가립니다.
- MP3와 AAC 코덱은 마스킹을 이용해 들리지 않는 내용을 버립니다.
- 분리 아티팩트(artifact)는 마스킹되지 않을 때만 들립니다. 그래서 단순한 오차 수치보다 청취 평가(listening test)가 더 중요합니다.

## 읽거나 볼 자료

- Josh Comeau and The Pudding, *Let's Learn About Waveforms* (파형 입문, 인터랙티브, 20분): https://pudding.cool/2018/02/waveforms/
- Jack Schaedler, *Seeing Circles, Sines and Signals* (원, 사인파, 신호 보기; 인터랙티브 DSP 입문): https://jackschaedler.github.io/circles-sines-signals/
- Shure, *Microphone Techniques for Recording* (녹음용 마이크 기법), 지향 특성(polar pattern), 근접 효과(proximity effect), 배치를 다룸: https://pubs.shure.com/guide/Microphone-Techniques-for-Recording/en-US
- 선택: FMP 노트북 1장 (음악 표현): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C0/C0.html

## 실습 (30분)

1. 랩 클립 폴더를 엽니다. 예: `tools/separation-lab/data/clips/US-1.x/clip1_*`.
2. 카메라 촬영자(camera holder)의 스템(stem)과 주변 사람(bystander)의 스템을 들어 봅니다.
3. 각 스템의 RMS 레벨을 dB로 계산하고, 카메라 촬영자가 얼마나 더 큰지 추정합니다.
4. 그 차이를 역제곱 법칙과 DRR로 설명합니다.
