# 06. 딥러닝 기반 음원 분리(Deep learning for separation)

> 영어 원문(English original): [06-deep-learning-separation.md](../06-deep-learning-separation.md)

딥러닝(deep learning)은 크고 유연한 함수(수백만 개의 매개변수를 가진 신경망)를 데이터에 맞추는 일입니다. 분리에서 이 함수는 혼합 신호를 받아 음원들을 출력합니다. 강의 05처럼 사전 가정(prior)을 사람이 직접 코딩하는 대신, 데이터가 그것을 제공하게 합니다.

## 1. 지도 학습 레시피(The supervised recipe)

**지도 학습(supervised learning)**은 입력과 원하는 출력의 예시로부터 배우는 것입니다. 회귀(regression)와 같습니다. 큰 학습 세트에서 모델의 출력과 알려진 정답 사이의 오차를 최소화하는 매개변수를 고릅니다. 여기서 입력은 혼합 신호이고 정답은 실제 스템입니다.

**데이터(data).**
- 분리된 스템(stem)을 모읍니다.
- 스템을 **무작위로 리믹싱(remixing)**하여 학습용 혼합 신호를 즉석에서 만듭니다: 서로 다른 곡의 스템, 무작위 이득, 채널 교환(왼쪽과 오른쪽 맞바꿈), 음높이·템포 변경.
- 이것이 **증강(augmentation)**입니다. 레이블이 유효하게 유지되는 변형을 적용해 소수의 실제 예시로 많은 새 학습 예시를 만드는 것입니다. 이미지 작업에서 이미 아시는 무작위 뒤집기, 자르기에 해당합니다.
- 리믹싱 증강(remixing augmentation)은 수백 곡으로 막대한 수의 혼합 신호를 만들어 냅니다. 이 분야에서 가장 중요한 기법입니다.

**모델(model).** 혼합 신호를 다음 중 하나로 매핑합니다.
- 음원마다의 **마스크(mask)**(스펙트로그램(spectrogram) 모델). 네트워크가 강의 05처럼 모든 시간-주파수 빈마다 음원에 속하는 비율(0~1)을 예측합니다. 마스크를 혼합 신호의 스펙트로그램에 곱한 뒤 파형으로 역변환합니다. 또는
- 음원 **파형(waveform)** 자체(시간 영역(time domain) 모델). 네트워크가 샘플을 직접 출력합니다. 마스크도, 별도의 위상 처리도 필요 없습니다.

**손실 함수(loss function).** 손실은 출력이 얼마나 틀렸는지를 재는 하나의 숫자입니다. 학습은 경사 하강법(gradient descent)으로 이를 줄이도록 가중치(weights)를 조정합니다.
- 크기(magnitude) 또는 파형에 대한 **L1** 또는 **L2**. L1은 평균 절대 차이 mean |a − b|이고, L2는 평균 제곱 차이 mean (a − b)², 이미 아시는 최소제곱 오차입니다. L1은 소수의 큰 오차에 덜 끌려갑니다.
- **음의 SI-SDR(negative SI-SDR)**(강의 05). 점수의 음수를 최소화하는 것은 점수를 최대화하는 것과 같습니다.
- **다중 해상도 STFT 손실(multi-resolution STFT loss)**: 출력과 실제 음원의 스펙트로그램을 여러 윈도 크기(예: 512, 1024, 2048 샘플)로 동시에 비교합니다.
  - 이유: 짧은 윈도는 타이밍이 선명하지만 주파수가 흐리고, 긴 윈도는 주파수가 선명하지만 타이밍이 흐립니다. 강의 03의 시간-주파수 트레이드오프이며, 진동 신호 해석의 불확정성 트레이드오프와 같습니다.
  - 여러 윈도 크기를 쓰면 이 모든 척도에서의 오차에 불이익을 줍니다.

**추론(inference).** 추론은 학습된 모델을 새 데이터에 실행하는 것입니다.
- 긴 파일은 한 번에 메모리에 들어가지 않습니다. **겹치는 조각(chunk)**(예: 서로 겹치는 10초 조각)으로 처리하고 **크로스페이드(crossfade)**합니다. 겹치는 구간에서 한 조각은 서서히 작아지고 다음 조각은 서서히 커져서 이음매에 딱 소리가 나지 않습니다. 우리 실험실이 SAM Audio에서 하는 방식과 똑같습니다.
- 계산량을 더 쓰고 품질을 높이는 테스트 시점 기법:
  - **시프트 트릭(shift trick)**: 입력을 몇 샘플 이동시켜 분리한 뒤 출력을 되돌리고, 여러 이동에 대해 평균합니다. 반복 측정을 평균해 무작위 오차를 줄이는 것과 같습니다.
  - **앙상블(ensemble)**: 서로 다른 여러 모델을 실행해 출력을 평균합니다.

**컴퓨터 비전 전공자를 위해:** 스펙트로그램 분리는 **이미지-이미지 회귀(image-to-image regression)**이며, 본질적으로 소프트 레이블(soft label)을 쓰는 시맨틱 분할(semantic segmentation)입니다. 마스크는 픽셀별 음원 확률입니다. 많은 아키텍처가 비전에서 곧바로 넘어왔습니다.

## 2. 아키텍처는 어떻게 진화했는가(How the architectures evolved)

**아키텍처(architecture)**는 네트워크의 배선도입니다. 어떤 층이 있고 어떻게 연결되는가입니다.

| 연도 | 모델(누가) | 아이디어 | 의의 |
|---|---|---|---|
| 2017 | 노래 목소리용 U-Net(Spotify research) | 크기 스펙트로그램에 이미지 U-Net 적용 | 컴퓨터 비전 아키텍처가 오디오로 전이됨을 보임 |
| 2019 | **Spleeter**(Deezer) | U-Net; 2, 4, 5 스템; MIT 라이선스; 매우 빠름 | 모든 노래방 앱과 DAW 플러그인에 음원 분리를 보급 |
| 2019 | **Open-Unmix**(Inria와 Sony) | 크기에 BiLSTM + 다채널 위너 후처리 필터(multichannel Wiener post-filter) | 연구용 깔끔한 기준 구현 |
| 2018–19 | Wave-U-Net, **Conv-TasNet** | 시간 영역: *학습된* 인코더(learned encoder)와 디코더가 STFT를 대체 | 음성에서 이상적 크기 마스크를 능가; 위상(phase) 문제 해결 |
| 2019–21 | **Demucs**에서 **Hybrid Demucs**(Meta)로 | LSTM이 달린 파형 U-Net, 이후 두 갈래(파형과 스펙트로그램) | 수년간 최고의 오픈 음악 모델 |
| 2022 | **HTDemucs**(Meta) | 두 갈래 사이에 영역 교차(cross-domain) 트랜스포머를 둔 하이브리드 | 강력하고 널리 쓰이며 노트북에서 돌릴 만큼 작음 |
| 2022 | **BSRNN**(대역 분할 RNN, band-split RNN) | 스펙트럼을 하위 대역으로 나눠 각 대역과 대역 간 상호작용을 모델링 | 대역 분할(band-split)이 승리 패턴이 됨 |
| 2023 | **BS-RoFormer**(ByteDance) | 대역 분할 + 회전 위치 임베딩(rotary position embedding, RoPE)을 쓰는 트랜스포머, 시간 방향과 대역 방향 어텐션을 번갈아 적용 | Sound Demixing Challenge 2023 음악 트랙 1위(논문 기준); 지금도 리더보드(leaderboard)들의 뼈대 |
| 2023–24 | **Mel-RoFormer**, SCNet | 멜 스케일(mel-scale)의 겹치는 대역; 희소 압축 네트워크(sparse compression network) | 작은 개선; 커뮤니티 파인튜닝(fine-tune)이 이를 기반으로 함 |

**표의 용어를 하나씩.**
- **U-Net:** 알파벳 U 모양의 네트워크. 왼쪽은 이미지를 단계적으로 줄이며(넓은 맥락을 보기 위해), 오른쪽은 다시 키우며(세부를 복원하기 위해), **스킵 연결(skip connection)**이 왼쪽의 세밀한 정보를 오른쪽으로 복사해 줍니다. 의료 영상 분할을 위해 만들어졌기 때문에 비전에서 오디오로 전이됩니다. 출력이 입력과 같은 크기이며, 마스크에 필요한 것이 바로 그것입니다.
- **Spleeter:** 음악 스트리밍 회사 Deezer의 오픈소스 분리기. **노래방(karaoke)** 앱은 노래에서 보컬을 제거합니다. **DAW 플러그인(DAW plugin)**은 디지털 오디오 워크스테이션(강의 04의 믹싱 소프트웨어) 안에 붙이는 확장 프로그램입니다. **MIT 라이선스**는 관대한 오픈소스 라이선스로, 상업적 사용을 포함해 누구나 코드를 쓰고 수정할 수 있습니다.
- **RNN과 LSTM:** **순환 신경망(RNN, recurrent neural network)**은 시퀀스를 한 단계씩 읽으며 은닉 상태(hidden state)를 앞으로 전달합니다. 학습된 f를 갖는 상태 공간 모델 x_{k+1} = f(x_k, u_k)와 같습니다. **LSTM**(long short-term memory, 장단기 메모리)은 무엇을 기억하고 잊을지를 학습하는 게이트(gate)가 달린 RNN이라 긴 구간의 정보를 유지할 수 있습니다. **BiLSTM**(양방향 LSTM, bidirectional LSTM)은 시간 순방향 LSTM 하나와 역방향 LSTM 하나를 돌려 합치므로 각 프레임이 과거와 미래를 모두 봅니다. 클립 전체가 필요해서 실시간으로는 돌릴 수 없습니다.
- **Open-Unmix:** Inria(프랑스 연구소)와 Sony의 기준 분리 모델. "후처리 필터(post-filter)"는 네트워크 뒤에 오는 처리 단계로, 여기서는 강의 05의 다채널 위너 필터입니다.
- **Wave-U-Net:** 스펙트로그램이 아니라 원시 파형(1차원)에 직접 작동하는 U-Net.
- **Conv-TasNet**(convolutional time-domain audio separation network, 합성곱 시간 영역 오디오 분리 네트워크):
  - STFT는 고정된 사인파 필터 집합입니다. Conv-TasNet은 대신 **학습된 인코더(learned encoder)**, 즉 필터를 데이터에서 학습하는 합성곱 층을 씁니다. 파형을 특징 격자로 바꾸고, 그 학습된 공간에서 마스크를 적용하고, **디코더(decoder)**가 다시 파형으로 바꿉니다.
  - 신호를 크기와 위상으로 나누지 않으므로 별도의 위상 문제가 없습니다. "위상 문제 해결"이 가리키는 바입니다.
  - "이상적 크기 마스크를 능가"는 출력 점수가 강의 05의 오라클 마스크 상한(혼합 신호의 위상을 유지하는 방식)보다 높았다는 뜻입니다.
- **Demucs**(Deep Extractor for Music Sources)와 **Hybrid Demucs:** Demucs는 가운데에 LSTM이 있는 파형 U-Net입니다. Hybrid Demucs는 파형용 U-Net과 스펙트로그램용 U-Net을 나란히 두고 출력을 결합합니다. **Meta**는 이를 공개한 회사입니다.
- **트랜스포머(transformer):** **어텐션(attention)** 층으로 만든 네트워크.
  - **어텐션**은 시퀀스의 각 요소가 다른 모든 요소에 대한 가중 평균을 계산하게 하며, 가중치는 내용에서 학습됩니다. 아무리 멀리 떨어져 있어도 두 위치가 직접 상호작용할 수 있습니다. 계산 비용은 시퀀스 길이의 제곱에 비례해 늘어납니다.
  - HTDemucs의 **영역 교차 트랜스포머(cross-domain transformer)**는 파형 갈래와 스펙트로그램 갈래가 정보를 교환하게 합니다.
- **BSRNN**(대역 분할 RNN): 스펙트로그램을 주파수 대역으로 나누고, 각 대역에 작은 인코더를 적용한 다음, 한 대역 안에서는 시간 방향으로, 대역 사이에서는 대역 방향으로 RNN을 돌립니다.
- **RoFormer / RoPE:** 어텐션은 스스로는 요소의 순서를 모르므로, **위치 임베딩(position embedding)**이 그 정보를 더합니다. **회전 위치 임베딩(RoPE, rotary position embedding)**은 특징 쌍을 위치에 비례하는 각도만큼 회전시켜 위치를 인코딩합니다. 그러면 어텐션이 두 요소 사이의 *상대* 거리에 의존합니다. BS-RoFormer는 이를 한 축이 시간, 다른 축이 대역인 격자에 적용하고 축마다 번갈아 어텐션을 합니다. 비전에서는 축 방향 어텐션(axial attention)이라 부릅니다.
- **멜 스케일(mel scale):** 음높이 지각을 따르는 주파수 척도로, 1 kHz 아래에서는 대략 선형이고 그 위에서는 로그입니다. **Mel-RoFormer**는 이 척도를 따르며 서로 겹치는 대역을 씁니다.
- **SCNet**(희소 압축 네트워크, sparse compression network): 주파수 축을 대역별로 압축하는 더 가벼운 네트워크.
- **Sound Demixing Challenge(SDX):** 팀들이 숨겨진 테스트 곡을 분리하고 순위를 매기는 대회. **리더보드(leaderboard)**는 그런 테스트의 공개 순위표입니다.
- **파인튜닝(fine-tune):** 이미 학습된 모델을 추가 또는 다른 데이터로 계속 학습시키는 것. 커뮤니티 **파인튜닝**은 공개된 모델에서 시작해 적응시킵니다. 처음부터 학습하는 것보다 계산량이 훨씬 적게 듭니다.

**대역 분할이 잘 되는 이유.**
- 주파수 영역마다 통계적 특성이 다릅니다: 100 Hz 부근의 베이스 기본음, 1–3 kHz 부근의 보컬 포먼트(formant), 8 kHz 이상의 심벌즈. (포먼트는 모음을 만드는 성도(vocal tract)의 공진 피크로, 관의 모드와 비슷합니다.)
- 나누면 모델이 대역별로 용량을 쓰고, 그다음 대역 간 관계를 추론할 수 있습니다.
- 귀의 임계 대역(critical band)을 닮았습니다(강의 01). 귀는 소리를 주파수 대역들로 나누어 분석하는데, 저주파에서는 좁고 고주파에서는 넓습니다.

**현재 최신 기술 수준(state of the art)**(2026년, 우리 조사 노트 [separation_tech_sota.md](../../../market-studies/audio-video-separation/research-notes/separation_tech_sota.md) 참고). "최신 기술 수준"은 발표되었거나 이용 가능한 최고 결과를 뜻합니다.
- 커뮤니티가 학습한 RoFormer 변형과 앙상블이 MVSEP 같은 공개 리더보드를 이끌며, 여러 곡 세트에서 보컬 SDR이 대략 12 dB입니다. SDR은 강의 05의 신호 대 왜곡비(dB)입니다.
- 이제 개선 폭은 연간 수분의 1 dB입니다. **고정 스템 품질은 차별화 요소로서는 포화에 가깝습니다.**

## 3. 영화용 분리와 대사 분리(Cinematic and dialogue separation)

- **The Cocktail Fork Problem**(MERL, 2021)은 **DnR**(Divide and Remaster) 데이터셋과 함께 **대사/음악/효과음(dialogue / music / effects)** 과제를 정의했습니다. MERL은 Mitsubishi Electric Research Laboratories입니다. 이름은 "칵테일 파티 문제"(여러 목소리 속에서 하나를 듣는 문제)를 음원 종류 둘에서 셋으로 확장한 것으로, 포크(fork)는 갈래가 셋입니다. DnR은 Gaudio와 AudioShake가 판매하는 **DME**(대사, 음악, 효과음) 분리의 학계 대응물입니다(강의 04).
- Sound Demixing Challenge 2023에는 음악 트랙과 나란히 영화(cinematic) 트랙이 있었습니다.
- 음성 분리(화자 대 화자)는 자체 계보가 있습니다. 강의 07을 참고하세요.

## 4. 고정 스템 모델의 한계: 프롬프트 모델이 등장한 이유(Limits of fixed-stem models: why prompt models appeared)

**고정 스템이 할 수 없는 것.** {보컬, 드럼, 베이스, 기타(other)}로 학습한 모델은 다음에 답할 수 없습니다.
- "두 번째 기타"
- "왼쪽의 여성"
- "짖는 개"

새로운 스템 종류마다 새로운 분리된 학습 데이터(training data)가 필요합니다.

**데이터 문제는 라이선스 문제이기도 합니다.**
- **MUSDB18**(곡당 스템 4개짜리 150곡의 표준 세트)과 **MoisesDB**(더 세밀한 악기 레이블을 가진 더 큰 세트)는 **비상업용(non-commercial)**입니다. 라이선스가 상업적 사용을 금지합니다.
- 인기 있는 커뮤니티 가중치(weights)의 상당수가 이들로 학습되었습니다. 가중치는 학습된 모델 안의 학습된 숫자들이며, "가중치 파일"이 곧 모델입니다.
- 상용 업체들은(AudioShake는 명시적으로 밝힙니다) 학습 데이터에 대한 라이선스를 구매합니다.
- 데이터가 어디서 왔고 무엇을 해도 되는지를 **출처(provenance)**와 **라이선싱(licensing)**이라 합니다. 미디어 고객은 이를 묻습니다. 써서는 안 되는 데이터로 학습한 모델은 법적 위험이기 때문입니다.

**쿼리 기반 모델(query-conditioned model)**은 첫 번째 문제에 대한 답입니다. **프롬프트(prompt)**(텍스트 설명이나 예시)를 받아 "프롬프트가 설명하는 무엇이든" 분리합니다. 텍스트로 질의하는 AudioSep 같은 모델이 먼저 나왔고, 이어서 SAM Audio가 나왔습니다(강의 08).

## 읽거나 볼 자료(Read or watch)

- ISMIR 2020 tutorial, "deep learning approaches" 장들, 코드 포함: https://source-separation.github.io/tutorial/
- Open-Unmix website, 아키텍처 설명과 오디오 데모 포함: https://sigsep.github.io/open-unmix/
- Spleeter repo: https://github.com/deezer/spleeter
- Demucs repo (README가 아키텍처 역사로 좋음): https://github.com/adefossez/demucs
- PyTorch tutorial, *Music source separation with Hybrid Demucs* (실행 가능): https://docs.pytorch.org/audio/stable/tutorials/hybrid_demucs_tutorial.html
- 커뮤니티 도구(Community tooling), 실무자들이 무엇을 쓰는지 보기 위해:
  - ZFTurbo, *Music Source Separation Training*: https://github.com/ZFTurbo/Music-Source-Separation-Training
  - Ultimate Vocal Remover GUI: https://github.com/Anjok07/ultimatevocalremovergui
  - MVSEP quality checker (리더보드): https://mvsep.com/quality_checker/
  - BS-RoFormer reference implementation (lucidrains): https://github.com/lucidrains/BS-RoFormer
- 논문(Papers), 원문을 보고 싶다면(각각 짧고 그림이 있음):
  - BSRNN: https://arxiv.org/abs/2209.15174
  - BS-RoFormer: https://arxiv.org/abs/2309.02612
  - Mel-RoFormer: https://arxiv.org/abs/2310.01809
  - HTDemucs: https://arxiv.org/abs/2211.08553
  - Conv-TasNet: https://arxiv.org/abs/1809.07454
  - The Cocktail Fork Problem (DnR): https://arxiv.org/abs/2110.09958

## 실습(Exercise, 1시간)

PyTorch Hybrid Demucs 튜토리얼을 실험실 음악 클립(`US-6.1` 또는 `US-7.1`)에 실행하고, 데모의 SAM Audio 텍스트 프롬프트와 비교합니다.

**무엇이든 실행하기 전에:**
- 별도의 venv(가상 환경, virtual environment: 설치가 다른 프로젝트를 망가뜨리지 않도록 분리된 파이썬 패키지 집합)를 사용합니다.
- 데모가 유휴 상태일 때, 제한된 스코프(capped scope) 안에서 실행합니다: `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 python ...`.
  - `systemd-run --scope`는 프로그램을 자원이 제한된 리눅스 그룹 안에서 시작합니다.
  - `MemoryMax=8G`는 RAM을 8 GiB로 제한하고, `MemorySwapMax=0`은 디스크 스왑(swap)으로 넘치는 것을 금지합니다.
  - 공유 머신에서는 폭주한 작업이 메모리를 소진해(메모리 부족, OOM(out-of-memory) 강제 종료) 다른 작업까지 쓰러뜨리는 대신 스스로 중단됩니다.
- GPU 작업은 한 번에 하나만 실행합니다.

**답할 질문:**
1. 표준 스템에서는 어느 출력이 더 깨끗한가?
2. 어느 쪽이 "리드 기타만"을 할 수 있는가?
3. 어느 출력이 합산하면 혼합 신호가 되는가? Σ 출력과 믹스의 SI-SDR로 확인합니다.
