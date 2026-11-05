# 05. 고전적 음원 분리와 분리 성능 측정(Classical separation and how separation is measured)

> 영어 원문(English original): [05-classical-separation.md](../05-classical-separation.md)

## 1. 문제 설정(The problem statement)

**혼합 모델(mixing models).**
- **순시 혼합(instantaneous mixing):** x(t) = Σᵢ sᵢ(t).
- **합성곱 혼합(convolutive mixing)**(방 안): x(t) = Σᵢ (hᵢ * sᵢ)(t).
- **다중 마이크(multiple microphones):** 필터들의 행렬.

**과소결정(underdetermined).** 채널이 1~2개이고 음원이 3개 이상이면 방정식보다 미지수가 많습니다. 어떤 해든 **사전 가정(prior)**, 즉 음원이 어떤 모습일지에 대한 가정이 필요합니다. 고전적 방법은 이 사전 가정을 사람이 직접 코딩하고, 신경망은 데이터에서 학습합니다(강의 06).

## 2. 시간-주파수 마스킹(time-frequency masking): 핵심 아이디어

**희소성(sparsity).** STFT(단시간 푸리에 변환, short-time Fourier transform) 영역에서 음성과 음악은 희소합니다. 대부분의 시간-주파수 빈(bin)에서 한 음원이 지배적입니다. 이를 "W-분리 직교성(W-disjoint orthogonality)"이라 합니다. 따라서 각 빈마다 음원이 얼마나 들어 있는지를 정하는 방식으로 분리할 수 있습니다.

  Ŝᵢ(m,k) = Mᵢ(m,k) · X(m,k),  0 ≤ Mᵢ ≤ 1.

**오라클 마스크(oracle mask).** 실제 스템으로 계산하며, 모든 마스킹 방법의 성능 상한을 줍니다.

| 마스크(Mask) | 공식(Formula) |
|---|---|
| 이상적 이진 마스크(IBM, ideal binary mask) | M = 1 if \|S\| > \|N\| else 0 |
| 이상적 비율 마스크(IRM, ideal ratio mask) | M = \|S\|² / (\|S\|² + \|N\|²) |

IRM은 빈마다 적용한 **위너 필터(Wiener filter)**입니다.

**이미 아시는 언어로 본 위너 필터.**
- 음원과 잡음이 파워 스펙트럼 P_s, P_n을 갖는 무상관 가우시안 과정(uncorrelated Gaussian process)이면, 평균제곱오차 최소(minimum-mean-square-error) 선형 추정은 다음과 같습니다.

  H(f) = P_s(f) / (P_s(f) + P_n(f)).

- 이는 칼만 필터(Kalman filter)의 주파수 영역 사촌입니다.
- "이 빈의 얼마만큼이 음원 i인가"를 예측하는 모든 분리기는 사실상 P_s와 P_n을 추정하는 것입니다.
- Open-Unmix의 *다채널 위너 필터(multichannel Wiener filter)* 후처리는 스테레오 공분산(covariance)을 이용해 같은 아이디어를 적용합니다.

**스펙트럼 차감(spectral subtraction).** 위너 필터의 조잡한 조상입니다.
1. 정지 구간에서 잡음 스펙트럼을 추정합니다.
2. 모든 프레임에서 그것을 뺍니다.
3. 결과를 0에서 잘라냅니다(clamp).

남은 고립된 피크는 "뮤지컬 노이즈(musical noise)"처럼 들리는데, 성능이 낮은 잡음 제거기에서 지금도 들리는 찍찍거리는 아티팩트(artifact)입니다.

## 3. NMF: 비음수 제약이 있는 모드 분해(modal decomposition)

**분해(factorisation).** 크기 스펙트로그램(magnitude spectrogram) V(주파수 × 시간)를 **V ≈ W H**로 분해합니다.
- W의 열은 **스펙트럼 템플릿(spectral template)**입니다(음 하나, 드럼 타격 하나, 음소 부류 하나).
- H의 행은 시간에 따른 그 템플릿의 **활성도(activation)**입니다.
- 둘 다 비음수이므로 각 부분이 가산적(additive)이 되며, 이는 음향 에너지가 더해지는 방식과 맞습니다.

**풀이.** Lee와 Seung의 곱셈 갱신 규칙(multiplicative updates)은 발산(divergence), 보통 Kullback–Leibler 또는 Itakura–Saito를 최소화합니다.

  H ← H ⊙ (Wᵀ(V ⊘ WH)) ⊘ (Wᵀ1),  W ← W ⊙ ((V ⊘ WH)Hᵀ) ⊘ (1Hᵀ)

**NMF(비음수 행렬 분해, non-negative matrix factorization)를 이용한 분리.**
1. 템플릿을 음원에 할당합니다. 예를 들어 깨끗한 피아노와 깨끗한 목소리로 미리 학습한 템플릿을 씁니다("지도 NMF(supervised NMF)").
2. 위너 필터 같은 마스크를 만듭니다: Mᵢ = WᵢHᵢ / WH.

**한계.** NMF는 교육용으로, 그리고 반복적인 음악에 훌륭합니다. 스펙트럼이 연속적으로 변하는 목소리에는 약합니다. 2010년경 가장 앞선 접근법이었습니다.

## 4. 구조 기반 기법(Structure-based tricks)

- **HPSS(화성-타악 분리, harmonic–percussive source separation):**
  - 화성 소리는 스펙트로그램에서 **가로** 선을 그립니다(안정된 음높이). 타악 소리는 **세로** 선을 그립니다(광대역, 짧음).
  - 시간 방향 중앙값 필터(median filter)는 화성 성분을, 주파수 방향 중앙값 필터는 타악 성분을 강화합니다. 이어서 마스크를 만듭니다(Fitzgerald 2010).
  - 저렴하며, 지금도 특징(feature)과 전처리 단계로 쓰입니다.
- **REPET:** 음악의 반주는 반복됩니다(루프, 마디). 자기상관(autocorrelation)으로 주기를 찾고, 반복 구간을 평균해 배경을 모델링하면 반복되지 않는 나머지가 보컬입니다.
- **음높이 기반(Pitch-based):** f₀를 추적하고 그 배음(harmonic)을 남깁니다. 깨끗한 단선율 하나에는 통하지만, 화음이나 여러 가수에서는 무너집니다.

## 5. 공간 기반 방법(Spatial methods, 마이크 2개 이상)

**DUET.** 마이크 두 개일 때 모든 빈에서 채널 간 **레벨 비율(level ratio)**과 **위상(시간) 차이(phase/time difference)**를 계산하고, 그 2차원 히스토그램을 그려 피크를 군집화합니다. 각 피크는 서로 다른 방향의 음원입니다.
- 이는 SAM Audio가 버리는 스테레오 정보를 직접 활용하는 방법입니다(강의 02).
- 패닝된 악기가 있는 스튜디오 믹스에 매우 관련이 깊습니다.

**빔포밍(beamforming).** 마이크 어레이(회의실, 스마트 스피커)에서 공간 필터를 특정 방향으로 조향(steer)합니다: 지연합(delay-and-sum) 또는 MVDR.

**ICA(독립 성분 분석, independent component analysis).** 음원 수 이상의 마이크가 필요하므로 일반 소비자 콘텐츠에는 거의 적용되지 않습니다.

## 6. 지표(Metrics): "좋음"을 어떻게 측정하는가

**SI-SDR(척도 불변 신호 대 왜곡비, scale-invariant signal-to-distortion ratio).** 우리 실험실이 쓰는 지표입니다. s를 실제 음원, ŝ를 추정치라 하고(둘 다 평균 0):

  s_target = (⟨ŝ, s⟩ / ‖s‖²) · s,  e = ŝ − s_target,  **SI-SDR = 10 log₁₀(‖s_target‖² / ‖e‖²)**

- 사영(projection)이므로 전체 이득 오차(global gain error)에는 불이익이 없습니다.
- **SI-SDRi(개선량, improvement)**는 혼합 신호(mixture)를 그대로 추정치로 썼을 때보다 얼마나 개선되었는지입니다. 보고해야 할 숫자입니다.
- 대략적인 감각: +3 dB는 들리는 수준, +10 dB는 좋음, +15 dB 이상은 깨끗한 음원에 가깝습니다.
- 우리의 한국어 테스트 예: 음악과 관중 소리에서 음성을 분리한 경우 +7.0 dB 개선, 음성에서 음성을 분리한 경우는 약 0~+1 dB 개선.

**BSSEval SDR, SIR, SAR.** 음악 분리의 표준입니다(`museval`, MUSDB 리더보드(leaderboard)). 오차를 다음과 같이 분해합니다.
- **간섭(interference)**: 다른 음원이 새어 들어온 것. SIR로 측정.
- **아티팩트(artifacts)**: 만들어졌거나 왜곡된 소리. SAR로 측정.

이 분해는 진단용입니다. 모델은 SIR은 높고 SAR은 낮을 수 있습니다(깨끗하지만 "물속에서 듣는 듯한" 소리).

**음성 지표.** PESQ와 POLQA는 품질을, STOI는 명료도를 추정하고, DNSMOS는 신경망 기반 평균 의견 점수(mean-opinion-score) 예측기입니다.

**청취 평가(listening test).** **MUSHRA**(숨겨진 기준(hidden reference)과 비교해 여러 버전을 평가)와 **A/B 선호도**.
- 지표와 귀는 어긋납니다. 특히 **생성(generative)** 출력에서 그렇습니다. 충분히 그럴듯하지만 시간이 약간 어긋난 출력은 SDR에서 낮은 점수를 받을 수 있습니다.
- *SDR — half-baked or well done?*(논문)와 강의 08의 CrowdioSet 저자들의 주의 사항을 참고하세요.

## 읽거나 볼 자료(Read or watch)

- ISMIR 2020 tutorial, *Open-Source Tools & Data for Music Source Separation*, 마스킹·평가·고전적 방법 장 참고: https://source-separation.github.io/tutorial/
- FMP notebooks, 8장(분해, decomposition), 특히:
  - HPSS: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8S1_HPS.html
  - NMF basics: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8S3_NMFbasic.html
  - Chapter overview: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8.html
- Le Roux et al., *SDR — half-baked or well done?* (논문, 짧고 읽기 쉬우며 SI-SDR의 출처): https://arxiv.org/abs/1811.02508
- `museval` / BSSEval v4, 기준 구현: https://github.com/sigsep/sigsep-mus-eval

## 실습(Exercise, 1시간): 이 과정에서 가장 유용한 실습

이 실습은 실험실 실험 E2("충실한 마스킹, faithful masking")를 직접 준비하는 단계입니다.

1. `tools/separation-lab/data/clips/US-2.1/`(음악과 관중 소리 위의 건배사)에서 정답 스템(ground-truth stem)이 있는 클립을 하나 고릅니다.
2. 음성 스템의 **오라클 IRM(oracle IRM)**을 계산해 혼합 신호의 STFT에 적용하고, 역변환한 뒤 SI-SDR을 측정합니다.
3. 같은 클립에 대한 SAM Audio의 출력과 비교합니다. 데모에서 얻을 수 있습니다.
4. SAM의 추정치로 마스크 M = |Ŝ_SAM|² / (|Ŝ_SAM|² + |X − Ŝ_SAM|²)를 만들어 *혼합 신호*에 적용하고 다시 측정합니다.

SAM 유도 마스킹(SAM-guided masking)은 오라클에 얼마나 가까우며, 더 충실하게(faithful) 들리는가?
