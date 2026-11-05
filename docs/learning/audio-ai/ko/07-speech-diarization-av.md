# 07. 음성: 향상, 화자 분할, 화자 분리, 그리고 시청각 처리

> 영어 원문(English original): [07-speech-diarization-av.md](../07-speech-diarization-av.md)

우리 페르소나(P1–P5) 대부분은 **목소리**를 다루므로, 이번 강의는 이 분야의 음성 쪽을 다룹니다.

네 가지 작업이 계속 등장합니다. 서로 구분해서 기억하세요.

| 작업 | 답하려는 질문 | 절 |
|---|---|---|
| 향상(enhancement) | "이 목소리를 깨끗하게 해 줄 수 있나?" | 1 |
| 화자 분할(diarisation) | "누가 언제 말했나?" | 3 |
| 분리(separation) | "각 목소리를 별도 트랙으로 주세요" | 4, 5 |
| 시청각(audio-visual) | "화면을 이용해 소리 처리를 도우세요" | 6 |

## 1. 음성 향상(speech enhancement): 잡음 제거(denoising)와 잔향 제거(dereverberation)

**음성 향상**은 녹음 속 음성을 더 또렷하게 만드는 일입니다. 흔한 경우는 둘입니다.
- **잡음 제거(denoise):** 배경 잡음(선풍기, 차 소리, 쉬익 소리)을 없앱니다.
- **잔향 제거(dereverb, de-reverberation):** 방의 울림 꼬리, 즉 01강에서 본 반사음의 번짐을 없앱니다.

**고전적 방법.** 잡음을 추정한 뒤 줄입니다. 자세한 내용은 05강에 있고, 요약하면 다음과 같습니다.
1. **잡음의 파워 스펙트럼을 추정합니다.** 잡음 **PSD**(파워 스펙트럼 밀도, power spectral density)는 주파수마다 잡음 파워가 얼마인지 알려 줍니다. 진동 시험의 PSD와 같은 대상입니다. 추정은 보통 아무도 말하지 않는 순간에서 합니다.
2. **주파수별로 이득(gain)을 적용합니다.** 이득은 0과 1 사이의 숫자로, 스펙트로그램의 각 주파수 빈(bin)에 곱합니다.
   - **위너 이득(Wiener gain)**은 대략 (음성 파워) / (음성 파워 + 잡음 파워)입니다. 음성이 우세한 곳에서는 1에 가깝고, 잡음이 우세한 곳에서는 0에 가깝습니다.
   - **스펙트럼 차감(spectral subtraction)**은 대신 측정된 파워에서 추정한 잡음 파워를 뺍니다.

**RNNoise** (Jean-Marc Valin, 2017). **하이브리드(hybrid)** 설계(고전적 신호 처리 + 작은 신경망)이며 좋은 엔지니어링의 모범입니다.
1. 고전적 **DSP**(디지털 신호 처리, digital signal processing: 일반적인 필터와 변환)로 두 종류의 특징을 계산합니다.
   - 약 22개의 **대역 에너지(band energy)**: 스펙트럼을 약 22개 대역으로 나눕니다. 저주파는 좁게, 고주파는 넓게 나누어 대략 귀와 비슷합니다. 대역마다 에너지 하나가 나오므로 스펙트럼의 거친 그림이 됩니다.
   - **피치 특징(pitch feature)**: 그 프레임이 얼마나 유성음(voiced)인지, 그리고 피치가 얼마인지. 피치는 성대가 진동하는 속도로 보통 100–250 Hz입니다. 유성음은 그 정수배 주파수에 배음(harmonics)을 가집니다(01강).
2. 아주 작은 **순환 신경망(recurrent network)**이 각 대역의 이득(0 = 제거, 1 = 유지)을 예측합니다.
   - **순환 신경망(RNN, recurrent neural network)**은 한 시간 프레임의 기억을 다음 프레임으로 넘깁니다. 상태 공간 모델 x(k+1) = f(x(k), 입력(k))에서 f를 학습한 것이라고 생각하면 됩니다.
   - RNNoise는 **GRU**(게이트 순환 유닛, gated recurrent unit) 층을 씁니다. GRU는 "게이트(gate)"를 추가합니다. 게이트는 0과 1 사이의 학습된 밸브로, 옛 상태를 얼마나 유지하고 새 입력을 얼마나 받아들일지 정합니다.
3. DSP가 그 이득을 적용하고, 여기에 **피치 콤 필터(pitch comb filter)**를 더합니다.
   - 콤 필터(comb filter)는 빗살처럼 일정한 간격으로 봉우리가 있는 이득 패턴을 가집니다.
   - 빗살을 음성의 배음 위치에 맞춥니다. 배음은 통과하고, 배음 *사이*에 있는 잡음은 줄어듭니다.

**실시간(real time).** CPU에서 실시간으로 동작합니다.
- "실시간"은 다음 오디오 블록이 도착하기 전에 현재 짧은 블록의 처리를 끝낸다는 뜻이므로, 통화 중에 라이브로 쓸 수 있습니다.
- 보통의 척도는 **실시간 계수(RTF, real-time factor)** = 처리 시간 / 오디오 길이입니다. RTF = 0.1이면 10초 오디오를 1초에 처리합니다. 라이브 사용의 최소 조건은 RTF가 1보다 작은 것입니다.

데모 페이지는 신경망 오디오 모델에 대한 블로그형 설명 중 최고입니다.

**DeepFilterNet** (2022–23). 복소 "딥 필터(deep filter)"를 예측하며, 이는 위상(phase) 처리에 도움이 됩니다. 실시간이고 오픈 소스입니다.
- 03강에서 본 것처럼 STFT(단시간 푸리에 변환, short-time Fourier transform: 스펙트로그램의 바탕 데이터)의 모든 시간–주파수 빈은 **복소수**입니다. 크기(magnitude)와 위상이 있습니다.
- 단순한 **마스크(mask)**는 0과 1 사이의 실수입니다. 크기만 바꾸고 잡음이 낀 위상은 그대로 남습니다.
- **딥 필터**(하나의 복소수일 때는 복소 마스크(complex mask)라고도 함)는 **복소** 가중치를 가진 짧은 **FIR 필터**(유한 임펄스 응답, finite impulse response: 최근 몇 개 입력의 가중합으로, 가중치를 고른 이동 평균과 같음)이며, 빈마다 하나씩 몇 개의 이웃 프레임에 걸쳐 적용합니다.
- 복소 가중치는 크기를 조절할 뿐 아니라 위상도 회전시킬 수 있습니다. 그래서 위상 처리에 도움이 됩니다.

**상용 향상기(commercial enhancer).** Adobe Podcast *Enhance Speech*, ElevenLabs *Voice Isolator*, Descript *Studio Sound*, Krisp, NVIDIA Broadcast, 그리고 휴대폰의 음성 분리 모드가 있습니다.
- 일부는 **생성적(generative)** 으로 동작하여(잡음을 줄이는 데 그치지 않고 새 음성을 합성하여) 음성을 "스튜디오 녹음"처럼 들리게 만듭니다.
- 사용자들은 강도를 높이면 로봇 같거나 먹먹한 아티팩트(artifact: 원본에 없던 소리)와 단어 끝이 잘리는 현상이 생긴다고 보고합니다. 이는 일화(anecdote)이며 우리 [시장 조사 노트](../../../market-studies/ai-media-saas-screening/research-notes/demand_pain_points.md)에 모아 두었습니다.
- 08강과 같은 상충 관계입니다. 그럴듯함(plausibility) 대 충실도(faithfulness)입니다.

## 2. 화자 임베딩(speaker embedding): 목소리를 위한 재식별(re-ID)

**임베딩(embedding).** 임베딩은 무언가를 요약한 벡터(숫자 목록)입니다. 여기서는 신경망이 약 1–3초의 음성 구간을 고정 길이 벡터(보통 192–512차원)로 사상(map)합니다.
- 같은 화자는 가깝게 모입니다.
- 다른 화자는 멀리 떨어집니다.

컴퓨터 비전에서 이미 아는 개념입니다. 얼굴 재식별(re-identification) 네트워크는 얼굴 이미지를 벡터로 바꾸고, 같은 사람의 두 이미지는 서로 가까워집니다. 화자 임베딩은 목소리에 대한 같은 것입니다. 추정 이론의 특징 벡터(feature vector)와도 비슷합니다. 중요한 것(누구인지)은 남기고 나머지(무슨 말을 했는지)는 버린 간결한 상태입니다.

**코사인 유사도(cosine similarity).** "가깝다"를 재는 방법으로, 두 벡터 사이 각도의 코사인입니다. cos θ = (a · b) / (|a| |b|).
- 1이면 같은 방향, 0이면 무관(수직), −1이면 반대 방향입니다.
- 벡터의 길이는 무시하고 방향만 비교합니다.
- 예: a = (1, 0), b = (0.8, 0.6)이면 cos θ = 0.8입니다. 같은 화자 쌍이 0.7, 다른 화자 쌍이 0.1 정도일 수 있으며, 실제 점수는 모델에 따라 다릅니다.

**역사.** 각 단계가 앞 단계를 대체했습니다.
- **i-vector**("정체성 벡터", identity vector): 신경망 이전의 통계적 방법입니다. 가우시안 혼합 모델(Gaussian mixture model: 음성 소리의 통계 모델)로 녹음 전체를 수백 개 숫자의 벡터 하나로 압축합니다.
- **x-vector**(**TDNN**, 시간 지연 신경망, time-delay neural network): 널리 쓰인 최초의 신경망 임베딩입니다.
  - TDNN은 시간 방향 1차원 합성곱입니다. 각 층이 현재 프레임과 앞뒤 몇 프레임을 봅니다.
  - 이어서 "통계 풀링(statistics pooling)"이 시간에 대한 평균과 표준편차를 구하므로, 길이가 다른 클립도 고정 크기 벡터 하나가 됩니다.
- **ECAPA-TDNN**: 개선된 TDNN으로, 채널 어텐션(channel attention: 어떤 특징 채널이 중요한지 네트워크가 학습)을 쓰고 여러 층의 특징을 합칩니다. 지금의 일반적인 기본값입니다.
- **ResNet** 변형(WeSpeaker): ResNet은 이미지 인식에서 가져온 잔차 합성곱 신경망(skip connection, 즉 건너뛰기 연결이 있음)입니다. WeSpeaker는 이를 바탕으로 한 화자 모델을 담은 오픈 툴킷입니다.

**학습.** 수천 명의 **VoxCeleb** 화자에 대한 분류 문제입니다.
- VoxCeleb는 YouTube에서 모은 유명인 인터뷰 클립에 화자 정체성을 붙인 공개 데이터셋입니다.
- 네트워크는 "이 수천 명 중 지금 말하는 사람은 누구인가?"에 답하도록 학습합니다. 최종 답 바로 앞의 층이 임베딩이 됩니다.
- 분류기는 **마진 손실(margin loss)**(**AAM-softmax**, 가산 각도 마진 소프트맥스(additive angular margin softmax), **ArcFace**라고도 함)을 씁니다. 이 손실은 정답 클래스가 실제보다 각도상 조금 *더 멀리* 있는 것처럼 가정합니다. 그래도 이기려면 네트워크가 같은 화자의 임베딩을 더 좁은 각도 군집으로 모으고, 다른 화자들을 더 멀리 밀어내야 합니다.
- 이는 **얼굴 인식에 쓰는 손실과 같습니다**.

**화자 검증(speaker verification).** "이 두 녹음은 같은 사람인가?"라는 예/아니오 문제입니다. 코사인 유사도를 계산하고 임계값(threshold)과 비교합니다.
- 임계값은 두 가지 오류 사이의 거래입니다. 다른 사람을 받아들이는 오류(오수락, false accept)와 맞는 사람을 거절하는 오류(오거부, false reject)입니다.
- 품질은 **동일 오류율(EER, equal error rate)**로 보고합니다. 두 오류가 같아지는 임계값에서의 오류율이며, 낮을수록 좋습니다. ROC 곡선에서 오수락률과 오거부율이 같아지는 한 점입니다.

**얼굴 재식별(face re-ID)에 대한 직관이 그대로 적용됩니다.** 이것은 차별화 요소(differentiator) 1, 즉 정체성 일관 분리(identity-consistent separation)에서 "7번째 청크(chunk)가 여전히 화자 A인가?"를 판단하는 구성 요소입니다. (청크는 긴 파일에서 한 번에 처리하는 짧은 조각입니다. 08강 참고.)

## 3. 화자 분할(speaker diarization): "누가 언제 말했는가"

**화자 분할(diarisation)** 은 화자를 미리 알지 못한 채 녹음을 화자별 레이블이 붙은 조각으로 나눕니다. 출력은 "화자 A 0.0–4.2 s, 화자 B 4.2–9.0 s, 화자 A 9.0–12.5 s"와 같은 모양입니다. 단어를 받아 적지 않고, 겹친 목소리를 오디오 트랙으로 분리하지도 않습니다.

**pyannote 파이프라인** (우리 랩이 사용: `speaker-diarization-community-1`):
1. **지역 분할(local segmentation).** 신경망이 약 10초 창(**분할 창(segmentation window)**: 네트워크는 고정 길이 입력을 받으므로 긴 녹음을 창 단위로 처리)을 봅니다.
   - 짧은 프레임마다, 최대 몇 명의 *지역 화자(local speaker)* 중 누가 활동 중인지 출력합니다. "지역"은 레이블이 이 창 안에서만 유효하다는 뜻입니다. 창 1의 화자 1이 창 2에서는 화자 2일 수 있습니다.
   - 두 명 이상이 동시에 말하는 **겹친 발화(overlapped speech)** 를 다룹니다.
   - "**파워셋(powerset)**" 다중 클래스 정식화를 사용합니다. 화자마다 독립적인 예/아니오 하나씩을 내는 대신, 모든 *조합* 중 하나의 클래스를 고릅니다. 아무도 없음, A, B, C, A+B, A+C, B+C입니다. 그러면 겹침도 하나의 클래스일 뿐이어서, 여러 예/아니오 출력보다 학습하기 쉽습니다.
2. **임베딩(embedding).** 각 창의 각 지역 화자마다 화자 임베딩(2절)을 계산합니다. community-1 모델 카드는 WeSpeaker 임베딩을 언급합니다.
3. **전역 군집화(global clustering).** 창들에 걸친 지역 화자를 전역 정체성으로 연결합니다.
   - **군집화(clustering)** 는 정답 레이블 없이 비슷한 벡터끼리 같은 그룹으로 묶는 일입니다.
   - **병합 군집화(agglomerative clustering)**(pyannote 3.x): 모든 임베딩을 각자 하나의 그룹으로 시작해, 가장 가까운 두 그룹의 거리가 임계값보다 멀어질 때까지 가장 가까운 두 그룹을 반복해서 합칩니다.
   - **VBx**(community-1이 언급): **베이즈 HMM(Bayesian HMM)** 군집화입니다. HMM(은닉 마르코프 모델, hidden Markov model)은 "누가 말하는가"를 시간에 따라 일정한 전환 확률로 바뀌는 숨은 상태(hidden state)로 보고, 임베딩은 그 상태를 잡음 섞어 측정한 값으로 봅니다. 이산 상태를 가진 상태 추정기와 비슷합니다. "베이즈(Bayesian)"와 "VB"(변분 베이즈, variational Bayes)는 미지수에 확률분포를 주고 근사 방법으로 맞춘다는 뜻입니다. 시간 모델 덕분에 임베딩을 각각 독립적으로 합칠 때보다 레이블이 매끄럽습니다.
4. **출력.** 화자 레이블의 타임라인(timeline)입니다. community-1은 순간마다 화자가 한 명인 "exclusive" 버전도 반환하며, 이는 전사(transcript)와 정렬하기 더 쉽습니다.

**지표: DER** (화자 분할 오류율, diarisation error rate) = (누락된 음성 + 오경보 + 화자 혼동) / 전체 음성.
- **누락된 음성(missed speech):** 누군가 말하는데 시스템은 아무도 안 말한다고 합니다.
- **오경보(false alarm):** 아무도 안 말하는데 시스템은 누군가 말한다고 합니다. 음성인지 아닌지 판단하는 일을 **VAD**(음성 활동 검출, voice activity detection)라고 합니다.
- **화자 혼동(speaker confusion):** 음성은 들었지만 엉뚱한 화자에게 배정합니다.
- 예: 100초의 음성에서 3초가 누락, 2초가 오경보, 4초가 혼동이면 DER = (3 + 2 + 4) / 100 = 0.09입니다.

**우리 측정값:**

| 시나리오(Scenario) | DER | 비고 |
|---|---|---|
| 2–3인 대화 | ~0.09 | 좋음 |
| 군중과 음악 위의 건배사 | ~0.11–0.14 | 좋음 |
| 거리 인터뷰 | ~0.34 | 나쁨: 조용한 행인이 인터뷰 대상의 클러스터에 합쳐짐 |

**대안:**
- **종단간(end-to-end) 화자 분할(EEND):** 네트워크 하나가 오디오에서 곧바로 화자 활동을 출력하며, 임베딩과 군집화 단계가 따로 없습니다.
- **음성 인식(ASR) 내부의 화자 분할(WhisperX 방식 파이프라인).** **ASR**(자동 음성 인식, automatic speech recognition)은 음성을 텍스트로 바꿉니다. WhisperX는 Whisper ASR 모델, 단어 단위 타임스탬프, 화자 분할 모델(pyannote)을 결합하여 모든 단어에 화자 레이블을 붙입니다.
- **업체 API.** API(응용 프로그램 인터페이스, application programming interface)는 인터넷으로 호출하는 서비스입니다. 오디오를 보내면 결과가 돌아옵니다. ElevenLabs, AssemblyAI 등이 전사와 함께 화자 분할을 판매합니다.

## 4. 블라인드 음성 분리(blind speech separation, "칵테일 파티 문제(cocktail party problem)")

**칵테일 파티 문제**는 사람이 여럿이 떠드는 방에서 한 목소리만 따라가는 능력을 가리킵니다. 기계에는 어렵습니다. **블라인드(blind)** 분리는 누가 말하는지 미리 아는 정보가 전혀 없고 혼합 신호만 주어진다는 뜻입니다.

**순열 문제(permutation problem).** "화자 1"과 "화자 2"를 출력하는 네트워크는 어느 출력이 어느 사람이어야 하는지 알 수 없습니다.
- 학습은 출력 1을 목표 1과, 출력 2를 목표 2와 비교합니다. 네트워크가 올바른 두 목소리를 순서만 바꿔 내놓으면, 답은 맞는데도 손실이 엄청나게 커집니다.
- 출력에는 자연스러운 순서가 없습니다. 똑같은 두 입자의 이름표와 같습니다.

두 가지 해결책:
- **딥 클러스터링(deep clustering)** (2016): 네트워크가 모든 시간–주파수 빈(time-frequency bin, 스펙트로그램의 한 칸: 한 프레임의 한 주파수)에 임베딩을 주어, 같은 화자가 우세한 빈끼리 가깝게 만듭니다. 그다음 **k-means**를 돌립니다. k개의 중심을 고르고, 각 빈을 가장 가까운 중심에 배정하고, 각 중심을 그 빈들의 평균으로 옮기는 일을 반복합니다. 묶인 그룹이 화자별 마스크가 됩니다.
- **PIT, 순열 불변 학습(permutation-invariant training)** (2016–17): 출력과 목표의 모든 대응에 대해 손실을 계산하고, 그중 최선인 것으로 학습합니다. 화자가 2명이면 대응이 2가지, N명이면 N!가지입니다. 지금은 표준입니다. 다중 객체 추적(multi-object tracking)에서 검출을 트랙에 맞추는 배정(assignment) 단계와 같은 발상입니다.

**아키텍처.** 모두 혼합 신호를 받아 화자마다 신호 하나를 출력합니다.
- **Conv-TasNet** (2018): 합성곱 신경망(TasNet = 시간 영역 오디오 분리 네트워크, time-domain audio separation network)으로, STFT 대신 학습된 필터로 파형을 직접 다룹니다.
- **DPRNN** (이중 경로 RNN, dual-path RNN): 짧은 청크 안에서 RNN을 돌리고 청크들 사이에서도 RNN을 돌리는 일을 번갈아 하여 아주 긴 시퀀스를 다룹니다.
- **SepFormer:** 같은 이중 경로 발상을 쓰는 트랜스포머(transformer, 어텐션 기반) 네트워크입니다.
- **TF-GridNet:** STFT 격자 위에서 동작하며, 주파수 방향과 시간 방향 모델링을 번갈아 합니다.

결과:
- **깨끗한 합성 2화자 데이터셋(WSJ0-2mix)에서 +20 dB SI-SDRi를 크게 넘는** 성능에 도달합니다.
  - **WSJ0-2mix**는 월스트리트 저널(Wall Street Journal) 코퍼스의 깨끗한 낭독 음성 두 개를 무작위 레벨로 더해 만듭니다.
  - **SI-SDR**(척도 불변 신호 대 왜곡비, scale-invariant signal-to-distortion ratio, 05강)은 목표 신호 에너지 대 오차 에너지의 비를 dB로 나타내며 전체 음량은 무시합니다. **SI-SDRi**의 "i"는 *개선(improvement)*, 즉 출력의 SI-SDR에서 처리하지 않은 혼합 신호의 SI-SDR을 뺀 값입니다.
  - +20 dB는 오차의 에너지가 목표 신호의 1/100이라는 뜻입니다.
- 잡음과 잔향이 있는 실제 녹음에서는 급격히 떨어집니다. **WHAMR!** 같은 벤치마크는 2화자 혼합에 실제 잡음과 방 잔향을 더해 이를 측정합니다.
- 최대 화자 수를 미리 알아야 합니다. 네트워크의 출력 슬롯 수가 고정되어 있기 때문입니다.

**우리에게 주는 의미.** 목소리에서 목소리를 분리하는 것은 어렵고 별도로 연구되는 문제입니다. 우리 랩에서 SAM Audio의 구간 고정(span-anchored) 음성-음성 분리는 평균 **0~+1 dB** 정도이며, 청크 사이에서 정체성이 뒤바뀝니다. (**구간(span)** 은 힌트로 주는 시작–끝 시간 범위입니다. 08강.) 프롬프트(prompt)로 해결되는 문제가 아니라 우회해서 설계해야 하는 약점입니다.

## 5. 목표 화자 추출(target-speaker extraction): "이 목소리를 주세요"

**목표 화자 추출**은 모든 목소리가 아니라 지정한 한 목소리만 뽑아냅니다.

**조건화(conditioning).** 분리기(separator)를, 목표 화자의 짧고 깨끗한 샘플에서 얻은 **등록 음성(enrolment)** 임베딩으로 조건화합니다.
- **등록(enrolment)** 은 휴대폰에 지문을 등록하는 것과 같은 절차입니다. 그 사람의 목소리를 미리 한 번 녹음해 임베딩으로 바꿉니다.
- 네트워크를 *조건화*한다는 것은 그 임베딩을 추가 입력으로 주어 출력이 그에 따라 달라지게 한다는 뜻입니다.
- 예: **VoiceFilter**(Google, 2018), **SpeakerBeam**(NTT, 일본의 통신 연구소).

**왜 도움이 되는가.** 순열 문제와 화자 수 미지 문제가 사라집니다. 출력은 항상 "등록된 그 사람"입니다.

**우리에게.** 이것이 차별화 요소 6, 즉 파일 하나 또는 여러 파일 전체에서 "이 목소리 찾기"입니다. SAM Audio에는 오디오 예시 프롬프트(audio-example prompt)가 없습니다. (**프롬프트(prompt)** 는 모델에 주는 지시입니다. SAM Audio는 텍스트, 마스킹된 영상, 시간 구간은 받지만 "내가 말하는 목소리의 녹음은 이것"이라는 입력은 받지 않습니다.)

## 6. 시청각(audio-visual): 얼굴 활용

**시청각** 방법은 소리뿐 아니라 영상도 씁니다. 화면 속 얼굴은 목소리와 시간을 맞춰 입술을 움직이며, 이는 마이크가 절대 주지 못하는 정보입니다.

- **Looking to Listen** (Google, 2018): 영상에서 얻은 얼굴 임베딩을 혼합 신호(mixture) 스펙트로그램(spectrogram)과 결합하여, 화면에 보이는 각 화자의 **마스크(mask)**(시간–주파수 빈마다 0~1 이득, 05강)를 예측합니다. 블로그 글이 훌륭합니다.
- **능동 화자 검출(ASD, active speaker detection)**: 예를 들어 **AVA-ActiveSpeaker** 데이터셋 기반의 TalkNet, Light-ASD. **얼굴 트랙(face track)**(추적처럼 영상 프레임들에 걸쳐 따라간 같은 얼굴)마다 "이 사람이 지금 말하고 있는가?"를 판단합니다. 정밀한 시각적 타이밍 기준점(anchor)을 제공합니다.
  - AVA-ActiveSpeaker는 영화 클립에서 보이는 모든 얼굴에 말하는 중/아님 레이블을 붙인 벤치마크입니다.
- **립싱크(lip-sync)** 는 화면 속 화자와 화면 밖 목소리(해설자나 카메라 촬영자(camera holder) 등)도 구별해 줍니다.
  - 립싱크 모델은 입 움직임과 오디오가 시간상 맞는지 측정합니다. 맞는 입이 없는 목소리는 화면 밖입니다.

**우리에게.** 이것들이 차별화 요소 5의 시각 단서(visual cue)입니다. 화자 임베딩(2절)과 결합하면 SAM Audio에 없는 정체성 추적을 얻을 수 있습니다.

## 읽거나 볼 자료

- RNNoise demo and explainer (blog-style, interactive): https://jmvalin.ca/demo/rnnoise/
- DeepFilterNet repo: https://github.com/Rikorose/DeepFilterNet
- ElevenLabs, *What is speaker diarization?* (a vendor primer; 업체 입문 자료): https://elevenlabs.io/blog/what-is-speaker-diarization
- pyannote:
  - repo: https://github.com/pyannote/pyannote-audio
  - community-1 model card (gated: Hugging Face에 로그인해 사용 조건에 동의해야 내려받을 수 있음. Hugging Face는 대부분의 오픈 모델을 호스팅하는 웹사이트): https://huggingface.co/pyannote/speaker-diarization-community-1
  - project site: https://pyannote.github.io/
- SpeechBrain (화자 임베딩, 검증, 분리 튜토리얼 제공): https://github.com/speechbrain/speechbrain
- Google Research blog, *Looking to Listen: audio-visual speech separation*: https://research.google/blog/looking-to-listen-audio-visual-speech-separation/
- TalkNet active speaker detection: https://github.com/TaoRuijie/TalkNet-ASD
- Hugging Face Audio Course (ASR, audio classification and pipelines): https://huggingface.co/learn/audio-course
- 논문(Papers):
  - PIT: https://arxiv.org/abs/1607.00325
  - Conv-TasNet: https://arxiv.org/abs/1809.07454
  - VoiceFilter: https://arxiv.org/abs/1810.04826
  - Looking to Listen: https://arxiv.org/abs/1804.03619

## 실습 (1시간)

1. `US-3.1`에 대해 랩의 화자 분할을 실행하고(`seplab diarize --help` 참고; `.venv-diar`에서 실행), 예측된 타임라인을 정답(ground truth: 클립과 함께 제공되는, 옳다고 알려진 화자 레이블)과 비교해 그려 보세요.
2. 두 화자의 3초 구간에서 화자 임베딩을 추출하세요.
3. 코사인 유사도 행렬을 그리세요. 얼굴 재식별처럼 같은 화자 블록이 밝게 나타나야 합니다.
4. 유사도가 애매한 구간을 하나 찾아 직접 들어 보세요.
