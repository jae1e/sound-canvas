# LLM eval: qwen3-4b-instruct-2507-gpu

Backend: `qwen3-4b-instruct-2507-gpu`. Date: 2026-11-04. Cases: 174. Concurrency: 1.

Pass = every check for the case is right (action, arguments, confirmation behaviour, groundedness). JSON valid = output parsed and matched the output schema. Accepted = the task validator would let the app use it; anything else is rejected and never applied.

## By task

| Task | Cases | Pass | JSON valid | Accepted | Prompt tok (mean) | Completion tok (mean) | Latency ms p50 | p95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| align | 44 | 77% | 100% | 98% | 806 | 52 | 222 | 314 |
| command | 46 | 72% | 100% | 98% | 696 | 37 | 151 | 217 |
| correction | 26 | 38% | 100% | 92% | 661 | 76 | 339 | 408 |
| routine_setup | 26 | 77% | 100% | 92% | 671 | 307 | 1042 | 2588 |
| travel_qa | 32 | 97% | 100% | 100% | 351 | 32 | 119 | 294 |
| **all** | 174 | 74% | 100% | 97% | 652 | 86 | 221 | 1710 |

## Detail checks

| Task | Check | Result |
| --- | --- | --- |
| align | exactAction | 93% |
| align | args | 91% |
| align | confirm | 82% |
| align | askedWhenShould | 88% |
| align | quietWhenShould | 81% |
| command | kind | 80% |
| command | exactAction | 93% |
| command | args | 87% |
| command | clarifyCorrect | 84% |
| command | quietWhenShould | 100% |
| command | askedWhenShould | 13% |
| correction | scope | 69% |
| correction | target | 65% |
| correction | side | 88% |
| correction | cue | 81% |
| correction | confirm | 83% |
| routine_setup | items | 88% |
| routine_setup | time | 88% |
| routine_setup | count | 88% |
| routine_setup | flag | 100% |
| routine_setup | flagged | 100% |
| travel_qa | answerable | 100% |
| travel_qa | included | 97% |
| travel_qa | noInvention | 100% |
| travel_qa | rescued | 0% |
| travel_qa | notInSourceCorrect | 100% |

Clarification: `askedWhenShould` is the share of cases labelled "ask / confirm" where the system asked; `quietWhenShould` is the share labelled "just do it" where it did not interrupt the user. Both appear under Detail checks for `align` (needsConfirmation) and `command` (clarify).

## By language

| Task | ko pass | en pass |
| --- | --- | --- |
| align | 68% (22) | 86% (22) |
| command | 70% (23) | 74% (23) |
| correction | 46% (13) | 31% (13) |
| routine_setup | 77% (13) | 77% (13) |
| travel_qa | 100% (16) | 94% (16) |

## By tag

| Tag | Cases | Pass |
| --- | --- | --- |
| ambiguous | 23 | 52% |
| asr | 12 | 92% |
| casual | 92 | 66% |
| hard | 17 | 82% |
| honorific | 24 | 88% |
| mixed | 6 | 50% |
| numbers | 53 | 72% |
| oos | 26 | 100% |
| real | 8 | 63% |

## Failures

### align (10)

- `align-ko-002` asr: "라멘 3분 타이머 | 라면 3분 타이머" -> start_timer {"t":"","l":"라면","s":180,"n":0} conf=false (needsConfirmation false, expected true)
- `align-ko-004` numbers: "찌개 오분 타이머 | 찌개 5분 타이머" -> start_timer {"t":"","l":"찌개","s":300,"n":0} conf=true (needsConfirmation true, expected false)
- `align-ko-008` hard,casual: "오늘은 여기까지 끝낼게 | 오늘은 여기까지 끝낼께" -> task_done {"t":"보고서 쓰기","l":"","s":0,"n":0} conf=false (type task_done, expected end_session)
- `align-ko-011` casual,numbers: "2분 더 | 이 분 더" -> extend_timer {"t":"찌개","l":"","s":120,"n":0} conf=true (needsConfirmation true, expected false)
- `align-ko-013` numbers: "10분 동안 조용히 해줘 | 십분 동안 조용히 해줘" -> set_quiet {"t":"","l":"","s":600,"n":0} conf=true (needsConfirmation true, expected false)
- `align-ko-019` casual: "다음 동작으로 넘어가 | 다음 동작으로 넘어가 줘" -> invalid_output:bad_count (invalid_output:bad_count)
- `align-ko-022` numbers: "오분만 쉬자 | 5분만 쉬자" -> rest {"t":"","l":"","s":300,"n":0} conf=true (needsConfirmation true, expected false)
- `align-en-015` casual: "add buy milk to my list | add buy milk to my lists" -> add_task {"t":"","l":"buy milk","s":0,"n":0} conf=true (needsConfirmation true, expected false)
- `align-en-019` mixed: "set 라면 timer for 4 minutes | set ramen timer for 4 minutes" -> start_timer {"t":"","l":"ramen","s":240,"n":0} conf=true (label: expected "라면", got "ramen")
- `align-en-021` casual: "go back one | go back" -> repeat_from {"t":"","l":"","s":0,"n":1} conf=false (type repeat_from, expected back)

### command (13)

- `command-ko-003` casual: "스쿼트 대신 런지 할래" -> action swap {"t":"스쿼트","l":"런지","f":"","s":0,"n":0} (from: expected "스쿼트", got "")
- `command-ko-011` casual: "찌개 타이머 다시 시작해줘" -> invalid_output:bad_duration (invalid_output:bad_duration)
- `command-ko-012` hard,ambiguous: "타이머 취소" -> action cancel_timer {"t":"","l":"","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-ko-014` ambiguous,casual: "다 됐어" -> action task_done {"t":"보고서 쓰기","l":"","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-ko-018` numbers,casual: "20분 동안 조용히 해줘" -> action set_quiet {"t":"","l":"","f":"","s":0,"n":0} (seconds: expected 1200, got 0)
- `command-ko-019` ambiguous,casual: "너무 힘들어요 쉬고 싶어요" -> action skip_task {"t":"보고서 쓰기","l":"","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-ko-021` honorific: "잠깐 일시정지 해주세요" -> action pause_timer {"t":"","l":"","f":"","s":0,"n":0} (type pause_timer, expected pause_session)
- `command-en-004` : "swap the push-up for a plank" -> action swap {"t":"push-up","l":"plank","f":"","s":0,"n":0} (from: expected "push-up", got "")
- `command-en-005` ambiguous: "swap" -> action swap {"t":"lunge","l":"squat","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-en-008` casual,numbers: "set a pasta timer for ten minutes" -> not_command (kind not_command, expected action)
- `command-en-009` ambiguous,numbers: "add 2 more minutes" -> action extend_timer {"t":"oven","l":"","f":"","s":120,"n":0} (kind action, expected clarify)
- `command-en-012` hard,ambiguous: "cancel the timer" -> action cancel_timer {"t":"oven","l":"","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-en-014` ambiguous,casual: "I'm done" -> action task_done {"t":"write report","l":"","f":"","s":0,"n":0} (kind action, expected clarify)

### correction (16)

- `correction-ko-002` real,casual: "오른손 먼저 나가야되는데 자꾸 왼손이 나가요" -> movement p1#2 side=right "오른손 먼저!" / "right hand first!" confirm=false (wrong: scope)
- `correction-ko-004` ambiguous,casual: "아래막기 할 때 팔꿈치가 벌어져요" -> movement p1#5 side=both "팔꿈치 꼭 꿈겨요!" / "keep elbows tight!" confirm=false (wrong: confirm)
- `correction-ko-006` casual,ambiguous: "허리를 펴고 하라고 계속 지적받아요" -> routine side=none "허리 펴세요!" / "straighten your back!" confirm=false (wrong: scope)
- `correction-ko-007` casual: "스쿼트할 때 무릎이 안으로 모여요" -> routine side=none "무릎을 펴세요!" / "straighten your knees!" confirm=false (wrong: scope)
- `correction-ko-008` honorific: "푸시업할 때 팔꿈치를 몸에 붙여야 해요" -> routine side=none "팔꿈치를 몸에 붙이세요!" / "keep elbows close to body!" confirm=false (wrong: scope)
- `correction-ko-010` casual: "앞차기할 때 왼발이 먼저 나가요. 오른발이어야 해요" -> movement p1#14 side=right "오른발 먼저 나가요!" / "right foot first!" confirm=false (wrong: confirm)
- `correction-ko-012` mixed,casual: "plank 할 때 허리가 처져요" -> invalid_output:unknown_item (invalid_output:unknown_item)
- `correction-en-001` casual: "my left foot steps before my hand on the front kick" -> movement p1#14 side=right "오른손 먼저!" / "right hand first!" confirm=false (wrong: confirm)
- `correction-en-002` casual: "my left foot steps before my hand on the front kick" -> movement p1#14 side=both "왼발 먼저!" / "left foot first!" confirm=false (wrong: cueEn)
- `correction-en-004` numbers: "movement 5, my knee does not straighten" -> movement p1#5 side=both "다리 펴세요!" / "straighten your leg!" confirm=false (wrong: cueEn)
- `correction-en-006` casual,ambiguous: "keep my back straight" -> routine side=none "척추를 직선으로 유지하세요!" / "Keep your spine straight!" confirm=false (wrong: scope, cueEn)
- `correction-en-007` casual: "my knees cave in on squats" -> invalid_output:unknown_movement (invalid_output:unknown_movement)
- `correction-en-009` ambiguous,casual: "low block elbows flare out" -> movement p1#1 side=both "팔꿈치 넓히세요!" / "elbows spread!" confirm=false (wrong: confirm)
- `correction-en-011` mixed,casual: "스쿼트 때 heels come up" -> routine side=none "heels down!" / "heels down!" confirm=false (wrong: scope)
- `correction-en-012` numbers,casual: "left shoulder is too high in movement 8" -> movement p1#8 side=both "왼쪽 어깨 낮추세요!" / "lower left shoulder!" confirm=false (wrong: side)
- `correction-en-013` casual: "on the final punch, kihap louder" -> movement p1#14 side=both "히파 더 크게!" / "kihap louder!" confirm=false (wrong: target)

### routine_setup (6)

- `routine_setup-ko-001` real,casual,numbers: "오늘은 하체 위주로 20분 정도" -> 5 items, 10.5 min: 준비 운동, 스쿼트, 런지, 고개 숙이 운동, 완화 운동 (10.5 min outside 15-25)
- `routine_setup-ko-010` numbers,casual: "스트레칭 하고 휴식 1분 그다음에 스쿼트 10개 2세트" -> 2 items, 2.6 min: 스트레칭, 스쿼트 (missing rest)
- `routine_setup-ko-012` honorific,numbers: "상체 15분 정도 해주세요. 푸시업 위주로요" -> 1 items, 5.0 min: 푸시업 (5.0 min outside 11-19)
- `routine_setup-en-001` real,casual,numbers: "lower body focus, about 20 minutes" -> 6 items, 14.1 min: Warm-up Stretch, Bodyweight Squats, Lunges, Glute Bridges, High Knees, Cool Down Stretch (14.1 min outside 15-25)
- `routine_setup-en-010` numbers: "10 pushups, rest 1 minute, then 10 pushups again" -> 1 items, 2.0 min: Pushups (missing rest, exercise[push])
- `routine_setup-en-012` numbers,casual: "lunges 10 each leg 3 sets, calf raises 20 reps 2 sets, glute bridge 15 reps 3 sets, then a 2 minute rest, then plank 30 seconds twice and 20 pushups" -> 6 items, 14.1 min: Lunges, Calf Raises, Glute Bridge, Rest, Plank, Pushups (missing rest)

### travel_qa (1)

- `travel_qa-en-005` casual: "What is special about the tree in the courtyard of Jogyesa?" -> answered (ok): The tree is designated a natural monument. (missing required fact)

