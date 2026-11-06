import hashlib

import pytest

from fls.canon import canonical, find_problem, record_hash
from conftest import VECTORS


@pytest.mark.parametrize("case", VECTORS["cases"], ids=lambda c: c["name"])
def test_cases(case):
    s = canonical(case["input"])
    assert s == case["canonical"]
    assert hashlib.sha256(s.encode()).hexdigest() == case["sha256"]


def test_chain():
    prev = ""
    for item in VECTORS["chain"]:
        env = item["envelope_without_record_hash"]
        assert env["prev_hash"] == prev
        assert canonical(env) == item["canonical"]
        assert record_hash(env) == item["record_hash"]
        prev = item["record_hash"]


def test_find_problem():
    assert find_problem({"a": [1, {"b": 1.5}]}) == "float"
    assert find_problem({"a": 1.0}) == "float"
    assert find_problem({"a": 2**53}) == "range"
    assert find_problem({"a": [True, None, "x", -3]}) is None
