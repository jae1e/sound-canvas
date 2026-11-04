import { TravelController } from '../../../apps/mobile/src/travel/controller';
import { GWANGHWAMUN } from '../../../apps/mobile/src/travel/landmarkFixtures';
import { MockTravelClient } from '../../../apps/mobile/src/travel/mock';
import { Transcript, type MeteredTransport } from './harness';

/** Travel Guide landmark Q&A over the fixture landmarks. */
export async function travelQa(transport: MeteredTransport): Promise<Transcript> {
  const tr = new Transcript(
    'Scenario 4: Travel Guide landmark Q&A over the fixture landmarks',
    'Real `TravelController` with the bundled fixture landmarks. Topic follow-ups (period, fee, hours) are deterministic. Other questions about the current landmark go to `travel_qa`, which may only use the loaded source text and is checked for a verbatim supporting quote and for numbers.',
  );
  const spoken: string[] = [];
  const ctl = new TravelController(new MockTravelClient(), (t) => void spoken.push(t), 'ko', Date.now, { sleep: async () => undefined });
  ctl.setFix({ lat: GWANGHWAMUN.lat, lng: GWANGHWAMUN.lng, accuracyM: 5, timestampMs: 1 });

  async function ask(text: string, note?: string) {
    const before = { spoken: spoken.length, calls: transport.calls.length };
    const handled = await ctl.handleUtterance(text);
    await ctl.idle();
    await transport.settle();
    const call = transport.calls[before.calls];
    const said = spoken.slice(before.spoken);
    tr.add({
      heard: text,
      path: call ? 'deterministic had no intent -> LLM travel_qa' : handled ? 'deterministic' : 'not handled (falls through)',
      state: ctl.getState().selectedLandmark ? `landmark: ${ctl.getState().selectedLandmark!.name}` : undefined,
      spoken: said.map((s) => (s.length > 160 ? s.slice(0, 157) + '...' : s)),
      ...(call ? { llm: { task: call.task, ms: call.ms, promptTokens: call.promptTokens, completionTokens: call.completionTokens } } : {}),
      ...(note ? { note } : {}),
    });
  }

  await ask('근처에 역사적인 곳 추천해줘');
  await ask('첫 번째 거 알려줘');
  await ask('언제 지어졌어?', 'Topic follow-up (period): deterministic, picks the dated sentence.');
  await ask('마당에 있는 나무는 뭐예요?', 'The source mentions an old pine in the yard: answerable, needs the LLM.');
  await ask('그때 왕은 누구였어요?', 'Not in the source: the answer must be the fixed "source does not say" line.');
  await ask('입장료가 얼마예요?', 'Fee topic: deterministic, no fee fact in the fixture.');
  await ask('Is there a famous tree in the yard?', 'English question over a Korean session and source: answered in English from the Korean text.');
  await ask('Who was the architect of the main hall?', 'Not in the source.');
  return tr;
}
