from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

Span = tuple[str, float, float]  # (sign, start_s, end_s); sign is "+" or "-"


@dataclass
class Prompt:
    """What to separate. Any combination of the three SAM Audio prompt types may be set."""

    description: str = ""                       # text prompt, lowercase noun/verb phrase works best
    spans: list[Span] = field(default_factory=list)
    masked_video: Any = None                    # path to a masked video, or a tensor (visual prompt)
    # Chunked runs: a chunk with no positive span gives silence for this target (speaker split).
    require_span: bool = False

    def __post_init__(self) -> None:
        self.spans = [(str(s), float(a), float(b)) for s, a, b in self.spans]
        for sign, a, b in self.spans:
            if sign not in ("+", "-") or b <= a or a < 0:
                raise ValueError(f"bad span {(sign, a, b)}")

    @classmethod
    def from_dict(cls, d: dict) -> "Prompt":
        return cls(d.get("description", ""), [tuple(s) for s in d.get("spans", [])], d.get("masked_video"))
