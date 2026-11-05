# 03. 스펙트럼 분석: FFT, STFT, 스펙트로그램

> 영어 원문(English original): [03-spectral-analysis.md](../03-spectral-analysis.md)

고전적이든 신경망이든 거의 모든 음원 분리(source separation) 방법은 **단시간 푸리에 변환(STFT, short-time Fourier transform)** 위에서 동작하거나 그와 비슷한 것을 학습합니다. 가장 중요한 강의입니다.

## 1. DFT와 FFT

**DFT(이산 푸리에 변환, discrete Fourier transform).** N개의 샘플에 대해:

  X[k] = Σₙ x[n] e^{−j2πkn/N},  k = 0 … N−1.

**빈(bin).** 빈 k는 주파수 k·f_s / N에 해당하므로 **분해능은 Δf = f_s / N**입니다. 예를 들어 48 kHz에서 2048점 프레임은 빈 간격이 23.4 Hz입니다.

**FFT(고속 푸리에 변환, fast Fourier transform)**는 DFT를 O(N log N)에 계산합니다.

**창 함수(windowing)와 누설(leakage).**
- 신호에서 프레임을 잘라내는 것은 직사각형을 곱하는 것과 같아서, 에너지가 이웃 빈으로 퍼집니다(**누설**, leakage).
- Hann 같은 테이퍼(tapered) 창 함수(window)는 주엽(main lobe)이 넓어지는 대신 누설이 훨씬 줄어드는 절충을 택합니다.

## 2. STFT와 시간–주파수 트레이드오프

**정의.** 길이 N의 창 함수를 홉(hop) H만큼씩 밀면서 각 프레임 m에 FFT를 취합니다.

  X(m, k) = Σₙ x[n + mH] w[n] e^{−j2πkn/N}

결과는 한 축이 시간, 다른 축이 주파수인 복소 행렬입니다.
- **|X|**는 크기(magnitude)이며, dB로 나타내면 익숙한 **스펙트로그램(spectrogram)** 이미지가 됩니다.
- **∠X**는 위상(phase)입니다.

**불확정성(uncertainty).** 시간 분해능과 주파수 분해능을 *동시에* 세밀하게 할 수는 없습니다: Δt·Δf ≥ 상수.

| 창 함수 | 주파수 세부 | 시간 세부 | 적합한 대상 |
|---|---|---|---|
| 긴 창 (48 kHz에서 4096 샘플, 85 ms) | 선명한 배음(harmonics) | 뭉개진 드럼 타격 | 음정이 있는(tonal) 내용 |
| 짧은 창 (512 샘플, 11 ms) | 흐릿한 배음 | 또렷한 과도음(transients) | 타악기 |

멀티 해상도 손실(multi-resolution losses)과 밴드 분할(band-split) 모델(강의 06)은 부분적으로 이 트레이드오프에 대한 답입니다.

**역 STFT(inverse STFT).** 중첩 가산(overlap-add)을 쓰는 ISTFT는 창 함수가 상수 중첩 가산(COLA, constant-overlap-add) 조건을 만족하면(예: 50% 또는 75% 중첩의 Hann) 신호를 정확히 복원합니다. 다음 단계를 가능하게 하는 것이 바로 이 성질입니다.

**기본 마스킹(masking) 패턴.** 혼합 신호(mixture)의 STFT에 마스크(mask)를 곱한 뒤 역변환합니다.

  Ŝ(m,k) = M(m,k) · X(m,k),  then ŝ = ISTFT(Ŝ).

## 3. 위상

**위상을 보통 무시하는 이유.** 우리가 지각하는 것의 대부분은 크기가 담고 있고, 위상은 잡음처럼 보입니다. 그래서 대부분의 고전적 분리기와 초기 신경망 분리기는 크기 마스크(magnitude mask)를 추정하고 **혼합 신호의 위상을 재사용**합니다. 시간-주파수 빈마다 한 음원이 지배적일 때 잘 동작합니다.

**실패하는 경우.** 음원들이 강하게 겹치는 곳에서는 무너집니다. 더 새로운 모델은 복소 마스크(complex mask)나 파형을 직접 예측합니다.

**우리 제품과의 연결.** 혼합 신호의 위상을 재사용하는 것은 우리 차별화 문서의 "충실한 마스킹(faithful masking)" 아이디어의 바탕이기도 합니다. 원본 녹음을 유지하고 가중치만 다시 조정하는 것입니다.

## 4. 지각적이고 간결한 특징

- **멜 스펙트로그램(mel spectrogram):** STFT 파워를 삼각형 모양의 멜(mel) 간격 대역(64–128개)으로 묶은 것. 귀처럼 고주파를 압축합니다. 분류기, ASR, 태깅의 표준 입력입니다.
- **MFCC(멜 주파수 켑스트럼 계수, mel-frequency cepstral coefficients):** 로그 멜 스펙트럼의 이산 코사인 변환(discrete cosine transform)으로, 스펙트럼 포락선(spectral envelope)을 비상관화(decorrelate)합니다. 음성과 화자 작업의 고전이며 "음색(timbre)"에 대한 멘탈 모델로도 여전히 유용합니다.
- **상수 Q 변환(Constant-Q / CQT):** 빈이 로그 간격이어서 옥타브마다 빈 개수가 같습니다. 음악적 피치에 적합합니다.
- **피치(f₀) 추정:** 자기상관(autocorrelation)과 YIN 계열 방법이 파형의 주기를 찾습니다.

## 5. 필터와 합성곱

- **FIR 및 IIR 필터**는 이퀄라이저(EQ)를 이루는 요소입니다: 저역 통과(low-pass), 고역 통과(high-pass), 셸프(shelf), 피킹(peaking).
- **합성곱 정리(convolution theorem):** 시간 영역의 합성곱(convolution)은 주파수 영역의 곱셈입니다. RIR(강의 01)과 합성곱해서 잔향(reverb)을 더하는 일은 속도를 위해 FFT로 합니다.

## 읽거나 볼 자료

- 3Blue1Brown, *But what is the Fourier Transform? A visual introduction* (푸리에 변환이란 무엇인가? 시각적 입문, 영상): https://www.youtube.com/watch?v=spUNpyF58BY
- FMP 노트북:
  - 2장, 푸리에 분석과 STFT: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C2/C2.html
  - 3장, 음악 동기화(music synchronisation, 실제 특징 활용): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C3/C3.html
- ISMIR 2020 음원 분리 튜토리얼의 "representations(표현)" 장: https://source-separation.github.io/tutorial/
- Julius O. Smith, *Spectral Audio Signal Processing* (스펙트럼 오디오 신호 처리, 심화 레퍼런스): https://ccrma.stanford.edu/~jos/sasp/
- librosa tutorials (튜토리얼, 코드용): https://librosa.org/doc/latest/auto_tutorials/index.html
- Valerio Velardo, The Sound of AI, 스펙트로그램, 멜, MFCC를 다루는 *Audio Signal Processing for ML* 영상: https://www.youtube.com/@ValerioVelardoTheSoundofAI

## 실습 (1시간)

1. 랩 클립 하나(예: 풀 밴드 믹스 속 기타인 `US-7.1`)에 대해 혼합 신호와 각 스템(stem)의 스펙트로그램을 그립니다.
2. 창 크기 512와 4096 두 가지를 써서 배음과 어택(attack)이 어떻게 보이는지 비교합니다.
3. 타깃 기타가 지배적인 시간-주파수 영역을 찾습니다. 이것이 강의 05에서 다룰 마스크의 직관입니다.
