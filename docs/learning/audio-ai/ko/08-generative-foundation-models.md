# 08. 생성 모델과 파운데이션 모델 (SAM Audio와 그 친척들)

> 영어 원문(English original): [08-generative-foundation-models.md](../08-generative-foundation-models.md)

**파운데이션 모델(foundation model)** 은 매우 폭넓은 데이터로 학습한 하나의 큰 모델로, 다시 학습시키지 않고 프롬프트(prompt)만으로 여러 작업에 맞출 수 있습니다. SAM Audio는 음원 분리를 위한 파운데이션 모델입니다. 이번 강의는 그것을 이루는 부품들을 설명합니다.

## 1. 생성 모델이 음원 분리에 들어온 이유

모델의 두 계열:
- **판별(discriminative)** 모델은 입력에서 무언가를 *판단하거나 예측*하도록 학습합니다. 여기서는 혼합 신호가 들어가면 가장 좋은 추측 음원 하나가 나옵니다.
- **생성(generative)** 모델은 실제 데이터처럼 보이는 새로운 샘플을 *만들어 내도록* 학습합니다.

**판별 분리기(discriminative separator)** (06강)는 혼합 신호(mixture)가 주어졌을 때 음원의 *기댓값*을 예측합니다. 강한 겹침처럼 혼합이 모호한 곳에서는 기댓값이 흐릿한 평균이 되며, 이것이 "물속 같은(watery)", "수중(underwater)" 아티팩트로 들립니다.

최소제곱에서 이미 아는 현상입니다. 제곱 오차 손실로 학습한 네트워크는 답의 **조건부 평균(conditional mean)** 을 학습합니다. 어떤 혼합이 깨끗한 음원 A에서 나왔을 수도, 깨끗한 음원 B에서 나왔을 수도 있고 확률이 같다고 합시다. 제곱 오차 기준 최선의 추측은 (A + B) / 2이며, 이것은 A도 B도 아닙니다. 둘이 섞인 것, 즉 흐림(blur)입니다.

**생성 분리기(generative separator)** 는 대신 조건부 분포(conditional distribution) p(source | mixture, prompt)에서 그럴듯한 깨끗한 음원을 *샘플링*합니다.
- p(source | mixture, prompt)는 이렇게 읽습니다. "들은 것(혼합 신호)과 요청한 것(프롬프트)이 주어졌을 때, 가능한 각 깨끗한 음원은 얼마나 그럴듯한가?"
- *샘플링(sampling)* 은 그 확률에 따라 답 하나를 무작위로 뽑는 것입니다. 위 예에서는 흐림이 아니라 A *또는* B가 나옵니다.
- 추정 이론에 비유하면, 판별 모델은 최소 평균 제곱 오차(MMSE) 추정, 즉 사후 분포의 평균과 같고, 생성 모델은 사후 분포에서 샘플 하나를 뽑는 것과 같습니다.

결과:
- 소리가 더 깨끗합니다.
- 내용을 **지어낼** 수 있습니다: 작은 타이밍 이동, 재합성된 음색(timbre: 소리의 색깔), 메워 넣은 빈틈.
- 합하면 혼합 신호로 되돌아오지 않습니다.

**그럴듯함(plausible)과 충실함(faithful) 사이의 이 상충 관계**가 우리 제품의 핵심 쟁점입니다(차별화 요소 2). 그럴듯함은 "진짜 깨끗한 음원처럼 들린다"는 뜻이고, 충실함은 "실제로 녹음에 있던 그대로"라는 뜻입니다.

## 2. 신경 오디오 코덱(neural audio codec): 생성 모델이 작동하는 잠재 공간(latent space)

**왜 잠재 공간인가.** 원시 48 kHz 오디오는 트랜스포머(transformer)에 넣기에는 너무 깁니다. 신경 코덱(neural codec)은 이를 짧은 잠재 프레임(latent frame) 시퀀스로 압축합니다.
- **트랜스포머**는 *어텐션(attention)* 에 기반한 신경망으로, 시퀀스의 모든 위치가 다른 모든 위치를 봅니다. 비용은 시퀀스 길이의 제곱으로 늘어납니다.
- 48 kHz 오디오 10초는 샘플 480,000개입니다. 이 정도 위치에 대한 어텐션은 비현실적입니다.
- **잠재 변수(latent)** 는 숨겨진 압축 표현, 즉 오디오 한 구간을 요약한 짧은 숫자 목록입니다. **잠재 공간(latent space)** 은 그런 표현 전체의 집합입니다.
- 임의의 숫자로 든 예시: 잠재 프레임(벡터) 하나가 20 ms를 담으면 10초는 샘플 480,000개 대신 500개 프레임이 됩니다. 트랜스포머가 다루기 쉽습니다.
- **잠재 변수의 프레임 레이트(frame rate of the latents)** 는 오디오 1초당 잠재 벡터의 수입니다.

**"코덱"의 뜻.** 코덱(codec, coder-decoder)은 신호를 압축하고 복원합니다. MP3가 코덱입니다(02강). *신경* 코덱은 양쪽 절반 모두를 신경망으로 만들고, 입력을 최대한 충실하게 복원하도록 학습합니다.

**모델:**
- **SoundStream** (Google, 2021);
- **EnCodec** (Meta, 2022);
- **DAC**, Descript Audio Codec (2023).

**동작 방식.** 모두 합성곱 인코더(convolutional encoder), 양자화기(quantiser), 디코더(decoder)로 이루어집니다.
- **인코더(encoder)** 는 파형을 짧은 잠재 시퀀스로 바꿉니다. 시간 방향으로 미끄러지는 학습된 필터를 쌓은 합성곱 신경망입니다.
- **양자화기(quantiser)** 는 각 잠재 벡터를 **코드북(codebook)**, 즉 학습된 벡터들의 표의 한 항목으로 반올림합니다. 그 항목의 번호가 **토큰(token)**, 즉 정수입니다. 항목이 1,024개인 코드북이면 토큰 하나가 10비트입니다(예시).
- **디코더(decoder)** 는 양자화된 잠재 변수를 다시 파형으로 되돌립니다.

학습:
- 복원 손실(reconstruction loss: 복원된 오디오가 원본에서 얼마나 먼가)과 **적대적 손실(adversarial loss)** 로 학습합니다. 적대적 손실은 GAN(생성적 적대 신경망, generative adversarial network)을 씁니다. 두 번째 네트워크인 판별기(discriminator)가 진짜 오디오와 복원된 오디오를 구별하려 하고, 디코더는 그것을 속이도록 학습합니다. 그러면 출력이 선명하고 진짜처럼 들립니다.

양자화기 설계:
- 양자화기는 **잔차 벡터 양자화(RVQ, residual vector quantisation)** 를 씁니다. 코드북 1로 양자화하고, 남은 오차를 코드북 2로 양자화하는 식으로 이어 갑니다. ADC의 축차 비교(successive approximation, 02강)와 비슷합니다. 각 단계가 앞 단계가 남긴 것을 해결합니다. 코드북이 하나 늘 때마다 세부가 더해집니다.
- 출력은 초당 수십~수백 프레임입니다(위의 잠재 프레임 레이트).

**VAE 변형(VAE variant)** 은 이산 토큰 대신 연속 잠재 변수를 유지합니다.
- **VAE**(변분 오토인코더, variational autoencoder)는 인코더가 한 점이 아니라 분포(평균과 퍼짐)를 출력하는 인코더–디코더 쌍이며, 학습이 잠재 공간을 매끄럽고 다루기 좋게 유지합니다.
- 잠재 변수는 코드북 반올림이 없는 보통의 실수 벡터입니다.
- 확산(diffusion)과 플로(flow) 모델(3절)은 연속 잡음을 더하고 빼므로 이쪽을 선호합니다.
- SAM Audio는 48 kHz의 DAC 방식 VAE("DAC-VAE")를 씁니다.

**토큰 위의 언어 모델(language model).** 코덱 토큰을 언어처럼 다루면 AudioLM과 **MusicGen**(Meta audiocraft)이 나오며, 이는 많은 음악 생성기의 기반입니다.
- **언어 모델**은 앞의 토큰들로 다음 토큰을 예측합니다. 휴대폰 자동 완성과 같습니다.
- **자기회귀(autoregressive)** 입니다. 토큰을 하나씩 생성하고 각 출력을 다시 입력으로 되먹입니다. AR 시계열 모델 x(k) = f(x(k−1), x(k−2), …)과 같은 발상입니다.
- 분리는 하지 않지만 같은 배관(plumbing)을 씁니다.

## 3. 확산 모델(diffusion model)과 플로 매칭(flow matching): ODE 적분

**확산(diffusion).**
- *순방향 과정(forward process):* 데이터가 순수 잡음이 될 때까지 가우시안 잡음을 단계적으로 더합니다. 온도장이 평평해질 때까지 열이 퍼지는 것과 같습니다.
- *학습(training):* 각 잡음 수준에서 잡음(또는 깨끗한 신호)을 예측하도록 네트워크를 학습합니다. 이런 네트워크를 **디노이저(denoiser)** 라고 합니다.
- *샘플링(sampling):* 과정을 거꾸로 실행합니다. 순수 잡음에서 시작해 단계마다 잡음을 조금씩 걷어 냅니다.
- 디노이저의 출력은 **스코어(score)** 와 연결됩니다. 스코어는 데이터의 확률 밀도가 가장 가파르게 오르는 방향(로그 확률의 기울기)입니다. 각 잡음 제거 단계는 샘플을 더 그럴듯하고 데이터다운 신호 쪽으로, 즉 언덕 위로 조금씩 밀어 올립니다.

**플로 매칭(flow matching, 정류 흐름(rectified flow)).** 더 단순하며 SAM Audio가 쓰는 방식입니다. 기호를 하나씩 읽어 봅시다.
- x₀는 순수 무작위 잡음 샘플입니다(데이터와 같은 모양).
- x₁은 실제 데이터 샘플로, 여기서는 깨끗한 목표 소리의 잠재 변수입니다.
- t는 0(전부 잡음)에서 1(전부 데이터)까지의 진행 변수입니다.
- x_t는 x₀에서 x₁로 가는 직선 위에서 비율 t만큼 간 지점입니다.
- v_θ는 신경망입니다(θ는 학습 가능한 가중치). 현재 지점 x_t, 시간 t, 조건을 받아 **속도(velocity)** 를 돌려줍니다.
- "정류(rectified)"는 경로를 직선으로 만든다는 뜻입니다.

*경로(path):* 잡음 x₀와 데이터 x₁을 뽑고, 직선 경로 x_t = (1 − t)x₀ + t·x₁을 정의합니다.
- 2차원 수치 예: x₀ = (0, 0), x₁ = (4, 2). t = 0.5에서 지점은 x_t = (2, 1)입니다. 일정한 속도 x₁ − x₀ = (4, 2)로 움직입니다.

*학습:* 네트워크 v_θ(x_t, t, condition)를 일정한 속도(x₁ − x₀)에 회귀(regress)시킵니다. 평범한 최소제곱(least squares)입니다.
- 무작위 쌍 (x₀, x₁)과 무작위 t를 뽑아 x_t를 만들고, 제곱 차이 ‖v_θ(x_t, t, c) − (x₁ − x₀)‖²를 최소화합니다.
- 같은 지점 x_t를 지나는 쌍이 여러 개입니다. 그래서 네트워크는 그 지점에서의 *평균* 속도를 학습합니다. 이 평균 속도를 따라가면 잡음 샘플의 구름이 데이터 분포로 옮겨집니다.

*샘플링:* 오일러(Euler) 또는 중점(midpoint) 스텝으로 t = 0부터 t = 1까지 상미분방정식(ODE) dx/dt = v_θ(x, t, c)를 **적분**합니다. 여기서 v_θ는 속도장(velocity field)입니다.
- 이미 아는 수치 적분입니다. 상태 x는 무작위 잡음 샘플에서 시작합니다. "우변" f(x, t)가 곧 네트워크입니다.
- **오일러** 스텝(스텝 크기 h): x ← x + h·v_θ(x, t, c), 그다음 t ← t + h. 4스텝이면 h = 0.25이고 네트워크를 4번 호출합니다.
- **중점** 스텝(2차): 속도를 계산하고, 반 스텝 이동한 뒤 거기서 속도를 다시 계산하고, 그 두 번째 속도로 한 스텝 전체를 갑니다. 스텝당 네트워크 호출이 두 번이지만 더 정확합니다.
- 모든 경로가 직선이라면 오일러 한 스텝으로 정확합니다. 평균된 경로는 휘어 있으므로 스텝이 많을수록 도움이 됩니다.
  - 스텝이 많을수록 품질이 좋아지지만 느려집니다.
  - 스텝 수는 비용과 품질을 직접 조절하는 다이얼입니다. 스텝 하나가 네트워크 순전파(forward pass) 한 번입니다.

**조건화(conditioning), 즉 조건부 생성(conditional generation).** *조건화*는 출력을 이끄는 추가 정보를 네트워크에 주는 것입니다.
- 네트워크는 **혼합 잠재 변수(mixture latent)** 와 **프롬프트 임베딩(prompt embedding)**(텍스트, 시각, 시간 구간(time span))을 봅니다.
- *분류기 없는 가이던스(classifier-free guidance)* 는 조건의 효과를 과장합니다. 네트워크를 학습할 때 가끔 조건을 빼서 조건 없는 예측도 할 수 있게 합니다. 샘플링할 때 두 속도를 모두 구해 외삽합니다. v = v_uncond + w·(v_cond − v_uncond), w > 1. 결과가 프롬프트 쪽으로 더 강하게 밀리며, 대가로 스텝마다 네트워크를 두 번 호출합니다.

**Dieleman의 통찰.** 오디오에 대한 확산은 대략 *주파수에서 거친 것에서 세밀한 것으로(coarse-to-fine)* 진행됩니다. 즉 "스펙트럼 자기회귀(spectral autoregression)"입니다. 이는 저주파는 대체로 맞고, 고주파 세부에서 생성 모델이 즉흥적으로 지어내는 이유를 설명해 줍니다.
- 실제 소리는 저주파에 고주파보다 훨씬 많은 에너지가 있습니다.
- 어떤 잡음 수준에서는 잡음이 약한 고주파를 먼저 묻어 버리고, 강한 저주파는 아직 삐져나와 있습니다.
- 그래서 역방향 과정은 저주파를 먼저 정하고, 그다음 한 대역 위, 이런 식으로 진행합니다. 시간이 아니라 주파수 축을 따라 움직이는 자기회귀 모델처럼 행동합니다.
- 맨 위의 마지막 세부는 가장 적은 정보로 만들어지므로 가장 "즉흥적"입니다.

## 4. 결합 임베딩(joint embedding): 텍스트, 이미지, 소리 연결

**결합 임베딩**은 서로 다른 종류의 데이터(텍스트, 이미지, 오디오)를 같은 벡터 공간(07강 2절)에 넣어 유사도를 직접 비교할 수 있게 합니다.

**대조 학습(contrastive learning)** 으로 학습합니다.
- 서로 맞는 쌍(예: 오디오 클립과 그 설명문)의 배치(batch)를 가져옵니다.
- 맞는 쌍은 가까워지고, 배치 안의 틀린 쌍은 모두 멀어지도록 학습합니다.

- **CLAP** (LAION): 대조 학습 기반의 오디오–텍스트 임베딩으로, **CLIP**(대조적 언어–이미지 사전학습, contrastive language–image pre-training: 이미지와 설명문에 대해 같은 일을 함)의 오디오 버전입니다. "이 오디오가 'crowd cheering'과 일치하는가?"를 점수화합니다. 점수는 오디오 임베딩과 텍스트 임베딩의 코사인 유사도입니다.
- **ImageBind** (Meta): 이미지, 오디오, 텍스트 등을 위한 하나의 임베딩 공간입니다. 라이선스(licence)가 **CC BY-NC-SA, 비상업(non-commercial)** 이어서 우리 랩이 SAM Audio의 시각 랭커(visual ranker)를 끄는 이유입니다.
  - **CC BY-NC-SA**는 크리에이티브 커먼즈 저작자표시–비영리–동일조건변경허락(Attribution-NonCommercial-ShareAlike)입니다. 저자를 밝히면(BY), 상업적으로 쓰지 않으면(NC), 파생물을 같은 라이선스로 공유하면(SA) 재사용할 수 있습니다.
  - *시각 랭커*는 SAM Audio에서 ImageBind로 후보 출력을 영상과 대조해 점수화하는 부분입니다.
- **음원 분리에서의 용도:**
  1. *조건화:* 프롬프트가 임베딩으로 들어갑니다.
  2. *재순위화(reranking):* 여러 후보를 생성하고 점수가 가장 높은 것을 고릅니다. 이것이 CLAP과 **판정 모델(judge model)** 을 쓰는 SAM Audio의 `reranking_candidates` 옵션입니다. 판정 모델은 출력이 프롬프트와 얼마나 맞고 얼마나 좋게 들리는지 점수화하도록 학습한 별도의 네트워크입니다.

## 5. 쿼리 기반 분리(query-based separation)에서 SAM Audio까지

**쿼리 기반 분리**는 원하는 소리를 설명하는 *쿼리(query)* 를 주면, 모델이 그 소리만 돌려주는 방식입니다. 텍스트 버전의 연구 용어는 **LASS**(언어 질의 음원 분리, language-queried audio source separation)입니다.

**AudioSep** (2023, "Separate Anything You Describe"). 텍스트 쿼리, CLAP 조건화, 마스크(mask) 기반입니다. "문장이 설명하는 것은 무엇이든 분리"합니다.
- *마스크 기반*은 모델이 혼합 신호의 스펙트로그램 위에 0~1 마스크를 예측한다는 뜻입니다(05강). 제거만 할 수 있고 새로 지어낼 수는 없습니다.

**SAM Audio** (Meta, 2025년 12월, 논문 arXiv 2512.18099):
- *아키텍처:* DAC-VAE 잠재 변수에 대해 **플로 매칭**으로 학습한 확산 트랜스포머(diffusion transformer, **DiT**: 디노이저/속도 네트워크로 쓰이는 트랜스포머).
- *프롬프트:*
  - **텍스트** (짧은 영어 명사구, 예: "dog barking");
  - **시각** (대상이 마스킹된 영상, 즉 각 프레임에서 대상의 픽셀을 윤곽으로 표시; `-tv` 모델);
  - **시간 구간** ("타깃은 3.2 s에서 5.0 s 동안 활성").
- *출력:* **타깃(target)** 과 **잔여 출력(residual)**, 둘 다 생성됩니다. 타깃은 요청한 소리이고, 잔여 출력은 그 나머지 전부입니다.
- *부가 기능:*
  - 선택적 구간 예측기(span predictor): 타깃이 활성인 시간 구간을 추측하는 모델;
  - 재순위화를 위한 판정 모델(judge model).
- *라이선스(licence):* SAM License. 상업적 사용을 허용하지만 허용 사용 규칙(acceptable-use rules: 금지된 사용 목록), 재배포 시 라이선스 동봉 의무(모델을 넘겨받는 사람에게도 라이선스를 함께 전달해야 함) 등의 조건이 있습니다.

**우리 랩의 측정 결과:**

| 발견(Finding) | 세부 내용(Detail) |
|---|---|
| 대형 vs 소형 모델 | 대형이 소형보다 약 2–3 dB 우수 |
| 음악·군중 속 음성 추출 | 잘 작동: 약 +6–7 dB SI-SDRi |
| 음성에서 음성 분리 | 약함: 평균 약 0~+1 dB; 청크 사이에서 정체성이 뒤바뀔 수 있음 |
| 합산 검사(Sum check) | target + residual ≠ mixture; 출력이 생성된 것이므로 입력 대비 약 7–9 dB SI-SDR에 그침 |
| 프롬프트 언어 | 텍스트 인코더(T5)가 한국어를 미지 토큰(unknown token)으로 바꾸므로 프롬프트는 영어여야 함; 한국어 *오디오*는 영어만큼 잘 분리됨 |

표 읽는 법:
- **SI-SDR**는 출력이 기준 신호에 얼마나 가까운지를 음량과 무관하게 dB로 나타낸 점수입니다. 높을수록 좋습니다. SI-SDRi는 처리하지 않은 혼합 신호 대비 개선량입니다(07강 4절). SDR은 척도 불변성이 없는 이전 버전입니다.
- +6–7 dB 개선은 오차 에너지 대 목표 신호 에너지의 비가 원래 혼합 신호보다 약 4~5배 줄었다는 뜻입니다(10 dB는 10배).
- **합산 검사:** 완벽한 분리라면 합이 입력과 정확히 같아야 합니다. 여기서는 target + residual이 입력에서 7–9 dB(SI-SDR)밖에 되지 않으므로 정확한 복사본이 아닙니다. 두 출력이 혼합에서 잘라낸 것이 아니라 생성된 것이기 때문입니다.
- **T5**는 Google의 텍스트 모델입니다. *텍스트 인코더*가 프롬프트를 임베딩으로 바꿉니다. 먼저 텍스트를 고정된 어휘의 조각으로 나누는데, 어휘에 없는 것은 의미 없는 자리표시자인 **미지 토큰(unknown token)** 이 됩니다. 한국어 프롬프트는 자리표시자의 나열로 도착합니다.

**외부 근거.** CrowdioSet 저자들(라이브 콘서트, 2026)은 보컬에서 SAM Audio가 약 3.7 dB, 자신들의 전문 모델은 약 10 dB라고 보고합니다. 또한 확산의 **정렬 어긋남(misalignment)** 이 SDR을 낮춘다고 지적합니다. 하나의 데이터 포인트로만 취급하세요.
- **CrowdioSet**은 라이브 콘서트 녹음 데이터셋입니다.
- *정렬 어긋남*은 생성된 출력이 기준 신호보다 아주 조금 시간상 이동해 있다는 뜻입니다. SDR은 샘플 단위로 비교하므로, 들었을 때 괜찮아도 미세한 이동이 오차로 계산됩니다.

## 6. 생성 분리를 충실하게 만들기 (미해결 문제와 우리의 접근)

- **정제(refinement):** 먼저 판별 분리기를 쓰고, 이후 확산 모델로 그 아티팩트를 정리합니다. 2024년의 한 논문은 음악에서 약 +0.5 dB의 개선을 보고합니다.
- **생성 기반 가이드 마스킹(generative-guided masking)**, 우리의 차별화 요소 2: 생성 추정치는 마스크를 만드는 데만 쓰고, 그 마스크를 실제 혼합 신호에 적용합니다(05강 실습).
  - 마스크는 실제 녹음의 일부를 줄일 수만 있습니다. 원래 없던 소리를 더할 수 없으므로 결과가 충실하게 유지됩니다.
- **검증(verification):** 모든 출력을 정체성 임베딩(07강)과 프롬프트(CLAP 또는 판정 모델)에 비추어 점검하고, 검사에 실패하면 다시 실행합니다.
- **업계 신호:** Suno는 자사의 스템(stem) 분리가 믹스(mix)를 잘라내는 대신 "regenerates each stem from scratch"(각 스템을 처음부터 다시 생성)한다고 말합니다. (**스템**은 악기 그룹 하나의 트랙으로, 보컬, 드럼 등입니다.) AI가 만든 노래에는 괜찮지만, 결혼식이나 팟캐스트 오디오에는 위험 신호입니다.

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
2. 스템을 내려받아 입력에 대한 (target + residual)의 SI-SDR를 계산하세요. 구성상 정확한 "mix − Σ targets" 변형과 비교하세요(잔여 출력을 믹스에서 타깃들을 뺀 것으로 정의하므로 합은 정의상 믹스입니다).
3. 타깃의 무음 구간을 들어 보세요. SAM이 그곳에 무언가를 지어내나요?
