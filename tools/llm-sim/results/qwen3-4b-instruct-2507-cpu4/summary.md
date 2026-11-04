# LLM eval: qwen3-4b-instruct-2507-cpu4

Backend: `qwen3-4b-instruct-2507-cpu4`. Date: 2026-11-04. Cases: 58. Concurrency: 1. CPU only, 4 threads, every 3rd case (subset).

Pass = every check for the case is right (action, arguments, confirmation behaviour, groundedness). JSON valid = output parsed and matched the output schema. Accepted = the task validator would let the app use it; anything else is rejected and never applied.

## By task

| Task | Cases | Pass | JSON valid | Accepted | Prompt tok (mean) | Completion tok (mean) | Latency ms p50 | p95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| align | 15 | 67% | 100% | 100% | 809 | 51 | 5057 | 8472 |
| command | 15 | 73% | 100% | 93% | 695 | 37 | 3937 | 6191 |
| correction | 9 | 33% | 100% | 100% | 661 | 78 | 6831 | 7402 |
| routine_setup | 9 | 89% | 100% | 89% | 670 | 273 | 19675 | 117290 |
| travel_qa | 10 | 90% | 100% | 100% | 345 | 31 | 2602 | 5664 |
| **all** | 58 | 71% | 100% | 97% | 655 | 83 | 5361 | 25351 |

## Detail checks

| Task | Check | Result |
| --- | --- | --- |
| align | exactAction | 93% |
| align | args | 93% |
| align | confirm | 73% |
| align | askedWhenShould | 100% |
| align | quietWhenShould | 64% |
| command | kind | 73% |
| command | exactAction | 93% |
| command | args | 93% |
| command | clarifyCorrect | 79% |
| command | quietWhenShould | 100% |
| command | askedWhenShould | 0% |
| correction | scope | 78% |
| correction | target | 78% |
| correction | side | 89% |
| correction | cue | 100% |
| correction | confirm | 67% |
| routine_setup | items | 89% |
| routine_setup | time | 100% |
| routine_setup | count | 88% |
| routine_setup | flag | 100% |
| routine_setup | flagged | 100% |
| travel_qa | answerable | 100% |
| travel_qa | included | 90% |
| travel_qa | noInvention | 100% |
| travel_qa | rescued | 0% |
| travel_qa | notInSourceCorrect | 100% |

Clarification: `askedWhenShould` is the share of cases labelled "ask / confirm" where the system asked; `quietWhenShould` is the share labelled "just do it" where it did not interrupt the user. Both appear under Detail checks for `align` (needsConfirmation) and `command` (clarify).

## By language

| Task | ko pass | en pass |
| --- | --- | --- |
| align | 63% (8) | 71% (7) |
| command | 75% (8) | 71% (7) |
| correction | 40% (5) | 25% (4) |
| routine_setup | 100% (4) | 80% (5) |
| travel_qa | 100% (5) | 80% (5) |

## By tag

| Tag | Cases | Pass |
| --- | --- | --- |
| ambiguous | 8 | 25% |
| asr | 3 | 100% |
| casual | 34 | 68% |
| hard | 5 | 80% |
| honorific | 5 | 100% |
| mixed | 1 | 100% |
| numbers | 18 | 67% |
| oos | 9 | 100% |
| real | 3 | 100% |

## Failures

### align (5)

- `align-ko-004` numbers: "찌개 오분 타이머 | 찌개 5분 타이머" -> start_timer {"t":"","l":"찌개","s":300,"n":0} conf=true (needsConfirmation true, expected false)
- `align-ko-013` numbers: "10분 동안 조용히 해줘 | 십분 동안 조용히 해줘" -> set_quiet {"t":"","l":"","s":600,"n":0} conf=true (needsConfirmation true, expected false)
- `align-ko-022` numbers: "오분만 쉬자 | 5분만 쉬자" -> rest {"t":"","l":"","s":300,"n":0} conf=true (needsConfirmation true, expected false)
- `align-en-015` casual: "add buy milk to my list | add buy milk to my lists" -> add_task {"t":"","l":"buy milk","s":0,"n":0} conf=true (needsConfirmation true, expected false)
- `align-en-021` casual: "go back one | go back" -> repeat_from {"t":"","l":"","s":0,"n":1} conf=false (type repeat_from, expected back)

### command (4)

- `command-ko-011` casual: "찌개 타이머 다시 시작해줘" -> invalid_output:bad_duration (invalid_output:bad_duration)
- `command-ko-014` ambiguous,casual: "다 됐어" -> action task_done {"t":"보고서 쓰기","l":"","f":"","s":0,"n":0} (kind action, expected clarify)
- `command-en-009` ambiguous,numbers: "add 2 more minutes" -> action extend_task {"t":"fold laundry","l":"","f":"","s":120,"n":0} (kind action, expected clarify)
- `command-en-012` hard,ambiguous: "cancel the timer" -> action cancel_timer {"t":"oven","l":"","f":"","s":0,"n":0} (kind action, expected clarify)

### correction (6)

- `correction-ko-004` ambiguous,casual: "아래막기 할 때 팔꿈치가 벌어져요" -> movement p1#5 side=both "팔꿈치 꼭 꿈겨요!" / "keep elbows tight!" confirm=false (wrong: confirm)
- `correction-ko-007` casual: "스쿼트할 때 무릎이 안으로 모여요" -> routine side=none "무릎을 펴세요!" / "straighten your knees!" confirm=false (wrong: scope)
- `correction-ko-010` casual: "앞차기할 때 왼발이 먼저 나가요. 오른발이어야 해요" -> movement p1#14 side=right "오른발 먼저 나가요!" / "right foot first!" confirm=false (wrong: confirm)
- `correction-en-006` casual,ambiguous: "keep my back straight" -> routine side=none "척추를 직선으로 유지하세요!" / "Keep your back straight!" confirm=false (wrong: scope)
- `correction-en-009` ambiguous,casual: "low block elbows flare out" -> movement p1#1 side=both "팔꿈치 펴세요!" / "elbows spread!" confirm=false (wrong: confirm)
- `correction-en-012` numbers,casual: "left shoulder is too high in movement 8" -> movement p1#8 side=both "왼쪽 어깨 낮추세요!" / "lower left shoulder!" confirm=false (wrong: side)

### routine_setup (1)

- `routine_setup-en-010` numbers: "10 pushups, rest 1 minute, then 10 pushups again" -> 1 items, 2.0 min: Pushups (missing rest, exercise[push])

### travel_qa (1)

- `travel_qa-en-005` casual: "What is special about the tree in the courtyard of Jogyesa?" -> answered (ok): The tree is designated as a natural monument. (missing required fact)

