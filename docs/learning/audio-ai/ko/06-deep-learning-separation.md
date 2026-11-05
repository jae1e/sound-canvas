# 06. 딥러닝 기반 음원 분리(Deep learning for separation)

> 영어 원문(English original): [06-deep-learning-separation.md](../06-deep-learning-separation.md)

## 1. 지도 학습 레시피(The supervised recipe)

**데이터(data).**
- 분리된 스템(stem)을 모읍니다.
- 스템을 **무작위로 리믹싱(remixing)**하여 학습용 혼합 신호를 즉석에서 만듭니다: 서로 다른 곡의 스템, 무작위 이득, 채널 교환, 음높이·템포 변경.
- 리믹싱 증강(remixing augmentation)은 수백 곡으로 막대한 수의 혼합 신호를 만들어 냅니다. 이 분야에서 가장 중요한 기법입니다.

**모델(model).** 혼합 신호를 다음 중 하나로 매핑합니다.
- 음원마다의 **마스크(mask)**(스펙트로그램(spectrogram) 모델), 또는
- 음원 **파형(waveform)** 자체(시간 영역(time domain) 모델).

**손실 함수(loss function):**
- 크기(magnitude) 또는 파형에 대한 L1 또는 L2
- 음의 SI-SDR(negative SI-SDR)
- **다중 해상도 STFT 손실(multi-resolution STFT loss)**: 여러 윈도 크기에서의 스펙트럼 손실로, 강의 03의 시간-주파수 트레이드오프를 다룹니다.

**추론(inference).**
- 긴 파일은 겹치는 조각(chunk)으로 처리한 뒤 크로스페이드(crossfade)합니다. 우리 실험실이 SAM Audio에서 하는 방식과 똑같습니다.
- 테스트 시점 기법: 시프트 트릭(shift trick, 작은 시간 이동들에 대한 예측을 평균)과 여러 모델의 앙상블(ensemble).

**컴퓨터 비전 전공자를 위해:** 스펙트로그램 분리는 **이미지-이미지 회귀(image-to-image regression)**이며, 본질적으로 소프트 레이블(soft label)을 쓰는 시맨틱 분할(semantic segmentation)입니다. 마스크는 픽셀별 음원 확률입니다. 많은 아키텍처가 비전에서 곧바로 넘어왔습니다.

## 2. 아키텍처는 어떻게 진화했는가(How the architectures evolved)

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

**대역 분할이 잘 되는 이유.**
- 주파수 영역마다 통계적 특성이 다릅니다: 100 Hz 부근의 베이스 기본음, 1–3 kHz 부근의 보컬 포먼트(formant), 8 kHz 이상의 심벌즈.
- 나누면 모델이 대역별로 용량을 쓰고, 그다음 대역 간 관계를 추론할 수 있습니다.
- 귀의 임계 대역(critical band)을 닮았습니다(강의 01).

**현재 최신 기술 수준(state of the art)**(2026년, 우리 조사 노트 [separation_tech_sota.md](../../../market-studies/audio-video-separation/research-notes/separation_tech_sota.md) 참고):
- 커뮤니티가 학습한 RoFormer 변형과 앙상블이 MVSEP 같은 공개 리더보드를 이끌며, 여러 곡 세트에서 보컬 SDR이 대략 12 dB입니다.
- 이제 개선 폭은 연간 수분의 1 dB입니다. **고정 스템 품질은 차별화 요소로서는 포화에 가깝습니다.**

## 3. 영화용 분리와 대사 분리(Cinematic and dialogue separation)

- **The Cocktail Fork Problem**(MERL, 2021)은 **DnR** 데이터셋과 함께 **대사/음악/효과음(dialogue / music / effects)** 과제를 정의했습니다. Gaudio와 AudioShake가 판매하는 DME 분리의 학계 대응물입니다.
- Sound Demixing Challenge 2023에는 음악 트랙과 나란히 영화(cinematic) 트랙이 있었습니다.
- 음성 분리(화자 대 화자)는 자체 계보가 있습니다. 강의 07을 참고하세요.

## 4. 고정 스템 모델의 한계: 프롬프트 모델이 등장한 이유(Limits of fixed-stem models: why prompt models appeared)

**고정 스템이 할 수 없는 것.** {보컬, 드럼, 베이스, 기타(other)}로 학습한 모델은 다음에 답할 수 없습니다.
- "두 번째 기타"
- "왼쪽의 여성"
- "짖는 개"

새로운 스템 종류마다 새로운 분리된 학습 데이터(training data)가 필요합니다.

**데이터 문제는 라이선스 문제이기도 합니다.**
- MUSDB18과 MoisesDB는 **비상업용(non-commercial)**입니다.
- 인기 있는 커뮤니티 가중치(weights)의 상당수가 이들로 학습되었습니다.
- 상용 업체들은(AudioShake는 명시적으로 밝힙니다) 학습 데이터에 대한 라이선스를 구매합니다.

**쿼리 기반 모델(query-conditioned model)**은 첫 번째 문제에 대한 답입니다. "프롬프트(prompt)가 설명하는 무엇이든" 분리합니다. 텍스트로 질의하는 AudioSep 같은 모델이 있고, 이어서 SAM Audio가 나왔습니다(강의 08).

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
- 별도의 venv를 사용합니다.
- 데모가 유휴 상태일 때, 제한된 스코프(capped scope) 안에서 실행합니다: `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 python ...`.
- GPU 작업은 한 번에 하나만 실행합니다.

**답할 질문:**
1. 표준 스템에서는 어느 출력이 더 깨끗한가?
2. 어느 쪽이 "리드 기타만"을 할 수 있는가?
3. 어느 출력이 합산하면 혼합 신호가 되는가? Σ 출력과 믹스의 SI-SDR로 확인합니다.
