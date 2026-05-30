import pandas as pd
from typing import List, Tuple


class ReviewProcessor:
    def __init__(self, df: pd.DataFrame, product_col: str = "parent_asin"):
        self.df = df.copy()
        self.product_col = product_col
        self._prepare()

    def _prepare(self):
        self.df["_date"] = pd.to_datetime(self.df["timestamp"], unit="s")
        self.df["_product"] = self.df[self.product_col]

    def get_products(self) -> List[dict]:
        products = (
            self.df.groupby("_product")
            .agg(review_count=("rating", "count"))
            .reset_index()
            .rename(columns={"_product": "product_id"})
        )
        if "title" in self.df.columns:
            titles = self.df.drop_duplicates("_product")[["_product", "title"]]
            titles = titles.rename(columns={"_product": "product_id"})
            products = products.merge(titles, on="product_id", how="left")
        else:
            products["title"] = products["product_id"]

        cols = ["product_id", "title", "review_count"]
        if "brand" in self.df.columns:
            brands_df = self.df.drop_duplicates("_product")[["_product", "brand"]]
            brands_df = brands_df.rename(columns={"_product": "product_id"})
            products = products.merge(brands_df, on="product_id", how="left")
            products["brand"] = products["brand"].fillna("")
            cols = ["product_id", "title", "brand", "review_count"]

        return (
            products.sort_values("review_count", ascending=False)
            [cols]
            .to_dict("records")
        )

    def get_date_range(self) -> Tuple[str, str]:
        min_d = self.df["_date"].min().strftime("%Y-%m-%d")
        max_d = self.df["_date"].max().strftime("%Y-%m-%d")
        return min_d, max_d

    def get_window(self, product_id: str, end_date: pd.Timestamp, window_days: int) -> pd.DataFrame:
        start = end_date - pd.Timedelta(days=window_days)
        mask = (
            (self.df["_product"] == product_id)
            & (self.df["_date"] >= start)
            & (self.df["_date"] < end_date)
        )
        return self.df[mask]

    def get_rating_timeseries(self, product_id: str, freq: str = "ME") -> List[dict]:
        df = self.df[self.df["_product"] == product_id].copy()
        ts = (
            df.set_index("_date")["rating"]
            .resample(freq)
            .agg(avg_rating="mean", review_count="count")
            .reset_index()
        )
        ts = ts[ts["review_count"] > 0]
        ts["date"] = ts["_date"].dt.strftime("%Y-%m")
        ts["avg_rating"] = ts["avg_rating"].round(3)
        return ts[["date", "avg_rating", "review_count"]].to_dict("records")

    def get_keyword_timeseries(self, product_id: str, attribute: str, keywords: List[str], freq: str = "ME") -> List[dict]:
        df = self.df[self.df["_product"] == product_id].copy()
        pattern = "|".join(keywords)
        df["_match"] = df["text"].str.lower().fillna("").str.contains(pattern, regex=True)
        ts = (
            df.set_index("_date")["_match"]
            .resample(freq)
            .mean()
            .reset_index()
        )
        ts = ts[ts["_match"].notna()]
        ts["date"] = ts["_date"].dt.strftime("%Y-%m")
        ts["neg_ratio"] = ts["_match"].round(4)
        return ts[["date", "neg_ratio"]].to_dict("records")
