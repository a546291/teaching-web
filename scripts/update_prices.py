#!/usr/bin/env python3
"""
從 TWSE / TPEx 抓取收盤價，只保留 stocks.json 裡的 46 檔，
正規化成同一個 schema 寫入 prices.json。

- TWSE：上市股票，用證交所「個股日成交資訊」查詢（STOCK_DAY，逐檔查詢）。
  原本用過 STOCK_DAY_ALL（一次回傳全部上市股票），但實測發現 STOCK_DAY_ALL
  收盤後常常隔了很久才更新，個股查詢頁背後的 STOCK_DAY 反而當天傍晚就有資料，
  所以改用這個逐檔查詢的版本，代價是要對 38 檔各發一次請求。
- TPEx：上櫃股票，tpex_mainboard_daily_close_quotes（一次回傳全部上櫃股票，
  實測更新速度正常，維持原本的整批查詢）。
兩邊都不需要 API Key。

若抓到的交易日跟現有 prices.json 的 asOf 相同（代表當天休市或尚未收盤），
就不覆寫檔案，讓 GitHub Actions 那邊不會產生無意義的 commit。
"""
import json
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT = __import__("pathlib").Path(__file__).resolve().parent.parent
STOCKS_PATH = ROOT / "stocks.json"
PRICES_PATH = ROOT / "prices.json"

TWSE_STOCK_DAY_URL = "https://www.twse.com.tw/exchangeReport/STOCK_DAY"
TPEX_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"

TAIPEI = timezone(timedelta(hours=8))
REQUEST_DELAY_SEC = 3  # 逐檔查詢 TWSE 時，避免太密集被視為濫用而擋掉


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def roc_date_to_ad(roc_str):
    # 例："1150812" -> "2026/08/12"，或 "115/08/12" -> "2026/08/12"
    digits = roc_str.strip().replace("/", "")
    year = int(digits[:3]) + 1911
    month = digits[3:5]
    day = digits[5:7]
    return f"{year}/{month}/{day}"


def load_codes():
    with open(STOCKS_PATH, encoding="utf-8") as f:
        stocks = json.load(f)
    return [s["code"] for s in stocks]


def fetch_twse_stock_day(code):
    """查單一上市股票當月每日收盤價，回傳當月最後一筆（最新交易日）。"""
    today = datetime.now(TAIPEI).strftime("%Y%m%d")
    url = f"{TWSE_STOCK_DAY_URL}?response=json&date={today}&stockNo={code}"
    try:
        payload = fetch_json(url)
    except Exception as e:
        print(f"  {code}: TWSE 查詢失敗（{e}）", file=sys.stderr)
        return None

    if payload.get("stat") != "OK" or not payload.get("data"):
        return None  # 不是上市股票，或當月剛好查不到資料

    last_row = payload["data"][-1]
    try:
        price = float(last_row[6].replace(",", ""))
    except (TypeError, ValueError, IndexError):
        return None
    try:
        change = float(last_row[7].replace(",", ""))
    except (TypeError, ValueError, IndexError):
        # 例如 "X0.00"（除權息等不比價註記），漲跌顯示為未知
        change = None

    return {
        "price": price,
        "change": change,
        "market": "TWSE",
        "date": roc_date_to_ad(last_row[0]),
    }


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
    tpex_index = build_tpex_index()  # 整批查詢，先查這邊比較便宜

    items = {}
    dates = []
    twse_query_count = 0
    for code in codes:
        hit = tpex_index.get(code)
        if hit is None:
            # 不在上櫃清單裡，逐檔查證交所個股日成交資訊
            if twse_query_count > 0:
                time.sleep(REQUEST_DELAY_SEC)
            twse_query_count += 1
            hit = fetch_twse_stock_day(code)

        if hit is None:
            items[code] = {"price": None, "change": None, "changePercent": None, "market": None}
            continue
        change_percent = None
        if hit["change"] is not None:
            prev_close = hit["price"] - hit["change"]
            if prev_close:
                change_percent = round(hit["change"] / prev_close * 100, 2)
        items[code] = {
            "price": hit["price"],
            "change": hit["change"],
            "changePercent": change_percent,
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
