# 07. 음성: 향상, 화자 분할, 화자 분리, 그리고 시청각 처리

> 영어 원문(English original): [07-speech-diarization-av.md](../07-speech-diarization-av.md)

우리 페르소나(P1–P5) 대부분은 **목소리**를 다루므로, 이번 강의는 이 분야의 음성 쪽을 다룹니다.

## 1. 음성 향상(speech enhancement): 잡음 제거(denoising)와 잔향 제거(dereverberation)

**고전적 방법.** 잡음의 파워 스펙트럼(power spectrum)을 추정한 뒤, 위너 필터(Wiener filter) 또는 스펙트럼 차감(spectral subtraction) 이득을 적용합니다(05강).

**RNNoise** (Jean-Marc Valin, 2017). **하이브리드(hybrid)** 설계이며 좋은 엔지니어링의 모범입니다.
1. 고전적 DSP로 약 22개의 대역 에너지(band energy)와 피치(pitch) 특징을 계산합니다.
2. 아주 작은 순환 신경망(recurrent network)이 각 대역의 이득(band gain)을 예측합니다.
3. DSP가 그 이득을 적용하고, 여기에 피치 콤 필터(comb filter)를 더합니다.

CPU에서 실시간(real-time)으로 동작합니다. 데모 페이지는 신경망 오디오 모델에 대한 블로그형 설명 중 최고입니다.

**DeepFilterNet** (2022–23). 복소 "딥 필터(deep filter)"(빈(bin)마다 짧은 복소 FIR 필터)를 예측하며, 이는 위상(phase) 처리에 도움이 됩니다. 실시간이고 오픈 소스입니다.

**상용 향상기(commercial enhancer).** Adobe Podcast *Enhance Speech*, ElevenLabs *Voice Isolator*, Descript *Studio Sound*, Krisp, NVIDIA Broadcast, 그리고 휴대폰의 음성 분리 모드가 있습니다.
- 일부는 **생성적(generative)** 으로 동작하여 음성을 "스튜디오 녹음"처럼 들리게 만듭니다.
- 사용자들은 강도를 높이면 로봇 같거나 먹먹한 아티팩트(artifact)와 단어 끝이 잘리는 현상이 생긴다고 보고합니다. 이는 일화(anecdote)이며 우리 [시장 조사 노트](../../../market-studies/ai-media-saas-screening/research-notes/demand_pain_points.md)에 모아 두었습니다.
- 08강과 같은 상충 관계입니다. 그럴듯함(plausibility) 대 충실도(faithfulness)입니다.

## 2. 화자 임베딩(speaker embedding): 목소리를 위한 재식별(re-ID)

**임베딩(embedding).** 신경망이 약 1–3초의 음성 구간을 고정 길이 벡터(보통 192–512차원)로 사상(map)합니다.
- 같은 화자는 (코사인 유사도(cosine similarity) 기준으로) 가깝게 모입니다.
- 다른 화자는 멀리 떨어집니다.

**역사.** i-vector, 그다음 **x-vector**(TDNN), 이어서 **ECAPA-TDNN**과 ResNet 변형(WeSpeaker)입니다.

**학습.** 수천 명의 VoxCeleb 화자에 대한 분류 문제를 마진 손실(margin loss, AAM-softmax/ArcFace)로 학습합니다. 이는 **얼굴 인식에 쓰는 손실과 같습니다**.

**화자 검증(speaker verification).** 코사인 유사도에 임계값(threshold)을 적용하며, 품질은 동일 오류율(EER, equal error rate)로 보고합니다.

**얼굴 재식별(face re-ID)에 대한 직관이 그대로 적용됩니다.** 이것은 차별화 요소(differentiator) 1, 즉 정체성 일관 분리(identity-consistent separation)에서 "7번째 청크(chunk)가 여전히 화자 A인가?"를 판단하는 구성 요소입니다.

## 3. 화자 분할(speaker diarization): "누가 언제 말했는가"

**pyannote 파이프라인** (우리 랩이 사용: `speaker-diarization-community-1`):
1. **지역 분할(local segmentation).** 신경망이 약 10초 창(window)을 보고, 겹친 발화(overlapped speech)를 포함해 최대 몇 명의 지역 화자(local speaker)에 대한 프레임 단위 활동(frame-level activity)을 출력합니다. "파워셋(powerset)" 다중 클래스 정식화를 사용합니다.
2. **임베딩(embedding).** 각 창의 각 지역 화자마다 계산합니다. community-1 모델 카드는 WeSpeaker 임베딩을 언급합니다.
3. **전역 군집화(global clustering).** 창들에 걸친 지역 화자를 전역 정체성으로 연결합니다. community-1 카드는 **VBx**(베이즈 HMM 군집화)를 언급하며, pyannote 3.x는 병합 군집화(agglomerative clustering)를 썼습니다.
4. **출력.** 화자 레이블의 타임라인(timeline)입니다. community-1은 순간마다 화자가 한 명인 "exclusive" 버전도 반환하며, 이는 전사(transcript)와 정렬하기 더 쉽습니다.

**지표: DER** (화자 분할 오류율, diarisation error rate) = (누락된 음성 + 오경보 + 화자 혼동) / 전체 음성.

**우리 측정값:**

| 시나리오(Scenario) | DER | 비고 |
|---|---|---|
| 2–3인 대화 | ~0.09 | 좋음 |
| 군중과 음악 위의 건배사 | ~0.11–0.14 | 좋음 |
| 거리 인터뷰 | ~0.34 | 나쁨: 조용한 행인이 인터뷰 대상의 클러스터에 합쳐짐 |

**대안:**
- 종단간(end-to-end) 화자 분할(EEND).
- 음성 인식(ASR, automatic speech recognition) 내부의 화자 분할(WhisperX 방식 파이프라인).
- 업체 API. ElevenLabs, AssemblyAI 등이 전사와 함께 화자 분할을 판매합니다.

## 4. 블라인드 음성 분리(blind speech separation, "칵테일 파티 문제(cocktail party problem)")

**순열 문제(permutation problem).** "화자 1"과 "화자 2"를 출력하는 네트워크는 어느 출력이 어느 사람이어야 하는지 알 수 없습니다.
- **딥 클러스터링(deep clustering)** (2016): 모든 시간–주파수 빈(time-frequency bin)을 임베딩한 뒤 k-means를 돌립니다.
- **PIT, 순열 불변 학습(permutation-invariant training)** (2016–17): 출력과 목표의 모든 대응에 대해 손실을 계산하고, 그중 최선인 것으로 학습합니다. 지금은 표준입니다.

**아키텍처.** Conv-TasNet (2018), DPRNN, SepFormer, TF-GridNet.
- **깨끗한 합성 2화자 데이터셋(WSJ0-2mix)에서 +20 dB SI-SDRi를 크게 넘는** 성능에 도달합니다.
- 잡음과 잔향이 있는 실제 녹음에서는 급격히 떨어집니다.
- 최대 화자 수를 미리 알아야 합니다.

**우리에게 주는 의미.** 목소리에서 목소리를 분리하는 것은 어렵고 별도로 연구되는 문제입니다. 우리 랩에서 SAM Audio의 구간 고정(span-anchored) 음성-음성 분리는 평균 **0~+1 dB** 정도이며, 청크 사이에서 정체성이 뒤바뀝니다. 프롬프트(prompt)로 해결되는 문제가 아니라 우회해서 설계해야 하는 약점입니다.

## 5. 목표 화자 추출(target-speaker extraction): "이 목소리를 주세요"

**조건화(conditioning).** 분리기(separator)를, 목표 화자의 짧고 깨끗한 샘플에서 얻은 **등록 음성(enrolment sample)** 임베딩으로 조건화합니다. 예: **VoiceFilter**(Google, 2018), SpeakerBeam(NTT).

**왜 도움이 되는가.** 순열 문제와 화자 수 미지 문제가 사라집니다. 출력은 항상 "등록된 그 사람"입니다.

**우리에게.** 이것이 차별화 요소 6, 즉 파일 하나 또는 여러 파일 전체에서 "이 목소리 찾기"입니다. SAM Audio에는 오디오 예시 프롬프트(audio-example prompt)가 없습니다.

## 6. 시청각(audio-visual): 얼굴 활용

- **Looking to Listen** (Google, 2018): 영상에서 얻은 얼굴 임베딩을 혼합 신호(mixture) 스펙트로그램(spectrogram)과 결합하여, 화면에 보이는 각 화자의 마스크(mask)를 예측합니다. 블로그 글이 훌륭합니다.
- **능동 화자 검출(ASD, active speaker detection)**: 예를 들어 AVA-ActiveSpeaker 데이터셋 기반의 TalkNet, Light-ASD. 얼굴 트랙(face track)마다 "이 사람이 지금 말하고 있는가?"를 판단합니다. 정밀한 시각적 타이밍 기준점(anchor)을 제공합니다.
- **립싱크(lip-sync)** 는 화면 속 화자와 화면 밖 목소리(해설자나 카메라 촬영자(camera holder) 등)도 구별해 줍니다.

**우리에게.** 이것들이 차별화 요소 5의 시각 단서(visual cue)입니다. 화자 임베딩(2절)과 결합하면 SAM Audio에 없는 정체성 추적을 얻을 수 있습니다.

## 읽거나 볼 자료

- RNNoise demo and explainer (blog-style, interactive): https://jmvalin.ca/demo/rnnoise/
- DeepFilterNet repo: https://github.com/Rikorose/DeepFilterNet
- ElevenLabs, *What is speaker diarization?* (a vendor primer; 업체 입문 자료): https://elevenlabs.io/blog/what-is-speaker-diarization
- pyannote:
  - repo: https://github.com/pyannote/pyannote-audio
  - community-1 model card (gated; Hugging Face에서 사용 조건에 동의해야 함): https://huggingface.co/pyannote/speaker-diarization-community-1
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

1. `US-3.1`에 대해 랩의 화자 분할을 실행하고(`seplab diarize --help` 참고; `.venv-diar`에서 실행), 예측된 타임라인을 정답(ground truth)과 비교해 그려 보세요.
2. 두 화자의 3초 구간에서 화자 임베딩을 추출하세요.
3. 코사인 유사도 행렬을 그리세요. 얼굴 재식별처럼 같은 화자 블록이 밝게 나타나야 합니다.
4. 유사도가 애매한 구간을 하나 찾아 직접 들어 보세요.
