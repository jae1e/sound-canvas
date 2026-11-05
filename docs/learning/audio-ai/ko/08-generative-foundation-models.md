# 08. 생성 모델과 파운데이션 모델 (SAM Audio와 그 친척들)

> 영어 원문(English original): [08-generative-foundation-models.md](../08-generative-foundation-models.md)

## 1. 생성 모델이 음원 분리에 들어온 이유

**판별 분리기(discriminative separator)** (06강)는 혼합 신호(mixture)가 주어졌을 때 음원의 *기댓값*을 예측합니다. 강한 겹침처럼 혼합이 모호한 곳에서는 기댓값이 흐릿한 평균이 되며, 이것이 "물속 같은(watery)", "수중(underwater)" 아티팩트로 들립니다.

**생성 분리기(generative separator)** 는 대신 조건부 분포 p(source | mixture, prompt)에서 그럴듯한 깨끗한 음원을 *샘플링*합니다.
- 소리가 더 깨끗합니다.
- 내용을 **지어낼** 수 있습니다: 작은 타이밍 이동, 재합성된 음색, 메워 넣은 빈틈.
- 합하면 혼합 신호로 되돌아오지 않습니다.

**그럴듯함(plausible)과 충실함(faithful) 사이의 이 상충 관계**가 우리 제품의 핵심 쟁점입니다(차별화 요소 2).

## 2. 신경 오디오 코덱(neural audio codec): 생성 모델이 작동하는 잠재 공간(latent space)

**왜 잠재 공간인가.** 원시 48 kHz 오디오는 트랜스포머(transformer)에 넣기에는 너무 깁니다. 신경 코덱(neural codec)은 이를 짧은 잠재 프레임(latent frame) 시퀀스로 압축합니다.

**모델:**
- **SoundStream** (Google, 2021);
- **EnCodec** (Meta, 2022);
- **DAC**, Descript Audio Codec (2023).

**동작 방식.** 모두 합성곱 인코더(convolutional encoder), 양자화기(quantiser), 디코더(decoder)로 이루어집니다.
- 복원 손실(reconstruction loss)과 **적대적 손실(adversarial loss)**(GAN)로 학습하여 출력이 진짜처럼 들리게 합니다.
- 양자화기는 **잔차 벡터 양자화(RVQ, residual vector quantisation)** 를 씁니다. 코드북(codebook) 1로 양자화하고, 남은 오차를 코드북 2로 양자화하는 식으로 이어 갑니다. ADC의 축차 비교(successive approximation)와 비슷합니다.
- 출력은 초당 수십~수백 프레임입니다.

**VAE 변형(VAE variant, 변분 오토인코더(variational autoencoder))** 은 이산 토큰(token) 대신 연속 잠재 변수를 유지합니다. 확산(diffusion)과 플로(flow) 모델은 이쪽을 선호합니다. SAM Audio는 48 kHz의 DAC 방식 VAE("DAC-VAE")를 씁니다.

**토큰 위의 언어 모델(language model).** 코덱 토큰을 언어처럼 다루면 AudioLM과 **MusicGen**(Meta audiocraft)이 나오며, 이는 많은 음악 생성기의 기반입니다. 분리는 하지 않지만 같은 배관(plumbing)을 씁니다.

## 3. 확산 모델(diffusion model)과 플로 매칭(flow matching): ODE 적분

**확산(diffusion).**
- *순방향 과정(forward process):* 데이터가 순수 잡음이 될 때까지 가우시안 잡음을 단계적으로 더합니다.
- *학습(training):* 각 잡음 수준에서 잡음(또는 깨끗한 신호)을 예측하도록 네트워크를 학습합니다.
- *샘플링(sampling):* 과정을 거꾸로 실행합니다.

**플로 매칭(flow matching, 정류 흐름(rectified flow)).** 더 단순하며 SAM Audio가 쓰는 방식입니다.
- *경로(path):* 잡음 x₀와 데이터 x₁을 뽑고, 직선 경로 x_t = (1 − t)x₀ + t·x₁을 정의합니다.
- *학습:* 네트워크 v_θ(x_t, t, condition)를 일정한 속도(x₁ − x₀)에 회귀(regress)시킵니다. 평범한 최소제곱(least squares)입니다.
- *샘플링:* 오일러(Euler) 또는 중점(midpoint) 스텝으로 t = 0부터 t = 1까지 상미분방정식(ODE) dx/dt = v_θ(x, t, c)를 **적분**합니다. 여기서 v_θ는 속도장(velocity field)입니다.
  - 스텝이 많을수록 품질이 좋아지지만 느려집니다.
  - 스텝 수는 비용과 품질을 직접 조절하는 다이얼입니다.

**조건화(conditioning), 즉 조건부 생성(conditional generation).**
- 네트워크는 **혼합 잠재 변수(mixture latent)** 와 **프롬프트 임베딩(prompt embedding)**(텍스트, 시각, 시간 구간(time span))을 봅니다.
- *분류기 없는 가이던스(classifier-free guidance)* 는 조건의 효과를 과장합니다.

**Dieleman의 통찰.** 오디오에 대한 확산은 대략 *주파수에서 거친 것에서 세밀한 것으로(coarse-to-fine)* 진행됩니다. 즉 "스펙트럼 자기회귀(spectral autoregression)"입니다. 이는 저주파는 대체로 맞고, 고주파 세부에서 생성 모델이 즉흥적으로 지어내는 이유를 설명해 줍니다.

## 4. 결합 임베딩(joint embedding): 텍스트, 이미지, 소리 연결

- **CLAP** (LAION): 대조 학습(contrastive learning) 기반의 오디오–텍스트 임베딩으로, CLIP의 오디오 버전입니다. "이 오디오가 'crowd cheering'과 일치하는가?"를 점수화합니다.
- **ImageBind** (Meta): 이미지, 오디오, 텍스트 등을 위한 하나의 임베딩 공간입니다. 라이선스(licence)가 **CC BY-NC-SA, 비상업(non-commercial)** 이어서 우리 랩이 SAM Audio의 시각 랭커(visual ranker)를 끄는 이유입니다.
- **음원 분리에서의 용도:**
  1. *조건화:* 프롬프트가 임베딩으로 들어갑니다.
  2. *재순위화(reranking):* 여러 후보를 생성하고 점수가 가장 높은 것을 고릅니다. 이것이 CLAP과 판정 모델(judge model)을 쓰는 SAM Audio의 `reranking_candidates` 옵션입니다.

## 5. 쿼리 기반 분리(query-based separation)에서 SAM Audio까지

**AudioSep** (2023, "Separate Anything You Describe"). 텍스트 쿼리, CLAP 조건화, 마스크(mask) 기반입니다. "문장이 설명하는 것은 무엇이든 분리"합니다.

**SAM Audio** (Meta, 2025년 12월, 논문 arXiv 2512.18099):
- *아키텍처:* DAC-VAE 잠재 변수에 대해 **플로 매칭**으로 학습한 확산 트랜스포머(diffusion transformer).
- *프롬프트:*
  - **텍스트** (짧은 영어 명사구);
  - **시각** (대상이 마스킹된 영상; `-tv` 모델);
  - **시간 구간** ("타깃은 3.2 s에서 5.0 s 동안 활성").
- *출력:* **타깃(target)** 과 **잔여 출력(residual)**, 둘 다 생성됩니다.
- *부가 기능:*
  - 선택적 구간 예측기(span predictor);
  - 재순위화를 위한 판정 모델(judge model).
- *라이선스(licence):* SAM License. 상업적 사용을 허용하지만 허용 사용 규칙(acceptable-use rules), 재배포 시 라이선스 동봉 의무 등의 조건이 있습니다.

**우리 랩의 측정 결과:**

| 발견(Finding) | 세부 내용(Detail) |
|---|---|
| 대형 vs 소형 모델 | 대형이 소형보다 약 2–3 dB 우수 |
| 음악·군중 속 음성 추출 | 잘 작동: 약 +6–7 dB SI-SDRi |
| 음성에서 음성 분리 | 약함: 평균 약 0~+1 dB; 청크 사이에서 정체성이 뒤바뀔 수 있음 |
| 합산 검사(Sum check) | target + residual ≠ mixture; 출력이 생성된 것이므로 입력 대비 약 7–9 dB SI-SDR에 그침 |
| 프롬프트 언어 | 텍스트 인코더(T5)가 한국어를 미지 토큰(unknown token)으로 바꾸므로 프롬프트는 영어여야 함; 한국어 *오디오*는 영어만큼 잘 분리됨 |

**외부 근거.** CrowdioSet 저자들(라이브 콘서트, 2026)은 보컬에서 SAM Audio가 약 3.7 dB, 자신들의 전문 모델은 약 10 dB라고 보고합니다. 또한 확산의 **정렬 어긋남(misalignment)** 이 SDR을 낮춘다고 지적합니다. 하나의 데이터 포인트로만 취급하세요.

## 6. 생성 분리를 충실하게 만들기 (미해결 문제와 우리의 접근)

- **정제(refinement):** 먼저 판별 분리기를 쓰고, 이후 확산 모델로 그 아티팩트를 정리합니다. 2024년의 한 논문은 음악에서 약 +0.5 dB의 개선을 보고합니다.
- **생성 기반 가이드 마스킹(generative-guided masking)**, 우리의 차별화 요소 2: 생성 추정치는 마스크를 만드는 데만 쓰고, 그 마스크를 실제 혼합 신호에 적용합니다(05강 실습).
- **검증(verification):** 모든 출력을 정체성 임베딩(07강)과 프롬프트(CLAP 또는 판정 모델)에 비추어 점검하고, 검사에 실패하면 다시 실행합니다.
- **업계 신호:** Suno는 자사의 스템(stem) 분리가 믹스(mix)를 잘라내는 대신 "regenerates each stem from scratch"(각 스템을 처음부터 다시 생성)한다고 말합니다. AI가 만든 노래에는 괜찮지만, 결혼식이나 팟캐스트 오디오에는 위험 신호입니다.

## 읽거나 볼 자료

- 신경 코덱(Neural codecs):
  - Google Research blog, *SoundStream*: https://research.google/blog/soundstream-an-end-to-end-neural-audio-codec/
  - Meta AI blog, *EnCodec*: https://ai.meta.com/blog/ai-powered-audio-compression-technique/
  - Descript Audio Codec repo: https://github.com/descriptinc/descript-audio-codec
- 생성 모델(Generative models):
  - Meta audiocraft (MusicGen and others): https://github.com/facebookresearch/audiocraft
  - Lilian Weng, *What are diffusion models?* (표준적인 블로그 설명): https://lilianweng.github.io/posts/2021-07-11-diffusion-models/
  - Cambridge MLG blog, *An introduction to flow matching*: https://mlg.eng.cam.ac.uk/blog/2024/01/20/flow-matching.html
  - Sander Dieleman:
    - *Diffusion is spectral autoregression*: https://sander.ai/2024/09/02/spectral-autoregression.html
    - *Generative modelling in latent space*: https://sander.ai/2025/04/15/latents.html
- 결합 임베딩과 쿼리 분리(Joint embeddings and query separation):
  - LAION CLAP: https://github.com/LAION-AI/CLAP
  - AudioSep repo: https://github.com/Audio-AGI/AudioSep, and paper: https://arxiv.org/abs/2308.05037
- SAM Audio:
  - project page: https://ai.meta.com/samaudio/
  - announcement: https://about.fb.com/news/2025/12/our-new-sam-audio-model-transforms-audio-editing/
  - code: https://github.com/facebookresearch/sam-audio
  - paper: https://arxiv.org/abs/2512.18099
  - press coverage (The Register): https://www.theregister.com/2025/12/16/meta_sam_ai_audio/
  - 우리 실행 결과(our runs): [sam-audio-first-run.md](../../../../tools/separation-lab/spike-results/sam-audio-first-run.md) 및 [korean-speech.md](../../../../tools/separation-lab/spike-results/korean-speech.md)
- 생성 분리 품질에 대한 근거(Evidence on generative separation quality, 논문):
  - CrowdioSet: https://arxiv.org/abs/2607.27828
  - Diffusion and consistency refinement: https://arxiv.org/abs/2412.06965

## 실습 (45분, 데모 내에서, 추가 모델 로딩 없음)

1. `US-2.1` 클립 하나를 소형·대형 모델로, 그리고 구간(span)을 쓴 경우와 쓰지 않은 경우로 실행하세요.
2. 스템을 내려받아 입력에 대한 (target + residual)의 SI-SDR를 계산하세요. 구성상 정확한 "mix − Σ targets" 변형과 비교하세요.
3. 타깃의 무음 구간을 들어 보세요. SAM이 그곳에 무언가를 지어내나요?
