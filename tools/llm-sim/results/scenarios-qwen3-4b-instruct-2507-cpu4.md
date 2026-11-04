# Scenario transcripts: qwen3-4b-instruct-2507-cpu4

Backend: `qwen3-4b-instruct-2507-cpu4`. Date: 2026-11-04. Each turn shows what was heard, which path handled it, the engine action and state, and what was spoken.

## Scenario 1: Work Partner, cooking session with misrecognized timers

Real `WorkController` + session engine. Each turn goes through `routeUtterance`: deterministic parsing first, the `align` LLM task only when hypotheses disagree or the speech is out of grammar. Confirmation is a bounded yes/no (20 s, default do nothing).

1. heard: "파스타 10분 타이머"
   - path: deterministic (known_label)
   - action: {"type":"start_timer","label":"파스타","durationMs":600000,"task":{"label":"파스타"}}
   - state: timers [파스타 596s running] tasks [파스타:in_progress, 샐러드:in_progress]
   - spoken: "파스타 타이머를 10분으로 시작했어요."
2. heard: "리조트 5분 타이머" (alternatives: "리조또 5분 타이머")
   - path: deterministic (known_label)
   - action: {"type":"start_timer","label":"리조또","durationMs":300000}
   - state: timers [파스타 592s running, 리조또 296s running] tasks [파스타:in_progress, 샐러드:in_progress]
   - spoken: "리조또 타이머를 5분으로 시작했어요."
   - note: The device case. The cooking lexicon contains 리조또, so `chooseHypothesis` picks the right alternative with no LLM call.
3. heard: "쿠키 5분 타이머" (alternatives: "쿠기 5분 타이머")
   - path: LLM fallback (hypotheses_disagree) -> failed: timeout, deterministic/retry [align 0 ms, 0+0 tokens]
   - action: {"type":"start_timer","label":"쿠키","durationMs":300000}
   - state: timers [파스타 588s running, 리조또 292s running, 쿠키 296s running] tasks [파스타:in_progress, 샐러드:in_progress]
   - spoken: "쿠키 타이머를 5분으로 시작했어요."
   - note: Both alternatives parse, with different labels that the lexicon does not know: this is where the LLM is needed.
4. heard: "네"
   - path: deterministic (noise)
   - state: timers [파스타 584s running, 리조또 288s running, 쿠키 292s running] tasks [파스타:in_progress, 샐러드:in_progress]
   - spoken: (silent)
   - note: Answer to the confirmation question, handled locally.
5. heard: "파스타 다 됐어"
   - path: deterministic (known_label)
   - action: {"type":"report_task","task":{"label":"파스타"},"report":"done"}
   - state: timers [리조또 284s running, 쿠키 288s running] tasks [파스타:completed, 샐러드:in_progress]
   - spoken: "파스타 타이머를 취소했어요. 파스타를 완료로 표시했어요."
6. heard: "아까 그 파스타 타이머 2분만 더 늘려줄래"
   - path: LLM fallback (low_confidence) -> failed: timeout, deterministic/retry [align 0 ms, 0+0 tokens]
   - state: timers [리조또 280s running, 쿠키 284s running] tasks [파스타:completed, 샐러드:in_progress]
   - spoken: "잘 못 알아들었어요. 다시 말씀해 주세요."
   - note: Free-form phrasing the grammar does not cover.
7. heard: "how long should the rice rest after cooking?"
   - path: LLM fallback (question) -> failed: timeout, deterministic/retry [align 0 ms, 0+0 tokens]
   - state: timers [리조또 276s running, 쿠키 280s running] tasks [파스타:completed, 샐러드:in_progress]
   - spoken: "잘 못 알아들었어요. 다시 말씀해 주세요."
   - note: A question nothing can answer: the model maps it to no action and the app says so honestly.
8. heard: "cancel the cookie timer"
   - path: LLM fallback (low_confidence) -> failed: timeout, deterministic/retry [align 0 ms, 0+0 tokens]
   - state: timers [리조또 272s running, 쿠키 276s running] tasks [파스타:completed, 샐러드:in_progress]
   - spoken: "잘 못 알아들었어요. 다시 말씀해 주세요."
   - note: Hard to undo: always confirmed.
9. heard: "no"
   - path: deterministic (noise)
   - state: timers [리조또 268s running, 쿠키 272s running] tasks [파스타:completed, 샐러드:in_progress]
   - spoken: (silent)

_LLM calls: 4 (4 failed), latency p50 0 ms, max 0 ms, tokens in/out 0/0_

## Scenario 2: set up a routine by free-form voice, then run it with deviations

Real `RoutineController`. Setup text the deterministic parser cannot place goes to the `routine_setup` task; the model output is validated against the routine schema and shown as an editable preview (never started automatically). Live utterances the grammar misses go to the `command` task in routine mode.

1. heard: "오늘은 하체 위주로 20분 정도"
   - path: deterministic parse is junk (a goal, not a list), so the parse is not trusted -> LLM routine_setup (draft is shown for editing, nothing starts automatically) [routine_setup 0 ms, 0+0 tokens]
   - state: 1 items: 오늘은 하체 위주로 정 1200s x1
   - spoken: "잠시만요, 정리해 볼게요." / "이해하지 못했어요. 다시 말하거나 입력해 주세요."
2. heard: "다섯 개 더"
   - path: deterministic
   - state: phase running, items: 오늘은 하체 위주로 정
   - spoken: "지금은 횟수를 늘릴 수 없어요."
3. heard: "이거 건너뛰어"
   - path: deterministic
   - action: skip
   - state: phase running, items: 오늘은 하체 위주로 정
   - spoken: "건너뛸게요. 이게 마지막이었어요."
4. heard: "너무 빠른데 좀 천천히 할게요"
   - path: deterministic
   - action: tempo 1.15
   - state: phase running, items: 오늘은 하체 위주로 정
   - spoken: "더 천천히 할게요. 속도 87퍼센트."
5. heard: "다리가 너무 후들거려서 잠깐 쉬어야겠어요"
   - path: deterministic missed -> LLM command [command 0 ms, 0+0 tokens]
   - state: phase running, items: 오늘은 하체 위주로 정
   - spoken: (silent)
6. heard: "오늘 운동은 이만 접을게요"
   - path: deterministic missed -> LLM command [command 0 ms, 0+0 tokens]
   - state: phase ended, items: 오늘은 하체 위주로 정
   - spoken: "수고하셨어요."
7. heard: "네"
   - path: deterministic
   - state: phase ended, items: 오늘은 하체 위주로 정
   - spoken: (silent)
8. heard: "(summary)"
   - path: engine
   - state: ended ended, deviations: skip, tempo; 
   - spoken: (silent)

_LLM calls: 3 (3 failed), latency p50 0 ms, max 0 ms, tokens in/out 0/0_

## Scenario 3: Taegeuk 1 practice, user adds the right-hand correction note

Real `RoutineController` on the built-in Taegeuk 1 routine. A note that names or implies its movement is attached deterministically (current movement when practising). A technique name that matches several movements opens the on-screen picker and asks the `correction` task, which can resolve it from the practice context.

1. heard: "오른손 먼저 나가야되는데 자꾸 왼손이 나가요"
   - path: deterministic (detectCorrectionNote + attachCorrection)
   - action: correction cue "오른손 먼저!" side=right part=손 movement=item/routine
   - state: corrections stored: 1
   - spoken: "이 운동에 메모했어요. 다음부터 "오른손 먼저" 하고 알려드릴게요."
2. heard: "문제: 아래막기 할 때 왼손이 나가요"
   - path: deterministic found several matching movements -> LLM correction [correction 0 ms, 0+0 tokens]
   - action: picker open with 5 candidates (movements 1,3,5,11,17)
   - state: corrections stored: 1
   - spoken: "어느 동작인지 화면에서 골라 주세요."

_LLM calls: 1 (1 failed), latency p50 0 ms, max 0 ms, tokens in/out 0/0_

## Scenario 4: Travel Guide landmark Q&A over the fixture landmarks

Real `TravelController` with the bundled fixture landmarks. Topic follow-ups (period, fee, hours) are deterministic. Other questions about the current landmark go to `travel_qa`, which may only use the loaded source text and is checked for a verbatim supporting quote and for numbers.

1. heard: "근처에 역사적인 곳 추천해줘"
   - path: deterministic
   - spoken: "근처 역사 명소 3곳이에요." / "첫 번째, 조계사, 370미터 거리예요. 조계사는 서울 종로 한가운데에 있는 절이에요." / "두 번째, 경복궁, 410미터 거리예요. 경복궁은 서울 도심 북쪽에 있는 조선 시대의 대표 궁궐이에요." / "세 번째, 청계천, 750미터 거리예요. 청계천은 서울 도심을 동서로 가로지르는 하천이에요." / "샘플 데이터 기준이에요. 궁금한 곳은 "두 번째 알려줘"처럼 말해 보세요."
2. heard: "첫 번째 거 알려줘"
   - path: deterministic
   - state: landmark: 조계사
   - spoken: "조계사에 대해 알려 드릴게요." / "조계사는 서울 종로 한가운데에 있는 절이에요." / "한국 불교에서 가장 큰 종단인 조계종의 총본산이에요." / "지금의 대웅전은 1938년에 지은 건물이에요." / "마당에는 오래된 백송이 있는데 천연기념물로 지정되어 있어요." / "부처님오신날 즈음에는 알록달록한 연등이 경내를 가득 채워요." / "높은 건물 사이에 있어도 안으로 들어가면 조용한 분위기예요." / "앱에 들어 있는 샘플 설명이에요."
3. heard: "언제 지어졌어?"
   - path: deterministic
   - state: landmark: 조계사
   - spoken: "지금의 대웅전은 1938년에 지은 건물이에요." / "앱에 들어 있는 샘플 설명이에요."
   - note: Topic follow-up (period): deterministic, picks the dated sentence.
4. heard: "마당에 있는 나무는 뭐예요?"
   - path: deterministic had no intent -> LLM travel_qa [travel_qa 0 ms, 0+0 tokens]
   - state: landmark: 조계사
   - spoken: (silent)
   - note: The source mentions an old pine in the yard: answerable, needs the LLM.
5. heard: "그때 왕은 누구였어요?"
   - path: deterministic had no intent -> LLM travel_qa [travel_qa 1484 ms, 341+16 tokens]
   - state: landmark: 조계사
   - spoken: "조계사에 대한 자료에는 그 내용이 나와 있지 않아요."
   - note: Not in the source: the answer must be the fixed "source does not say" line.
6. heard: "입장료가 얼마예요?"
   - path: deterministic
   - state: landmark: 조계사
   - spoken: "조계사의 입장료은 제가 가진 자료에 나와 있지 않아요."
   - note: Fee topic: deterministic, no fee fact in the fixture.
7. heard: "Is there a famous tree in the yard?"
   - path: deterministic had no intent -> LLM travel_qa [travel_qa 0 ms, 0+0 tokens]
   - state: landmark: 조계사
   - spoken: (silent)
   - note: English question over a Korean session and source: answered in English from the Korean text.
8. heard: "Who was the architect of the main hall?"
   - path: deterministic had no intent -> LLM travel_qa [travel_qa 1494 ms, 341+16 tokens]
   - state: landmark: 조계사
   - spoken: "My source for 조계사 doesn't say."
   - note: Not in the source.

_LLM calls: 4 (2 failed), latency p50 1494 ms, max 1494 ms, tokens in/out 682/32_
