import pandas as pd
from typing import List
from ..events.event_types import RatingDropEvent

DANGER_DROP = 0.5
WARNING_DROP = 0.2


class RatingTrendDetector:
    def detect(self, current: pd.DataFrame, previous: pd.DataFrame, brand: str, window: str) -> List[RatingDropEvent]:
        if len(current) == 0 or len(previous) == 0:
            return []

        curr_avg = current["rating"].mean()
        prev_avg = previous["rating"].mean()
        delta = prev_avg - curr_avg

        if delta < WARNING_DROP:
            return []

        return [
            RatingDropEvent(
                brand=brand,
                current_rating=round(curr_avg, 3),
                previous_rating=round(prev_avg, 3),
                delta=round(delta, 3),
                window=window,
            )
        ]
