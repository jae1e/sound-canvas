from seplab.diar_metrics import der, overlap_stats, purity_coverage, segment_accuracy, speaker_count_error

REF = {"a": [(0, 10), (20, 30)], "b": [(10, 20), (28, 35)]}


def test_perfect_with_renamed_labels():
    hyp = {"x": [(0, 10), (20, 30)], "y": [(10, 20), (28, 35)]}
    r = der(REF, hyp)
    assert r["der"] < 1e-6 and r["mapping"] == {"a": "x", "b": "y"}
    assert segment_accuracy(REF, hyp)["accuracy"] == 1.0
    pc = purity_coverage(REF, hyp)
    assert pc["purity"] > 0.99 and pc["coverage"] > 0.99


def test_miss_false_alarm_confusion():
    # total ref speech = 10+10+10+7 = 37 s
    hyp = {"x": [(0, 5)], "y": [(10, 20), (20, 30), (40, 41)]}   # misses a:5-10; a 20-30 labelled y; FA 1 s
    r = der(REF, hyp)
    assert abs(r["miss"] - (5 + 7 * 1.0 - 0) / 37) < 0.05 or r["miss"] > 0
    assert r["false_alarm"] > 0 and r["confusion"] > 0
    assert 0 < r["der"] < 1


def test_collar_and_skip_overlap():
    hyp = {"x": [(0.1, 10.1), (20, 30)], "y": [(10, 20), (28, 35)]}
    assert der(REF, hyp)["der"] > der(REF, hyp, collar=0.25)["der"]
    assert der(REF, hyp, skip_overlap=True)["der"] >= 0


def test_count_and_overlap():
    hyp = {"x": [(0, 10)], "y": [(10, 20)], "z": [(20, 30)]}
    assert speaker_count_error(REF, hyp) == {"ref": 2, "hyp": 3, "correct": False}
    o = overlap_stats(REF, {"x": [(0, 30)], "y": [(10, 20)]})
    assert abs(o["ref_overlap_fraction"] - 2 / 35) < 0.01
    assert o["overlap_recall"] is not None
