# 11. 하드웨어와 소프트웨어의 소음 저감 (그리고 음성 인식이 그것을 원하지 않을 때)

> 영어 원문(English original): [11-noise-reduction.md](../11-noise-reduction.md)

**이 강의를 하는 이유.** 우리 현장 음성 기록 앱은 안드로이드 휴대폰, 이어버드 또는 헤드셋으로 녹음하고, 직접 운영하는 RTX 4090 서버가 받아쓰기(transcription)를 합니다([MVP 요구사항](../../../products/industrial-voice-logging/mvp-requirements.md)). 이 앱은 한국 지하철 객실에서 약 72–79 dBA로 측정되는 지하철에서 동작해야 하고, 나중에는 85–100 dBA의 공장에서도 동작해야 합니다. (**dBA**는 **A-가중(A-weighting)**을 적용한 데시벨 단위 소리 크기입니다. A-가중은 저음에 둔한 귀의 반응을 흉내 낸 필터입니다. 01강 참고.) 우리 [조사 노트](../../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md)(Q4, Q5, Q7 절)는 대부분의 엔지니어가 놀라는 두 가지를 찾았습니다.
- 최신 음성 인식기(speech recogniser) 앞에 잡음 제거기(denoiser)를 두면 대개 받아쓰기 결과가 *더 나빠집니다*;
- 마이크, 그리고 마이크가 입에 얼마나 가까운지가 어떤 소프트웨어보다 더 중요합니다.

이 강의는 두 가지를 물리부터 차례로 설명합니다. 05강에서 마스크(mask), 위너 필터(Wiener filter), MVDR 빔포밍을 이미 다뤘고, 07강 1절에서 RNNoise, DeepFilterNet과 상용 향상기(enhancer)를 다뤘으며, [10강](10-capture-chain.md)은 캡처 사슬(capture chain: 마이크, 블루투스 코덱, 안드로이드 오디오 소스)을 따라갑니다. 여기서는 그 강의들을 링크하고, 새로운 내용을 더 깊이 다룹니다.

**레이블(labels)** (조사 노트와 같음): **[F]** 1차 자료에서 검증됨; **[V]** 업체 주장(vendor claim); **[P]** 논문 또는 제3자 보고; **[E]** 우리의 추정(estimate); **[H]** 우리의 가설(hypothesis). 사실 확인 날짜는 2026-11-05입니다.

**이번 강의에서 만나는 용어** (각 용어는 처음 나올 때 다시 설명합니다):

| 용어 | 쉬운 뜻 |
|---|---|
| ANC(능동 소음 제어, active noise cancellation) | 헤드폰이 "반소음(anti-noise)" 파동을 재생해 *내* 귀에서 소음이 상쇄되게 합니다. 듣는 사람을 보호합니다 |
| 업링크 잡음 억제(uplink noise suppression), "ENC" | *마이크* 신호가 통화 상대나 인식기로 가기 전에 깨끗하게 만드는 일. ENC(environmental noise cancellation, 환경 소음 제거)는 이것의 마케팅 이름입니다 |
| 수동 차음(passive isolation), NRR | 질량과 밀폐로 소리를 막는 것(이어컵, 이어팁, 귀마개). NRR(noise reduction rating, 소음 감소 등급)은 청력 보호구의 미국 실험실 등급으로, 단위는 dB입니다 |
| 주변음 허용 모드(transparency, ambient mode) | 이어버드가 자체 마이크로 바깥 소리를 귀에 다시 들려주어 주변을 들을 수 있게 합니다 |
| SNR(신호 대 잡음비, signal-to-noise ratio) | 음성 파워를 잡음 파워로 나눈 값, 단위는 dB. 0 dB는 파워가 같다는 뜻이고, +10 dB는 음성 파워가 잡음의 10배라는 뜻입니다 |
| 역위상(anti-phase) | 파동을 반 주기(180°) 밀어 꼭대기가 골짜기와 만나게 한 복사본 |
| 빔포밍(beamforming) | 여러 마이크를 조합해 한 방향만 듣게 하는 것. 위상 배열(phased-array) 레이더와 같습니다 |
| 차동 배열(differential array) | 살짝 지연시킨 마이크 신호를 더하는 대신 *빼서*, 아주 작은 배열에서 방향성 패턴을 얻는 것 |
| 지향 지수(DI, directivity index) | 모든 방향에서 고르게 오는 소리에 비해 정면을 얼마나 더 잘 듣는지, 단위는 dB |
| 확산 잡음(diffuse noise) | 무작위 위상으로 모든 방향에서 동시에 오는 잡음. 울림이 많은 지하철 객실이 그 예입니다 |
| 코히어런스(coherence) | 주파수별로 두 신호가 얼마나 선형적으로 관련되는지를 나타내는 0–1 척도. 두 마이크에 같은 소리가 오면 1에 가깝고, 바람 난류는 0에 가깝습니다 |
| VPU(음성 픽업 장치, voice pickup unit) | 두개골이나 외이도(ear canal)의 진동으로 내 목소리를 느끼는 가속도계(골전도, bone conduction) |
| 근접 마이크(close-talk mic) | 헤드셋 붐(boom)처럼 입에서 몇 센티미터 안에 두는 마이크 |
| 뮤지컬 잡음(musical noise) | 조잡한 잡음 제거기가 남기는 반짝이고 짹짹거리는 찌꺼기 |
| 사전 SNR / 사후 SNR(a priori / a posteriori SNR) | 빈(bin)별로 *믿는*(추정하고 평활화한) SNR과 현재 프레임에서 *측정한* SNR |
| VAD(음성 활동 검출, voice activity detection) | 짧은 프레임마다 "음성" 또는 "음성 아님"을 붙이는 검출기 |
| WER / CER | 받아쓰기의 단어 / 글자 오류율(word / character error rate): (치환 + 삭제 + 삽입) / 정답 길이. 한국어에는 CER을 씁니다 |
| PESQ, STOI, DNSMOS | 오디오가 *사람 청취자에게* 얼마나 좋게, 또는 얼마나 알아듣기 쉽게 들리는지 예측하는 점수(05강 6절) |
| 분포 이동(distribution shift) | 테스트 데이터가 학습 데이터와 달라 보여 모델이 예측하기 어렵게 동작하는 것 |

## 1. 모두 "노이즈 캔슬링"이라고 불리는 네 가지

사양서에 "ANC + ENC"라고 적혀 있다면 서로 다른 두 시스템을 뜻합니다. 네 가지 개념을 구분하세요.

| 이름 | 누구의 문제를 푸는가 | 어디서 작동하는가 | 우리 받아쓰기에 도움이 되는가? |
|---|---|---|---|
| ANC | 착용자의 귀 | 이어컵이나 외이도 안의 음장(sound field) | 아니요. 음성 마이크는 여전히 잡음을 전부 듣습니다(2절) |
| 업링크 억제(ENC, Qualcomm cVc) | 상대편: 통화 상대나 인식기 | 이어버드나 휴대폰 안의 DSP, 마이크 신호에 작용 | 빔포밍은 예; 공격적인 억제는 해가 될 수 있음(7절) |
| 수동 차음, 청력 보호구 | 착용자의 청력 | 이어컵, 이어팁, 귀마개 | 마이크에는 아니요. 약 85 dBA부터 청력 보호구가 요구됩니다 |
| 주변음 허용 모드 | 착용자의 주변 인식 | 바깥 마이크 소리를 낮은 지연으로 귀에 재생 | 아니요 |

**cVc**("Clear Voice Capture")는 듀얼 마이크 빔포밍, 에코 제거(echo cancellation), 잡음 억제를 묶은 Qualcomm의 업링크 패키지로, 많은 이어버드에 들어 있습니다 [V]. 이것은 **DSP**(디지털 신호 처리, digital signal processing: 작은 칩에서 돌아가는 필터와 변환)이며 *헤드셋 안에서*, 오디오가 휴대폰에 닿기 전에 실행됩니다. 그래서 우리 앱은 이것을 끌 수 없습니다.

**계산 예제: 95 dBA에서 귀덮개(earmuff)가 하는 일.** NRR은 실험실에서 C-가중 잡음으로 측정합니다. A-가중으로 잰 현장 소음에는 보통 미국의 다음 경험칙을 씁니다 [P] ([Canadian Audiologist](https://canadianaudiologist.ca/the-infamous-nrr-new-derating/), [Wikipedia](https://en.wikipedia.org/wiki/Hearing_protection_device)).
- OSHA(미국 산업안전보건청): 7 dB를 빼고, 실제 착용 상태를 반영해 절반으로 줄입니다. NRR 28로 표시된 Peltor급 귀덮개 [V]는 95 − (28 − 7)/2 = 귀에서 **84.5 dBA**를 줍니다.
- NIOSH(미국 국립산업안전보건연구원): 귀덮개는 25% 깎은 뒤 7을 뺍니다: 95 − (0.75 × 28 − 7) = **81 dBA**.
- 어느 쪽이든 붐 마이크는 이어컵 *바깥*에 있어 여전히 95 dBA를 듣습니다. 청력 보호구는 귀를 보호하지, 녹음을 보호하지 않습니다.

## 2. ANC의 물리: 역위상 소리

**중첩(superposition).** 음압은 선형으로 더해집니다(01강). 스피커가 귀에서 p_anti = −p_noise를 만들면 합은 0입니다. 어려운 점은 반소음을 *정확히* 반대로 만드는 것입니다. 진폭이 같고, 반 주기 밀려 있고, 올바른 위치와 시각에 도착해야 합니다.

**세 가지 설계:**
- **피드포워드(feedforward).** 바깥의 **기준 마이크(reference mic)**가 잡음이 귀에 닿기 전에 듣습니다. 필터가 귀에서의 잡음을 예측해 스피커를 구동합니다. 개루프(open-loop)라서 안정적이지만, 음향 경로의 모델이 좋아야 합니다.
- **피드백(feedback).** 스피커 옆 안쪽의 **오차 마이크(error mic)**가 남은 소리를 재고, 제어기가 그것을 0으로 밀어내도록 스피커를 구동합니다. 서보 루프(servo loop)입니다. 모든 피드백 루프처럼 지연이 이득을 제한하고, 보드 감도 적분(Bode's sensitivity integral, "물침대 효과(waterbed effect)")에 따라 한 대역에서 잡음을 누르면 다른 대역에서 올라옵니다.
- **하이브리드(hybrid).** 둘을 함께 씁니다. 적응형(adaptive) 설계는 **FxLMS**(filtered-x least mean squares)로 필터를 계속 조정합니다. 오차 마이크 파워에 대한 경사 하강법(gradient descent)이며, 기준 신호를 스피커→마이크 경로 모델로 걸러서 씁니다.

**기계공학 비유.** 이것은 능동 진동 제어(active vibration control)입니다. 능동 엔진 마운트나 능동 제진대는 기준 가속도계(피드포워드), 오차 가속도계(피드백), 가진기(shaker)를 씁니다. 두 분야 모두 FxLMS를 쓰고 한계도 같습니다. 액추에이터 동특성, 센서에서 액추에이터까지의 지연, 그리고 파장에 비해 조용하게 만들 수 있는 영역의 크기입니다.

**계산 예제: 반소음은 얼마나 정밀해야 하나?** 반소음의 진폭은 맞지만 위상 오차가 φ라고 합시다. 남는 양은 원래의 |1 − e^{iφ}| = 2 sin(φ/2)입니다.

| 위상 오차 φ | 잔여 | 잡음 감소 |
|---|---|---|
| 5° | 0.087 | −21.2 dB |
| 10° | 0.174 | **−15.2 dB** |
| 20° | 0.347 | −9.2 dB |
| 60° | 1.000 | 0 dB: 효과 없음. 60°를 넘으면 ANC가 잡음을 *더합니다* |

진폭 오차 1 dB만으로도 결과는 −19.3 dB로 제한되고, 10°와 1 dB가 함께 있으면 −14.1 dB입니다. ANC는 정밀 정합(precision matching) 문제입니다.

**계산 예제: 지연 예산(latency budget).** 시간 오차 τ는 위상 오차 φ = 360° · f · τ가 되며, 주파수에 비례해 커집니다. ams 엔지니어의 기사에 따르면 마이크가 스피커에서 0.7 cm 떨어져 있으면 소리가 약 20 µs 걸리고, 디지털 처리 사슬 전체가 그보다 빨라야 합니다 [V]. 반소음이 20 µs 늦게 도착하면:

| 주파수 | 100 Hz | 1 kHz | 4 kHz | 8 kHz |
|---|---|---|---|---|
| 위상 오차 | 0.7° | 7.2° | 28.8° | 57.6° |
| 가능한 최대 감소 | −38 dB | −18 dB | −6 dB | −0.3 dB |

무작위로 예측할 수 없는 잡음이라면, 어떤 필터도 고주파에서 고정된 지연을 메울 수 없습니다. 지하철의 웅웅거림이나 엔진 험(hum) 같은 저주파 지속음이 ANC가 빛나는 곳입니다.

**계산 예제: 파장과 정숙 영역(zone of quiet).** 능동 제어의 고전적인 결과(Elliott 등)에 따르면, 한 점에서 상쇄하면 10 dB "정숙 영역"은 지름이 약 **λ/10**밖에 되지 않습니다 [P]. 파장은 λ = c/f이고 c = 343 m/s입니다.

| 주파수 | 100 Hz | 1 kHz | 4 kHz |
|---|---|---|---|
| 파장 λ | 3.43 m | 34 cm | 8.6 cm |
| 10 dB 영역 (λ/10) | 34 cm | 3.4 cm | 0.9 cm |

외이도의 길이는 약 2.5 cm입니다. 4 kHz에서는 오차 마이크 주변의 정숙 영역이 고막에 닿지도 못합니다. 그래서 대략 1 kHz 위에서는 ANC가 수동 차음에 일을 넘깁니다. 같은 기사의 대표 수치 [V]: 피드백 ANC는 약 1 kHz 아래에서 최대 약 20 dB; 피드포워드는 가장 좋은 대역에서 25 dB 이상, 약 4 kHz까지; 수동 차음은 수 kHz 위에서 20–30 dB입니다([Electronic Design / ams](https://www.electronicdesign.com/technologies/analog/article/21789816/challenges-await-in-noise-cancelling-headset-design)).

**ANC가 마이크 녹음에 거의 도움이 안 되는 이유.** ANC는 이어컵 안의 몇 세제곱센티미터를 조용하게 만듭니다. 스템(stem)이나 붐에 달린 음성 마이크는 바깥, 주변 소음장 한가운데에 있습니다. ANC는 *착용자*를 돕고, 업링크 처리(3절)는 별개의 시스템입니다.

## 3. 마이크 배열과 빔포밍

04강에서 극성 패턴(polar pattern, 카디오이드 = (1 + cos θ)/2)을, 05강 5절에서 지연-합(delay-and-sum)과 MVDR을 소개했습니다. 여기서는 마이크가 각각 2–3개인 휴대폰과 이어버드의 아주 작은 배열에 대한 숫자를 봅니다.

**지연-합.** 목표 방향에서 오는 파동이 정렬되도록 각 마이크를 지연시킨 뒤 더합니다. 목표 소리는 같은 위상으로 더해지고, 다른 방향은 일부 상쇄됩니다.

**계산 예제: 15 mm 떨어진 두 마이크.** 마이크를 잇는 선을 따라 소리가 올 때 가능한 최대 지연은 τ = d/c = 0.015 / 343 = **43.7 µs**입니다. 16 kHz 샘플링에서 한 샘플은 62.5 µs이므로 이것은 0.7 샘플입니다. 그래서 빔포머는 분수 지연(fractional-delay) 필터를 쓰거나 STFT 영역에서 위상을 돌립니다. 위상으로 보면:
- 1 kHz에서 2π f τ = **15.7°**입니다. 앞을 향한 지연-합 빔은 바로 뒤에서 오는 소리를 |cos 15.7°| = 0.96, 즉 **−0.3 dB**밖에 줄이지 못합니다;
- 4 kHz에서 위상은 **63°**이고, 뒤쪽 감쇠는 |cos 63°| = 0.45, 즉 −6.9 dB가 됩니다.

더하기는 배열이 대략 반 파장 이상(1 kHz에서 17 cm)에 걸칠 때만 통합니다. 15 mm 쌍은 더하기로는 거의 무지향성(omnidirectional)입니다.

**차동 배열: 더하지 말고 빼기.** 마이크는 입을 향하는 선을 따라 놓입니다(**엔드파이어(endfire)** 배열; **브로드사이드(broadside)**는 그 선에 수직이라는 뜻). y(t) = x_front(t) − x_rear(t − d/c)를 취합니다. 뒤에서 오는 소리는 뒤 마이크에 먼저 닿고, 지연을 거치면 앞 마이크와 정확히 같아져 상쇄됩니다. 결과는 전자식 카디오이드입니다. 대가는 정면 응답으로, 마이크 하나에 비해 2 sin(2π f d/c)입니다: **100 Hz에서 −25.2 dB**, 1 kHz에서 −5.3 dB, 4 kHz에서 +5.0 dB.

응답은 미분기(differentiator)처럼 옥타브당 6 dB씩 올라가므로 등화(EQ, equalisation)해야 합니다. 100 Hz에서 EQ가 25 dB를 더하고, 두 마이크의 자체 잡음(self-noise)이 함께 증폭됩니다(상관이 없으므로 +3 dB). 결과적으로 100 Hz에서 마이크 하나보다 **약 28 dB 더 큰 쉬익 소리(hiss)**가 납니다. 이것이 작은 배열의 핵심 트레이드오프입니다.

**지향 지수(DI).** 확산 잡음에서, 말하는 사람을 향한 빔의 SNR 이득은 그 DI와 같습니다.

| 패턴 | DI | 비고 |
|---|---|---|
| 무지향(omni) | 0 dB | 마이크 하나 |
| 지연-합, 15 mm 간격 마이크 2개 | 1 kHz에서 0.1 dB, 4 kHz에서 1.7 dB | 더하기에는 너무 작음 |
| 카디오이드(cardioid) | 4.8 dB | 1차 차동, 마이크 2개 |
| 하이퍼카디오이드(hypercardioid) | 6.0 dB | 마이크 2개짜리 1차 배열의 최댓값 |
| 2차, 마이크 3개 | 최대 9.5 dB | 자체 잡음과 불일치(mismatch)에 훨씬 민감 |

**확산 잡음과 코히어런스.** 확산 잡음에서 거리 d만큼 떨어진 두 마이크의 코히어런스는 sin(kd)/(kd)이고, k = 2πf/c입니다.
- d = 15 mm: 1 kHz에서 0.987, 4 kHz에서 0.81. 두 마이크가 거의 *같은* 잡음을 들으므로 평균으로는 없앨 수 없고, 빼기(차동 또는 초지향성(superdirective) 처리)만이 없앨 수 있습니다.
- d = 15 cm(노트북이나 회의용 바): 1 kHz에서 0.14. 잡음이 마이크마다 거의 독립이므로 마이크 N개를 더하면 최대 10·log₁₀ N dB(2개면 3 dB)를 얻습니다.
- 확산 잡음 공분산을 넣은 **MVDR**(05강)이 바로 이 초지향성 해를 줍니다. 가까운 마이크 두 개라면 하이퍼카디오이드입니다. 실제 설계는 **대각 하중(diagonal loading)**(공분산 대각선에 작은 상수를 더하는 것)을 넣어, DI를 조금 포기하는 대신 마이크 불일치와 자체 잡음에 강해집니다.

**현실적인 이득 [E].** 진짜 확산 잡음에서는 마이크 2개짜리 휴대폰이나 이어버드 빔포머로 약 3–5 dB를 기대하고, 널(null)에 놓인 단일 음원에 대해서는 훨씬 더 많이(10–20 dB) 기대합니다. 비교하면, 마이크를 입에서 30 cm에서 2.5 cm로 옮기면 20·log₁₀(30/2.5) = **21.6 dB**를 모든 주파수에서, 아티팩트 없이 얻습니다.

**바람.** 바람 소음은 난류입니다. 마이크 구멍에서 생기는 작은 압력 소용돌이(eddy)이지, 음파가 아닙니다. 15 mm 떨어진 두 구멍은 대체로 서로 독립인 소용돌이를 보므로 코히어런스가 낮고, 진짜 소리는 저주파에서 코히어런트합니다. 위의 28 dB 수치가 보여 주듯 차동 배열은 상관없는 저주파 신호를 키우므로 바람이 굉음이 됩니다. 그래서 기기는 낮은 코히어런스로 바람을 감지해 마이크 하나, 고역 통과 필터(high-pass filter) 또는 VPU로 전환합니다(흔한 설계 [E]).

## 4. 골전도와 음성 픽업 장치(VPU)

**무엇인가.** VPU는 외이도나 피부에 밀착된 MEMS 가속도계입니다. 내 목소리는 두개골을 흔들지만, 주변의 75 dBA는 거의 흔들지 못합니다. 그래서 VPU는 공기 중 잡음에, 그리고 다른 사람의 목소리에 거의 영향을 받지 않습니다. 그 덕분에 VAD용 **본인 음성 검출기(own-voice detector)**로도 거의 완벽합니다.

**함정: 대역폭.**
- 조직(tissue)은 저역 통과 필터처럼 작용하고, 센서도 그 대역에 맞춰 만듭니다. Knowles는 V2S200D 음성 진동 센서의 센서 대역폭을 4 kHz로 명시합니다 [V] ([LCSC 제품 정보](https://www.lcsc.com/product-detail/C20099439.html)).
- 이어버드에서는 더 나쁩니다. 이어버드 하우징의 본인 음성 진동은 400 Hz 위에서 약 −93 dB/decade로 떨어집니다 [P] ([Weyer와 Jax 2026, 논문](https://arxiv.org/abs/2609.02165)). 400 Hz에서 4 kHz까지가 한 decade(10배)이므로 신호가 93 dB 떨어지고, 약 1 kHz 위의 성분을 잡으려면 아주 조용한 센서가 필요합니다.
- s 같은 치찰음(sibilant, 한국어 ㅅ, ㅆ)은 에너지 대부분이 약 4 kHz 위에 있습니다. 그래서 골전도 음성은 베개 너머로 말하는 것처럼 먹먹하게 들리고, 자음이 사라집니다.

**융합(fusion).** 시스템은 VPU의 깨끗한 저대역과 공기 마이크의 고대역을 합칩니다. 대략 1–2 kHz 근처의 크로스오버(crossover) [E]를 쓰거나, 두 신호를 모두 입력으로 받는 신경망을 씁니다. 조사 노트에 모은 근거 [P]:
- 공기 마이크와 융합한 골전도 센서는 CER을 (상대적으로) 20% 넘게 줄였고, 68 dB 잡음에서 골전도 신호의 SNR(진폭비)이 공기 마이크의 5배를 넘었습니다([PMC12195400](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12195400/));
- 잡음 제거 오토인코더(denoising autoencoder)를 붙인 골전도 마이크는 실제 62–74 dBA 잡음에서 CER 9.13%를 기록했고, 공기 마이크는 58.75%였습니다([NTU](https://scholars.lib.ntu.edu.tw/handle/123456789/488045)).

**현장의 친척들:**
- **후두 마이크(throat mic, laryngophone)**는 목에 붙입니다. 군용과 모터스포츠에서 쓰며, 같은 대역 제한 트레이드오프가 있습니다.
- **Shokz 계열 헤드셋**은 골전도를 *스피커*에 씁니다. OpenComm2의 마이크는 cVc가 붙은 평범한 공기 붐 마이크입니다 [P]. 사양서의 "골전도"라는 말은 주의해서 읽으세요.
- 85–100 dBA용 **산업용 헤드셋**, 예를 들어 3M Peltor WS LiteCom Pro III는 귀덮개(모델에 따라 NRR 24–28)와 잡음 제거 다이내믹 붐 마이크를 결합합니다 [V]. RealWear Navigator 520은 마이크 4개로 100 dBA까지 음성 인식을 한다고 주장합니다 [V] ([사양](https://shop.realwear.com/pages/realwear-navigator-520-specifications)).

**계산 예제: 잡음 제거 붐이 통하는 이유.** 그 캡슐은 압력 경도(pressure-gradient, 차동)형으로, 04강의 근접 효과(proximity effect)입니다. 거리 r의 점음원에 대해, 경도 마이크의 출력은 같은 압력의 먼 평면파에 비해 √(1 + 1/(kr)²)배입니다. r = 2.5 cm(이상화한 점음원 [E])에서 입은 먼 잡음보다 **100 Hz에서 +26.8 dB**, 300 Hz에서 +17.3 dB, 1 kHz에서 +7.6 dB, 3 kHz에서 +1.8 dB를 더 얻습니다.

이것은 가까이 있어서 얻는 21.6 dB의 레벨 이점에 *더해집니다*. 그리고 지하철과 공장 잡음이 가장 센 대역에서 가장 큽니다. 붐 위치가 중요한 이유도 이것입니다. 5 cm로 멀어지면 레벨 6 dB와 경도 보너스의 일부를 잃습니다.

## 5. 고전적 소프트웨어 잡음 제거

설정: 마이크 하나, STFT X(m,k) = S(m,k) + N(m,k)(03강). m은 프레임, k는 주파수 빈입니다. 잡음 제거기는 빈마다 이득 0 ≤ G(m,k) ≤ 1을 골라 Ŝ = G·X를 출력합니다. 아래 방법은 모두 빈별 잡음 파워 추정값 σ²(k)가 필요합니다.

**스펙트럼 차감(spectral subtraction, 파워 형태).** G = √max(1 − α·σ²/|X|², G_min²)이며, **과차감 계수(oversubtraction factor)** α ≥ 1과 **스펙트럼 바닥(spectral floor)** G_min을 씁니다. 기본 아이디어는 05강 2절에 있습니다.

**계산 예제: 뮤지컬 잡음은 어디서 오나.** 잡음만 있는 빈에서 |X|²는 평균 σ² 주위로 요동합니다. 가우시안 잡음이면 지수 분포(exponential distribution)를 따르므로 P(|X|² > a·σ²) = e^(−a)입니다. 200만 개 샘플로 시뮬레이션한 결과:

| α | 프레임마다 살아남는 잡음 빈 | 257개 빈 중(512점 FFT) | 잔여 잡음 파워 |
|---|---|---|---|
| 1 | e^(−1) = 36.8% | 약 95개 | −4.3 dB |
| 2 | 13.5% | 약 35개 | −8.7 dB |
| 3 | 5.0% | 약 13개 | −13.0 dB |

- 살아남은 빈 하나하나는 무작위 주파수에 있는 폭 31 Hz, 길이 32 ms의 짧은 소리(blip)입니다. 프레임마다 수십 개가 생겨 반짝이는 "뮤지컬" 질감을 만듭니다.
- 평균 잡음을 정확히 빼면(α = 1) 잡음은 4.3 dB만 작아지면서 소리는 *더 나빠집니다*.
- α를 키우면 음성도 먹힙니다. G_min = 0.1(−20 dB) 같은 바닥을 두면 짧은 소리 대신 일정하고 조용한 쉬익 소리가 남는데, 귀는 이것을 훨씬 잘 참습니다.

**위너 이득(Wiener gain)** (05강): G = ξ/(1 + ξ)이고, ξ는 빈의 **사전 SNR**입니다.

| ξ | −10 dB | 0 dB | 10 dB | 20 dB |
|---|---|---|---|---|
| 위너 이득 G | 0.091 (−20.8 dB) | 0.50 (−6.0 dB) | 0.909 (−0.8 dB) | 0.99 (−0.1 dB) |

0 dB에서는 그 빈의 음성도 잡음과 함께 6 dB 깎입니다. 음성과 잡음이 겹치는 곳에서는 잡음 제거가 음성도 지웁니다.

**MMSE-STSA와 LSA(Ephraim–Malah, 1984–85)를 직관적으로.**
- **질문.** 잡음 섞인 측정값 하나를 공식에 넣는 대신 이렇게 묻습니다. "내가 측정한 것과 내가 믿는 것을 고려하면, 깨끗한 진폭의 기댓값은 얼마인가?" 칼만 갱신(Kalman update)과 같은 베이즈 추정기입니다. **MMSE-STSA**(최소 평균 제곱 오차 단구간 스펙트럼 진폭)는 진폭의 오차를, **LSA**(로그 스펙트럼 진폭)는 그 로그의 오차를 최소화하는데, 후자가 우리가 듣는 방식에 더 가깝습니다.
- **두 가지 입력.** **사후 SNR** γ = |X|²/σ²는 이번 프레임에서 측정합니다. **사전 SNR** ξ는 **결정 지향(decision-directed)** 규칙 ξ̂(m) = 0.98·|Ŝ(m−1)|²/σ² + 0.02·max(γ(m) − 1, 0)으로 믿는 값입니다.
- **뮤지컬 잡음이 사라지는 이유.** ξ̂는 대부분 지난 프레임의 결과이므로, 한 프레임짜리 무작위 γ 튐이 문을 열지 못하고, 외톨이 짧은 소리가 생기지 않습니다(Cappé 1994).
- **숫자.** LSA 이득은 G = ξ/(1+ξ) · exp(½·E₁(v))이고, v = ξγ/(1+ξ), E₁은 지수 적분(exponential integral)입니다. ξ = −10 dB, γ = 1에서 **0.24**로, 위너의 0.09보다 큽니다. ξ = 0 dB, γ = 2에서는 0.56 대 0.50이고, ξ = 10 dB(γ = 11)에서는 둘 다 0.91입니다. LSA는 확신이 없을 때 *덜* 억제해, 잡음을 조금 남기는 대신 아티팩트를 줄입니다.

**잡음 바닥 σ² 추적하기.**
- **VAD로 게이트한 평균.** VAD가 잡음이라고 한 프레임에서만 σ²(m) = β·σ²(m−1) + (1 − β)·|X|²로 갱신합니다. β = 0.98, 홉(hop) 16 ms면 시정수는 0.016/0.02 = 0.8 s입니다. 약점은 큰 잡음 속 VAD 오류입니다. 한 시험에서 Silero VAD v5는 순수 잡음 클립의 최대 약 40%를 음성으로 통과시켰습니다 [P].
- **최소 통계(minimum statistics)** (Martin, 2001). 음성에는 음절 사이에 틈이 있으므로, 약 1.5 s 동안 각 빈의 평활화된 파워 최솟값은 잡음 바닥 근처에 있습니다. 최솟값은 평균보다 낮으므로 편향 보정(bias correction)을 곱합니다. VAD가 필요 없지만, 커지는 잡음(터널로 들어가는 열차)을 1–2 s 늦게 따라갑니다.
- **가장 싼 잡음 제거기**는 80–100 Hz 고역 통과 필터입니다. 지하철 잡음은 8 Hz 근처와 20–80 Hz에서 강하고 [P], 목소리 기본 주파수는 낮은 남성 목소리에서 약 85 Hz부터 시작합니다. 선형이고 부드러우므로 안전한 후보지만, 그래도 시험해야 합니다 [H].

## 6. 신경망 잡음 제거기, 제품, 평가 지표

- **RNNoise와 DeepFilterNet**(07강 1절): 대역별 이득이나 복소 필터를 예측하는 작은 실시간 신경망입니다.
- **Microsoft DNS Challenge**(Deep Noise Suppression, 2020–2023): 공개 학습 데이터, NSNet 기준 모델(baseline), DNSMOS 지표를 제공합니다([repo](https://github.com/microsoft/DNS-Challenge)). 2023년 대회는 청취 점수와 **함께 단어 정확도(word accuracy)**로도 채점했습니다 [F]. 듣기 좋은 것과 알아듣기 쉬운 것은 다른 목표입니다.
- **제품 [V]:** Krisp(통화와 음성 에이전트용), NVIDIA Broadcast와 Maxine SDK(Background Noise Removal, Studio Voice), 지원 앱의 통화와 녹음에 쓰는 Apple의 Voice Isolation 마이크 모드([Apple](https://support.apple.com/101993)), cVc 같은 이어버드 업링크 DSP.
- **생성형 "스튜디오" 향상기**(Adobe Enhance Speech, NVIDIA Studio Voice, ElevenLabs Voice Isolator; 07강과 08강)는 목소리를 다시 합성(re-synthesise)합니다. 잡음이 아주 심한 구간에서는 그럴듯하지만 틀린 소리를 만들 수 있습니다. 증거 기록에서는 그 출력이 기록이 아니라 재구성물입니다.

**평가 지표: 각각 무엇에 점수를 주는가.**

| 지표 | 측정하는 것 | 깨끗한 기준 신호가 필요한가? | WER을 예측하도록 설계되었나? |
|---|---|---|---|
| PESQ | 체감 통화 품질 | 예 | 아니요 |
| STOI | 사람 청취자의 명료도(intelligibility) | 예 | 아니요 |
| DNSMOS (P.835: SIG, BAK, OVRL) | 음성, 배경, 전체에 대한 청취자 평가 예측 | 아니요 | 아니요. BAK는 조용한 배경에 점수를 줌 |
| SI-SDR | 파형 충실도(05강) | 예 | 아니요 |
| WER / CER | 인식기가 맞힌 것 | 정답 받아쓰기가 필요 | 이것이 *바로* 목표 |

날카로운 예: MetricGAN+([논문](https://arxiv.org/abs/2104.03538))는 PESQ를 최대화하도록 학습되며, 7절 연구에서 모든 구성의 WER을 올린 향상기가 바로 이것입니다.

## 7. 음성 향상 대 ASR: 핵심 절

**잡음 제거가 최신 ASR의 WER을 자주 올리는 이유:**
1. **아티팩트(artifact).** 마스크가 틀린 곳에서는 음성에 구멍을 내고(자음 에너지 손실), 짧은 소리를 남기거나 시작 부분(onset)을 뭉갭니다. Iwamoto 등은 향상 오차를 잡음 부분, 음성 크기 부분, 그리고 **아티팩트** 부분(음성과 잡음의 선형 결합이 아닌 모든 것)으로 나눴습니다. ASR 성능 저하의 주원인은 아티팩트였습니다 [P] ([논문](https://arxiv.org/abs/2201.06685)).
2. **분포 이동.** Whisper는 다양한 웹 오디오 68만 시간으로 학습했습니다 [F] ([논문](https://arxiv.org/abs/2212.04356)). Cohere Transcribe는 0–30 dB SNR에서 학습했고 [V], Qwen3-ASR은 극한 잡음에서 강한 결과를 보고합니다 [V]. 이 모델들에게 잡음 섞인 음성은 익숙하지만, 스펙트럼 구멍과 게이팅(gating)이 있는 "향상된" 음성은 새로운 종류의 오디오입니다.
3. **새 정보가 없음.** 단일 마이크 잡음 제거기는 인식기와 같은 신호를 봅니다. 정보를 버릴 수만 있습니다(정보 이론의 데이터 처리 부등식, data-processing inequality). 인식기는 이미 자기만의 암묵적 잡음 제거를 배웠고, 그것은 귀가 아니라 인식에 맞춰져 있습니다.
4. **조용한 실패.** 과억제는 **삭제(deletion)**, 즉 빠진 단어로 나타나는데, 뭉개진 단어보다 알아채기 어렵습니다. Krisp도 자기 제품에 대해 같은 점을 지적합니다 [V].

**근거** (링크가 없으면 조사 노트 Q4에서):

| 연구 | 설정 | 결과 |
|---|---|---|
| *When De-noising Hurts* (2025) [P] | Whisper, Parakeet, Gemini Flash 2.0, Parrotlet-a 앞에 MetricGAN+; 의료 녹음 500개 | **40개 구성 모두**에서 원본 오디오가 더 좋음; 오류율 1.1–46.6 포인트 상승([논문](https://arxiv.org/abs/2512.17562)) |
| *Where Speech Enhancement Hurts Recognition* (2026) [P] | FRCRN; 추론 시 마스크 강도 α 조절 | Whisper 6.44 → 약한 α = 0.25에서 **5.57**, 완전한 α = 1에서 6.46으로 복귀. wav2vec2.0 17.13 → 10.20([논문](https://arxiv.org/abs/2607.11157)) |
| Whisper 앞의 SAM Audio [P] | 분리를 전처리(front-end)로 사용 | 소리는 더 깨끗, WER/CER은 더 높음 |
| 브리지 모듈(bridge module, 2024) [P] | CMGAN/DEMUCS + Whisper | 도움이 됨, 주로 작은 Whisper 모델에서 |
| 잡음 증강 미세 조정(noise-augmented fine-tuning) [P] | Whisper-medium, 노래 가사, −5~5 dB | WER 18.05%, 향상 모듈을 쓴 경우 63.45% |
| 한국 국방 음성 명령 [P] | Whisper 앞에 잡음 제거기 | CER 6.17% 감소. 나머지와 상충하며, 결과는 잡음 제거기와 잡음에 따라 다름 |
| Krisp Voice Isolation 벤치마크 [V] | 실제 녹음 265개, 인식기 설정 11개 | 경쟁 음성이 있는 오디오: 통합 WER 23.24% → 6.24%. 잡음은 있지만 경쟁 음성이 없는 전화 통화: 3.48% → **3.91%**([블로그](https://krisp.ai/blog/voice-isolation-benchmark/)) |

**도움이 되는 경우:**
- 약하거나 오래된 인식기(작은 Whisper, wav2vec2.0);
- 인식기가 이미 무너진 아주 낮은 SNR;
- **끼어드는 말소리(interfering speech)**. 인식기는 단어처럼 들리는 것은 무엇이든 받아쓰므로, 옆 사람 목소리나 승강장 안내 방송을 지우면 삽입 오류가 줄어듭니다. 위 Krisp의 큰 개선이 바로 이것입니다;
- **약하거나 섞은 향상**: 부분 마스크, 또는 원본 신호의 일부를 출력에 다시 섞어 아티팩트를 묽히는 "관측 더하기(observation adding)" [P].

**계산 예제: 더 나은 지렛대는 마이크다 [E].** 0.3 m에서의 음성 레벨(보통 70, 높인 목소리 76, 큰 목소리 82, 외침 88 dB [P])을 거리와 결합합니다. 이어버드 스템은 약 +8 dB(조사 노트 추정), 2–3 cm 붐은 +20 dB입니다.

| 상황 | 30 cm 휴대폰 | 이어버드 스템 | 2–3 cm 붐 |
|---|---|---|---|
| 지하철 75 dBA, 높인 목소리 | +1 dB | +9 dB | +21 dB |
| 지하철 75 dBA, 큰 목소리 | +7 dB | +15 dB | +27 dB |
| 공장 95 dBA, 외침 | −7 dB | +1 dB | +13 dB |

Parakeet-TDT-0.6B-v3는 MUSAN 잡음에서 SNR별 평균 WER을 공개합니다 [V]: 깨끗할 때 6.34%, 10 dB에서 7.12%, 5 dB에서 8.23%, 0 dB에서 11.66%, −5 dB에서 19.88%([모델 카드](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)). 공장의 휴대폰은 0 dB 아래에 있고, 거기서는 모든 모델이 크게 나빠집니다. 붐은 같은 음성을 약 +5~+15 dB로 옮기며, 거기서 모델은 1–2 포인트만 잃습니다. 아티팩트 없이 +20 dB를 주는 단일 마이크 소프트웨어는 없습니다. (이것은 광대역 dBA 추정입니다. 지하철 잡음은 100 Hz 아래에 몰려 있으므로 음성 대역 안의 SNR은 조금 더 좋습니다 [H].)

**두 번째 지렛대: 잡음 증강 미세 조정.** 녹음한 지하철이나 공장 잡음을 깨끗한 음성과 우리 자신의 음성에 −5~+10 dB로 섞은 뒤 서버 모델을 미세 조정합니다. 잡음 제거기가 무엇을 지울지 추측하는 대신, 모델이 잡음을 배웁니다.

**우리 앱을 위한 경험칙:**
1. 인식기에는 가장 덜 처리되고 가장 가까이에서 녹음한 오디오를 줍니다.
2. 향상은 사람이 듣고 재생할 때만 쓰고, 기본 ASR 입력으로는 절대 쓰지 않습니다.
3. 원본 오디오는 항상 보관합니다. 향상된 파일은 파생 복사본입니다.
4. ASR용 향상을 시도한다면 약하거나 섞은 버전을 A/B 비교 대상(arm)으로 시험하고, 귀가 아니라 CER/WER로만 판단합니다.

## 8. 우리 앱에서는(In our app)

| 지렛대 | MVP 선택 | 이유 |
|---|---|---|
| 안드로이드 캡처 소스 | 지원되면 `UNPROCESSED`, 아니면 `VOICE_RECOGNITION`(10강 4절과 7절). `VOICE_COMMUNICATION`은 시험 비교 대상으로만 | 호환성 규정(CDD)은 선택 사항인 `UNPROCESSED`에서 어떤 처리도 허용하지 않고, `VOICE_RECOGNITION`에서는 잡음 저감과 AGC(자동 이득 제어, automatic gain control)를 **기본으로 꺼 두도록** 요구합니다 [F]. `VOICE_COMMUNICATION`은 통화 경로로, "예를 들어 에코 제거나 자동 이득 제어를 활용한다"고 문서화되어 있습니다 [F]. 레벨과 헤드룸(headroom) 계산은 10강에 있습니다 |
| 블루투스 경로 | 세그먼트마다 경로, 코덱, 켜진 효과(effect) 기록(요구사항 A3) | 헤드셋 DSP(cVc 등)는 휴대폰보다 먼저 실행되며 끌 수 없습니다. 협대역 CVSD 링크는 약 4 kHz에서 끊깁니다(10강 3절) |
| 캡처 시작 | 기본은 푸시 투 토크(PTT, push-to-talk) (A2) | 잡음만 있는 세그먼트가 없으므로 VAD 오작동과 지어낸 단어(환각, hallucination)가 줄어듭니다(조사 노트 Q5) |
| 지하철 | 광대역(wideband) 링크로 연결한, 스템 마이크가 있는 이어버드 | 손에 든 휴대폰보다 약 +8 dB [E]; 10강은 약 9 dB로 추정 |
| 85 dBA 이상 | 귀덮개가 있는 붐 헤드셋(Peltor급) | 어차피 보호구가 필요하고, 근접 붐으로 약 +20 dB [E] |
| 서버 ASR 입력 | 원본 16 kHz 세그먼트, 잡음 제거기 없음 | 7절 |
| 향상된 재생 | 선택형 토글. 서버가 잡음을 지운 *청취용* 복사본(예: DeepFilterNet)을 만들고 파생물로 표시 | 기본으로는 ASR에 넣지 않습니다. 원본 파일의 해시가 기록으로 남습니다(A3, A9) |

**1주 차 A/B 시험** (MVP §3.3의 시끄러운 지하철 세트와 S-3의 CER/WER 루프로). CER/WER과 무음(no-speech) 표시로만 판단하고, 서버에서는 무거운 작업을 한 번에 하나만 돌립니다.
1. **캡처 소스와 경로**(10강의 1주 차 목록과 공통): 휴대폰 마이크의 `UNPROCESSED`, `VOICE_RECOGNITION`, `VOICE_COMMUNICATION`, 그리고 이어버드; 나중에 붐 헤드셋. 같은 한국어, 영어, 혼합 대본 문장을 씁니다.
2. **서버 전처리:** 원본 대 80 Hz 고역 통과 대 DeepFilterNet 대 원본과 섞은 DeepFilterNet.
3. **캡처 모드:** PTT 대 착용자가 켠 VAD 세션. 무음 세그먼트와 환각 세그먼트를 셉니다.
4. **맥락:** 세션마다 휴대폰 SPL 앱 측정값. 나중의 미세 조정을 위해 10 s짜리 잡음 전용 클립을 선택적으로 녹음하되, 주변에서 아무도 말하지 않을 때만, 메모와 같은 개인정보 규칙 아래에서 합니다.

## 읽거나 볼 자료(Read or watch)

- Audio University, *How Do Microphone Polar Patterns Work?* (영상): 카디오이드와 그 친구들, 즉 차동 배열이 전자적으로 만드는 패턴: https://www.youtube.com/watch?v=qV6mxPpqTv0
- Andrew Greensted, *Delay Sum Beamforming* (The Lab Book Pages): 빔 패턴, 주파수 의존성, 간격과 그레이팅 로브(grating lobe)를 그림과 함께: http://www.labbookpages.co.uk/audio/beamforming/delaySum.html
- Oliver Jones (ams), *Challenges Await In Noise-Cancelling Headset Design* (Electronic Design; 업체 엔지니어의 기사): 피드포워드 대 피드백, 주파수 범위, 20 µs 예산: https://www.electronicdesign.com/technologies/analog/article/21789816/challenges-await-in-noise-cancelling-headset-design
- Rivera Benois, Nowak, Zölzer, *Hybrid Active Noise Control Structures: A Short Overview* (논문; 짧고 헤드폰용 블록 다이어그램 포함): https://www.hsu-hh.de/ant/wp-content/uploads/sites/699/2019/01/Hybrid-Active-Noise-Control-Structures_-A-Short-Overview-Rivera-Nowak-Zoelzer.pdf
- Olivier Cappé, *Elimination of the musical noise phenomenon with the Ephraim and Malah noise suppressor* (논문; 결정 지향 규칙에 대한 가장 명확한 설명): https://www.di.ens.fr/olivier.cappe/Publications/Self-archive/ephma94.pdf
- Iwamoto 등, *How Bad Are Artifacts?: Analyzing the Impact of Speech Enhancement Errors on ASR* (논문): https://arxiv.org/abs/2201.06685
- Krisp, *Voice Isolation Benchmark* (업체 블로그; WER이 나빠진 경우까지 비판적으로 읽으세요): https://krisp.ai/blog/voice-isolation-benchmark/
- 안드로이드 호환성 정의 문서(Android Compatibility Definition), §5.4.2 *Capture for Voice Recognition*과 §5.11 *Capture for Unprocessed*: https://source.android.com/docs/compatibility/16/android-16-cdd#542_capture_for_voice_recognition

## 실습(Exercise, 1시간)

1. **준비:** [README](README.md)대로 `~/audio-learn`을 만들고, 저장소 루트에서 스크립트를 실행합니다.
2. **깨끗한 음성과 잡음.** 스크립트는 한국어 Zeroth 클립 `tools/separation-lab/data/zeroth/test_data_01/003/105/105_003_2246.flac`(18.7 s, 16 kHz)을 씁니다. 영어는 `tools/separation-lab/data/librispeech/LibriSpeech/test-clean/1089/134686/1089-134686-0000.flac`(10.4 s)을 쓰세요. 잡음은 합성한 웅웅거림(파워의 57%가 100 Hz 아래에 있어 지하철 잡음과 비슷함)이거나, `NOISE`에 직접 녹음한 지하철 소리를 지정합니다.
3. **실행**한 뒤, 헤드폰으로 편안한 음량에서 0, 5, 10 dB의 `noisy_*`와 `specsub_*`를 들어 보세요. α = 1이고 바닥이 없을 때 반짝이는 뮤지컬 잡음을 찾아 들어 보고, 바닥 0.1과 비교하세요.
4. **보기:** `spectrograms.png`를 봅니다. 쉬는 구간의 점들이 뮤지컬 잡음이고, 고주파 자음의 빈자리는 잡음 제거기가 지운 음성입니다. 스크립트는 쉬는 구간의 잡음 감소량을 출력합니다. 여러 난수 시드에서 α = 1은 −4~−5 dB, α = 2는 −8~−10 dB로 측정되어, 5절의 −4.3 dB와 −8.7 dB에 가깝습니다.
5. **선택: DeepFilterNet.** https://github.com/Rikorose/DeepFilterNet/releases 에서 미리 빌드된 `deep-filter-0.5.6-x86_64-unknown-linux-musl` 바이너리를 내려받아 `~/audio-learn/deep-filter`로 저장하고 `chmod +x` 하세요(모델이 들어 있어 PyTorch가 필요 없고, 48 kHz WAV만 받으므로 `_48k` 파일을 씁니다). 먼저 `free -h`를 확인하고, 무거운 작업은 한 번에 하나만 돌리며, 메모리 상한을 둡니다.
   `mkdir -p ~/audio-lab11/dfn && systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 ~/audio-learn/deep-filter -D -o ~/audio-lab11/dfn ~/audio-lab11/noisy_5dB_48k.wav`
6. **답하기:** 어느 버전을 *듣고* 싶고, 어느 버전을 인식기에 주겠습니까? 두 답이 왜 다를 수 있을까요?

모든 녹음과 출력은 저장소 바깥의 `~/audio-lab11`에 둡니다. 절대 커밋하지 마세요.

```python
from pathlib import Path
import numpy as np, soundfile as sf, matplotlib.pyplot as plt
from scipy.signal import stft, istft, resample_poly

CLEAN = "tools/separation-lab/data/zeroth/test_data_01/003/105/105_003_2246.flac"
NOISE = None                      # or the path to your own subway recording
OUT = Path.home() / "audio-lab11"; OUT.mkdir(exist_ok=True)   # outside the repo
rng = np.random.default_rng(0)

s, fs = sf.read(CLEAN)                                          # 16 kHz mono
s = np.concatenate([1e-5 * rng.standard_normal(int(0.7 * fs)), s])  # 0.7 s with no speech
if NOISE:                         # own recording: mono, resampled, looped to length
    n, nfs = sf.read(NOISE); n = n.mean(axis=1) if n.ndim > 1 else n
    noise = np.resize(resample_poly(n, fs, nfs), len(s))
else:                             # white noise tilted -4.5 dB/octave above 50 Hz: a rumble
    spec = np.fft.rfft(rng.standard_normal(len(s)))
    f = np.maximum(np.fft.rfftfreq(len(s), 1 / fs), 50.0)      # flat below 50 Hz
    noise = np.fft.irfft(spec * (f / 1000) ** (-4.5 / 6.02), len(s))

def mix_at_snr(s, noise, snr_db):
    g = np.sqrt(np.sum(s**2) / (np.sum(noise**2) * 10 ** (snr_db / 10)))
    return s + g * noise

def spectral_subtraction(x, alpha=2.0, floor=0.0, noise_sec=0.5):
    t, X = stft(x, fs, nperseg=512, noverlap=384)[1:]          # 32 ms window, 8 ms hop
    P = np.abs(X) ** 2
    sigma2 = P[:, t < noise_sec].mean(axis=1, keepdims=True)   # noise PSD from the lead-in
    G = np.sqrt(np.maximum(1 - alpha * sigma2 / np.maximum(P, 1e-12), floor**2))
    return istft(G * X, fs, nperseg=512, noverlap=384)[1][: len(x)]

pause = slice(1000, int(0.6 * fs))
for snr in [0, 5, 10]:
    x = mix_at_snr(s, noise, snr); x *= 0.9 / np.max(np.abs(x))
    sf.write(OUT / f"noisy_{snr}dB.wav", x, fs)
    sf.write(OUT / f"noisy_{snr}dB_48k.wav", resample_poly(x, 3, 1), 48000)  # DeepFilterNet
    for alpha, floor in [(1, 0), (2, 0), (2, 0.1)]:
        y = spectral_subtraction(x, alpha, floor)
        sf.write(OUT / f"specsub_{snr}dB_a{alpha}_f{floor}.wav", y, fs)
        drop = 10 * np.log10(np.mean(y[pause] ** 2) / np.mean(x[pause] ** 2))
        print(f"{snr:>2} dB SNR, alpha={alpha}, floor={floor}: pause noise {drop:5.1f} dB")

x = mix_at_snr(s, noise, 5); y = spectral_subtraction(x)
fig, ax = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
for a, sig, name in zip(ax, [s, x, y], ["clean", "noisy, 5 dB SNR", "spectral subtraction"]):
    a.specgram(sig, NFFT=512, Fs=fs, noverlap=384, cmap="magma", vmin=-120); a.set_title(name)
fig.tight_layout(); fig.savefig(OUT / "spectrograms.png", dpi=120); plt.show()
```
