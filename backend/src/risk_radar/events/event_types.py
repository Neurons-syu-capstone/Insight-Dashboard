from dataclasses import dataclass, field
from typing import List


@dataclass
class KeywordSpikeEvent:
    brand: str
    attribute: str
    top_keyword: str
    current_freq: float
    previous_freq: float
    delta_pct: float
    window: str
    evidence: List[str] = field(default_factory=list)


@dataclass
class RatingDropEvent:
    brand: str
    current_rating: float
    previous_rating: float
    delta: float
    window: str


@dataclass
class RiskAlert:
    brand: str
    attribute: str
    level: str       # "위험" | "경고" | "양호"
    trigger: str     # "keyword_spike" | "rating_drop"
    delta_pct: float
    description: str
    evidence: List[str]
    window: str
