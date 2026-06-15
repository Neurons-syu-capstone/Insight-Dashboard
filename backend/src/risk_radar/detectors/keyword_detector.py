import pandas as pd
from typing import Dict, List
from ..events.event_types import KeywordSpikeEvent

ATTRIBUTE_KEYWORDS: Dict[str, List[str]] = {
    "사이즈": ["narrow", "tight", "too small", "too big", "sizing", "size issue",
               "run small", "run big", "wide", "length", "half size"],
    "내구성": ["broke", "broken", "fell apart", "falling apart", "sole", "glue",
               "worn out", "separated", "coming apart", "peeling", "durability"],
    "착용감": ["uncomfortable", "painful", "pain", "blister", "blisters",
               "rub", "rubbing", "hurt", "sore", "no support", "no cushion"],
    "디자인": ["ugly", "cheap", "faded", "color", "looks cheap", "cheap looking",
               "flimsy", "poor quality"],
    "반품":   ["return", "returned", "refund", "exchange", "sent back", "returning"],
}

DANGER_THRESHOLD = 0.30
WARNING_THRESHOLD = 0.15


class KeywordSpikeDetector:
    def __init__(self, attribute_keywords: Dict[str, List[str]] = None):
        self.attribute_keywords = attribute_keywords or ATTRIBUTE_KEYWORDS

    def _keyword_freq(self, reviews: pd.DataFrame) -> Dict[str, float]:
        if len(reviews) == 0:
            return {attr: 0.0 for attr in self.attribute_keywords}

        text = reviews["text"].str.lower().fillna("")
        result = {}
        for attr, keywords in self.attribute_keywords.items():
            pattern = "|".join(keywords)
            result[attr] = text.str.contains(pattern, regex=True).mean()
        return result

    def detect(self, current: pd.DataFrame, previous: pd.DataFrame, brand: str, window: str) -> List[KeywordSpikeEvent]:
        curr_freq = self._keyword_freq(current)
        prev_freq = self._keyword_freq(previous)

        events = []
        for attr in self.attribute_keywords:
            prev = prev_freq[attr]
            curr = curr_freq[attr]

            if prev == 0:
                if curr < 0.03:
                    continue
                delta_pct = 1.0
            else:
                delta_pct = (curr - prev) / prev

            if delta_pct < WARNING_THRESHOLD:
                continue

            text_lower = current["text"].str.lower().fillna("")
            pattern = "|".join(self.attribute_keywords[attr])
            matched = current[text_lower.str.contains(pattern, regex=True)]
            evidence = matched["text"].head(3).tolist()

            kw_counts = {
                kw: text_lower.str.contains(kw).sum()
                for kw in self.attribute_keywords[attr]
            }
            top_keyword = max(kw_counts, key=kw_counts.get)

            events.append(
                KeywordSpikeEvent(
                    brand=brand,
                    attribute=attr,
                    top_keyword=top_keyword,
                    current_freq=curr,
                    previous_freq=prev,
                    delta_pct=delta_pct,
                    window=window,
                    evidence=evidence,
                )
            )

        return events
