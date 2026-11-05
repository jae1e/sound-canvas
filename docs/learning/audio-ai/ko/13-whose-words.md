# 13. 누구의 말인가? 한 화자만 받아 적기: 착용자의 목소리, 등록, 화자 분할과 음성 인식, 목표 화자 인식

> 영어 원문(English original): [13-whose-words.md](../13-whose-words.md)

**이 강의가 필요한 이유.** 우리의 현장 음성 기록 앱([MVP 요구사항](../../../products/industrial-voice-logging/mvp-requirements.md))은 휴대폰, 이어버드 또는 헤드셋으로 녹음하고, 그 오디오를 우리 자체 서버로 보내 전사(transcription, 음성을 글로 옮기는 일)합니다. 전사문은 올바른 사람의 말을 담고 있을 때에만 쓸모가 있고, 또 적법합니다.
- **법.** 한국의 통신비밀보호법에 따르면, 내가 참여하지 않은 타인 간의 대화를 녹음하는 것은 범죄이며 1–10년의 징역에 처해질 수 있습니다 [P]. 대화 참여자가 자기 대화를 녹음하는 것은 일반적으로 적법하지만, 여전히 민사 책임의 위험이 있습니다 [P].
- **정확성.** 메모에 "압력 정상"이라고 적혀 있다면, 그 말을 한 사람은 지나가던 사람이 아니라 착용자여야 합니다.
- **나중에.** 여러 사람이 참여하는 TBM(tool-box meeting, 작업 전 안전 회의) 안전 브리핑에는 각 줄마다 화자가 표시된 전사문이 필요합니다.

[강의 07](07-speech-diarization-av.md)은 *오디오* 쪽을 다뤘습니다. 화자 임베딩, 화자 분할(diarisation)과 DER, 블라인드 분리와 PIT, 목표 화자 추출, 시청각 활성 화자 검출(active speaker detection)입니다. 이번 강의는 *텍스트* 쪽을 다룹니다. 어떤 단어가 누구의 것인지, 그리고 착용자의 말만 남기는 방법입니다.

**레이블** (강의 09와 같음; 조사일 2026-11-05): [F] 1차 자료 페이지, 코드 또는 법조문에서 검증됨; [V] 업체 주장(vendor claim); [P] 논문, 언론 또는 기타 제3자; [E] 우리의 추정 또는 우리가 직접 측정한 값; [I] 우리의 추론; [H] 검증할 가설(hypothesis). 법적 내용은 우리의 [법률 조사 노트](../../../market-studies/industrial-voice-logging/research-notes/architecture_security_legal_trust.md)(7절)에서 가져왔으며 법률 자문이 아닙니다.

**이번 강의에서 만나는 용어** (각 용어는 처음 쓰이는 곳에서 다시 설명합니다):

| 용어 | 쉬운 뜻 |
|---|---|
| 착용자(wearer) | 휴대폰, 이어버드 또는 헤드셋을 지닌 사람. 메모의 주인 |
| 주변 사람(bystander) | 그 밖에 목소리가 마이크에 들어오는 모든 사람: 행인, 동료, 안내 방송 |
| PTT(push-to-talk) | 무전기처럼, 착용자가 버튼을 누르고 있거나 켜 둔 동안에만 오디오를 녹음함 |
| 활성화 세션(armed session) | 착용자가 의도적으로 시작하는 핸즈프리 녹음 구간. VAD가 녹음을 걸러 주고, 침묵이 이어지면 일시 정지함 |
| VAD(음성 구간 검출, voice activity detection) | 프레임(20 ms짜리 오디오 조각)마다 내리는 예/아니요 판정: "지금 누가 말하고 있나?" 누구인지는 말하지 않음 |
| 근접 마이크(close-talk mic) | 입에서 몇 센티미터 떨어진 마이크. 헤드셋 붐 마이크나 라발리에(lavalier) 마이크 등 |
| 근거리장 / 원거리장(near field / far field) | 근거리장: 마이크에 가까워서 거리에 따라 레벨이 빠르게 변하고 소리가 건조함(dry). 원거리장: 마이크에서 멀어서 레벨이 천천히 변하고 방의 울림이 지배함 |
| 임계 거리(critical distance) | 화자로부터의 거리 중, 직접음과 방의 울림이 같은 크기가 되는 거리 |
| DRR | 직접음 대 잔향음 비(direct-to-reverberant ratio, 강의 01): 직접음 에너지를 울림 에너지로 나눈 값, dB 단위 |
| OVD(자기 음성 감지, own-voice detection) | "지금 *착용자*가 말하고 있나?"를 성문이 아니라 기기의 센서로 판단하는 것 |
| VPU(voice pickup unit) | 착용자가 말할 때 두개골이 떨리는 것을 느끼는 이어버드 속 진동 센서(골전도, bone conduction) |
| 등록(enrolment) | 기준 임베딩을 만들기 위해 한 사람의 목소리를 한 번 녹음해 두는 것(강의 07) |
| 화자 검증(speaker verification) | "이 사람이 등록된 그 사람인가?" 임베딩을 기준과 비교해 내리는 예/아니요 판정 |
| FAR, FRR, EER | 오수락률(false-accept rate), 오거부율(false-reject rate), 그리고 둘이 같아지는 지점의 동일 오류율(equal error rate) (2c절) |
| 개인화 VAD(personal VAD) | 등록된 목소리를 조건으로 받는 VAD. 프레임마다 "아무도 아님", "등록된 사람", "다른 사람" 중 하나를 말함 |
| 화자 분할(diarisation) | "누가 언제 말했나"를 익명 레이블로 답하는 것(강의 07) |
| 음성 인식(ASR) | 자동 음성 인식(automatic speech recognition): 오디오를 넣으면 글이 나오고, 단어마다 시작과 끝 시각이 붙음. 우리 것은 자체 서버에서 돌아감([강의 12](12-speech-to-text.md)) |
| 강제 정렬(forced alignment) | 이미 알고 있는 각 단어가 시간상 어디에 있는지를 음소 또는 문자 인식기로 찾아내는 것 |
| DER | 화자 분할 오류율(diarisation error rate): 잘못 표시된 초를 전체 발화 초로 나눈 값(강의 07) |
| cpWER | 연결 최소 순열 단어 오류율(concatenated minimum-permutation word error rate): 엉뚱한 화자에게 준 단어까지 벌점을 매기는 단어 점수(2d절) |
| 목표 화자 추출(target-speaker extraction) | 혼합음에서 등록된 목소리 하나를 오디오로 뽑아내는 것(강의 07) |
| 목표 화자 음성 인식(target-speaker ASR) | 누구의 말을 받아 적을지 지정받고 나머지는 무시하는 인식기 |
| 다화자 음성 인식(multi-talker ASR) | 겹쳐 말하는 여러 화자를 한꺼번에 받아 적는 인식기 |
| SOT | 직렬화 출력 학습(serialized output training): 하나의 출력 흐름에 모든 화자의 말을 한 사람씩 차례로 담고, 그 사이에 화자 전환 토큰을 넣음 |
| 성문(voiceprint) | 사람을 알아보는 데 쓰는 저장된 화자 임베딩. 법적으로는 생체 정보이므로 어떤 용도든 옵트인(opt-in)임: 당사자가 명시적으로 동의하기 전까지는 꺼져 있음 |

## 1. 문제: 누가 무슨 말을 했나, 네 가지 경우

화자 정보가 붙어야 하는 전사문에서는 세 가지가 잘못될 수 있습니다.
- **주변 사람 유입(bystander leakage):** 다른 사람의 말이 착용자의 텍스트에 들어갑니다. 법적, 신뢰상의 실패입니다.
- **놓친 단어(missed words):** 게이트가 잘라 내거나, 향상기(enhancer)가 억눌렀거나, 인식기가 아예 만들어 내지 못해서 착용자의 말이 빠집니다. 데이터 손실 실패입니다.
- **잘못된 귀속(wrong attribution):** 단어는 받아 적었지만 엉뚱한 사람에게 붙습니다. 안전 기록에서 감독자가 한 "밸브 차단했습니다"가 작업자의 진술로 기록되면 사실 오류입니다.

| 경우 | 여기서 "한 화자의 텍스트"가 뜻하는 것 | 가장 흔한 실패 |
|---|---|---|
| 1. 군중 속 혼자 남기는 메모(지하철, 야적장) | 착용자의 말만. 나머지는 모두 잡음이며 텍스트를 만들면 안 됨 | 유입: 승객의 문장이나 안내 방송이 메모에 들어감. 게이트가 너무 엄격하면 단어를 놓침 |
| 2. 착용자가 다른 한 사람과 대화 | 착용자 쪽이 기록임. 상대 쪽은 버리거나 별도의 익명 레이블로 두며, 절대 착용자 텍스트에 합치지 않음 | 말 차례가 바뀌는 곳과 겹침에서 잘못된 귀속: 상대의 "네, 잠금 조치했어요"가 착용자의 진술이 됨 |
| 3. 한 사람이 진행하는 TBM 브리핑 | 마이크를 찬 진행자가 본문이 됨. 참석자의 질문과 답은 "참석자 1", "참석자 2"로 표시 | 마이크에서 먼 참석자의 말을 놓침. 한 사람이 두 레이블로 쪼개지거나, 두 사람이 하나로 합쳐짐. 모두가 녹음 중임을 알아야 함 |
| 4. 여러 사람이 말하는 자유 회의 | 한 화자란 없음. 모든 줄에 화자가 붙은 완전한 전사문이 필요 | 세 가지 실패 모두에 겹침과 잘못된 화자 수까지. 아직 연구 수준의 난제(CHiME, NOTSOFAR 챌린지) |

경우 1과 2가 MVP입니다. 경우 3이 첫 번째 업종(vertical)입니다. 경우 4는 화자마다 마이크가 있거나 제대로 된 회의용 마이크가 생기기 전까지는 범위 밖입니다 [H, 우리의 [ASR 조사 노트](../../../market-studies/industrial-voice-logging/research-notes/asr_noise_ondevice_onprem.md) Q7과 Q8에서].

**법적 무게는 녹음 규칙이 집니다.** 나중에 주변 사람의 텍스트를 지워도 그들의 대화를 녹음했다는 사실은 사라지지 않습니다. 경우 1을 적법하게 지키는 것은 앱이 *언제* 녹음하느냐입니다. 즉 PTT, 착용자가 시작하는 세션, 그리고 주변 사람 일시 정지입니다 [H; 법률 자문 필요].

## 2. 가장 싼 것부터 가장 어려운 것까지, 접근법의 사다리

각 단(rung)은 아래 단보다 연산, 데이터, 동의 또는 엔지니어링 면에서 비용이 더 듭니다. 경우에 필요한 만큼만 올라가세요.

| 단 | 아이디어 | 성문이 필요한가? | 우리 상태 |
|---|---|---|---|
| a | 설계로 해결: PTT와 근접 마이크 | 아니요 | MVP |
| b | 기기 센서로 자기 음성 감지 | 아니요 | 나중에, 하드웨어가 허락하면 |
| c | 개인화 VAD 또는 화자 검증 | 예 | 법률 자문 후에만, 옵트인 |
| d | 화자 분할과 음성 인식 | 아니요(익명 레이블) | TBM 업종 |
| e | 음성 인식 전 목표 화자 추출 | 예 | 계획 없음 |
| f | 목표 화자 음성 인식과 다화자 음성 인식 | 모델에 따라 다름 | 지켜봄 |
| g | 시청각 | 아니요 | 바디캠, 나중에 |

### 2a. 설계로 해결: PTT와 근접 마이크

**아이디어.** 마이크에서 착용자가 다른 누구보다 훨씬 크게 들리게 하고, 착용자가 원할 때만 녹음합니다. 그러면 문제 대부분이 애초에 생기지 않습니다.

**예제 1: 역제곱 법칙(inverse-square law).** 강의 01에서: 자유 음장(free field, 반사가 없는 곳)에서 음압은 1/r로 줄어듭니다. 따라서 두 거리 사이의 레벨 차이는 20·log₁₀(r_far / r_near) dB입니다. 두 사람이 같은 힘으로 말한다고 가정합니다.
- 입에서 헤드셋 붐 마이크까지: 3 cm. 주변 사람에서 같은 마이크까지: 1.5 m = 150 cm.
- 비율 150 / 3 = 50이고, 20·log₁₀(50) = 20 × 1.699 = **34.0 dB**입니다. 음압비 50, 파워비 2,500입니다. 주변 사람의 목소리는 착용자 파워의 1/2,500로 도착합니다.

| 마이크 위치 | 1.5 m 거리 주변 사람과의 차이 | 1.0 m 거리 대화 상대와의 차이 |
|---|---|---|
| 헤드셋 붐, 입에서 3 cm | 34.0 dB | 30.5 dB |
| PTT용으로 입에 댄 휴대폰, 5 cm | 29.5 dB | 26.0 dB |
| 이어버드, 입에서 약 12 cm | 21.9 dB | 18.4 dB |
| 얼굴 앞에 든 휴대폰, 30 cm | 14.0 dB | 10.5 dB |

**차이를 깎아 먹는 두 가지 보정.**
- **말하는 힘.** 소리치는 주변 사람은 음원에서부터 더 큽니다. 1 m에서의 전형적인 레벨은 보통 말소리가 약 60 dB, 고함이 76 dB입니다 [P, ANSI S3.5, 우리 ASR 노트 경유]. 16 dB 차이로, 붐 마이크 이점의 약 절반입니다. 사람들은 시끄러운 곳에서 자기도 모르게 목소리를 높이기도 합니다(롬바르드 효과, Lombard effect).
- **방.** 실내에서는 **임계 거리** r_c 너머에서 레벨이 더 이상 줄지 않습니다. 그곳에서는 방의 울림(확산되어 방 어디서나 거의 같은 크기)이 직접음만큼 커집니다. 지향성이 없는 음원에 대한 흔한 추정식은 r_c ≈ 0.057·√(V / RT60) 미터이며, V는 m³, RT60은 초 단위입니다(강의 01).
  - **예제 2.** 강의 01의 방: V = 60 m³, RT60 = 0.48 s이므로 r_c = 0.057 × √125 = 0.057 × 11.2 ≈ **0.64 m**입니다.
  - 1.5 m의 주변 사람: 직접음은 울림 레벨 대비 20·log₁₀(0.64 / 1.5) = −7.4 dB이므로, 직접음과 울림을 합치면 울림 레벨보다 10·log₁₀(1 + 10^(−0.74)) = **+0.7 dB** 높습니다.
  - 3 cm의 착용자: 직접음이 같은 울림 레벨보다 20·log₁₀(0.64 / 0.03) = **+26.5 dB** 높고, 착용자 자신의 울림은 그에 비해 무시할 만합니다.
  - 차이: 34 dB가 아니라 26.5 − 0.7 ≈ **25.8 dB**입니다. 방이 주변 사람에게 약 8 dB를 돌려줍니다. 지하철 객차와 콘크리트 기계실도 울림이 큽니다 [I].

**레벨 게이팅(level gating).** 이 정도 차이가 있으면 간단한 규칙으로 다른 말소리 대부분을 걸러 낼 수 있습니다. 프레임의 레벨이 착용자의 전형적인 말소리 레벨에 가까울 때만 남기는 것입니다.
1. 20 ms 프레임마다 레벨을 dB로 잽니다. 샘플 제곱의 평균에 10·log₁₀을 취합니다.
2. 세션에서 착용자의 기준 레벨 L_ref를 추정합니다. 예를 들어 프레임 레벨의 95번째 백분위수입니다. 차이가 크면 가장 큰 5%의 프레임은 거의 항상 착용자입니다.
3. 레벨이 L_ref − G 이상인 프레임만 남깁니다. G = 15 dB이고 차이가 34 dB이면, 보통 크기로 말하는 주변 사람은 게이트보다 약 19 dB 아래에 있습니다.

실습의 시뮬레이션을 랩의 대화 클립 두 개(US-3.1, 영어와 한국어; 잡음은 착용자보다 15 dB 낮게; 2026-11-05 우리 실행)에 돌리면 다음과 같습니다 [E].

| 착용자 마이크 대 상대 화자 | 레벨 차이 | 남은 착용자 프레임 | 남은 상대 단독 프레임 |
|---|---|---|---|
| 3 cm 대 1.5 m | 34.0 dB | 87–92% | 4–6% |
| 12 cm 대 1.0 m | 18.4 dB | 88–93% | 13–19% |
| 30 cm 대 1.0 m | 10.5 dB | 90–93% | 42–49% |

- **34 dB에서 새는 것은 목소리가 아니라 잡음입니다.** 4–6%는 배경 잡음 속의 큰 순간 소음입니다. 잡음을 빼면 상대 목소리 프레임은 하나도 통과하지 못합니다. 잡음이 없을 때(영어 클립) 상대 목소리는 18.4 dB에서 약 3%, 10.5 dB에서 약 34%가 통과합니다.
- **착용자는 자기 프레임의 10–15%를 잃습니다.** 말소리는 모음, 약한 자음, 문장 속 쉼 사이에서 그 자체로 30 dB 이상 오르내리고, 15 dB 게이트는 조용한 부분을 잘라 냅니다. 그래서 앱은 프레임이 아니라 단어나 구간 단위로 판단합니다(3절).
- **마이크 위치가 결정합니다.** 게이트는 붐 마이크나 입에 댄 휴대폰에서는 잘 되고, 이어버드에서는 아슬아슬하며, 얼굴 앞에 든 휴대폰에서는 실패합니다. 그래서 문턱값은 입력 경로(input route)에 따라 달라야 하며, 요구사항 A3이 이미 구간마다 이를 기록합니다. 얼굴에서 떨어뜨려 든 휴대폰에는 (b)단 이상이 필요합니다.

### 2b. 자기 음성 감지(OVD)

**아이디어.** 착용자만 만들 수 있는 신호를 써서 성문이 필요 없게 합니다.

**VPU와 골전도.** 말을 하면 두개골이 떨립니다. 외이도나 피부에 닿은 가속도계는 그 떨림을 느끼지만, 공기를 타고 오는 주변 사람의 목소리는 그것을 거의 움직이지 못합니다.
- Apple의 한 특허가 핵심 규칙을 설명합니다. 가속도계에 진동이 있고 **동시에** 마이크에 유성음(voiced speech)이 있을 때만 "착용자의 말"로 판정합니다. 두 검출기의 AND입니다 [P, [US9313572B2](https://patents.google.com/patent/US9313572B2/en)]. 가속도계는 주로 약 800 Hz 아래의 *유성음*(성대가 떨려서 나는 소리)을 잡으므로, /s/나 /f/ 같은 무성음은 마이크에서 와야 합니다.
- 어느 기계가 돌고 있는지 알아낼 때 공기 중 마이크 대신 구조물 진동 센서를 쓰는 것과 같은 요령입니다. 전달 경로가 음원을 알려 줍니다. 약점: 기침, 씹기, 발걸음도 센서를 흔듭니다 [P].
- Apple은 AirPods Pro 3에 "음성 감지 가속도계(speech-detecting accelerometer)"와 대화 감지(Conversation Awareness: 말을 시작하면 미디어 볼륨이 줄어드는 기능)를 명시합니다 [F, [Apple 사양](https://www.apple.com/airpods-pro/specs/)]. 다만 어느 센서가 이 기능을 움직이는지는 밝히지 않습니다. Samsung은 Galaxy Buds4 Pro의 VPU를 마이크 세 개와 융합된 골전도 센서라고 설명합니다 [V, [Samsung Newsroom, 2026-06-25](https://news.samsung.com/uk/finding-your-voice-anywhere-the-tech-behind-galaxy-buds4-pros-crystal-clear-calls)].

**VPU 없이 쓰는 근거리장 단서.**
- **레벨**(2a절)과 **DRR**: 예제 방에서 3 cm의 착용자는 건조하고(DRR ≈ +26 dB) 1.5 m의 주변 사람은 울림이 많습니다(DRR ≈ −7 dB). DRR은 녹음만으로도 추정할 수 있지만(예: 단어가 끝난 뒤 에너지가 얼마나 빨리 줄어드는지로), 레벨보다 추정이 더 불안정합니다 [I].
- **스펙트럼 기울기(spectral tilt, 저음과 고음 사이의 균형):** 가까운 지향성 마이크는 저음을 키우고(근접 효과(proximity effect), 강의 04), 먼 화자의 소리는 일부가 고음을 흡수하는 부드러운 표면에 반사되어 도착합니다. 보조 특징으로는 쓸모 있지만 단독으로는 약합니다 [I].
- **마이크 간 레벨 차이(ILD, inter-mic level difference).** 대부분의 휴대폰은 아래쪽 끝과 위쪽 끝에 마이크가 하나씩 있습니다. 먼 화자로부터는 두 마이크의 거리가 거의 같지만, 아래쪽 끝 가까이에 있는 입으로부터는 거리가 크게 다릅니다.

**예제 3: 휴대폰 마이크 두 개.** PTT를 위해 휴대폰을 입에 대고 있습니다. 아래쪽 마이크는 입술에서 5 cm, 위쪽 마이크는 14 cm 더 먼 19 cm에 있습니다.
- 착용자: 아래쪽 마이크에서 20·log₁₀(19 / 5) = **11.6 dB** 더 큽니다. 휴대폰과 일직선 위 1.5 m에 있는 주변 사람(최악의 경우): 20·log₁₀(1.64 / 1.50) = **0.8 dB**이고, 옆에서는 약 0 dB입니다.
- "ILD > 6 dB이면 착용자" 같은 규칙은 *각자가 얼마나 크게 말하든 상관없이* 둘을 구분합니다. 우리 시뮬레이션에서 착용자의 ILD 중앙값은 9 dB(잡음 때문에 11.6보다 낮아짐), 상대 화자는 약 0 dB가 나왔습니다 [E].
- 이것은 그래디오미터(gradiometer)입니다. 몇 센티미터 떨어진 가속도계 두 개처럼, 차이를 취하면 먼 음원은 상쇄되고 가까운 음원은 남습니다. 휴대폰이 입 가까이 있을 때만 통하며, 30 cm에서는 두 마이크가 모두 멉니다. 이어버드는 입 쪽으로 빔포밍(beamforming: 여러 마이크를 합쳐 한 방향을 듣게 하는 것)을 해서 내부적으로 같은 일을 합니다.

**업체가 공개하는 것(2026-11-05 확인).**
- 이어버드의 VPU 신호나 자기 음성 플래그를 서드파티 앱에 넘겨주는 **공개 Android 또는 iOS API는 찾지 못했습니다** [I, 검색 결과; 없다는 것은 증명하기 어려움]. 블루투스로 휴대폰이 받는 것은 VPU가 이미 융합된, 처리된 모노 음성 스트림 하나입니다.
- Android는 휴대폰 자체 마이크 정보는 알려 줍니다. `AudioRecord.getActiveMicrophones()`는 활성 마이크마다 `MicrophoneInfo`를 돌려주며, 여기에 미터 단위 위치가 들어 있습니다(API 레벨 28 이상). 위치가 알 수 없음(unknown)으로 나올 수도 있습니다 [F, [Android 레퍼런스](https://developer.android.com/reference/android/media/MicrophoneInfo)]. Galaxy S25가 앱에 가공되지 않은 마이크 채널 두 개를 주는지는 실기기에서 시험해 봐야 합니다 [I].

### 2c. 등록을 이용한 개인화 VAD와 화자 검증

**아이디어.** 착용자를 한 번 등록해 두고, 오디오의 모든 구간에 대해 "이것이 등록된 목소리인가?"를 묻습니다.
- **화자 검증**(강의 07, 2절): ECAPA-TDNN 네트워크가 1–3초의 말소리를 임베딩으로 바꾸고, 착용자의 등록 임베딩과의 코사인 유사도를 문턱값과 비교합니다.
- **개인화 VAD**(Google, 2019–20)는 VAD와 검증을 파라미터 약 130,000개짜리 아주 작은 네트워크 하나로 합칩니다. 등록 임베딩이나 검증 점수를 조건으로 받아 프레임마다 비음성, 목표 화자, 다른 화자 중 하나를 출력하며, 등록된 사용자가 말할 때만 스트리밍 인식기가 돌게 하려는 것입니다 [P, [프로젝트 페이지](https://google.github.io/speaker-id/publications/PersonalVAD/)].

**두 가지 오류.** **FAR**(오수락률)은 다른 사람의 구간을 착용자로 받아들인 비율로, 주변 사람 유입입니다. **FRR**(오거부율)은 착용자의 구간을 거부한 비율로, 놓친 단어입니다. 문턱값을 올리면 FAR은 내려가고 FRR은 올라갑니다. **EER**(동일 오류율)은 FAR = FRR이 되는 문턱값에서의 오류율입니다. 요약 숫자 하나일 뿐, 반드시 써야 할 설정은 아닙니다.

**예제 4.** 착용자 구간 10개와 다른 사람 구간 10개의 코사인 점수입니다.
- 착용자: 0.82, 0.77, 0.74, 0.71, 0.66, 0.62, 0.58, 0.49, 0.41, 0.33
- 다른 사람: 0.52, 0.44, 0.38, 0.31, 0.27, 0.22, 0.18, 0.12, 0.08, 0.03

| 문턱값(점수 ≥ 문턱값이면 수락) | FAR | FRR |
|---|---|---|
| 0.30 | 4/10 = 40% | 0/10 = 0% |
| 0.42 | 2/10 = 20% | 2/10 = 20% |
| 0.50 | 1/10 = 10% | 3/10 = 30% |
| 0.55 | 0/10 = 0% | 3/10 = 30% |

- 한 줄을 손으로 확인해 봅시다. 0.42에서 다른 사람의 0.52와 0.44가 통과하고(FAR 2/10), 착용자의 0.41과 0.33이 떨어집니다(FRR 2/10). 0.41 초과 0.44 이하의 어떤 문턱값이든 FAR = FRR = 20%이므로 **EER = 20%**입니다.
- 우리에게 오수락은 주변 사람의 말을 기록에 넣는 것이고, 오디오를 검토용으로 보관한다면 오거부보다 나쁩니다. 그래서 문턱값을 EER 지점보다 높게, 예를 들어 0.55(FAR 0%, FRR 30%)로 두고, 거부된 구간은 지우지 않고 검토로 보냅니다.

```python
import numpy as np

target   = np.array([0.82, 0.77, 0.74, 0.71, 0.66, 0.62, 0.58, 0.49, 0.41, 0.33])  # wearer
impostor = np.array([0.52, 0.44, 0.38, 0.31, 0.27, 0.22, 0.18, 0.12, 0.08, 0.03])  # others

def rates(th):
    far = np.mean(impostor >= th)   # someone else accepted as the wearer
    frr = np.mean(target < th)      # the wearer rejected
    return far, frr

for th in (0.30, 0.42, 0.50, 0.55):
    far, frr = rates(th)
    print(f"threshold {th:.2f}: FAR {far:.0%}  FRR {frr:.0%}")

# EER: try every observed score as the threshold and take the one where FAR and FRR meet
ths = np.sort(np.concatenate([target, impostor]))
t_eer = ths[np.argmin([abs(np.subtract(*rates(t))) for t in ths])]
print("EER about", f"{np.mean(rates(t_eer)):.0%}", "at threshold", t_eer)   # 20% at 0.44
```

**짧은 구간과 잡음은 검증 성능을 떨어뜨립니다.**
- VoxCeleb1(유명인 인터뷰: 실제 환경이지만 지하철은 아님)에서 사전 학습된 ECAPA-TDNN의 EER은 0.5초 구간에서 17.29%, 1.0초에서 6.98%, 1.5초에서 2.99%, 2.0초에서 2.30%였습니다 [P, [He et al. 2023](https://arxiv.org/abs/2310.04681)]. 전체 길이 시험 발화에서는 SpeechBrain의 ECAPA 모델이 0.80%를 보고합니다 [V, [모델 카드](https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb)]. 현장 메모는 "네", "완료", "밸브 3번" 같은 짧은 조각투성이입니다.
- **예제 5: 시간당 유입.** 활성화 세션 한 시간 동안 검증기에 도달하는 주변 사람 구간이 120개이고, 문턱값이 EER 지점에 있다고 합시다. 2초 구간이면 120 × 0.023 ≈ **3**개가 새고, 1초면 120 × 0.070 ≈ **8**개, 0.5초면 120 × 0.173 ≈ **21**개입니다. 위 EER들은 더 깨끗한 오디오에서 나온 것이므로, 잡음과 블루투스 코덱은 이를 더 나쁘게 만듭니다 [I]. 그래서 검증은 (a)단 뒤의 두 번째 확인일 수는 있어도, 결코 그것을 대신할 수는 없습니다.

**법적 지위: 성문은 생체 정보입니다.**
- **한국:** 사람을 알아보는 데 쓰이는 목소리는 개인정보보호위원회(PIPC)의 개인정보보호법(PIPA) 지침상 생체인식정보로서 민감정보입니다. 별도 동의가 필요하며, 원칙적으로 특징을 추출한 뒤에는 원본 음성을 삭제해야 합니다 [P].
- **일리노이 BIPA**(생체정보 프라이버시법, Biometric Information Privacy Act): "성문(voiceprint)"은 생체 식별자이며, 서면 고지, 서면 동의서(written release), 공개된 보존 일정이 필요합니다 [F].
- **EU GDPR 제9조:** 사람을 식별하는 데 쓰는 생체 데이터는 특수 범주이며, 직원의 동의는 유효한 경우가 드뭅니다 [P]. AI법(AI Act)은 순수한 일대일 검증("이 사람이 자신이 주장하는 그 사람인가?")을 고위험 원격 생체 식별에서 제외하지만 [F, 우리 노트 기준], GDPR은 여전히 적용됩니다.
- **결론:** 사람별 옵트인, 기본값은 꺼짐, 템플릿은 우리 서버에만 저장, 법률 자문 검토 전에는 아무것도 하지 않음, v1에는 넣지 않음.

### 2d. 화자 분할과 음성 인식

**파이프라인.** 같은 오디오에 음성 인식(타임스탬프가 붙은 단어)과 화자 분할(화자 차례)을 따로 돌린 다음, 각 단어를 그 단어와 가장 많이 겹치는 차례의 화자에게 줍니다.
- WhisperX가 정확히 이렇게 합니다. Whisper가 텍스트를 쓰고, wav2vec2 강제 정렬이 단어 시각을 찾고, pyannote community-1이 화자 차례를 찾고, `assign_word_speakers`가 각 단어에 겹친 시간의 합이 가장 큰 화자를 붙입니다 [F, [코드](https://github.com/m-bain/whisperX/blob/main/whisperx/diarize.py)]. 기본 정렬 모델에는 한국어 모델(`kresnik/wav2vec2-large-xlsr-korean`)도 들어 있습니다 [F, 코드]. 쓰기 전에 그 모델의 라이선스를 확인하세요.

**예제 6: 차례 경계에 걸친 단어.** "밸브(valve)"라는 단어가 4.10–4.50초에 걸쳐 있습니다. 화자 분할 결과는 A가 4.30초까지, B가 4.20초부터 말한다고 합니다.
- A와 겹친 시간: 4.10–4.30 = 0.20초. B와 겹친 시간: 4.20–4.50 = 0.30초. 단어는 **B**에게 갑니다.
- 실제로는 A가 "밸브"라고 말했고 B는 4.20초에 기침만 했다면, 단어가 잘못 귀속된 것입니다. 귀속 오류는 차례 경계에 삽니다. pyannote의 "배타적(exclusive)" 출력(매 순간 정확히 한 화자)은 이 배정을 단순하게 해 주지만 [V, [pyannote 블로그](https://pyannote.ai/blog/community-1)], 그래도 하나를 골라야 합니다.

**겹침(overlap).** 일반적인 인식기는 단어 흐름 하나를 출력합니다. 두 사람이 동시에 말하면 보통 큰 쪽을 받아 적고 다른 쪽은 빠뜨리거나 뭉개며, 무엇을 만들어 내든 레이블은 하나만 붙습니다. 우리 경우에는 착용자가 더 크므로, 겹친 구간에서 인식된 주변 사람의 단어는 착용자 텍스트에 붙어 버립니다. 착용자로 위장한 유입입니다. 랩의 US-3.1 대화 클립은 발화의 11–14%가 겹쳐 있으니, 드문 경우가 아닙니다.

**지표: DER 대 cpWER.** DER(강의 07)은 *초*(놓침, 오경보, 혼동)를 세며 단어는 보지 않습니다. **WER**(단어 오류율, word error rate, 강의 12) = (치환 + 삭제 + 삽입된 단어) / 정답 단어 수이며, 화자는 보지 않습니다. **cpWER**(연결 최소 순열 WER)은 CHiME-6 챌린지에서 도입되었습니다 [P, [Watanabe et al. 2020](https://arxiv.org/abs/2004.09249)].
1. 정답의 화자마다 그 사람의 모든 단어를 시간 순서대로 이어 문자열 하나로 만듭니다. 시스템이 출력한 레이블마다 같은 일을 합니다.
2. 정답 화자와 시스템 레이블의 모든 일대일 짝짓기를 시도합니다. 레이블은 익명이므로 "spk1"이 A일 수도 B일 수도 있습니다. 강의 07의 PIT와 같은 순열 문제입니다.
3. 짝짓기마다 각 쌍의 단어 오류를 더합니다. 짝이 없는 시스템 레이블은 삽입으로, 짝이 없는 정답 화자는 삭제로 셉니다.
4. cpWER = 가장 작은 합계 / 정답 단어 수입니다.

**예제 7.** A가 "close valve three now"(3번 밸브 지금 잠가), B가 "valve three is open"(3번 밸브 열려 있어), 그다음 A가 "okay done"(알았어, 됐어)이라고 말합니다. 시스템은 "open" → "often" 하나만 빼고 모든 단어를 맞혔지만, "okay done"을 엉뚱한 화자에게 줍니다.
- 정답: A = "close valve three now okay done"(6단어), B = "valve three is open"(4단어), N = 10. 시스템: spk1 = "close valve three now", spk2 = "valve three is often okay done".
- 화자를 무시한 일반 WER: 치환 1 / 10 = **10%**.
- A↔spk1, B↔spk2 짝짓기: A는 "okay done"을 잃고(삭제 2), B는 "open" 대신 "often"(치환 1)과 여분의 "okay done"(삽입 2)을 받습니다. 합계 5. 다른 짝짓기 A↔spk2, B↔spk1은 3 + 3 = 6입니다(손으로 확인해 보세요).
- cpWER = min(5, 6) / 10 = **50%**.
- **교훈:** 엉뚱한 화자에게 간 단어는 하나마다 오류 두 개, 즉 원래 자리의 삭제 하나와 도착한 자리의 삽입 하나의 비용을 치릅니다. "okay done"은 1초도 안 되므로 DER은 거의 알아채지 못합니다. [MeetEval](https://github.com/fgnt/meeteval)(MIT 라이선스)은 cpWER과 함께, 각 단어가 대략 맞는 시각에 있어야 한다는 조건까지 붙인 시간 제약 버전 tcpWER도 계산합니다.

**우리 서버에서 돌릴 수 있는 화자 분할 모델.**
- **NeMo Streaming Sortformer**(NVIDIA)는 최대 **4명**의 화자에 대해 프레임별 활동을 출력하며, 등장 순서대로 레이블을 붙이고, 화자 캐시로 청크(chunk)마다 레이블을 일정하게 유지합니다 [V, [NVIDIA 블로그, 2025-08-18](https://developer.nvidia.com/blog/identify-speakers-in-meetings-calls-and-voice-apps-in-real-time-with-nvidia-streaming-sortformer/)]. [모델 카드](https://huggingface.co/nvidia/diar_streaming_sortformer_4spk-v2)에는 CC-BY-4.0, 4명 이하 DIHARD III에서 DER 약 13.2–14.9, 0.32초에서 30.4초까지의 지연 시간 설정이 나와 있습니다 [F, 우리 노트 기준]. NVIDIA는 영어에 최적화되었다고 하며, 심한 크로스토크와 빠른 말 차례 교대에는 여전히 약하다고 합니다. 최대 8명을 다루는 Nemotron 3 Diarization이 더 새로운 모델입니다 [V].
- **pyannote community-1**(오프라인): DER은 17.0(AMI-IHM)에서 20.3(AliMeeting)까지입니다 [F, [모델 카드](https://huggingface.co/pyannote/speaker-diarization-community-1)]. 원거리 잡음 오디오에서는 약 20%를 예상하세요 [H].
- **TBM에는:** 익명 레이블("진행자", "참석자 1", ...)을 씁니다. 진행자는 성문이 아니라 (a)단으로 찾은 크고 가까운 목소리입니다.

### 2e. 음성 인식 전 목표 화자 추출

- **아이디어**(강의 07, 5절): 목소리를 등록하고, VoiceFilter나 SpeakerBeam으로 그 목소리를 오디오로 추출한 뒤, 그 결과에 음성 인식을 돌립니다. 등록이 필요하므로 2c절의 법적 지위가 그대로 적용됩니다.
- **향상(enhancement)의 함정.** 파형을 다시 쓰는 전처리(front-end)는 무엇이든 아티팩트를 남길 수 있습니다([강의 11](11-noise-reduction.md)). 물먹은 듯하거나 "음악적인" 잡음, 잘린 단어 끝 같은 것입니다. 인식기는 잡음은 견디도록 학습되지만 아티팩트는 그렇지 않으므로, 과잉 억제(over-suppression)는 단어를 떨어뜨립니다.
  - Google의 VoiceFilter-Lite 글이 바로 이 점을 말하며, 과소 억제보다 과잉 억제에 더 큰 벌점을 주는 학습 손실과, 실행 중 잡음 종류에 맞춰 억제 강도를 조절하는 방식으로 대응합니다. 또한 파형이 아니라 인식기 자체의 입력 특징(feature)에 작용하며, 잡음 섞인 겹친 발화에서 25.1%, 울림 있는 겹친 발화에서 14.7%의 WER 개선을 보고합니다 [V, [Google Research 블로그, 2020](https://research.google/blog/improving-on-device-speech-recognition-with-voicefilter-lite/)].
  - 우리 ASR 노트에서는 향상 전처리가 최신 인식기에 대체로 효과가 없거나 해롭다는 결과를 찾았습니다 [P]. **우리에게:** 음성 인식 경로에는 넣지 않습니다. 기껏해야 사람이 듣기 위한 정리된 사본에만 씁니다.

### 2f. 목표 화자 음성 인식과 다화자 음성 인식(개념만)

- **목표 화자 음성 인식.** 인식기에 "누구"라는 입력을 줍니다. 등록 임베딩이나 한 화자의 화자 분할 활동입니다. 그리고 그 화자의 말만 출력하도록 학습시킵니다. 추출과 인식이 하나의 네트워크가 되므로, 중간에 오디오 아티팩트가 생기지 않습니다.
  - 예: NVIDIA의 스트리밍 다화자 Parakeet(파라미터 0.6B)은 학습된 "화자 커널(speaker kernel)"을 통해 Sortformer의 화자별 활동을 조건으로 받으며, 등록이 필요 없습니다. AMI IHM(헤드셋 마이크)에서 cpWER 21.26, AMI SDM(먼 마이크 하나)에서 37.44를 보고하고, NVIDIA Open Model License를 따릅니다. 카드에는 언어가 나와 있지 않습니다 [V, [모델 카드](https://huggingface.co/nvidia/multitalker-parakeet-streaming-0.6b-v1)].
- **SOT(직렬화 출력 학습).** 디코더 하나가 모든 화자의 전사를 시작 시각 순서대로 차례차례 쓰고, 그 사이에 화자 전환 토큰을 넣습니다: "close valve three now ⟨sc⟩ valve three is open" [P, [Kanda et al. 2020](https://arxiv.org/abs/2003.12687)]. 출력 헤드 수가 고정되어 있지 않으므로 몇 사람이 말했는지도 추정할 수 있습니다.
- **화자 귀속 음성 인식(speaker-attributed ASR)**은 출력 단어마다 화자 레이블을 붙이고, 등록된 프로필이 있으면 신원까지 붙입니다 [P, [Kanda et al. 2021](https://arxiv.org/abs/2104.02128)].
- **현황:** 대부분 영어 회의 벤치마크입니다. 한국어와 한영 혼용 성능은 알려져 있지 않습니다 [I]. 지켜보되, 만들지는 않습니다.

### 2g. 시청각(나중에, 바디캠용)

- 활성 화자 검출(강의 07, 6절)은 화면에 보이는 얼굴 중 누가 말하고 있는지 알려 줍니다. **반전:** 바디캠에서 착용자는 화면에 절대 나오지 않는 유일한 사람입니다. 그래서 크고 건조한 목소리인데 화면에 움직이는 입이 없으면 착용자를 가리키고, 화면 속 입과 맞는 목소리는 주변 사람입니다 [I]. 한국에서는 공개된 장소에서 업무 목적으로 쓰는 이동형 영상정보처리기기는 불빛, 소리, 안내판 등으로 촬영 중임을 표시해야 합니다(개인정보보호법 제25조의2) [P]. 영상은 MVP 범위 밖입니다.

## 3. 신뢰도와 대비책

**원칙:** 누구의 말인지 확실하지 않으면 착용자의 말로 적지 않습니다. 이를 **구간별 착용자 우세 점수(wearer-dominance score)**로 잽니다. D = (L_ref에서 G dB 이내인 발화 프레임) / (VAD가 판정한 전체 발화 프레임). 여러 프레임을 모으므로, 2a절에서 게이트 아래로 떨어지던 조용한 자음 때문에 구간 전체가 탈락하지는 않습니다. 제안하는 시작값입니다 [H; 지하철 잡음 시험 세트로 조정할 것].

| 조건 | 앱이 하는 일 |
|---|---|
| D ≥ 0.8이고 인식기가 확신함 | 착용자의 텍스트로 보여 줌 |
| 0.4 ≤ D < 0.8, 또는 겹침이 의심됨 | "화자 확인"과 함께 흐리게 보여 주고 검토 대기열에 넣음 |
| D < 0.4: 주변 사람일 가능성 높음 | 기본적으로 전사하지 않음. 시각과 함께 "[다른 목소리, 전사 안 함]"으로 표시 |
| 발화 없음, 또는 인식기 신뢰도 낮음 | 표시만 하고 텍스트는 보여 주지 않음(요구사항 A11) |

**예제 8.** 6초 구간에는 20 ms 프레임이 300개 있습니다. VAD가 250개를 발화로 판정하고, 그중 230개가 L_ref에서 15 dB 이내입니다. D = 230 / 250 = **0.92**로 착용자입니다. 다른 구간은 발화 프레임 180개 중 그런 프레임이 40개입니다. D = 0.22이므로 전사하지 않습니다.

**대비책:**
- **주변 사람일 가능성이 높은 말은 전사하지 않습니다.** 착용자가 우세한 구간만 인식기로 보내되, 단어 가장자리가 살아남도록 양 끝에 여유(padding)를 둡니다(약 0.3초로 시작 [H]). 유럽 데이터보호이사회(EDPB, European Data Protection Board)의 음성 비서 지침은 설계자에게 배경 말소리와 다른 사람의 목소리를 걸러 내라고 요구합니다 [F, [EDPB 지침 02/2021](https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf)].
- **주변 사람 일시 정지(bystander pause).** 근처에서 다른 사람들이 이야기하는 순간을 위해, 한 번 탭하면 녹음이 멈추고 일시 정지 이벤트가 기록됩니다(요구사항 A14). 녹음을 나중에 정리하는 것이 아니라 녹음 자체를 막는 유일한 대비책입니다.
- **사람의 검토.** 사용자는 표시된 줄을 탭해 들어 보고(A11) "내 말" 또는 "내 말 아님"으로 표시하거나 텍스트를 고칩니다. 수정은 개정 이벤트(revision event, A9)가 되어 평가 세트(S-3)로 들어갑니다.
- **마이크 경로별 숫자 두 개:** **유입률(leak rate)**(전사문에 들어간 주변 사람의 단어)과 **누락률(miss rate)**(잃어버린 착용자의 단어). 단어 단위로 센 FAR과 FRR입니다.

## 우리 앱에서는

- **MVP:**
  - (a)단: 기본은 PTT, 착용자가 시작하는 활성화 세션, 상시 녹음 모드 없음(MVP 결정 2);
  - 경로를 반영한 레벨 게이트와 우세 점수 D. 저장된 16 kHz 구간과 인식기의 단어 타임스탬프로 서버에서 계산하며, 경로는 요구사항 A3에서 가져옴;
  - 저신뢰 표시, "전사 안 함" 자리 표시, 주변 사람 일시 정지(A14), 검토(A11);
  - 데이터 모델에서 `speaker.label`은 항상 `"wearer"`이고 `identity_ref`는 비워 둠(우리 법률 노트의 스키마).
- **나중에:**
  - **(b)**: 이어버드가 VPU나 자기 음성 신호를 앱에 공개할 때(아직 찾지 못함), 또는 S25에서 녹음 시험으로 마이크 두 개의 ILD 확인이 통할 때;
  - **(d)** TBM용: pyannote community-1, 또는 화자가 4명 이하이고 스트리밍이 중요하면 Sortformer; 익명 `diar_N` 레이블과 레벨로 찾은 진행자; 음성 안내, 참석자 서명, 동의 이벤트 기록; 우리가 직접 녹음한 브리핑으로 cpWER 측정. 더 좋은 모델보다 화자마다 마이크 하나가 더 큰 도움이 됩니다;
  - **(c)**: 법률 자문 후에만. 사람별 옵트인, 템플릿은 우리 서버에만, 특징 추출 후 등록용 원본 오디오 삭제, 그리고 말하는 사람이 착용자인지 확인하는 데만 쓰고 결코 다른 사람을 식별하는 데는 쓰지 않음;
  - **(e)와 (f)**: 지켜봅니다. A/B 시험 없이는 아무것도 인식기 입력에 손대지 않습니다.
- **절대 하지 않음:** 목소리로 감정, 스트레스, "생산성"을 분석하는 것. EU AI법은 직장 내 감정 인식을 금지하며(제5조 제1항 (f)) [P], 이는 작업자의 신뢰를 무너뜨릴 것입니다. 주변 사람을 몰래 식별하는 것도 하지 않습니다.

## 읽거나 볼 자료

모든 링크는 2026-11-05에 확인했습니다.

- pyannote.ai, *Community-1* 공개 글. 화자 차례를 전사문과 맞추기 위한 "배타적(exclusive)" 화자 분할 포함: https://pyannote.ai/blog/community-1
- WhisperX README. Whisper, 강제 정렬, pyannote를 한 파이프라인에 묶고 단어 단위 화자 레이블을 붙임: https://github.com/m-bain/whisperX
- NVIDIA Technical Blog, *Identify Speakers in Meetings, Calls, and Voice Apps in Real-Time with NVIDIA Streaming Sortformer*: https://developer.nvidia.com/blog/identify-speakers-in-meetings-calls-and-voice-apps-in-real-time-with-nvidia-streaming-sortformer/
- NVIDIA NeMo 문서, *Speaker Diarization* (종단간(end-to-end) Sortformer, 단계식(cascaded) 파이프라인, 음성 인식과 결합한 화자 분할): https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/speaker_diarization/intro.html
- Google Research 블로그, *Improving On-Device Speech Recognition with VoiceFilter-Lite* (등록을 조건으로 한 필터링, 그리고 과잉 억제가 음성 인식을 해치는 이유): https://research.google/blog/improving-on-device-speech-recognition-with-voicefilter-lite/
- MeetEval, cpWER과 tcpWER 계산 도구: https://github.com/fgnt/meeteval
- Hervé Bredin (pyannoteAI), *Beyond Transcription: Building Voice AI That Understands Conversations* (영상, AI Engineer): https://www.youtube.com/watch?v=mFLlVpnGpds
- Kanda et al., *Serialized Output Training for End-to-End Overlapped Speech Recognition* (paper): https://arxiv.org/abs/2003.12687

## 실습 (1시간)

**데이터.** 랩의 합성 클립은 [랩 README](../../../../tools/separation-lab/README.md)와 [DATA.md](../../../../tools/separation-lab/DATA.md)에 설명되어 있습니다.
- `tools/separation-lab/data/clips/US-3.1/`(영어, LibriSpeech)과 `US-3.1-ko/`(한국어, Zeroth-Korean)를 쓰세요. 두 사람과 세 사람의 대화입니다. 클립 폴더마다 `mixture.wav`, 화자별 스템(`spk_<id>.wav`), 배경(`others.wav`), 그리고 `targets[].activity`에 각 화자의 발화 구간을 초 단위로 적은 `manifest.json`이 있습니다. 모두 16 kHz 모노입니다. (`US-2.1`은 대화가 아닙니다. 군중 웅성거림과 음악 위에서 건배사를 하는 화자 한 명입니다.)
- **녹음은 로컬에만 두고 절대 커밋하지 않습니다.** `data/` 폴더 전체가 git에서 무시됩니다.

**(a) 가까운 착용자, 먼 주변 사람 (40분).** 저장소 루트에서 `~/audio-learn` 환경으로 실행하세요.

```python
# Reads local clips; writes one WAV under data/tmp/ (git-ignored).
import json
import numpy as np, soundfile as sf

clip = "tools/separation-lab/data/clips/US-3.1/clip2_2spk_mixed"   # or US-3.1-ko/clip2_2spk_mixed
m = json.load(open(f"{clip}/manifest.json"))
sr, hop = m["sr"], int(0.02 * m["sr"])                  # 20 ms frames
stems = [sf.read(f"{clip}/{t['path']}")[0] for t in m["targets"]]
noise = sf.read(f"{clip}/others.wav")[0]
n = len(noise) // hop
tc = (np.arange(n) + 0.5) * hop / sr                    # frame centres in seconds

def is_active(segs):                                    # ground truth from the manifest
    return np.any([(tc >= s) & (tc < e) for s, e in segs], axis=0)

def frame_db(x):
    return 10 * np.log10((x[: n * hop] ** 2).reshape(n, hop).mean(axis=1) + 1e-12)

def unit(x, act):                                       # unit RMS while the person talks
    return x / np.sqrt(np.mean(x[: n * hop][np.repeat(act, hop)] ** 2))

aw, ab = (is_active(t["activity"]) for t in m["targets"])   # first speaker = the wearer
w, b = unit(stems[0], aw), unit(stems[1], ab)
z = noise / np.sqrt(np.mean(noise ** 2)) * 10 ** (-15 / 20)   # noise 15 dB below the wearer

for r_w, r_b in [(0.03, 1.5), (0.12, 1.0), (0.30, 1.0)]:
    mix = w + b * r_w / r_b + z                         # pressure falls as 1/r
    lv = frame_db(mix)
    keep = lv >= np.percentile(lv, 95) - 15             # the level gate, G = 15 dB
    right = np.concatenate([keep[aw], ~keep[ab & ~aw]]).mean()
    print(f"{r_w*100:.0f} cm vs {r_b} m ({20*np.log10(r_b/r_w):.1f} dB): "
          f"wearer kept {keep[aw].mean():.0%}, other-only kept {keep[ab & ~aw].mean():.0%}, "
          f"right decisions {right:.0%}")
    if r_w == 0.12:                                     # to listen to (headphones, low volume)
        sf.write("tools/separation-lab/data/tmp/l13_mix_12cm.wav", 0.1 * mix, sr, subtype="FLOAT")
```

1. 영어 클립과 한국어 클립에 실행하고 2a절의 표와 비교하세요. "Right decisions"는 발화 프레임 중 게이트가 남기기/버리기를 옳게 고른 비율입니다.
2. 잡음을 0으로 두고(`z = 0 * noise`) 다시 실행하세요. 어떤 유입이 목소리였고 어떤 것이 잡음이었나요?
3. G = 10, 15, 20 dB로 바꿔 보고 "wearer kept"와 "other-only kept"를 서로 대응시켜 그려 보세요. 2c절의 FAR 대 FRR과 같은 맞교환(trade-off)입니다.
4. 역할을 바꿔서(두 번째 화자를 착용자로) 결론이 유지되는지 확인하세요.
5. `l13_mix_12cm.wav`를 헤드폰으로 들어 보세요. 상대 화자의 말을 알아들을 수 있나요? 그렇다면 인식기도 아마 알아들을 것입니다.
6. 심화: `r_w = 0.05`로 두고 두 번째 "위쪽 마이크" 신호 `w * 5/19 + b * r_w / (r_b + 0.14) + np.roll(z, 8000)`를 만든 다음, 두 마이크 사이의 프레임별 dB 차이를 규칙으로 쓰세요("6 dB보다 크면 착용자"). 상대 화자를 16 dB 더 크게 만들어도 여전히 통하나요?
7. 변형: `US-1.x`에서는 `camera_holder_*` 스템이 건조하고 4 dB 더 커서(착용자에 가장 가까움), `passer_by_*` 스템이 주변 사람 역할을 합니다. `US-2.1`에서는 `others_crowd_babble.wav`를 경우 1의 군중으로 다루세요.

**(b) 손으로 cpWER 계산하기 (15분).** 정답: A가 "lock out pump two"(2번 펌프 잠금 조치), B가 "pump two is locked"(2번 펌프 잠겼음)라고 말합니다. 시스템: spk1 = "lock out pump", spk2 = "two pump two is locked". 시간 순서로 늘어놓은 단어로 일반 WER을 계산하고(화자 무시), 두 짝짓기 각각의 오류와 cpWER을 계산한 뒤, 두 숫자가 왜 다른지 한 문장으로 설명하세요. 확인: 일반 WER 0%, cpWER 2/8 = 25%.

**(c) 돌아보기 (5분).** 1절의 네 가지 경우마다 어느 단을 먼저 쓸지, 그리고 세 가지 실패(유입, 놓친 단어, 잘못된 귀속) 중 무엇이 가장 걱정되는지 적어 보세요.
