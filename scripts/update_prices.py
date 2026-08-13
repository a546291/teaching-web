#!/usr/bin/env python3
"""
從 TWSE / TPEx OpenAPI 抓取收盤價，只保留 stocks.json 裡的 46 檔，
正規化成同一個 schema 寫入 prices.json。

- TWSE：上市股票，STOCK_DAY_ALL
- TPEx：上櫃股票，tpex_mainboard_daily_close_quotes
兩邊都不需要 API Key。

若抓到的交易日跟現有 prices.json 的 asOf 相同（代表當天休市或尚未收盤），
就不覆寫檔案，讓 GitHub Actions 那邊不會產生無意義的 commit。
"""
import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT = __import__("pathlib").Path(__file__).resolve().parent.parent
STOCKS_PATH = ROOT / "stocks.json"
PRICES_PATH = ROOT / "prices.json"

TWSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
TPEX_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"

TAIPEI = timezone(timedelta(hours=8))


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def roc_date_to_ad(roc_str):
    # 例："1150812" -> "2026/08/12"
    roc_str = roc_str.strip()
    year = int(roc_str[:3]) + 1911
    month = roc_str[3:5]
    day = roc_str[5:7]
    return f"{year}/{month}/{day}"


def load_codes():
    with open(STOCKS_PATH, encoding="utf-8") as f:
        stocks = json.load(f)
    return [s["code"] for s in stocks]


def build_twse_index():
    rows = fetch_json(TWSE_URL)
    index = {}
    for row in rows:
        try:
            price = float(row["ClosingPrice"])
        except (TypeError, ValueError):
            continue
        try:
            change = float(row["Change"])
        except (TypeError, ValueError):
            change = None
        index[row["Code"]] = {
            "price": price,
            "change": change,
            "market": "TWSE",
            "date": roc_date_to_ad(row["Date"]),
        }
    return index


def build_tpex_index():
    rows = fetch_json(TPEX_URL)
    index = {}
    for row in rows:
        try:
            price = float(row["Close"])
        except (TypeError, ValueError):
            continue
        try:
            change = float(row["Change"].strip())
        except (TypeError, ValueError):
            # 除權息等特殊註記，非數字漲跌，價格仍可信，漲跌顯示為未知
            change = None
        index[row["SecuritiesCompanyCode"]] = {
            "price": price,
            "change": change,
            "market": "TPEx",
            "date": roc_date_to_ad(row["Date"]),
        }
    return index


def main():
    codes = load_codes()
    twse_index = build_twse_index()
    tpex_index = build_tpex_index()

    items = {}
    dates = []
    for code in codes:
        hit = twse_index.get(code) or tpex_index.get(code)
        if hit is None:
            items[code] = {"price": None, "change": None, "market": None}
            continue
        items[code] = {
            "price": hit["price"],
            "change": hit["change"],
            "market": hit["market"],
        }
        dates.append(hit["date"])

    if not dates:
        print("沒有抓到任何一檔的資料，可能是 API 掛了，放棄寫入。", file=sys.stderr)
        sys.exit(1)

    # TWSE、TPEx 更新腳步不一定同步（例如某天 TWSE 開放資料還沒放出當日收盤價，
    # TPEx 卻已經更新），用「最舊」的交易日當 asOf，才能保證這個日期底下
    # 46 檔全部都是同一天或更早，不會有「asOf 寫 8/13，但某幾檔其實還是
    # 8/12 舊價」這種不誠實的情況。
    as_of = min(dates)

    if PRICES_PATH.exists():
        with open(PRICES_PATH, encoding="utf-8") as f:
            old = json.load(f)
        if old.get("asOf") == as_of:
            print(f"沒有更完整的新資料（{as_of} 之後至少還有一個市場尚未更新，或今天非交易日），不覆寫。")
            return

    snapshot = {
        "asOf": as_of,
        "updatedAt": datetime.now(TAIPEI).isoformat(timespec="seconds"),
        "items": items,
    }

    with open(PRICES_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"寫入 prices.json，交易日 {as_of}，共 {len(items)} 檔。")


if __name__ == "__main__":
    main()
