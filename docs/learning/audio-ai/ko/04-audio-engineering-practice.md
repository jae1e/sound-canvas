# 04. 실무 오디오 엔지니어링(Audio engineering in practice)

> 영어 원문(English original): [04-audio-engineering-practice.md](../04-audio-engineering-practice.md)

이 강의는 실제 녹음물이 어떻게 만들어지고 믹싱(mixing)되는지를 다룹니다. 음원 분리(source separation)는 믹스(mix)를 되돌리는 **역문제(inverse problem)**입니다. 이해하지 못하는 과정은 역으로 되돌릴 수 없습니다.

## 1. 마이크(Microphones)

**다이내믹 마이크(dynamic microphone)와 콘덴서 마이크(condenser microphone).**
- **다이내믹(dynamic)** 마이크(자석 안에서 움직이는 코일)는 튼튼하고 감도가 낮습니다. 큰 소리의 음원과 무대 보컬에 적합합니다.
- **콘덴서(condenser)** 마이크(전원이 들어가는 프리앰프(preamp)가 달린 커패시터 진동판)는 감도가 높고 더 세밀합니다. 스튜디오의 표준입니다.

**지향 패턴(polar pattern).** 안테나 패턴처럼 방향에 따른 이득 패턴입니다.
- **무지향(omnidirectional):** 모든 방향에서 똑같이 소리를 받습니다.
- **단일지향/카디오이드(cardioid):** 뒤쪽 소리를 거부합니다.
- **양지향/8자형(figure-8):** 앞뒤 소리를 받고 양옆 소리를 거부합니다.
- **슈퍼카디오이드(supercardioid)와 샷건 마이크(shotgun):** 좁은 지향성으로 영화 촬영 현장에 쓰입니다.

**근접 효과(proximity effect).** 지향성 마이크는 음원이 가까워질수록 저음이 커집니다. 가까이서 녹음한 목소리와 카메라 촬영자(camera holder)의 목소리가 "묵직하게" 들리는 이유의 일부입니다.

**어떤 마이크를 어디에:**
- **영화와 인터뷰:** 화자에게 클립으로 고정한 핀마이크(lavalier, lav)는 근접 음장의, 잔향이 적고(dry) 분리된 트랙을 줍니다. 프레임 위에 두는 붐 마이크(boom) 샷건이 주된 대안입니다.
- **휴대폰:** 아주 작은 MEMS 마이크 2~4개. 휴대폰은 소리가 파일에 도달하기 전에 **이미 처리**합니다. 잡음 억제, 자동 이득 제어(AGC, automatic gain control), 바람 소리 필터링, 때로는 음성 분리 모드까지 적용합니다.
  - 따라서 사용자가 업로드한 파일은 우리가 받기 전에 정체를 알 수 없는 비선형 처리 체인을 이미 거쳤습니다.
  - 이 체인은 깨끗한 합성 믹스로 학습한 모델이 실제 휴대폰 오디오에서 성능이 떨어지는 이유를 설명하는 데 도움이 됩니다.

## 2. 게인 스테이징(gain staging)과 클리핑(clipping)

**헤드룸(headroom).** 각 단계(마이크, 프리앰프, 변환기(converter))에는 잡음 바닥(noise floor)과 최대 레벨이 있습니다. 좋은 게인 스테이징(gain staging)은 신호를 잡음보다 충분히 위에, 클리핑보다 아래에 둡니다.

**클리핑(clipping)은 되돌릴 수 없습니다.** 파형이 최대 크기(full scale)에서 평평해지면 정보는 사라집니다. 클리핑 복원(declipping)도 그 자체로 재구성 문제이며, 흔히 생성(generative) 문제이기도 합니다.

## 3. 처리 도구 모음(The processing toolbox)

**이퀄라이저(EQ, equaliser).** 스펙트럼을 다듬는 필터입니다.
- 80 Hz 부근의 하이패스 필터(high-pass filter)는 럼블(rumble, 저주파 웅웅거림)을 제거합니다.
- 3–5 kHz 부근의 프레즌스(presence) 부스트는 명료도(intelligibility)를 높입니다.
- 노치(notch) 필터는 60 Hz 또는 50 Hz의 험(hum)을 제거합니다.

**컴프레서(compressor).** 비선형이며 시변(time-varying)인 이득 제어기입니다. 엔지니어에게는 그저 제어 루프(control loop)입니다.

```
level_dB  = 20·log10(envelope(x))          # envelope follower
gain_dB   = 0                    if level ≤ T
          = (T − level)·(1 − 1/R) otherwise  # threshold T, ratio R
gain_s    = smooth(gain_dB, attack τa, release τr)   # first-order smoothing
y         = x · 10^((gain_s + makeup)/20)
```

여기서 T는 임계값(threshold), R은 압축비(ratio), τa·τr는 어택/릴리스(attack/release) 시간 상수, makeup은 메이크업 게인(makeup gain)입니다.

- **리미터(limiter):** 압축비가 매우 높고 어택이 빠른 컴프레서. 최종 피크 상한을 정합니다.
- **게이트(gate) 또는 익스팬더(expander):** 컴프레서의 반대입니다. 임계값 아래의 신호를 줄입니다. 예를 들어 문장 사이의 방 소음입니다.
- **디에서(de-esser):** 5–9 kHz 대역의 치찰음(sibilance), 즉 "s" 소리에서만 작동하는 컴프레서.
- **잔향(reverb)과 딜레이(delay):** 인공적인 방 울림이나 에코를 더합니다. 컨볼루션 리버브(convolution reverb)는 강의 01의 RIR 모델 그대로입니다.
- **잡음 제거(noise reduction):** 고전적인 스펙트럼 게이팅(spectral gating)으로, 잡음 스펙트럼을 추정해 그 아래에 있는 빈(bin)을 감쇠시킵니다. 강의 07의 음성 향상기(speech enhancer)의 조상입니다.

## 4. 멀티트랙(multitrack), 스템(stem), 믹스(mix), 마스터(master)

**음악 제작 흐름.** **멀티트랙(multitrack)**으로 녹음하고(마이크나 악기마다 한 트랙), 트랙들을 **스템(stem)**으로 믹싱한 다음, 결과물을 **마스터링(mastering)**합니다.
- **스템(stem)**은 그룹 서브믹스(submix)입니다: 드럼, 베이스, 보컬, 기타, 건반.
- 레이블과 리믹스 대회에서 스템을 배포합니다. 유명한 분리 데이터셋(MUSDB18, MoisesDB)은 스템 모음입니다.

**믹스는 단순한 합이 아닙니다.** 실제로는 다음이 포함됩니다.
- 패닝(panning)
- 그룹(버스) 압축(bus compression): 음원들을 서로 결합시킵니다
- 여러 트랙이 공유하는 잔향
- 마스터링 리미터

따라서 "혼합 신호(mixture) = Σ 스템"은 근사적으로만 성립합니다. 이것이 어떤 분리기도 완벽할 수 없는 이유 중 하나이며, 우리의 "나머지(others) = 믹스 − Σ 타깃(targets)" 출력이 결과의 합이 믹스와 맞도록 유지하는 정직한 방법인 이유입니다.

## 5. 영화, TV, 방송: DME와 M&E

**DME 스템.** 영화와 TV 믹스는 **대사(dialogue)**, **음악(music)**, **효과음(effects)** 스템과 최종 믹스로 납품됩니다. 이를 대사·음악·효과음 스템(DME, dialogue/music/effects)이라 부릅니다.

**M&E.** 음악·효과음 트랙(M&E, music & effects; 대사 없음)은 더빙(dubbing) 스튜디오에 필요한 것으로, 그 위에 새 언어의 대사 트랙을 얹습니다.
- Netflix는 믹스와 정확히 합이 맞는 DME 스템과 "fully filled" M&E를 요구합니다. "Fully filled"는 대사 밑에 깔린 앰비언스(ambience)와 폴리(Foley)를 다시 만들어, 음성을 제거해도 빈 구멍이 남지 않는다는 뜻입니다.

**스튜디오에 이미 스템이 있어야 하는데도 분리가 필요한 이유.**
- 아카이브, 오래된 TV, 많은 논픽션 제작물에는 **최종 믹스만** 있습니다. 스템이 분실되었거나 처음부터 만들어지지 않았습니다.
- 음악 라이선스가 새 지역이나 플랫폼을 포괄하지 않는 경우가 많아, 음악을 교체해야 합니다.
- 검증된 사례와 관련 업체는 우리 시장 조사를 참고하세요.

**스포츠 생중계.** 해설, 관중, 효과음 마이크가 실시간으로 믹싱됩니다. 아카이브에는 보통 방송 믹스만 남습니다. 바로 우리의 "해설자 1 / 해설자 2 / 관중" 시나리오입니다.

**콘서트.** 객석 믹스(FOH, front-of-house) 엔지니어가 PA를 통해 밴드를 믹싱합니다. 관중석의 휴대폰은 방을 거친 PA 소리와 휴대폰 근처의 관중 소리를 함께 녹음합니다. 이는 스튜디오 믹스와는 매우 다른 신호입니다(강의 09, CrowdioSet 논문).

## 읽거나 볼 자료(Read or watch)

- Shure, *Microphone Techniques for Recording*: https://pubs.shure.com/guide/Microphone-Techniques-for-Recording/en-US
- Audio University (YouTube), 컴프레션, EQ, 게인 스테이징, 마이크 종류를 다룬 짧고 명쾌한 영상: https://www.youtube.com/@AudioUniversity
- iZotope Learn, 실용적인 믹싱·마스터링 글 모음: https://www.izotope.com/en/learn.html
- Sound On Sound, *Techniques*, 현업 엔지니어들의 더 깊이 있는 글: https://www.soundonsound.com/techniques
- Netflix:
  - *Sound Mix Specifications & Best Practices*: https://backlothelp.netflix.com/hc/en-us/articles/360001794307-Netflix-Sound-Mix-Specifications-Best-Practices-v1-5
  - *M&E Creation Guidelines*: https://backlothelp.netflix.com/hc/en-us/articles/115006122187-M-E-Creation-Guidelines
- AudioShake glossary, *DME* (업체의 설명 자료): https://www.audioshake.ai/glossary/dme-dialogue-music-and-effects
- 우리 자체 조사, 미디어에서 분리가 필요한 이유: [gaudio-lab-and-ai-separation-market.md](../../../market-studies/audio-video-separation/gaudio-lab-and-ai-separation-market.md)

## 실습(Exercise, 45분)

1. 위의 컴프레서를 numpy로 약 20줄에 구현하고, `tools/separation-lab/data/clips/US-3.1/`의 음성 스템(speech stem)에 적용합니다.
2. T = −30 dBFS, R = 4, τa = 5 ms, τr = 100 ms를 시도합니다.
3. 시간에 따른 이득 곡선(gain curve)을 그립니다.
4. 그런 다음 압축된 음성을 음악 스템에 더해 보고 문제를 확인합니다. 이득이 시간에 따라 변했기 때문에, 뺄셈으로는 원래 음성을 더 이상 복원할 수 없습니다.
