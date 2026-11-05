# 09. 오늘날의 서비스는 무엇을 쓰는가 (2026-11-05 기준)

> 영어 원문(English original): [09-industry-map.md](../09-industry-map.md)

**주의.** 업체들은 아키텍처를 거의 공개하지 않습니다. 아래에서 쓰는 레이블은 다음과 같습니다.
- **[V]** 업체 주장(vendor claim);
- **[P]** 언론 또는 제3자 보도(press or third-party report);
- **[F]** 1차 자료 또는 공식 페이지에서 검증됨(verified on a primary or official page);
- **[I]** 우리의 추론(our inference).

투자 및 사용량 수치는 출처가 더 충실하게 정리된 우리의 이전 시장 조사에서 가져왔습니다.

**이번 강의에서 만나는 용어** (각 용어는 표에서 처음 나올 때 다시 설명합니다):

| 용어 | 쉬운 뜻 |
|---|---|
| 스템(stem) | 완성된 곡에서 악기 그룹 하나(보컬, 드럼, 베이스, 기타 등)만 뽑아낸 트랙 |
| API | 응용 프로그램 인터페이스(application programming interface): 내 소프트웨어에서 인터넷으로 호출하는 서비스. 오디오를 보내면 결과가 돌아옴 |
| 분당 과금(per-minute pricing) | 처리한 오디오 1분마다 요금을 받는 방식. "$0.05/min"이면 3분짜리 곡은 $0.15 |
| B2B | 기업 간 거래(business-to-business): 개인 소비자가 아니라 회사에 판매 |
| 시리즈 A / 시리즈 D(Series A / Series D) | 벤처 투자 라운드의 이름. A는 초기 라운드이고, 회사가 커지면 B, C, D로 이어짐 |
| 기업 가치(valuation) | 투자 라운드에서 투자자들이 회사 전체에 매긴 가격 |
| ARR | 연간 반복 매출(annual recurring revenue): 반복되는 구독과 계약의 연간 가치 |
| 기기 내 처리(on-device) | 회사 서버가 아니라 사용자의 휴대폰이나 컴퓨터에서 계산이 실행됨 |
| 지연(latency) | 소리가 들어간 뒤 결과가 나오기까지의 시간 지연 |
| 출처(provenance) | 무언가가 어디서 왔는가. 모델 가중치의 경우 어떤 데이터로 학습했고 그 사용이 허락되었는가 |
| 라이선스(licence) | 사용 조건에 관한 법적 약관. MIT는 매우 관대함. CC BY 4.0은 출처를 밝히면 어떤 용도로든 허용(CC = 크리에이티브 커먼즈, BY = 저작자 표시). *gated*는 로그인하고 약관에 동의해야 내려받을 수 있다는 뜻. SAM License는 Meta의 자체 약관 |

## 1. 오픈 구성 요소 (누구나 쓸 수 있는 것)

| 구성 요소(Component) | 무엇인가(What it is) | 라이선스와 비고(Licence and notes) |
|---|---|---|
| Spleeter (Deezer, 2019) | U-Net(건너뛰기 연결이 있고 U자 모양인 합성곱 인코더–디코더, 이미지 분할(segmentation)에서 가져옴), 2/4/5 스템(stem)(2, 4, 5개 트랙으로 분리), 빠름 | MIT. 품질은 구식이지만 여전히 많은 앱 내부에 있음 [I] |
| Demucs / HTDemucs (Meta) | 하이브리드 파형·스펙트로그램(spectrogram) 트랜스포머(원시 파형과 스펙트로그램을 모두 다루며 어텐션 층을 가짐) | 코드는 MIT; 상업적 사용 전에 가중치의 학습 데이터 출처(training-data provenance)를 확인할 것 (우리의 라이선스 노트 참조) |
| BS-RoFormer / Mel-RoFormer 커뮤니티 가중치 | UVR, MVSEP, ZFTurbo MSST를 통한 리더보드 선두 모델. (BS = 대역 분할(band-split): 스펙트로그램을 주파수 대역으로 자름. RoFormer = 회전식 위치 인코딩(rotary position encoding)을 쓰는 트랜스포머. "가중치(weights)"는 학습된 파라미터. UVR, MVSEP, ZFTurbo MSST는 이 모델들을 돌리는 무료 앱, 웹 서비스, 학습 툴킷) | 다수가 비상업(non-commercial) 데이터셋으로 학습되어 상업적 사용에는 출처 위험이 큼 |
| pyannote community-1 | 화자 분할(diarisation) 파이프라인("누가 언제 말했나", 07강) | CC BY 4.0, gated |
| RNNoise, DeepFilterNet | 실시간(real-time) 음성 잡음 제거기(denoiser) (07강) | 오픈 소스 |
| **SAM Audio** (Meta, Dec 2025) | 프롬프트(prompt) 기반 생성 분리 (텍스트, 시각, 구간) | SAM License, 조건부로 상업적 사용 허용 |

**시사점 [I].** ("오픈 부품"은 누구나 코드나 가중치를 내려받을 수 있는 구성 요소입니다.) 유능한 팀이라면 오픈 부품으로 몇 주 안에 좋은 분리기를 조립할 수 있습니다. 표준 스템에서의 품질만으로는 방어 가능한 우위가 아닙니다.

## 2. 소비자 및 프로슈머(prosumer) 스템 앱

| 서비스(Service) | 기술 (공개된 범위)(Technology, as disclosed) | 신호(Signals) |
|---|---|---|
| **Moises** (및 Music.AI API) | 독자 모델(공개되지 않음); API 요금, 즉 분당 가격 공개 (스템 ≈ $0.05/min) | 처리량 20억 분(2B), 5천만 달러 이상 조달 [V] ([2025 review](https://moises.ai/newsroom/company-milestones/2025-year-in-review)); Music.AI $40M Series A(초기 벤처 투자 라운드), Jan 2025 [P] |
| **LALAL.AI** | 자체 모델 세대: Phoenix (2022), Orion, **Perseus** (첫 트랜스포머, 즉 어텐션 기반 네트워크; Orion 대비 약 +1 dB), **Andromeda** (Perseus 학습 데이터의 ≈4배) [V] ([about](https://lalal.ai/about/), [Perseus](https://www.lalal.ai/blog/perseus-ai-lalalai-transformer-neural-network/)) | 꾸준한 모델 출시가 이들의 스토리 |
| **Gaudio Studio** (Gaudio Lab) | GSEP 분리 엔진 | Gaudio에 따르면 CES 2024 Innovation Award (CES는 대규모 가전 박람회) [V] ([blog](https://www.gaudiolab.com/blog/231)) |
| **Suno** stems | **생성형(Generative)**(모델이 기존 오디오를 자르는 대신 새 오디오를 합성): 곡을 잘라내는 대신 "regenerates each stem from scratch"(각 스템을 처음부터 재생성); Advanced Split은 ~100개 악기 유형 제공 (Premier 요금제) [V] ([Suno, 2026-06-11](https://suno.com/blog/stem-separation-updates)) | 분리가 생성기의 한 기능이 됨 |
| **CapCut** | 무료 보컬 제거기와 음성 분리기(voice isolator), "up to 10 stems" [V] ([CapCut](https://www.capcut.com/resource/voice-isolator)) | 무료이고 번들(더 큰 앱에 추가 요금 없이 포함)이므로 편의성(convenience)이 전쟁터 |

## 3. 전문가용 및 B2B 미디어

| 서비스(Service) | 기술과 포지셔닝(Technology and positioning) | 신호(Signals) |
|---|---|---|
| **AudioShake** | 독자 모델; **라이선스를 받은(licensed)** 프로덕션 라이브러리 음악(영화·TV용 음악을 공급하는 라이브러리에서, 회사가 사용 허락을 받은 음악)으로 학습한다고 주장 [V]; 방송용 지연(latency) 약 11 ms(1000분의 11초)의 실시간 "Dialogue RT" [V] ([post](https://www.audioshake.ai/post/audioshake-debuts-dialogue-rt-the-first-ai-dialogue-isolation-model-built-for-live-broadcast)); 다중 화자 분리 API(위에서 정의한 API) | $14M Series A(초기 벤처 투자 라운드), 2025-10-01; Disney Music Group, WMG, UMG, NFL Films, WBD를 고객으로 주장 [V] ([post](https://www.audioshake.ai/post/series-a-round-raise-14-million-shinecapital-origin-thomson-reuters)) |
| **Gaudio Studio Pro** | OTT 및 방송용 DME Separator와 Music Replacer. **DME** = 대사·음악·효과(dialogue, music and effects), 영화·TV 사운드트랙의 표준 세 층으로, separator는 완성된 믹스를 이 셋으로 나눕니다(04강). **Music Replacer**는 음악 층을 다른 음악으로 바꿉니다. **OTT** = 오버 더 톱(over-the-top), 즉 인터넷으로 제공되는 스트리밍 서비스(넷플릭스 등). API는 운영 중(호출 가능), 웹 에디터는 대기자 명단(사용자가 신청하고 접근을 기다림) [V] ([overview](https://www.gaudiolab.com/ko/products/gaudio-studio-pro-overview)) | CES 2026 Innovation Award 2건, 2025-11-05 발표 [V] ([news](https://www.gaudiolab.com/news/216)) |
| **ElevenLabs** | Voice Isolator, 더빙(dubbing)(영상을 다른 언어 목소리로 다시 입힘), 화자 분할(diarisation, 화자 레이블)을 포함한 전사(transcription, 음성을 텍스트로); API 가격표 ([pricing](https://elevenlabs.io/pricing/api)) | 2025년 말 ARR(연간 반복 매출) 약 $330M (회사 발표), Series D(후기 벤처 투자 라운드) 기업 가치(valuation: 투자자들이 회사 전체에 매긴 가격) 약 $11B, Feb 2026 [P] |
| **Adobe** Podcast Enhance Speech / Premiere Speech Enhancer | 음성을 "재스튜디오화(re-studio)"하는 향상(거친 녹음을 스튜디오에서 녹음한 것처럼 들리게 함), 부분적으로 생성형일 가능성 [I] ([Enhance](https://podcast.adobe.com/enhance)) | 무료 또는 번들; 사용자가 아티팩트(artifact)에 불만 (우리 노트의 일화) |
| iZotope RX, DaVinci Resolve, Descript | 에디터(오디오·영상 편집 프로그램) 내부의 대사 분리 및 음악 재균형(music-rebalance) 도구. (오디오 편집 프로그램을 DAW, 디지털 오디오 워크스테이션(digital audio workstation)이라고 함) | 전문 편집 소프트웨어의 한 기능으로서의 분리 |

## 4. 플랫폼 및 기기 기능 (분리가 눈에 보이지 않게 됨)

- **Apple Music Sing** (Dec 2022): iPhone, iPad, Apple TV 4K에서 전체 카탈로그(음악 라이브러리 전체)에 걸쳐 제공되는 보컬 레벨 슬라이더. Apple은 슬라이더가 보컬을 낮추지만 완전히 제거하지는 않는다고 밝힙니다 [F] ([Apple Newsroom](https://www.apple.com/newsroom/2022/12/apple-introduces-apple-music-sing/)).
  - 카탈로그 규모의 기기 내 처리(on-device) ML 분리(계산이 사용자 자신의 기기에서 실행됨).
  - 이 기능은 따라 부르기(노래방, karaoke) 모드입니다. 노래방은 주 보컬을 제거하거나 줄인 트랙 위에 노래하는 것입니다.
  - Algoriddim의 djay(DJ 앱)는 이미 2020년에 Apple의 Neural Engine(Apple 기기의 기계 학습 전용 칩)에서 실시간 스템을 구동했습니다 [P] ([AppleInsider](https://appleinsider.com/articles/20/06/18/apples-neural-engine-tapped-in-new-djay-pro-to-reinvent-live-mixing/)).
- **Apple tvOS Enhance Dialogue:** 보도에 따르면 표준 플레이어 앱(시스템 기본 내장 플레이어, 서드파티 앱 아님)에서만 작동 [P] ([iDownloadBlog](https://www.idownloadblog.com/?p=960018)).
- **YouTube Studio "Erase Song":** AI가 저작권이 있는 음악만 제거하고 나머지 오디오는 유지하며, 2024년에 업그레이드됨 [P] ([Engadget](https://www.engadget.com/youtube-upgrades-its-erase-song-tool-to-remove-copyrighted-music-only-140032261.html)).
- **Samsung Galaxy Audio Eraser:**
  - S25 (2025): 녹화된 영상에서 음성, 음악, 바람, 군중, 잡음을 분리하며 각각에 슬라이더 제공 [P] ([SamMobile](https://www.sammobile.com/news/galaxy-s25-audio-eraser-what-how-it-works/)).
  - S26 (April 2026): 실시간 "Voice focus" 추가 [V] ([Samsung](https://news.samsung.com/global/faster-real-time-enhanced-audio-eraser-with-the-galaxy-s26-series)).
  - **소리 유형(sound type)** 별로 분리하며, 특정 사람을 고를 수 있다고 밝힌 출처는 없습니다.
- **Spotify × UMG:** 팬이 만드는 AI 커버와 리믹스를 유료 부가 기능으로 제공하는 계약(Spotify와 Universal Music Group, UMG) [P] ([The Music Network](https://themusicnetwork.com/news/spotify-universal-music-ai-covers-deal)). 스템이 라이선스를 받은 소비자 제품이 됩니다.
- **Google:** ProducerAI를 인수(Feb 2026)하여 Flow Music으로 이름을 바꾸고 Lyria 3.5를 출시했습니다. [google_producerai_acquisition.md](../../../market-studies/audio-video-separation/research-notes/google_producerai_acquisition.md)를 참조하세요.

## 5. 주목할 기술 동향

1. **고정 스템은 포화 상태입니다.** 대역 분할(band-split) 트랜스포머와 앙상블(ensemble: 여러 모델의 출력을 평균)이 지배적입니다. 개선은 아키텍처가 아니라 데이터에서 나옵니다.
2. **라이선스를 받은 학습 데이터가 B2B의 해자(moat: 경쟁자가 쉽게 따라 하지 못하는 지속적 경쟁 우위)입니다** (AudioShake의 주장). 커뮤니티 가중치에는 출처 위험이 있습니다.
3. **생성 모델이 음원 분리에 들어오고 있습니다:** SAM Audio, Suno의 재생성 스템, 생성형 음성 향상기. 이는 시장을 둘로 가릅니다 [I]:
   - 리믹스와 AI 음악에는 *그럴듯함(plausible)* 으로 충분합니다;
   - 결혼식, 팟캐스트, 방송, 법적 용도에는 *충실함(faithful)* 이 필요합니다.
4. **프롬프트 기반 멀티모달 선택.** 텍스트, 영상, 시간으로 "가리켜서 소리를 선택"합니다. 선택 UI(사용자 인터페이스)가 새로운 제품 표면(product surface), 즉 사용자가 직접 만지는 제품의 부분입니다.
5. **기기 내 처리(on-device)와 실시간.** Apple, Samsung, AudioShake RT. 단순한 경우(음성 대 나머지 전부)는 무료 OS(운영 체제, operating system) 기능이 되어 가고 있습니다.
6. **어려운 최전선은 정체성(identity)입니다:**
   - *이* 화자, *이* 기타;
   - 긴 파일 전체에서 일관되게 유지;
   - 검증됨.

   지금까지 확인한 소비자 제품 중 사람 단위 분리를 잘 하는 것은 없습니다. 그것이 우리의 기회입니다. [technology-differentiation.md](../../../products/audio-separation/technology-differentiation.md)를 보세요.

## 우리 제품의 위치 [I]

- **경쟁하지 말 것:** 표준 스템(보컬, 드럼, 베이스, 기타로 나누는 일반적 분리) (과밀하고 포화됨).
- **경쟁할 것:**
  - 길고 현실적인 영상·오디오에 대한 정체성 수준의 분리("누가 누구인가");
  - 합하면 믹스로 되돌아가는 충실한 출력;
  - 시각 단서와 스테레오 단서에 기반한 선택 UI;
  - 편의성: 링크나 파일을 넣으면 편집된 영상이 나오는 것.
