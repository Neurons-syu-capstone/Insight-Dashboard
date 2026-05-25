import pandas as pd
from typing import List, Optional
from .processors.review_processor import ReviewProcessor
from .detectors.keyword_detector import KeywordSpikeDetector
from .detectors.rating_detector import RatingTrendDetector
from .alert.alert_generator import AlertGenerator
from .events.event_types import RiskAlert

_LEVEL_ORDER = {"위험": 0, "경고": 1, "양호": 2}


class RiskRadar:
    def __init__(self, df: pd.DataFrame, product_col: str = "parent_asin"):
        self.processor = ReviewProcessor(df, product_col=product_col)
        self._keyword_detector = KeywordSpikeDetector()
        self._rating_detector = RatingTrendDetector()
        self._alert_gen = AlertGenerator()

    def scan(self, product_id: str, reference_date: Optional[str] = None, window_days: int = 90) -> List[RiskAlert]:
        ref = (
            pd.Timestamp(reference_date)
            if reference_date
            else self.processor.df["_date"].max()
        )

        current = self.processor.get_window(product_id, ref, window_days)
        previous_end = ref - pd.Timedelta(days=window_days)
        previous = self.processor.get_window(product_id, previous_end, window_days)

        window_label = f"최근 {window_days}일"

        keyword_events = self._keyword_detector.detect(current, previous, product_id, window_label)
        rating_events = self._rating_detector.detect(current, previous, product_id, window_label)

        alerts = (
            self._alert_gen.from_keyword_events(keyword_events)
            + self._alert_gen.from_rating_events(rating_events)
        )

        alerts.sort(key=lambda a: _LEVEL_ORDER.get(a.level, 3))
        return alerts

    def rating_trend(self, product_id: str) -> List[dict]:
        return self.processor.get_rating_timeseries(product_id)

    def keyword_trend(self, product_id: str, attribute: str) -> List[dict]:
        from .detectors.keyword_detector import ATTRIBUTE_KEYWORDS
        keywords = ATTRIBUTE_KEYWORDS.get(attribute, [])
        return self.processor.get_keyword_timeseries(product_id, attribute, keywords)
