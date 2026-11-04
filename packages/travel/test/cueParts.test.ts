import { describe, expect, it } from "vitest";

import { routeCueFragments, turnCueParts } from "../src/cues";
import { formatDistance, turnPhrase } from "../src/text";

describe("turnCueParts", () => {
  it("builds the approach cue from a distance fragment plus a direction fragment", () => {
    expect(turnCueParts("approach", "right", "", 50, "ko")).toEqual(["50미터 앞에서", "우회전하세요"]);
    expect(turnCueParts("approach", "left", "", 50, "en")).toEqual(["In 50 meters,", "turn left"]);
    expect(turnCueParts("approach", "arrive", "", 30, "en")).toEqual(["You will arrive in", "30 meters"]);
  });

  it("joins to the full spoken sentence", () => {
    expect(turnCueParts("approach", "right", "", 50, "ko").join(" ")).toBe(`${formatDistance(50, "ko")} 앞에서 ${turnPhrase("right", "ko")}`);
    expect(turnCueParts("now", "left", "", 10, "ko").join(" ")).toBe("지금 좌회전하세요");
    expect(turnCueParts("now", "left", "", 10, "en").join(" ")).toBe("Turn left now");
    expect(turnCueParts("now", "arrive", "", 10, "ko")).toEqual([turnPhrase("arrive", "ko")]);
  });

  it("collects the fragments of a route without duplicates", () => {
    const frags = routeCueFragments({ steps: [{ turn: "right", instruction: "" }, { turn: "right", instruction: "" }, { turn: "straight", instruction: "" }, { turn: "other", instruction: "" }] }, "ko");
    expect(new Set(frags).size).toBe(frags.length);
    expect(frags).toContain("50미터 앞에서");
    expect(frags).toContain("우회전하세요");
    expect(frags).not.toContain(turnPhrase("straight", "ko"));
  });
});
