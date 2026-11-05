# 오디오와 AI 음원 분리(source separation): 엔지니어를 위한 커리큘럼

> 영어 원문(English original): [README.md](../README.md)
>
> 영어 버전이 기준 문서(canonical source)이며, 이 문서는 전문 용어에 익숙해지기 위한 학습용 번역입니다.

**2026-11-05 작성, 사용자 대상.** 공학 수학에 익숙하지만 오디오는 처음인 기계공학자를 위한 문서입니다. 소리의 물리부터 오늘날 음원 분리 서비스의 기반이 되는 딥러닝 및 생성 모델(generative model)까지 다룹니다. `tools/separation-lab`에서의 우리 작업과 [오디오 분리 제품 문서](../../../products/audio-separation/)에 연결되어 있습니다.

읽기 자료는 논문보다 블로그, 인터랙티브 설명, 영상, 튜토리얼을 우선합니다. 논문은 가장 명확한 출처일 때만 넣었고 *(paper)*로 표시했습니다. 모든 링크는 2026-11-05에 확인했습니다.

## 이미 아는 내용과의 대응

| 이미 아는 것 (기계공학) | 오디오에서의 대응 | 강의 |
|---|---|---|
| 파동 방정식, 진동 모드, 공진 | 음파, 배음(harmonics), 룸 모드(room modes), 포먼트(formant) | 1 |
| 신호 및 시스템, 전달 함수, 합성곱(convolution) | LTI 시스템(선형 시불변 시스템)으로서의 방과 마이크, 임펄스 응답(impulse response), 잔향(reverb) | 1, 3 |
| 푸리에 급수와 변환 | 스펙트럼(spectrum), FFT, STFT, 스펙트로그램(spectrogram) | 3 |
| 샘플링과 데이터 수집(DAQ), 에일리어싱(aliasing) | 디지털 오디오: 샘플링 레이트(sample rate), 비트 깊이(bit depth), 디더(dither) | 2 |
| 모드 분해, 최소제곱, 행렬 분해 | NMF, 위너 필터링(Wiener filtering), 마스킹(masking) | 5 |
| 최적화, 회귀 | 신경망 분리기 학습(손실 함수, PIT) | 6 |
| 확률 과정, ODE | 확산(diffusion) 및 플로 매칭(flow-matching) 생성 모델 | 8 |

## 일정 (주당 6–8시간, 약 4주)

| 주 | 강의 | 시간 | 핵심 아이디어 |
|---|---|---|---|
| 1 | [01 소리, 청각, 방](01-sound-hearing-rooms.md) | 2 h | 소리는 압력이고, 귀는 로그 스케일이며, 방은 필터다 |
| 1 | [02 디지털 오디오](02-digital-audio.md) | 2 h | 샘플링, 양자화(quantisation), 스테레오와 미드/사이드(mid/side), 라우드니스(loudness, LUFS) |
| 1 | [03 스펙트럼 분석: FFT에서 스펙트로그램까지](03-spectral-analysis.md) | 3 h | STFT는 이 분야의 주된 작업 표현이다 |
| 2 | [04 실무 오디오 엔지니어링](04-audio-engineering-practice.md) | 2 h | 마이크, EQ, 컴프레션(compression), 스템(stem), DME와 M&E |
| 2 | [05 고전적 음원 분리와 평가 지표](05-classical-separation.md) | 3 h | 마스크(mask), 위너 필터(Wiener filter), NMF, HPSS, SI-SDR |
| 3 | [06 음원 분리를 위한 딥러닝](06-deep-learning-separation.md) | 3 h | U-Net에서 Demucs, 밴드 분할(band-split) RoFormer까지 |
| 3 | [07 음성: 향상, 화자 분할, 시청각 분리](07-speech-diarization-av.md) | 3 h | RNNoise, pyannote, 타깃 화자(target-speaker) 및 시청각(audio-visual) 분리 |
| 4 | [08 생성 모델과 파운데이션 모델](08-generative-foundation-models.md) | 3 h | 신경 코덱(neural codec), 확산과 플로 매칭, CLAP, SAM Audio |
| 4 | [09 오늘날 서비스가 쓰는 것](09-industry-map.md) | 1.5 h | 오픈 구성 요소, 벤더 모델, 플랫폼 기능, 동향 |

**빠른 경로 (약 8시간)**, 시간이 부족할 때: 강의 03, 05, 06, 08. 이 네 강의가 우리 제품이 어떻게 동작하고 약점이 어디에 있는지를 설명해 줍니다.

## 실습 도구

학습용으로 별도의 가벼운 환경을 유지하세요. SAM Audio에 맞춰 버전이 고정된 랩의 `.venv`에는 아무것도 설치하지 마세요.

```bash
uv venv ~/audio-learn && source ~/audio-learn/bin/activate
uv pip install numpy scipy librosa matplotlib soundfile jupyter
```

- **클립(Clips):** `tools/separation-lab/data/clips/` 아래의 랩 합성 클립에는 정답(ground-truth) 스템(stem)이 함께 있어 실습에 이상적입니다.
- **SAM Audio 실험:** 노트북에서 모델을 로드하기보다 로컬 웹 데모(`tools/separation-lab/run-demo.sh`)를 사용하세요. 워크스테이션의 RAM이 제한적입니다. 랩 README를 참고하세요.
- **듣기:** 편안한 볼륨으로 헤드폰을 끼고 들으세요. 스펙트로그램은 파형 그래프보다 훨씬 많은 것을 보여 줍니다.

## 옆에 열어 둘 핵심 참고 자료

- Meinard Müller, *Fundamentals of Music Processing* (음악 처리 기초), 무료 FMP 노트북: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C0/C0.html
- Manilow, Seetharaman and Salamon, *Open-Source Tools & Data for Music Source Separation* (ISMIR 2020 튜토리얼, 온라인 책): https://source-separation.github.io/tutorial/
- Steven W. Smith, *The Scientist and Engineer's Guide to Digital Signal Processing* (과학자와 엔지니어를 위한 DSP 안내서, 무료): https://www.dspguide.com/
- Julius O. Smith III, CCRMA online books (온라인 도서): https://ccrma.stanford.edu/~jos/
- Hugging Face Audio Course (오디오 강좌): https://huggingface.co/learn/audio-course
- 영상 채널:
  - The Sound of AI (Valerio Velardo), ML을 위한 오디오 신호 처리: https://www.youtube.com/@ValerioVelardoTheSoundofAI
  - Audio University, 녹음과 믹싱 기초: https://www.youtube.com/@AudioUniversity
