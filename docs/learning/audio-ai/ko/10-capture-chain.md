# 10. 수음 사슬(capture chain): 마이크, 블루투스, 안드로이드 오디오 경로, 파일 형식

> 영어 원문(English original): [10-capture-chain.md](../10-capture-chain.md)

전사문(transcript)은 그것이 나온 오디오보다 좋아질 수 없고, 손상의 대부분은 파일이 생기기도 전에 일어납니다. 공기 중에서, 마이크에서, 블루투스 링크에서, 그리고 안드로이드 내부에서입니다. 이번 강의는 입에서 나온 목소리가 16 kHz WAV 세그먼트(segment)가 되기까지를 따라가며, 각 단계가 어디서 정보를 잃는지와 그 손실을 어떻게 측정하는지를 보여 줍니다. 마지막에는 이것이 갤럭시 S25용 현장 기록 앱에 어떤 의미인지 정리합니다. 지금은 72–79 dBA의 지하철, 나중에는 85–100 dBA의 공장이 대상입니다.

**레이블(label)**은 우리 조사 노트와 같습니다. [F] 공식 또는 1차 페이지에서 검증, [V] 업체 주장, [P] 논문 또는 제3자 보고, [E] 우리 추정, [H] 검증할 가설. 2026-11-05에 확인했습니다.

**이번 강의에서 만나는 용어** (각 용어는 처음 나올 때 다시 설명합니다):

| 용어 | 쉬운 뜻 |
|---|---|
| dB SPL | 음압 레벨(sound pressure level): 공기 중 소리의 크기, 20·log₁₀(p_rms / 20 µPa) ([강의 01](01-sound-hearing-rooms.md) 1절). 94 dB SPL이 1 Pa |
| dBA | A 가중(A-weighting) 필터를 거쳐 잰 dB SPL. 귀처럼 저주파를 덜 쳐 줌. "지하철 객실 75 dBA" 같은 소음 수치가 이것을 씀 |
| dBFS | 풀 스케일(full scale), 즉 파일이 담을 수 있는 가장 큰 수 대비 데시벨([강의 02](02-digital-audio.md) 5절). 0 dBFS가 천장 |
| MEMS 마이크 | 미세 전자 기계 시스템(micro-electro-mechanical system): 휴대폰과 이어버드에 쓰는 몇 밀리미터 크기의 실리콘 칩 마이크 |
| 감도, SNR, AOP | 데이터시트 수치: 1 Pa에 대한 출력, 마이크 자체 잡음에서 1 Pa까지의 거리, 심한 왜곡이 생기기 전 가장 큰 소리 |
| 근거리장 / 원거리장(near field / far field) | 음원 가까이에서 거리에 따라 레벨이 빠르게 변하는 영역 / 멀리서 소리가 거의 평면파로 도착하는 영역 |
| 블루투스 프로필(Bluetooth profile) | 블루투스 링크의 표준 "업무 정의": 음악은 A2DP, 통화는 HFP |
| CVSD, mSBC, LC3 | 핸즈프리 링크의 음성 코덱(압축기). 각각 8, 16, 32 kHz로 샘플링 |
| LE 오디오(LE Audio) | 저전력 블루투스(Bluetooth Low Energy) 무선 위의 새 오디오 시스템. LC3 코덱 사용 |
| AudioRecord | 앱이 마이크 원시 샘플을 읽을 때 쓰는 안드로이드 클래스 |
| 오디오 소스(audio source) | 앱이 요청하는 프리셋(`MIC`, `VOICE_RECOGNITION` 등): 어떤 마이크와 어떤 처리를 쓸지 |
| AEC, NS, AGC | 음향 반향 제거(acoustic echo cancellation), 잡음 억제(noise suppression), 자동 이득 제어(automatic gain control): 휴대폰이 적용할 수 있는 처리 |
| CDD | 안드로이드 호환성 정의 문서(Compatibility Definition Document): 구글 안드로이드를 탑재해 출시하려면 휴대폰이 지켜야 하는 규칙 |
| 경로(route) | 녹음에 실제로 쓰인 입력 장치: 휴대폰 마이크, 블루투스 헤드셋, USB |
| 리샘플링(resampling), 다운믹스(downmix) | 샘플링 레이트 바꾸기 / 여러 채널을 하나로 합치기 |
| ASR | 자동 음성 인식(automatic speech recognition): 음성을 텍스트로 |

## 1. 입에서 파일까지의 사슬

녹음은 진동 측정처럼 하나의 측정 사슬입니다. 센서, 신호 조절(signal conditioning), ADC(아날로그-디지털 변환기), 드라이버, 파일 형식으로 이어집니다. 각 단계는 정보를 잃을 수 있고, 그 손실은 나중에 거의 되돌릴 수 없습니다. 클리핑(clipping)은 [강의 04](04-audio-engineering-practice.md) 2절, 에일리어싱(aliasing)은 [강의 02](02-digital-audio.md) 1절에서 다뤘습니다.

| # | 단계 | 일어나는 일 | 잃을 수 있는 것 | 알아차리는 법 |
|---|---|---|---|---|
| 1 | 공기 | 음성은 입에서 퍼져 나가고, 잡음은 사방에서 옴 | 거리와 잡음 레벨이 정하는 SNR, 바람 난류 | 말 사이의 잡음, 낮은 웅웅거림(rumble) |
| 2 | 마이크 | 압력이 진동판(diaphragm)을 움직여 전압이나 비트가 됨 | 자체 잡음, AOP를 넘으면 왜곡과 클리핑 | 윗부분이 평평한 파형 |
| 3 | 프리앰프(preamp)와 ADC | 게인, 앤티 에일리어싱 필터, 샘플링 | 게인이 너무 높으면 클리핑, 너무 낮으면 쉬익 소리(hiss) | 0 dBFS에 붙은 피크 |
| 4 | 헤드셋 DSP(디지털 신호 처리)와 블루투스(쓰는 경우) | 이어버드 펌웨어가 잡음을 줄인 뒤, 음성 코덱이 신호를 무선 링크에 욱여넣음 | 4, 8 또는 16 kHz 위의 모든 것, 과격한 잡음 제거에 망가진 음성, 20–150 ms의 지연, 끊김 | 평평하게 잘린 스펙트럼, 딸깍 소리나 공백 |
| 5 | 안드로이드 오디오 프레임워크 | 소스 프리셋(NS, AGC, AEC), 리샘플링, 라우팅, 여러 앱이 동시에 녹음할 때의 규칙 | 처리 잡음(artefact), 시간에 따라 바뀌는 게인, 엉뚱한 마이크, 무음 | 레벨이 "숨 쉬듯" 오르내림, 예상과 다른 경로 |
| 6 | 우리 인코더 | PCM WAV(무손실) 또는 손실 코덱 | WAV는 없음, 낮은 비트레이트에서는 디테일 | 물기 어린, 소용돌이치는 고음 |
| 7 | 서버 정규화(normalisation) | 디코딩, 리샘플링, 다운믹스, 레벨 조정 | 부주의하면 채널 상쇄, 에일리어싱, 클리핑 | 무음이거나 텅 빈 소리 |

**핵심 교훈.** 서버는 저장된 파일에 더 좋은 모델을 다시 돌릴 수 있지만, 1–5단계가 버린 것은 되살릴 수 없습니다. 그래서 수음 경로는 의도적으로 골라야 하고, 실제로 쓰인 경로를 세그먼트마다 **기록(log)**해야 합니다. 4단계와 5단계는 지연도 더합니다. 앱이 버퍼를 *받은* 시각은 말을 *한* 시각이 아닙니다(3.3절).

## 2. 현장의 마이크

### 2.1 휴대폰 MEMS 마이크와 데이터시트 수치

휴대폰에는 보통 MEMS 마이크가 두 개에서 네 개 있습니다([강의 04](04-audio-engineering-practice.md) 1절). 입 가까운 아래쪽에 하나, 위쪽에 하나, 그리고 흔히 카메라 옆에 하나입니다. 휴대폰은 이들을 비교해 잡음을 줄이고 바람을 감지합니다. 녹음에 어떤 마이크를 쓸지는 플랫폼이 정하고, `AudioRecord.getActiveMicrophones()`로 알려 줍니다[F].

데이터시트 용어. 모두 표준 시험음인 1 kHz, 94 dB SPL(1 Pa)을 기준으로 합니다.
- **감도(sensitivity)**는 그 시험음에 대한 출력입니다. 디지털 MEMS 마이크는 dBFS로 표시합니다. −37 dBFS라면 1 Pa 시험음이 풀 스케일보다 37 dB 낮게 나온다는 뜻입니다.
- **SNR(신호 대 잡음비, signal-to-noise ratio)**은 94 dB에서 마이크 자체의 쉬익 소리를 뺀 값으로, 그 잡음을 등가 음압 레벨로 나타내고 A 가중합니다. SNR 65 dBA라면 자체 잡음이 29 dBA(94 − 65)짜리 방처럼 들린다는 뜻이고, 조용한 침실 수준입니다. 75 dBA 지하철에서는 상관없고, 조용한 사무실에서는 중요합니다.
- **AOP(음향 과부하점, acoustic overload point)**는 왜곡이 심해지기 전의 가장 큰 레벨입니다. 보통 **THD**(전고조파 왜곡, total harmonic distortion: 소리에 없던, 마이크가 만들어 낸 배음이 출력에서 차지하는 비율) 10%에서 정의합니다. AOP를 넘으면 마이크 자체가 클리핑됩니다. **다이내믹 레인지(dynamic range)**는 AOP에서 자체 잡음 레벨을 뺀 값입니다.
- **대표 값.** TDK는 감도 −37 dBFS, SNR 68 dBA, AOP 133 dB SPL인 휴대폰급 MEMS 마이크를 발표했습니다[V] ([발표 기사](https://www.microcontrollertips.com/mems-microphones-excel-in-high-dynamic-range-environments/)). 휴대폰급 부품은 흔히 SNR 65–70 dBA, AOP 120–135 dB SPL을 내세웁니다[V]. 안드로이드는 `MicrophoneInfo`로 마이크별 감도와 최대 SPL을 알려 주며, CDD는 휴대폰이 이 값을 채우도록 요구합니다[F]. 그래도 값이 "알 수 없음(unknown)"으로 올 수 있습니다.

**계산 예 1: 고함을 치면 클리핑될까?** 마이크 뒤에서 휴대폰은 자체 게인을 정합니다. CDD(4.2절)는 두 오디오 소스의 목표 게인을 줍니다.
- `VOICE_RECOGNITION`: 90 dB SPL의 1 kHz 시험음은 16비트 샘플에서 32768 중 RMS 2500을 *내야 합니다(SHOULD)*. 즉 20·log₁₀(2500/32768) = −22.35 dBFS입니다[F]. 사인파의 피크는 √2 × RMS = 3536이고, 풀 스케일(32767)에 닿기까지 9.3배(+19.3 dB) 커질 수 있습니다. 그래서 이 경로는 약 **109 dB SPL**에서 사인파를 클리핑합니다.
- `UNPROCESSED`: 94 dB SPL 시험음이 RMS 520(−36 dBFS)을 *내야만 합니다(MUST)*[F]. 같은 계산으로 약 **127 dB SPL**에서 클리핑되니, 헤드룸(headroom)이 18 dB 더 있습니다.
- 음성의 피크는 RMS 레벨보다 대략 12 dB 이상 높습니다[E, 경험칙].
  - 지하철, 휴대폰 30 cm, 높인 목소리(76 dB SPL): 피크는 88 dB SPL 근처로, 두 한계보다 20 dB 이상 낮습니다. 안전합니다.
  - 공장, 휴대폰을 입술(3 cm)에 대고 고함: 평균 약 108 dB SPL(계산 예 2의 3 cm 행), 피크는 120 dB SPL 근처입니다. CDD 목표로 맞춘 `VOICE_RECOGNITION` 경로는 클리핑되지만 `UNPROCESSED`는 아닙니다.
- **주의.** 이것은 CDD 목표치입니다. S25의 실제 게인은 측정하기 전까지 모릅니다(7절).

### 2.2 그 밖에 만날 마이크

| 마이크 | 입까지 거리 | 휴대폰과의 연결 | 장점 | 약점 |
|---|---|---|---|---|
| 손에 든 휴대폰 | 20–30 cm | 내장 | 가장 넓은 대역폭(하드웨어가 48 kHz로 동작), 마이크 여러 개 | 입에서 멂 |
| 주머니 속 휴대폰, 가슴 바디캠(bodycam) | 20–40 cm, 흔히 가려짐 | 내장, 또는 자체 녹음기 | 손이 자유로움 | 천에 막혀 먹먹함, 부스럭 소리. 지하철 추정 SNR −5 ~ +3 dB[E] |
| 라발리에(lavalier, 옷에 다는 마이크) | 15–25 cm, 가슴 | 유선 또는 자체 무선 | 거리가 일정 | 턱 아래라 고음이 일부 빠짐, 옷 소리 |
| 이어버드 마이크 | 10–12 cm, 귀 | 블루투스 HFP 또는 LE 오디오 | 늘 착용. **빔포밍(beamforming)**: 마이크 두 개를 합쳐 입 쪽을 "겨냥". 일부는 골전도(bone-conduction)나 음성 픽업 센서 추가 | 블루투스 코덱 한계, 끌 수 없는 펌웨어 잡음 제거 |
| 근접 붐 마이크(close-talk boom) | 2–3 cm, 입술 옆 | 유선 또는 블루투스 헤드셋 | 가장 높은 SNR, 흔히 소음 제거형(2.4절) | 위치를 맞춰야 함, 덜 편함 |
| 붐 달린 청력 보호 헤드셋(3M Peltor WS LiteCom Pro III급) | 2–3 cm | 블루투스 A2DP와 HFP | 시끄러운 현장에서 어차피 필요한 PPE(개인 보호구, personal protective equipment)를 겸함, 소음 제거 붐[V] | 블루투스 코덱과 광대역 지원 여부 미확인[공백] |
| 머리 착용형 마이크 배열(RealWear Navigator 520) | 5–10 cm | 자체 컴퓨터 | "100 dBA까지의 소음에서 정확한 음성 인식(Accurate voice recognition in noise up to 100 dBA)"[V] | 별도 기기 |

제품 정보는 [asr_noise_ondevice_onprem.md](../../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md) Q7에서 가져왔습니다.

### 2.3 근거리장, 원거리장, 그리고 SNR 예산

- **잡음은 확산(diffuse)되어 있습니다.** 지하철 객실이나 공장 홀에서는 잡음이 수많은 반사를 거쳐 모든 방향에서 옵니다. 바로 옆 기계 하나가 압도하지 않는 한, 마이크를 어디에 두든 레벨이 거의 같습니다. 공장 바닥의 배경 진동이라고 생각하면 됩니다.
- **음성은 가까운 점음원(point source)에서 나옵니다.** 거리가 두 배가 될 때마다 레벨이 6 dB 떨어집니다(역제곱 법칙, inverse-square law, [강의 01](01-sound-hearing-rooms.md) 1절). 그래서 마이크를 가까이 가져가면 음성만 커지고, SNR도 같은 dB만큼 오릅니다.
- **근거리장과 원거리장.** 음원에서 약 λ/2π보다 가까운 곳(1 kHz에서 5.5 cm, 300 Hz에서 18 cm)에서는 파면이 크게 휘어 있고 거리에 따라 레벨이 가파르게 변합니다. 이것이 근거리장입니다. 멀리 가면 파면이 거의 평평해집니다. 이것이 원거리장입니다. 입술에서 2–3 cm 떨어진 붐 마이크는 목소리의 근거리장 안에 있고, 잡음은 원거리장 소리로 듣습니다.

**계산 예 2: SNR 예산.**
- 0.3 m에서의 음성 레벨: 높인 목소리 76 dB, 고함 88 dB(ANSI S3.5에서 유래한 표[P]). 사람은 시끄러운 곳에서 목소리를 높이며, 이를 **롬바르드 효과(Lombard effect)**라고 합니다[P]. 거리 r에서의 레벨은 L(r) = L(0.3 m) + 20·log₁₀(0.3 / r)입니다.
- 주변 소음: 지하철 75 dBA(한국 지하철 객실 측정치 72–79 dBA[P]), 공장 95 dBA(85–100 범위 안의 가정).

| 마이크 위치 | 거리 | 30 cm 대비 음성 이득 | 지하철: 음성 / SNR | 공장: 음성 / SNR |
|---|---|---|---|---|
| 손에 든 휴대폰 | 30 cm | 0 dB | 76 dB / **+1 dB** | 88 dB / **−7 dB** |
| 이어버드 | 11 cm | +8.7 dB | 84.7 dB / **+9.7 dB** | 96.7 dB / **+1.7 dB** |
| 근접 붐 마이크 | 3 cm | +20 dB | 96 dB / **+21 dB** | 108 dB / **+13 dB** |

**이 숫자가 ASR에 뜻하는 것.** 한 업체는 잡음을 섞은 영어 벤치마크에서 Parakeet-TDT-0.6B-v3가 깨끗할 때 **WER**(단어 오류율, word error rate: 틀린 단어의 비율) 6.3%, SNR 10 dB에서 7.1%, 0 dB에서 11.7%, −5 dB에서 19.9%라고 보고합니다[V]. 그러니 30 cm 거리의 휴대폰은 지하철에서는 쓸 만한 경계선이고 공장에서는 쓸모가 없습니다. 붐 마이크는 두 곳 모두에서 넉넉합니다.

- **주의: 음원.** 3 cm에서는 입이 점음원이 아니므로 +20 dB는 근사치입니다. 우리 조사 노트도 같은 경험칙을 씁니다[E].
- **주의: 가중.** dBA는 저주파를 덜 쳐 주는데, 지하철 소음의 상당 부분은 100 Hz 아래에 있습니다[P]. 80–100 Hz 고역 통과 필터(high-pass filter)로 싸게 없앨 수 있으므로, 음성 대역 안의 SNR은 A 가중 수치보다 대개 더 좋습니다.
- **주의: 아직 측정 없음.** 지하철 객실 안의 SNR을 실측해 발표한 곳은 없습니다[공백]. 우리 첫 주 녹음이 그 값을 줄 것입니다.

### 2.4 바람 잡음과 근접 효과

**바람 잡음(wind noise)은 멀리서 온 소리가 아닙니다.** 마이크 구멍 위를 흐르는 공기가 난류가 되고, 그 소용돌이(eddy)가 진동판을 직접 밉니다.
- 압력 변동이 크고 저주파에 몰려 있습니다. 말소리가 작을 때도 마이크나 ADC를 클리핑으로 몰 수 있습니다. 몇 센티미터 떨어진 소용돌이끼리는 서로 무관하지만, 두 마이크에 도착한 진짜 소리는 서로 강하게 관련되어 있습니다. 휴대폰은 이 차이로 바람을 감지한 뒤 마이크를 바꾸거나 필터를 겁니다. 이것도 처리입니다(4절).
- 대책을 좋은 순서로: 폼이나 털 윈드스크린(windscreen, 난류를 구멍에서 떨어뜨림), 몸이나 손으로 가리기, 고역 통과 필터. 바람은 지하철 승강장(들어오는 열차가 밀어내는 공기)과 야외 현장에서 만납니다.

**근접 효과(proximity effect), 그리고 소음 제거 붐 마이크가 통하는 이유.** [강의 04](04-audio-engineering-practice.md) 1절에서 지향성 마이크는 진동판 앞뒤의 압력 *차이*에 반응하기 때문에 음원 가까이에서 저음이 커진다고 설명했습니다. 소음 제거 붐 마이크는 이 성질을 이용하려고 일부러 목소리의 근거리장에 둔 압력 경도(pressure-gradient, "차동(differential)") 마이크입니다.
- 점음원에서 나오는 구면파는 p = (A/r)·e^(i(ωt − kr))입니다. 그 경도의 크기는 |∂p/∂r| = (|A|/r)·√(k² + 1/r²)이고, 여기서 k = 2πf/c는 파수(wavenumber)입니다.
- 마이크에서 같은 압력을 갖는 먼 평면파의 경도는 k·|p|에 불과합니다.
- 그래서 가까운 목소리는 같은 압력의 먼 잡음보다 √(1 + 1/(kr)²)만큼 추가 이득을 얻습니다.

**계산 예 3.** r = 2 cm의 붐 마이크는 300 Hz에서 약 19 dB(k = 5.5 rad/m, kr = 0.11), 1 kHz에서 약 9 dB(kr = 0.37), 3 kHz에서 약 2.6 dB(kr = 1.1)의 추가 이득을 얻습니다. 이것은 역제곱 법칙의 이점 위에 더해지며, 지하철과 기계 소음이 가장 센 저주파에서 가장 큽니다. 헤드셋 제조사는 그로 인한 저음 증가를 이퀄라이징(equalise)으로 보정합니다. 함정은 이 이점이 거리에 달려 있다는 점입니다. 붐을 입에서 밀어내면 이점이 빠르게 사라집니다.

## 3. 블루투스 헤드셋

### 3.1 무선 하나, 프로필 둘

블루투스 **프로필**은 한 가지 업무를 정한 표준 설명서입니다.
- **A2DP**(고급 오디오 배포 프로필, Advanced Audio Distribution Profile)는 음악을 휴대폰에서 헤드셋으로 *한 방향*으로, 높은 품질로 보냅니다(블루투스 기본 음악 코덱인 SBC나 AAC 같은 코덱, 44.1 또는 48 kHz 스테레오). **마이크 채널이 없습니다.**
- **HFP**(핸즈프리 프로필, Hands-Free Profile)는 *양방향* 통화 링크입니다. 음성은 **SCO** 링크(동기 연결 지향, synchronous connection-oriented. **eSCO**는 그 확장형)로 오갑니다. 무선 위에 예약한 고정 시간 슬롯으로, 시분할 버스의 전용 채널과 비슷합니다. 슬롯이 작아서 음성 코덱이 목소리를 압축해 넣습니다.

| HFP 코덱 | 도입 버전 | 샘플링 레이트 | 대략의 오디오 대역폭 | 분류 |
|---|---|---|---|---|
| CVSD(연속 가변 기울기 델타 변조, continuously variable slope delta modulation) | 최초의 HFP | 8 kHz | 약 3.4–4 kHz까지 | 협대역(narrowband) |
| mSBC(변형 서브밴드 코덱, modified sub-band codec) | HFP 1.6 | 16 kHz | 50 Hz–7 kHz[P] | 광대역(wideband) |
| LC3-SWB(저복잡도 통신 코덱 초광대역, Low Complexity Communication Codec super-wideband) | HFP 1.9 | 32 kHz, 7.5 ms 프레임[F] | 50 Hz–14 kHz[P] | 초광대역(super-wideband) |
| LC3를 쓰는 LE 오디오(HFP가 아닌 별도 시스템) | 안드로이드 13 이상 | 마이크 수음 최대 32 kHz[F] | 약 14–16 kHz까지 | 초광대역 |

- **출처.** 32 kHz와 7.5 ms는 HFP 1.9 규격을 인용한 [Espressif의 HFP 헤더 파일](https://github.com/espressif/esp-idf/blob/master/components/bt/host/bluedroid/api/include/api/esp_hf_defs.h)에서 가져왔습니다. 대역폭은 우리 조사 노트에 있는 언론 출처에서 왔습니다.
- **LE 오디오.** 안드로이드 가이드는 LC3가 "기본 오디오 코덱이며 A2DP(미디어)에 쓰이던 SBC 코덱과 HFP(음성)의 mSBC를 대체한다(is the default audio codec and replaces the SBC codec used for A2DP (media) and mSBC in HFP (voice))"고, "BLE 오디오에서는 입력과 출력 샘플링이 32 kHz에 이를 수 있다(with BLE Audio, input and output sampling can reach 32 kHz)"고 씁니다[F] ([안드로이드](https://developer.android.com/develop/connectivity/bluetooth/ble-audio/overview)). 갤럭시 버즈3 프로(Galaxy Buds3 Pro)는 LE 오디오를 지원합니다[P]. 저장소에서 앞서 쓴 저가 QCY 이어버드는 아마 협대역 마이크의 클래식 HFP일 것입니다[미검증].
- **어떤 코덱인가?** 코덱은 휴대폰과 헤드셋이 협상해 정합니다. 앱에 이를 알려 주는 공개 API는 찾지 못했으므로[공백], 스펙트럼을 보고 읽어 냅니다(실습).

### 3.2 마이크가 열리면 음악 소리가 나빠지는 이유

앱이 클래식 블루투스 헤드셋의 마이크를 열면, 휴대폰은 헤드셋을 A2DP에서 HFP로 전환합니다. 이제 재생도 같은 좁은 음성 링크를 함께 씁니다. 모노, 8 또는 16 kHz, 음성 코덱입니다. 음악이 갑자기 전화 통화처럼 들립니다. 안드로이드 가이드도 분명히 말합니다. "클래식 블루투스는 블루투스 마이크를 쓸 때 오디오 품질을 낮춘다(Bluetooth classic lowers audio quality when using Bluetooth microphones)"[F]. LE 오디오는 이 문제를 대부분 피합니다. 우리에게는 이런 뜻입니다. 녹음이 헤드셋 마이크를 잡고 있는 동안에는 시작음과 종료음도 음성 링크로 재생됩니다. 그것은 괜찮고, 녹음하지 않을 때 마이크를 열어 두지 말아야 할 이유가 하나 더 생깁니다.

### 3.3 지연, 그리고 그것이 타임스탬프에 중요한 이유

- **지연의 크기.** 블루투스 마이크 경로는 대략 **20–150 ms**의 지연을 더하며, 우리 기기로는 측정하지 않았습니다[E]. 보고된 수치는 HFP 약 40 ms[P], 최적화된 LE 오디오 링크 20–30 ms 대 클래식 블루투스 "보통 100 ms(typically 100ms)"[P]입니다([architecture_security_legal_trust.md](../../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md) 3절 참고). 소프트웨어는 이 지연을 보지 못합니다. `AudioRecord.getTimestamp()`는 샘플 프레임을 부팅 시계(boot clock)에 대응시키지만 "구현이 모르는 지연은 반영할 수 없다(cannot account for any delay unknown to the implementation)"[F]. 헤드셋 내부 지연이 바로 그런 미지의 지연입니다.
- **수치로 보기.** 120 ms 오프셋은 30 fps 영상에서 3.6프레임(프레임당 33 ms)입니다. "전사문 한 줄을 눌러 재생하기"에서는 티가 나지 않습니다. 음성을 로봇 로그나 영상과 ±50 ms로 맞출 때는 티가 나므로, 경로를 기록하고 헤드셋 모델마다 한 번 보정해야 합니다.
- **누르고 말하기(PTT, push-to-talk).** 사용자가 시각 t에 버튼을 놓을 때, 마지막 20–150 ms의 음성은 아직 무선 링크 안에 있습니다. 버튼을 놓은 뒤에도 짧게 더 녹음하세요(post-roll). 200 ms 이상이 무난한 출발점입니다[H].
- **연결 준비 시간.** 예전 `startBluetoothSco()` 메서드에 대한 안드로이드 문서는 링크 설정이 "몇 초 걸릴 수 있다(can take several seconds)"고 경고합니다[F]. 헤드셋이 HFP로 바뀌는 동안 메모의 첫 단어를 잃을 수 있고, 이는 2초 안에 녹음을 시작한다는 목표에 중요합니다.

### 3.4 안드로이드 라우팅(routing), 개념 수준으로

- `AudioManager.setCommunicationDevice(device)`(API 레벨 31, 즉 안드로이드 12)는 통신에 쓸 기기를 안드로이드에 알려 줍니다. *출력* 기기, 즉 헤드셋을 넘기면 "짝이 맞는 입력 기기는 플랫폼이 자동으로 고른다(the matching source device is selected automatically by the platform)"[F]. 이 API는 API 레벨 34(안드로이드 14)부터 지원 중단(deprecated)된 `startBluetoothSco()`를 대체합니다[F]. 다 쓰면 `clearCommunicationDevice()`를 호출합니다.
- `AudioRecord.setPreferredDevice(device)`는 특정 입력을 요청합니다. 선호일 뿐이며, 사용자의 시스템 설정이 이를 덮어쓸 수 있습니다[F].
- `AudioRecord.getRoutedDevice()`는 녹음 중에 실제로 쓰이는 입력을 알려 줍니다. 예를 들어 `TYPE_BUILTIN_MIC`, `TYPE_BLUETOOTH_SCO`, `TYPE_BLE_HEADSET`입니다[F]. **요청한 것이 아니라 이것을 기록하세요.**
- 헤드셋 자체의 잡음 억제는 헤드셋 펌웨어 안에서 돕니다. 안드로이드 설정은 거기에 닿지 않습니다.

## 4. 안드로이드 수음 경로

### 4.1 AudioRecord와 오디오 소스

- **AudioRecord.** 이 클래스는 앱에 원시 PCM 샘플을 버퍼 단위로 넘겨 줍니다. DAQ 드라이버의 버퍼를 읽는 것과 비슷합니다. PCM(펄스 부호 변조, pulse-code modulation)은 샘플 값을 그대로 늘어놓은 것입니다([강의 02](02-digital-audio.md) 3절).
- **오디오 소스.** 앱은 `AudioRecord`를 열 때 오디오 소스를 지정합니다. 안드로이드는 이를 "기본 물리적 오디오 신호 출처이자 녹음 구성(both a default physical source of audio signal, and a recording configuration)"으로 정의합니다[F]. 어떤 마이크에, 어떤 처리를 쓸지입니다.
- **처리 블록:**
  - **AEC**(음향 반향 제거)는 마이크가 들은 소리에서 휴대폰 스피커가 재생한 소리를 빼서, 통화 상대방이 자기 목소리를 다시 듣지 않게 합니다. 적응 필터(adaptive filter)가 재생 신호를 기준으로 반향을 예측해 뺍니다.
  - **NS**(잡음 억제)는 잡음이라고 판단한 것을 프레임별, 대역별로 줄입니다([강의 07](07-speech-diarization-av.md) 1절).
  - **AGC**(자동 이득 제어)는 조용할 때 게인을 올리고 시끄러울 때 내려 레벨을 일정하게 유지합니다([강의 04](04-audio-engineering-practice.md) 1절). 말 사이 쉼마다 잡음도 키웁니다.

| 소스 | 안드로이드의 설명[F] | 적용될 수 있는 처리 | 우리의 용도 |
|---|---|---|---|
| `MIC` / `DEFAULT` | "마이크 오디오 소스(Microphone audio source)" | 제조사가 튜닝한 대로, 명시 없음 | 기준선으로만 |
| `CAMCORDER` | "영상 녹화용으로 튜닝되며, 가능하면 카메라와 같은 방향(tuned for video recording, with the same orientation as the camera if available)" | 흔히 스테레오, 바람 필터, AGC[E] | 안 씀. 다른 앱이 쓰는 동안 우리 수음은 무음 처리됨[F] |
| `VOICE_RECOGNITION` | "음성 인식용으로 튜닝(tuned for voice recognition)" | CDD상 NS와 AGC가 기본으로 꺼짐[F] | **ASR 기본값** |
| `VOICE_COMMUNICATION` | "VoIP 같은 음성 통신용으로 튜닝(tuned for voice communications such as VoIP)"(인터넷 통화), "가능하면 반향 제거나 자동 이득 제어(echo cancellation or automatic gain control if available)" 사용 | AEC, NS, AGC | 비교 실험용으로만. 통화 경로임 |
| `UNPROCESSED` | "가능하면 처리하지 않은(원시) 소리용으로 튜닝되고, 아니면 DEFAULT처럼 동작(tuned for unprocessed (raw) sound if available, behaves like DEFAULT otherwise)" | 지원되는 경우 레벨 배율기(level multiplier) 외에는 없음(CDD)[F] | **지원되면 가장 좋은 원시 경로** |

### 4.2 CDD가 요구하는 것

**CDD**는 휴대폰 제조사가 구글 안드로이드를 출시하려면 충족해야 하는 규칙집입니다. MUST는 반드시 지킬 규칙이고, SHOULD는 권고이며, STRONGLY RECOMMENDED는 나중에 MUST가 될 수 있는 권고입니다. 그러니 SHOULD 항목은 "잘 만든 휴대폰이라면 이렇게 한다"로 보고, 우리 휴대폰은 직접 재야 합니다. 우리가 읽은 것은 안드로이드 17 CDD(최종 수정 2026-08-31)이며, 사용자의 S25는 2026-11-03 테스트에서 안드로이드 17이었습니다([technical-decisions.md](../../../products/voice-life-companion/technical-decisions.md) 4.4절).

**`VOICE_RECOGNITION`**(5.4.2절)[F]:
- 44.1 kHz나 48 kHz 중 하나로 수음해야 합니다(MUST).
- 기본 설정에서 모든 잡음 감소와 모든 자동 이득 제어를 꺼야 합니다(MUST).
- 100 Hz에서 4 kHz까지 ±3 dB 안으로 평탄해야 합니다(SHOULD). 그 대역 밖의 강력 권고 허용치는 느슨합니다. 30–100 Hz는 ±20 dB, **4–22 kHz는 ±30 dB**입니다. 그래서 "s" 소리의 상당 부분이 사는 4 kHz 위 영역은 거의 규정되어 있지 않습니다.
- 90 dB SPL에서 RMS 2500을 내고(계산 예 1), 72–102 dB SPL에서 레벨을 선형으로 따라가며, 90 dB SPL에서 THD 1% 미만이어야 합니다(SHOULD).
- 휴대폰에 음성 인식용으로 튜닝된 잡음 억제가 있다면, `NoiseSuppressor` API로 제어할 수 있어야 합니다(MUST).

**`UNPROCESSED`**(5.11절)[F]는 선택 사항입니다. 이를 제공하는 휴대폰은 `AudioManager.getProperty(PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED)`로 지원을 알려야 합니다(MUST). 100 Hz에서 7 kHz까지 ±10 dB 안으로 평탄하고, 94 dB SPL에서 RMS 520(−36 dBFS)을 내며, SNR이 60 dB 이상이어야 합니다(MUST). 그리고 레벨 배율기 외에는 "다른 어떤 신호 처리(예: 자동 이득 제어, 고역 통과 필터, 반향 제거)(any other signal processing (e.g. Automatic Gain Control, High Pass Filter, or Echo cancellation))"도 있어서는 안 됩니다(MUST NOT).

**여러 앱이 동시에 녹음할 때**(5.4.5절)[F]. 다른 앱이 `VOICE_COMMUNICATION`(통화)이나 `CAMCORDER`(영상)로 수음하는 동안, 우리 수음은 무음 처리됩니다. `AudioRecordingConfiguration.isClientSilenced()`가 이를 알려 주므로[F], 앱은 무음을 메모인 것처럼 저장하는 대신 그 세그먼트에 표시를 할 수 있습니다.

### 4.3 기본 48 kHz, 리샘플링, 오디오 효과

- **다운샘플링(downsampling).** 휴대폰 마이크 하드웨어는 보통 48 kHz로 동작하고[E], CDD는 `VOICE_RECOGNITION`을 44.1 또는 48 kHz로 요구합니다[F]. `AudioRecord`에 16 kHz를 요청하면 안드로이드가 리샘플링하며, CDD는 다운샘플링할 때 "적절한 앤티 에일리어싱 필터(an appropriate anti-aliasing filter)"를 요구합니다[F]. 리샘플링이 왜 필터링 문제인지는 [강의 02](02-digital-audio.md) 1절에서 설명했습니다.
- **업샘플링(upsampling).** 협대역 블루투스 경로는 반대 방향입니다. 링크는 8 kHz를 보내고, 앱은 그것을 요청한 16 kHz로 받습니다[E]. 파일 헤더는 16 kHz라고 하지만 내용은 4 kHz에서 끝납니다. **헤더는 샘플링 레이트를 알려 줄 뿐, 대역폭은 알려 주지 않습니다.**
- **오디오 효과.** `NoiseSuppressor`, `AcousticEchoCanceler`, `AutomaticGainControl`(`android.media.audiofx` 패키지)은 녹음기의 오디오 세션에 붙일 수 있고, 각각 `isAvailable()` 확인 메서드가 있습니다. 안드로이드는 "일부 기기에서는 사용한 MediaRecorder.AudioSource에 따라 플랫폼이 수음 경로에 NS를 기본으로 넣을 수 있다(on some devices, NS can be inserted by default in the capture path by the platform according to the MediaRecorder.AudioSource used)"고 경고하며, 앱이 켜짐 상태를 확인하라고 합니다[F]. 그래서 세그먼트마다 소스와 각 효과가 켜져 있었는지(`getEnabled()`)를 기록해야 합니다.

### 4.4 ASR이 가장 덜 처리된 경로를 원하는 이유

- **모델이 아니라 귀에 맞춘 튜닝.** 휴대폰의 NS와 AGC는 통화하는 *사람의 귀*에 맞춰 튜닝되어 있습니다. 듣는 사람에게 필요 없는 것을 지우고, 레벨 변화와 처리 잡음을 더합니다. 최신 ASR 모델은 잡음 섞인 음성으로 학습했기 때문에 일정한 잡음은 견딥니다. 한 번도 본 적 없는 처리 잡음은 잘 견디지 못합니다. 2025년 12월 연구에서는 Whisper, Parakeet 등의 앞에 음성 향상기(speech enhancer)를 두자 시험한 40개 조합 모두에서 오류율이 나빠졌습니다[P] (조사 노트 Q4).
- **그래서:** 가장 좋은 마이크가 먼저이고, 다음이 가장 덜 처리된 경로(`UNPROCESSED`, 없으면 `VOICE_RECOGNITION`)이며, 잡음 제거는 하더라도 검증된 선택지로만 씁니다. 이 논쟁은 [강의 11](11-noise-reduction.md)에서 다룹니다.

## 5. 음성용 파일 형식

코덱, 컨테이너(container), 무손실과 손실 압축은 [강의 02](02-digital-audio.md) 3절에서 설명했습니다.

| 형식 | 무손실? | 대표적인 음성 설정 | 만나는 곳 | ASR 관점 메모 |
|---|---|---|---|---|
| PCM WAV | 예 | 16 kHz, 16비트, 모노 | 우리 세그먼트, ASR 도구 | 단순하고 정확하지만 큼: 44바이트 헤더 뒤에 샘플 |
| FLAC | 예 | 같은 설정, 흔히 절반 이하 크기 | 보관용, 데이터셋 | 비트 단위로 동일(bit-exact), 장기 보관에 좋음 |
| Ogg(.opus, .ogg)나 WebM 안의 Opus | 아니요 | 음성은 16–32 kbit/s, 6–510 kbit/s 가능[F] | 메신저, 브라우저, 웹 통화 | 협대역(4 kHz)부터 전대역(fullband, 20 kHz)까지의 모드[F]. ffmpeg는 48 kHz로 디코딩하므로 원본이 16 kHz여도 ffprobe는 48000이라고 표시(직접 확인) |
| m4a나 mp4 안의 AAC | 아니요 | 44.1 또는 48 kHz에서 64–128 kbit/s | 휴대폰 녹음 앱, 영상 | 이 비트레이트에서는 영향이 작음[E] |
| AMR-NB / AMR-WB(.amr, .3gp) | 아니요 | 8 kHz에서 4.75–12.2 kbit/s / 16 kHz에서 6.6–23.85 kbit/s[F] | 이동 통신 통화, 옛 녹음기 | AMR-NB는 전화 음질이므로 피할 것 |
| MP3 | 아니요 | 64–128 kbit/s | 어디서나 | 이 비트레이트에서는 괜찮음, 반복 재인코딩은 피할 것 |

출처: [RFC 6716](https://www.rfc-editor.org/rfc/rfc6716)(Opus), [RFC 4867](https://www.rfc-editor.org/rfc/rfc4867)(AMR).

**샘플링 레이트와 그 출신:** 8 kHz(전화, CVSD), 16 kHz(광대역 음성, mSBC, ASR 표준), 32 kHz(LC3 초광대역), 44.1 kHz(CD), 48 kHz(휴대폰 하드웨어, 영상). 대역폭은 레이트의 절반을 넘지 못합니다. **모노냐 스테레오냐:** 음성 인식은 채널 하나를 쓰고, 휴대폰의 스테레오 녹음은 음악에서 말하는 "왼쪽과 오른쪽"이 아니라 마이크 두 개입니다.

**계산 예 4: 데이터 레이트(data rate).**
- 16 kHz × 16비트 × 1채널 = 256,000 bit/s = 256 kbit/s = 초당 32,000바이트이므로 **분당 1.92 MB**입니다. 30초 세그먼트는 960,000바이트에 44바이트 헤더가 붙습니다.
- 48 kHz 16비트 모노는 그 세 배인 분당 5.76 MB입니다. 24 kbit/s Opus는 분당 0.18 MB로, 16 kHz WAV의 10분의 1입니다.
- 하루 한 시간 분량의 메모를 16 kHz WAV로 90일(`standard` 보존 등급) 보관하면 1.92 × 60 × 90 ≈ 10.4 GB입니다.

**ASR 모델이 기대하는 것: 16 kHz, 모노, 부동소수점.**
- Whisper의 로더는 ffmpeg에 정확히 그것(`-ac 1 -ar 16000`)을 요청한 뒤, 16비트 정수를 32768로 나눠 [−1, 1) 범위의 실수로 만듭니다[F] ([audio.py](https://github.com/openai/whisper/blob/main/whisper/audio.py)). 스펙트로그램은 10 ms마다 25 ms 창(window)을 씁니다.
- faster-whisper는 어떤 파일이든 디코딩해 16 kHz 모노로 리샘플링합니다[F]. Parakeet 모델 카드는 "16kHz" "모노 채널 오디오(Monochannel audio)"를 요구합니다[V].
- 16 kHz를 가정하는 모델에 48 kHz 배열을 넘기면, 모델은 음성을 세 배 느리고 약 한 옥타브 반 낮게 듣습니다. 알아들을 수 없는 소리가 됩니다. 샘플링 레이트는 샘플과 함께 다녀야 합니다.

**계산 예 5: 협대역이 지우는 것.**
- Whisper는 16 kHz 오디오를 0–8 kHz의 멜 대역(mel band) 80개로 바꿉니다([강의 03](03-spectral-analysis.md) 4절, large-v3는 128개). librosa로 대역 중심을 계산하면 80개 중 18개(128개 중 28개)가 4 kHz 위에 있습니다. CVSD 오디오에서는 모델 입력의 약 5분의 1이 비어 있는 셈입니다.
- 그 대역들은 쉬익거리는 자음인 **마찰음(fricative)**의 상당 부분을 담습니다. s, sh, f, 그리고 한국어 ㅅ, ㅆ, ㅊ입니다. 8 kHz 오디오를 16 kHz로 업샘플링해도 이 대역은 채워지지 않고, 파일 모양만 맞춰질 뿐입니다.
- 낮은 비트레이트도 해롭습니다. 아마존 연구(2020년, 방 건너편 마이크를 위한 LSTM 모델. LSTM은 [강의 07](07-speech-diarization-av.md) 1절에서 본 것과 같은 순환 신경망)에서 Opus는 비압축 오디오 대비 WER을 8 kbit/s에서 202%, 16 kbit/s에서 12.6%, 32 kbit/s에서 6.6% 상대적으로 높였습니다[P] ([논문](https://arxiv.org/abs/2002.00122)). 최신 모델은 더 견딜 수도 있지만, 그것에 기대지는 않습니다.

## 6. 견고한 정규화 파이프라인: 어떤 마이크의 어떤 파일이든

서버는 우리 WAV 세그먼트뿐 아니라 나중에는 가져온 파일도 보게 됩니다. 영상, 메신저 음성 메시지, 다른 녹음기의 파일입니다. 파이프라인 하나가 이 모두를 몰래 망가뜨리지 않으면서 모델이 원하는 형태로 바꿔야 합니다.

1. **원본은 손대지 않습니다.** SHA-256 해시로 저장하고(`sha256sum file`), 모든 파생 파일에 원본 해시를 기록합니다. 우리 [아키텍처 노트](../../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md) 5절도 증거에 대해 같은 규칙을 둡니다.
2. **조사하고, 그 결과를 파일 옆에 저장합니다:**
   ```bash
   ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,bit_rate:format=format_name,duration -of default=noprint_wrappers=1 in.m4a
   ```
   헤더는 구조에 대해서만 믿고 내용에 대해서는 믿지 마세요. Opus 파일은 48000 Hz로 표시되고, 협대역 블루투스 수음은 16 kHz로 표시될 수 있습니다.
3. **변환하기 전에 채널, 클리핑, DC 오프셋을 확인합니다.** **DC 오프셋(DC offset)**은 파형 전체가 0에서 일정하게 비켜나 있는 것으로, 대개 ADC의 미세한 불균형에서 옵니다. 헤드룸을 낭비하고, 오디오를 자르는 곳마다 딸깍 소리를 냅니다.
   ```python
   import sys, numpy as np, soundfile as sf
   x, fs = sf.read(sys.argv[1], always_2d=True)   # keep the native rate and every channel
   print(f"{fs} Hz, {x.shape[1]} ch, {len(x)/fs:.1f} s")
   for c, ch in enumerate(x.T):
       clipped = np.mean(np.abs(ch) >= 0.999)      # share of samples at full scale
       print(f"ch{c}: peak {20*np.log10(np.max(np.abs(ch))+1e-12):.1f} dBFS, "
             f"DC {np.mean(ch):+.4f}, clipped {100*clipped:.3f} %")
   if x.shape[1] == 2:
       r = np.corrcoef(x[:, 0], x[:, 1])[0, 1]     # near -1 means one channel is inverted
       print(f"L/R correlation {r:+.2f}", "-> do NOT average; pick one channel" if r < 0 else "")
   ```
   ffmpeg의 `astats` 필터(`ffmpeg -i in.wav -af astats -f null -`)도 같은 것을 알려 줍니다. 피크 레벨, DC 오프셋, 그리고 클리핑된 샘플이 연달아 있을수록 커지는 "Flat factor"입니다.
4. **다운믹스하기 전에 채널을 고릅니다.** 채널 평균(ffmpeg의 `-ac 1`은 (L + R)/2를 계산)은 두 채널이 같은 신호를 담을 때만 안전합니다.
   - **극성 반전(polarity inversion).** 한 채널의 신호가 뒤집혀 있으면(잘못 배선된 마이크나 어떤 처리 체인) L = s, R = −s이므로 (L + R)/2 = 0이 되어 음성이 사라집니다. 직접 시험해 보니 `-ac 1`이 그런 파일을 완전한 무음으로 만들었습니다.
   - **콤 필터링(comb filtering).** 입에서 거리가 다른 두 마이크는 같은 음성을 시간차 τ를 두고 녹음합니다. 둘의 평균은 **콤 필터**이며, m = 0, 1, 2…에 대해 f = (2m + 1)/(2τ)에 노치(notch, 깊게 파인 곳)가 생깁니다. **계산 예 6:** 경로 차가 10 cm면 τ = 0.10/343 = 0.29 ms이고 1.7 kHz, 5.1 kHz… 에 노치가 생깁니다. 음성 대역 한가운데서 텅 빈 소리가 납니다.
   - 그래서 상관계수가 음수이거나 채널이 서로 다른 마이크라면 더 나은 채널 하나를 남깁니다. `-af "pan=mono|c0=c0"`는 첫 채널을 남깁니다.
5. **제대로 변환하고 리샘플링합니다:**
   ```bash
   ffmpeg -i in.m4a -af aresample=resampler=soxr -ac 1 -ar 16000 -c:a pcm_s16le out_16k.wav
   ```
   - `soxr`는 많은 ffmpeg 빌드에 들어 있는 고품질 리샘플러입니다(`ffmpeg -hide_banner -buildconf | grep soxr`로 확인). 없으면 `-af` 부분을 빼세요. 기본 리샘플러도 제대로 된 필터입니다. 샘플을 버리는 방식으로 리샘플링하면 절대 안 됩니다([강의 02](02-digital-audio.md) 1절). 파이썬에서는 `librosa.load(path)`가 조용히 **22,050 Hz**로 리샘플링하고 채널을 평균합니다. 레이트를 유지하려면 `sr=None`, 아니면 `sr=16000`을 넘기고, 채널을 살펴보려면 `mono=False`를 넘기세요.
6. **약 80 Hz에서 고역 통과 필터**를 걸어 DC와 웅웅거림을 없앱니다. 지하철 소음은 100 Hz 아래에 몰려 있습니다[P]. 이것은 거의 언제나 안전한 유일한 필터입니다.
7. **레벨은 움직이지 않는 상수 게인 하나로 맞춥니다.** *피크 정규화(peak normalisation)*는 가장 높은 피크가 예컨대 −1 dBFS에 오도록 파일을 배율 조정합니다. *라우드니스 정규화(loudness normalisation)*는 −23 LUFS 같은 목표 라우드니스로 맞춥니다([강의 02](02-digital-audio.md) 5절). 둘 다 상수 게인 하나이며, ASR 모델은 다양한 레벨의 녹음으로 학습되므로 상수 게인은 거의 상관없습니다[E]. 컴프레서(compressor), 리미터(limiter), AGC는 시간에 따라 게인을 바꾸므로 피합니다. 중간 파일은 부동소수점(`-c:a pcm_f32le`)으로 두어 게인 단계에서 절대 클리핑되지 않게 합니다.
8. **무음 잘라내기는 조심해서 하거나, 아예 하지 않습니다.** **VAD**(음성 활동 검출기, voice activity detector)는 프레임마다 음성이 있는지 판단하는데, 큰 소음 속에서는 VAD가 잘못 판단합니다. 한 연구에서는 Silero VAD v5가 순수 잡음 클립의 61%만 맞게 분류했습니다[P]. 잘라내기는 단어의 시작과 끝을 자를 수도 있고 타임스탬프를 밀어 버립니다. 오디오는 그대로 두고 ASR 단계가 음성 없는 구간을 표시하게 하는 편이 낫습니다. 잘라낸다면 오프셋 대응표를 저장하세요.
9. **모든 것을 기록합니다:** 원본 해시, ffprobe 출력, 경로, 소스와 효과(우리 세그먼트의 경우), 도구 버전을 포함한 모든 변환 명령, 각 파생 파일의 해시.

## 7. 우리 앱에서

이번 강의가 [MVP 요구사항](../../../products/industrial-voice-logging/mvp-requirements.md)에 어떻게 대응하는지:

- **세그먼트(A3).** 16 kHz 모노 16비트 PCM WAV, 하나에 최대 30초. 계산 예 4가 "분당 약 1.9 MB"라는 수치를 확인해 줍니다. WAV는 무손실이므로 사슬의 6단계에서는 잃는 것이 없습니다.
- **세그먼트별 경로(A3).** 최소한 `getRoutedDevice()`의 유형과 제품명, 오디오 소스, 요청한 샘플링 레이트와 실제로 받은 레이트, NS·AEC·AGC가 켜져 있었는지, 활성 마이크, 그리고 `isClientSilenced()` 구간을 기록합니다. 경로가 바뀌면 세그먼트를 닫고 새로 열어, 한 파일에 두 마이크가 섞이지 않게 합니다[H].
- **오디오 소스.** 요구사항은 아직 이를 정하지 않았고, 조사 노트 Q4는 시험을 요청합니다. 제안: `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED`가 지원한다고 하면 `UNPROCESSED`, 아니면 `VOICE_RECOGNITION`. `VOICE_COMMUNICATION`은 통화 처리가 오류율에 어떤 영향을 주는지 재는 시험용으로만 녹음합니다.
- **지하철에서 이어버드 대 휴대폰 마이크.** 링크가 적어도 광대역이라면 이어버드가 SNR을 약 9 dB 얻습니다(계산 예 2). 협대역 CVSD 링크는 4 kHz 위를 모두 버리므로 SNR 이득보다 더 많이 잃을 수 있고, 이어버드 펌웨어의 잡음 제거는 우리가 끌 수 없는 전처리(front end)입니다. 그래서 소음 지하철 세트는 두 가지를 모두 녹음합니다.
- **85 dBA 이상.** 30 cm 거리의 휴대폰은 SNR 약 −7 dB로 쓸 수 없습니다. 청력 보호구를 겸하는 근접 붐 헤드셋(계산 예 2와 3)을 누르고 말하기와 함께 쓰는 것을 계획합니다.
- **시각(A8).** 블루투스는 20–150 ms의 알 수 없는 오프셋을 더하며, 경로 기록이 어떤 세그먼트에 그 오프셋이 있는지 서버에 알려 줍니다. PTT 버튼을 놓은 뒤 짧은 추가 녹음(post-roll)을 둡니다.
- **신호음(A4).** 시작음과 종료음은 현재 경로를 따르며 절대 스피커를 강제하지 않습니다. 블루투스 헤드셋에서는 HFP 링크로 재생됩니다. 시작음은 수음을 시작하기 전에 재생하거나 그 시각을 기록해, 전사되지 않게 합니다.

**첫 주에 측정할 것**(요구사항 3.3절과 함께):
1. **S25의 기능.** `UNPROCESSED`를 지원하는가? `getMicrophones()`와 `MicrophoneInfo`는 무엇을 보고하는가(감도, 최대 SPL)? 소스마다 어떤 효과를 쓸 수 있고, 어떤 효과가 기본으로 켜져 있는가?
2. **지하철 세트의 경로별 품질.** `VOICE_RECOGNITION`, `UNPROCESSED`, `VOICE_COMMUNICATION`으로 녹음한 휴대폰 마이크와 이어버드 각각에 대해: 대역폭(실습 스크립트의 대역 레벨), 추정 SNR, 클리핑된 샘플, 그리고 경로와 환경 태그별 **CER**(문자 오류율, character error rate: 한국어의 일반적인 점수)(S-3).
3. **레벨 보정(calibration).** 같은 일정한 소리에 대해 휴대폰 SPL 앱의 측정값과 파일의 dBFS를 적어 둡니다. 이것으로 dBFS를 dB SPL로 되돌려 대응시키고, 계산 예 1의 헤드룸을 확인합니다.
4. **블루투스 연결 시간과 오프셋.** 헤드셋 경로를 요청한 때부터 무음이 아닌 첫 버퍼까지의 시간. 헤드셋별 지연 보정은 나중에 하며, 반드시 선택된 출력을 쓰고 스피커를 강제해서는 안 됩니다.
5. **48 kHz 비교군(결정이 아니라 제안).** 조사 노트는 경로가 16 kHz보다 높게 지원할 때 가장 좋은 원시 스트림을 보관하자고 제안합니다[H]. 48 kHz로 몇 개 녹음해 서버에서 다운샘플링해 보면 CER이 달라지는지 알 수 있습니다. 사용자가 달리 정하지 않는 한 MVP는 16 kHz를 유지합니다.

## 읽거나 볼 자료

- Android, *Compatibility Definition Document*(호환성 정의 문서, 안드로이드 17), 5.4절 "Audio Recording"과 5.11절 "Capture for Unprocessed": https://source.android.com/docs/compatibility/17/android-17-cdd
- Android Developers, `MediaRecorder.AudioSource` 레퍼런스(소스 프리셋): https://developer.android.com/reference/android/media/MediaRecorder.AudioSource, 그리고 `NoiseSuppressor`(효과를 붙이는 법과 확인하는 법): https://developer.android.com/reference/android/media/audiofx/NoiseSuppressor
- Android Developers, *Bluetooth Low Energy Audio overview*(저전력 블루투스 오디오 개요: LC3, 32 kHz 수음, `setCommunicationDevice`): https://developer.android.com/develop/connectivity/bluetooth/ble-audio/overview
- Android Developers(영상), *Supporting BLE Audio in your voice communication applications*(음성 통신 앱에서 BLE 오디오 지원하기): https://www.youtube.com/watch?v=cXl9fUyW6FM
- TDK InvenSense(영상, 업체 자료), *Digital MEMS Microphones Explainer*(디지털 MEMS 마이크 설명): https://www.youtube.com/watch?v=MzolAmXYf90
- FFmpeg 문서, *ffprobe*와 soxr를 포함한 *resampler* 옵션: https://ffmpeg.org/ffprobe.html, https://ffmpeg.org/ffmpeg-resampler.html
- OpenAI Whisper, `audio.py`: ASR 모델이 무엇을 기대하는지(16 kHz 모노 부동소수점, 로그 멜) 정확히 보여 주는 짧은 파일: https://github.com/openai/whisper/blob/main/whisper/audio.py
- Khare, Sundaram, Wu(아마존, 2020), *Multi-channel acoustic modeling using mixed bitrate Opus compression*(혼합 비트레이트 Opus 압축을 이용한 다채널 음향 모델링) *(논문)*. 표 1에 비트레이트별 WER이 있습니다: https://arxiv.org/abs/2002.00122

## 실습 (1시간)

목표: 데이터에서 경로를 직접 봅니다. 학습용 가상환경을 씁니다(`source ~/audio-learn/bin/activate`. [커리큘럼 README](README.md) 참고).

1. **녹음.** s 소리가 많은 한국어와 영어 문장 하나를 고릅니다. 예: "세 시 삼십 분, 3번 펌프 압력 센서 점검. Check the pressure sensor on pump three." 지하철에서, 또는 집에서 *별도의* 기기로 잡음을 휴대폰 SPL 앱 기준 약 75 dBA로 틀어 놓고 말합니다. 두 번 녹음합니다. (a) 휴대폰 마이크로, 휴대폰은 약 30 cm 거리에. (b) 이어버드로, 블루투스 마이크를 고를 수 있는 녹음 앱에서. 파일 이름에 경로를 넣습니다(`phone.m4a`, `buds.m4a`).
2. **파일은 로컬에만 둡니다.** 저장소 밖의 폴더, 예를 들어 `~/recordings/lecture10/`에 복사합니다. 녹음 파일은 절대 커밋하지 않습니다.
3. 6절의 ffprobe 명령으로 두 파일을 **조사**하고 코덱, 샘플링 레이트, 채널 수를 적습니다. 파이썬용으로 *원래 레이트 그대로* WAV로 변환합니다: `ffmpeg -i phone.m4a -c:a pcm_s16le phone.wav`(`-ar` 없이).
4. **스펙트로그램 비교:** `ffmpeg -i buds.wav -lavfi showspectrumpic=s=1024x512:legend=1 buds.png`. 협대역 링크는 약 4 kHz(CVSD), 광대역 링크는 약 8 kHz(mSBC), LE 오디오나 LC3-SWB는 약 16 kHz에서 평평한 천장을 보입니다. 48 kHz로 녹음한 휴대폰 마이크는 20 kHz까지 갈 수도 있습니다.
5. 아래 스크립트로 **SNR과 대역폭을 추정**합니다: `python snr_bw.py phone.wav`. 20 ms 프레임 중 가장 조용한 20%를 잡음으로, 가장 시끄러운 10%를 음성과 잡음의 합으로 봅니다. SNR을 아는 합성 시험 파일에서는 약 3 dB 이내로 읽었습니다. 경로를 비교하기에는 충분하지만 절대 측정은 아닙니다. 0.3–3 kHz 레벨보다 약 40 dB 넘게 낮은 대역은 비어 있는 것이고, 경로가 그 대역을 잘라 낸 것입니다.
   ```python
   import sys, numpy as np, soundfile as sf, scipy.signal as sg
   x, fs = sf.read(sys.argv[1], always_2d=True); x = x[:, 0]           # first channel, native rate
   x = sg.sosfilt(sg.butter(4, 80, "highpass", fs=fs, output="sos"), x)  # drop DC and rumble < 80 Hz
   # 1) SNR from 20 ms frame powers: quiet frames = pauses (noise), loud frames = speech + noise
   hop = int(0.02 * fs); n = len(x) // hop
   p = np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12
   p_noise, p_loud = np.percentile(p, 20), np.percentile(p, 90)
   print(f"estimated SNR {10 * np.log10(max(p_loud - p_noise, 1e-12) / p_noise):.1f} dB")
   # 2) Bandwidth: average level of each band relative to the 0.3-3 kHz speech core
   f, P = sg.welch(x, fs, nperseg=1024)
   level = lambda lo, hi: 10 * np.log10(P[(f >= lo) & (f < hi)].mean() + 1e-20)
   for lo, hi in [(4500, 7000), (8500, 14000), (16500, 20000)]:
       if hi <= fs / 2:
           print(f"{lo/1000:g}-{hi/1000:g} kHz: {level(lo, hi) - level(300, 3000):6.1f} dB")
   ```
6. 어느 경로의 SNR이 더 높았는지, 어느 경로의 대역폭이 더 넓었는지, 어느 쪽이 더 잘 전사될 것으로 예상하는지와 그 이유를 **적어 둡니다**. 이 메모는 보관하세요. ASR 비교 평가(bake-off)가 여러분의 예측을 확인해 줄 것입니다.
