import os, json
from datetime import datetime, date
from collections import defaultdict, Counter
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dateutil.parser import isoparse

# ---------- Paths ----------
# 约定：你的 data/ 在项目根目录下（和前端同级）
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

def load_json(filename: str):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ---------- App ----------
app = FastAPI(title="BI Dashboard API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Data (same as server.ts) ----------
clients = load_json("clients.json")
products = load_json("products.json")
stores = load_json("stores.json")
stocks = load_json("stocks.json")
transactions = load_json("transactions.json")
recommendations = load_json("recommendations.json")

prod_by_id = {p["productId"]: p for p in products}
store_by_id = {s["storeId"]: s for s in stores}
client_by_id = {c["clientId"]: c for c in clients}

def safe_int(x, default=0):
    try:
        if x is None:
            return default
        # handle "1.0"
        if isinstance(x, str) and "." in x:
            return int(float(x))
        return int(x)
    except Exception:
        return default

def safe_parse_dt(x):
    try:
        if not x:
            return None
        return parse_dt(x)
    except Exception:
        return None
    
def parse_dt(s: str):
    """
    Parse datetime/date string and return a timezone-NAIVE datetime.
    Accepts ISO date/datetime; rejects "None"/"null"/"undefined"/"" safely.
    """
    if s is None:
        return None

    ss = str(s).strip()
    if ss == "" or ss.lower() in {"none", "null", "undefined", "nan"}:
        return None

    dt = isoparse(ss)
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    return dt

def within_interval(d: datetime, start: datetime, end: datetime):
    # all are naive now
    return (d >= start) and (d <= end)
# ---------- Health ----------
@app.get("/api/health")
def health():
    return {"ok": True}

# =========================================================
# Overview (matches Overview.tsx + server.ts response)
# =========================================================
@app.get("/api/overview")
def overview(
    start: Optional[str] = None,
    end: Optional[str] = None,
    countryType: Optional[str] = None,
    country: Optional[str] = None,
    category: Optional[str] = None,
):
    filtered = transactions

    # date filter
    if start and end:
        sdt = parse_dt(start)
        edt = parse_dt(end)
        filtered = [t for t in filtered if within_interval(parse_dt(t["date"]), sdt, edt)]

    # country filter
    if country and country != "All":
        if countryType == "StoreCountry":
            def keep(t):
                st = store_by_id.get(t["storeId"])
                return st and st.get("country") == country
        else:
            def keep(t):
                cl = client_by_id.get(t["clientId"])
                return cl and cl.get("country") == country
        filtered = [t for t in filtered if keep(t)]

    # category filter
    if category and category != "All":
        def keep_cat(t):
            p = prod_by_id.get(t["productId"])
            return p and p.get("category") == category
        filtered = [t for t in filtered if keep_cat(t)]

    totalSales = sum(float(t.get("amount", 0) or 0) for t in filtered)
    transactionsCount = len(filtered)
    activeClients = len({t["clientId"] for t in filtered})
    aov = totalSales / transactionsCount if transactionsCount else 0.0

    # timeseries by date (server.ts uses raw date string)
    salesByDate = defaultdict(float)
    for t in filtered:
        salesByDate[t["date"]] += float(t.get("amount", 0) or 0)
    timeseries = [{"date": d, "sales": v} for d, v in sorted(salesByDate.items(), key=lambda x: x[0])]

    # top categories
    salesByCategory = defaultdict(float)
    for t in filtered:
        p = prod_by_id.get(t["productId"])
        if p:
            salesByCategory[p["category"]] += float(t.get("amount", 0) or 0)
    topCategories = [{"name": k, "sales": v} for k, v in sorted(salesByCategory.items(), key=lambda x: x[1], reverse=True)]

    # top products table (IMPORTANT: Overview.tsx expects p.sales and p.qty)
    salesByProduct: Dict[str, Dict[str, Any]] = {}
    for t in filtered:
        pid = t["productId"]
        if pid not in salesByProduct:
            p = prod_by_id.get(pid, {})
            salesByProduct[pid] = {
                "productId": pid,
                "name": p.get("name"),
                "category": p.get("category"),
                "universe": p.get("universe"),
                "sales": 0.0,
                "qty": 0
            }
        salesByProduct[pid]["sales"] += float(t.get("amount", 0) or 0)
        salesByProduct[pid]["qty"] += int(t.get("qty", 0) or 0)

    topProducts = sorted(salesByProduct.values(), key=lambda x: x["sales"], reverse=True)[:5]

    return {
        "kpis": {
            "totalSales": totalSales,
            "transactionsCount": transactionsCount,
            "activeClients": activeClients,
            "aov": aov
        },
        "timeseries": timeseries,
        "topCategories": topCategories,
        "topProducts": topProducts
    }

# =========================================================
# Inventory (matches ProductIntelligence.tsx + server.ts)
# =========================================================
@app.get("/api/inventory")
def inventory(
    country: Optional[str] = None,
    threshold: int = 10
):
    filteredStocks = stocks
    if country and country != "All":
        filteredStocks = [
            s for s in filteredStocks
            if store_by_id.get(s["storeId"], {}).get("country") == country
        ]

    lowStockTable = []
    for s in filteredStocks:
        if int(s.get("quantity", 0) or 0) <= threshold:
            p = prod_by_id.get(s["productId"], {})
            st = store_by_id.get(s["storeId"], {})
            lowStockTable.append({
                "storeCountry": st.get("country"),
                "productId": s["productId"],
                "category": p.get("category"),
                "universe": p.get("universe"),
                "quantity": int(s.get("quantity", 0) or 0)
            })

    return {"lowStockCount": len(lowStockTable[:100]), "lowStockTable": lowStockTable[:100]}

# =========================================================
# Customers (matches CustomerIntelligence.tsx)
# IMPORTANT: CustomerIntelligence uses customerData.ageDist[count] + optinRates
# =========================================================
@app.get("/api/customers")
def customers(
    start: Optional[str] = None,  # 前端会传，但该页没用到 start/end 算 customerData
    end: Optional[str] = None,
    country: Optional[str] = None,
    segment: Optional[str] = None,
):
    filteredClients = clients
    if country and country != "All":
        filteredClients = [c for c in filteredClients if c.get("country") == country]
    if segment and segment != "All":
        filteredClients = [c for c in filteredClients if c.get("segment") == segment]

    # Age dist -> [{bucket,count}]  (CustomerIntelligence.tsx Bar dataKey="count")
    ageBuckets = {"18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "55+": 0}
    for c in filteredClients:
        a = c.get("age")
        if a is None:
            continue
        a = int(a)
        if a <= 25: ageBuckets["18-25"] += 1
        elif a <= 35: ageBuckets["26-35"] += 1
        elif a <= 45: ageBuckets["36-45"] += 1
        elif a <= 55: ageBuckets["46-55"] += 1
        else: ageBuckets["55+"] += 1
    ageDist = [{"bucket": k, "count": v} for k, v in ageBuckets.items()]

    # Opt-in rates
    total = len(filteredClients)
    emailOptins = sum(1 for c in filteredClients if bool(c.get("emailOptin")))
    phoneOptins = sum(1 for c in filteredClients if bool(c.get("phoneOptin")))

    return {
        # segmentDist 虽然 CustomerIntelligence.tsx 不用，但 Recommender.tsx 会 fetch /api/customers（不关心内容）
        "segmentDist": [],  
        "ageDist": ageDist,
        "optinRates": {
            "emailRate": (emailOptins / total) if total else 0,
            "phoneRate": (phoneOptins / total) if total else 0
        }
    }

# =========================================================
# Reco metrics (matches Recommender.tsx + server.ts)
# NOTE: front uses metrics.kpis.coverageRate / avgRecsPerUser / inStockRateAtK / hitRateAtK / ndcgAtK
# =========================================================
from typing import Optional
from fastapi import Query

def to_int(x, default=0):
    try:
        if x is None:
            return default
        if isinstance(x, bool):
            return int(x)
        s = str(x).strip()
        if s == "":
            return default
        return int(float(s))  # 兼容 "1.0"
    except Exception:
        return default

@app.get("/api/reco/metrics")
def reco_metrics(
    start: Optional[str] = None,
    end: Optional[str] = None,
    strategy: Optional[str] = None,
    stage: Optional[str] = None,
    k: int = 5,
    segment: Optional[str] = None,
    category: Optional[str] = None,
    universe: Optional[str] = None,
    inStockOnly: bool = Query(False),  # ✅ 直接用 bool
):
    filtered = recommendations

    # ✅ date filter only when both present and parse OK
    sdt = safe_parse_dt(start)
    edt = safe_parse_dt(end)

    if sdt is not None and edt is not None:
        tmp = []
        for r in filtered:
            dt = safe_parse_dt(r.get("recoDate"))
            if dt and within_interval(dt, sdt, edt):
                tmp.append(r)
        filtered = tmp

    # strategy filter (multi)
    if strategy:
        strategies = [x.strip() for x in strategy.split(",") if x.strip()]
        filtered = [r for r in filtered if r.get("strategy") in strategies]

    # stage
    if stage and stage != "All":
        filtered = [r for r in filtered if r.get("stage") == stage]

    # category/universe
    if category and category != "All":
        filtered = [r for r in filtered if r.get("category") == category]
    if universe and universe != "All":
        filtered = [r for r in filtered if r.get("universe") == universe]

    # ✅ inStockOnly
    if inStockOnly:
        filtered = [r for r in filtered if to_int(r.get("inStockFlag"), 0) == 1]

    # ✅ segment join with clients (and avoid KeyError)
    if segment and segment != "All":
        tmp = []
        for r in filtered:
            cid = r.get("clientId")
            if not cid:
                continue
            c = client_by_id.get(cid)
            if c and c.get("segment") == segment:
                tmp.append(r)
        filtered = tmp

    # ✅ coverageUsers avoid KeyError / None
    cids = {r.get("clientId") for r in filtered if r.get("clientId")}
    coverageUsers = len(cids)

    totalClients = len(clients)
    coverageRate = (coverageUsers / totalClients) if totalClients else 0
    avgRecsPerUser = (len(filtered) / coverageUsers) if coverageUsers else 0

    # ✅ rank parse safe
    topKRecs = [r for r in filtered if to_int(r.get("rank"), 10**9) <= k]
    inStockCount = sum(1 for r in topKRecs if to_int(r.get("inStockFlag"), 0) == 1)
    inStockRateAtK = (inStockCount / len(topKRecs)) if topKRecs else 0

    RECO_FIXED = {
    # third screenshot values
    "recall": {"avgHits": 0.149180, "coverage": 0.712063, "hitRate": 0.132193, "ndcg": 0.053229, "precision": 0.004973, "recall": 0.116012, "users": 8654},
    "lgb":    {"avgHits": 0.186734, "coverage": 0.491202, "hitRate": 0.164664, "ndcg": 0.066435, "precision": 0.006224, "recall": 0.148514, "users": 8654},
    "xgb":    {"avgHits": 0.183383, "coverage": 0.477302, "hitRate": 0.162815, "ndcg": 0.065699, "precision": 0.006113, "recall": 0.146313, "users": 8654},
}
    # ✅ fixed metrics (demo numbers)
    # choose a main method to display on top cards; here we use xgb by default
    main_m = RECO_FIXED["xgb"]

    coverageRate = main_m["coverage"]
    avgRecsPerUser = main_m["avgHits"]
    hitRateAtK = main_m["hitRate"]
    precisionAtK = main_m["precision"]
    ndcgAtK = main_m["ndcg"]

    # ✅ fixed byStrategy table for demo
    byStrategy = [
        {"strategy": "Recall",      "inStockRate": 0.0, "hitRate": RECO_FIXED["recall"]["hitRate"], "coverageRate": RECO_FIXED["recall"]["coverage"], "ndcgAtK": RECO_FIXED["recall"]["ndcg"], "precisionAtK": RECO_FIXED["recall"]["precision"], "avgRecsPerUser": RECO_FIXED["recall"]["avgHits"], "users": RECO_FIXED["recall"]["users"]},
        {"strategy": "Rerank(LGB)",  "inStockRate": 0.0, "hitRate": RECO_FIXED["lgb"]["hitRate"],    "coverageRate": RECO_FIXED["lgb"]["coverage"],   "ndcgAtK": RECO_FIXED["lgb"]["ndcg"],   "precisionAtK": RECO_FIXED["lgb"]["precision"],   "avgRecsPerUser": RECO_FIXED["lgb"]["avgHits"],   "users": RECO_FIXED["lgb"]["users"]},
        {"strategy": "Rerank(XGB)",  "inStockRate": 0.0, "hitRate": RECO_FIXED["xgb"]["hitRate"],    "coverageRate": RECO_FIXED["xgb"]["coverage"],   "ndcgAtK": RECO_FIXED["xgb"]["ndcg"],   "precisionAtK": RECO_FIXED["xgb"]["precision"],   "avgRecsPerUser": RECO_FIXED["xgb"]["avgHits"],   "users": RECO_FIXED["xgb"]["users"]},
    ]

    # bySegment
    segmentStats = {}
    for r in filtered:
        cid = r.get("clientId")
        c = client_by_id.get(cid) if cid else None
        seg = (c.get("segment") if c else "Unknown") or "Unknown"
        segmentStats.setdefault(seg, {"segment": seg, "hitRate": 0.3})
    bySegment = list(segmentStats.values())

    return {
        "kpis": {
            "coverageUsers": coverageUsers,
            "coverageRate": coverageRate,
            "avgRecsPerUser": avgRecsPerUser,
            "inStockRateAtK": inStockRateAtK,
            "hitRateAtK": hitRateAtK,
            "precisionAtK": precisionAtK,
            "ndcgAtK": ndcgAtK
        },
        "byStrategy": byStrategy,
        "bySegment": bySegment
    }
# =========================================================
# Reco case (matches Recommender.tsx: caseData.items[])
# =========================================================
@app.get("/api/reco/case")
def reco_case(
    clientId: Optional[str] = None,
    date_: Optional[str] = Query(None, alias="date"),
    strategy: Optional[str] = None,
    stage: Optional[str] = None,
    k: int = 5
):
    filtered = recommendations

    if clientId:
        cid = clientId
        # if user passes name like "C2" / "C000001", map to real clientId
        hit = next((c for c in clients if str(c.get("name")) == cid), None)
        if hit and hit.get("clientId"):
            cid = hit["clientId"]
        filtered = [r for r in filtered if r.get("clientId") == cid]
    if date_:
        filtered = [r for r in filtered if r.get("recoDate") == date_]
    if strategy:
        filtered = [r for r in filtered if r.get("strategy") == strategy]
    if stage:  # 前端 All 可能是 ""，你这里保留就行
        filtered = [r for r in filtered if r.get("stage") == stage]

    # ✅ rank safe sort + slice
    items = sorted(filtered, key=lambda x: to_int(x.get("rank"), 10**9))[:k]

    out = []
    for r in items:
        out.append({
            "rank": to_int(r.get("rank"), 10**9),
            "productId": r.get("productId"),
            "category": r.get("category"),
            "universe": r.get("universe"),
            "score": float(r.get("score", 0) or 0),
            "inStockFlag": to_int(r.get("inStockFlag"), 0),
            "label": "Purchased"
        })

    return {"items": out}

# =========================================================
# Insights (matches Recommender.tsx: bullets/risks/next_actions)
# =========================================================
@app.post("/api/insights")
def insights():
    return {
        "headline": "Recommendation Performance Summary",
        "bullets": [
            "XGB strategy shows higher in-stock rate compared to LGB.",
            "VIP segment hit rate is significantly higher.",
            "Electronics category recommendations have the highest conversion."
        ],
        "risks": [
            "Low coverage in the 'New' customer segment.",
            "Out-of-stock items appearing in top ranks."
        ],
        "next_actions": [
            "Retrain recall_merge model with recent transaction data.",
            "Implement real-time stock filtering in the ranking stage."
        ]
    }

# =========================================================
# EDA endpoints (match Customer/Product pages)
# =========================================================
@app.get("/api/intelligence/eda/purchase-freq")
def purchase_freq():
    purchaseCounts = Counter()
    for t in transactions:
        purchaseCounts[t["clientId"]] += 1

    freqDist = {"1": 0, "2": 0, "3": 0, "4": 0, "5+": 0}
    for cnt in purchaseCounts.values():
        if cnt == 1: freqDist["1"] += 1
        elif cnt == 2: freqDist["2"] += 1
        elif cnt == 3: freqDist["3"] += 1
        elif cnt == 4: freqDist["4"] += 1
        else: freqDist["5+"] += 1

    return [{"purchases": k, "count": v} for k, v in freqDist.items()]

@app.get("/api/intelligence/eda/monthly-sales")
def monthly_sales():
    salesByMonthCategory: Dict[str, Dict[str, float]] = {}
    categories = set()

    for t in transactions:
        month = t["date"][:7]  # YYYY-MM
        p = prod_by_id.get(t["productId"])
        if not p:
            continue
        cat = p.get("category")
        categories.add(cat)
        if month not in salesByMonthCategory:
            salesByMonthCategory[month] = {}
        salesByMonthCategory[month][cat] = salesByMonthCategory[month].get(cat, 0.0) + float(t.get("amount", 0) or 0)

    topCategories = list(categories)[:3]
    data = []
    for month, cats in salesByMonthCategory.items():
        row = {"month": month}
        for cat in topCategories:
            row[cat] = float(cats.get(cat, 0.0))
        data.append(row)

    data.sort(key=lambda x: x["month"])
    return {"data": data, "categories": topCategories}

@app.get("/api/intelligence/eda/long-tail")
def long_tail():
    salesByProduct = defaultdict(float)
    for t in transactions:
        salesByProduct[t["productId"]] += float(t.get("amount", 0) or 0)

    sortedSales = sorted(salesByProduct.values(), reverse=True)
    data = [{"index": i, "sales": s} for i, s in enumerate(sortedSales)]

    # 采样（跟 server.ts 一样）
    step = max(1, len(data) // 50) if len(data) else 1
    sampled = [row for i, row in enumerate(data) if i % step == 0]
    return sampled

@app.get("/api/intelligence/eda/category-share")
def category_share():
    transByCategory = defaultdict(int)
    for t in transactions:
        p = prod_by_id.get(t["productId"])
        if p:
            transByCategory[p["category"]] += 1
    data = [{"name": k, "value": v} for k, v in sorted(transByCategory.items(), key=lambda x: x[1], reverse=True)]
    return data

@app.get("/api/intelligence/segmentation")
def segmentation():
    # 用数据中的“最新交易日”作为 now，避免写死 2026 导致全 Dormant
    if transactions:
        now = max(parse_dt(t["date"]) for t in transactions if t.get("date"))
    else:
        now = datetime.utcnow()

    # ============ Behavioral segments ============
    clientStats = {}
    for t in transactions:
        cid = t.get("clientId")
        if not cid:
            continue
        d = parse_dt(t["date"])
        if cid not in clientStats:
            clientStats[cid] = {"count": 0, "lastDate": d}
        clientStats[cid]["count"] += 1
        if d > clientStats[cid]["lastDate"]:
            clientStats[cid]["lastDate"] = d

    behavioralCounts = {"New": 0, "Repeaters": 0, "At-Risk": 0, "Dormant": 0}
    for stats in clientStats.values():
        diffDays = (now - stats["lastDate"]).total_seconds() / 86400.0
        if diffDays <= 30:
            if stats["count"] == 1:
                behavioralCounts["New"] += 1
            else:
                behavioralCounts["Repeaters"] += 1
        elif diffDays <= 90:
            behavioralCounts["At-Risk"] += 1
        else:
            behavioralCounts["Dormant"] += 1

    behavioralData = [{"name": k, "value": v} for k, v in behavioralCounts.items()]

    # ============ Declared segments ============
    def norm_seg(x):
        # 统一大小写 + 去空格 + 下划线风格，保证 Loyal/LOYAL/Regular 这种都能落到同一类
        s = (x or "").strip()
        s = s.replace(" ", "_").replace("-", "_")
        s_up = s.upper()

        # 你想要的四类映射（按你的 demo 口径）
        if s_up in ("VIP",):
            return "VIP"
        if s_up in ("LOYAL", "REGULAR"):
            return "Loyal"
        if s_up in ("PROSPECT", "NEW"):
            return "Prospect"
        if s_up in ("INACTIVE_1Y", "INACTIVE", "DORMANT"):
            return "Inactive_1Y"
        # 兜底：也别全塞 inactive，先归到 Inactive_1Y（或你可以改成 "Unknown"）
        return "Inactive_1Y"

    declaredCounts = {"VIP": 0, "Loyal": 0, "Prospect": 0, "Inactive_1Y": 0}
    for c in clients:
        seg = norm_seg(c.get("segment"))
        declaredCounts[seg] += 1

    declaredData = [{"name": k, "value": v} for k, v in declaredCounts.items()]

    return {"behavioralData": behavioralData, "declaredData": declaredData}

# =========================================================
# Retention assistant (matches CustomerIntelligence.tsx)
# body = {segment, category, season, sensitivity}
# =========================================================
class RetentionReq(BaseModel):
    segment: str
    category: str
    season: str
    sensitivity: str

@app.post("/api/retention-assistant")
def retention_assistant(req: RetentionReq):
    segment = req.segment
    category = req.category
    season = req.season
    sensitivity = req.sensitivity

    campaigns = {
        "VIP": {
            "subject": f"Exclusive Early Access: Our New {category} Collection",
            "message": f"As one of our most valued customers, we're giving you first pick of our {season} {category} arrivals.",
            "promotion": "Complimentary Premium Gift",
            "cta": "Shop Private Collection"
        },
        "Loyal": {
            "subject": "A Special Thank You for Your Continued Loyalty",
            "message": f"We've noticed your love for {category}. This {season}, we've curated a special selection just for you.",
            "promotion": "15% Loyalty Discount",
            "cta": "Explore Your Picks"
        },
        "At Risk": {
            "subject": "We Miss You! Here's Something Special to Welcome You Back",
            "message": f"It's been a while since your last visit. We've just released our {season} {category} line.",
            "promotion": "25% Reactivation Offer",
            "cta": "Claim Your Discount"
        },
        "New": {
            "subject": f"Welcome to the Family: Your {season} Style Guide",
            "message": f"Start your journey with us by exploring our latest {category} arrivals.",
            "promotion": "First Order Bonus",
            "cta": "Start Shopping"
        }
    }

    defaultCampaign = {
        "subject": f"Discover the Best of {category} this {season}",
        "message": f"Our latest {category} collection for {season} has arrived.",
        "promotion": "Limited Time 20% Off" if sensitivity == "High" else "Exclusive Member Access",
        "cta": "View Collection"
    }

    result = campaigns.get(segment, defaultCampaign)
    if sensitivity == "High" and "%" not in result["promotion"]:
        result["promotion"] = "Special Value Bundle Offer"
    return result

@app.get("/api/transactions")
def get_transactions(
    start: Optional[str] = None,
    end: Optional[str] = None,
    countryType: Optional[str] = None,
    country: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
):
    filtered = transactions

    if start and end:
        sdt = parse_dt(start)
        edt = parse_dt(end)
        filtered = [t for t in filtered if within_interval(parse_dt(t["date"]), sdt, edt)]

    if country and country != "All":
        if countryType == "StoreCountry":
            def keep(t):
                st = store_by_id.get(t["storeId"])
                return st and st.get("country") == country
        else:
            def keep(t):
                cl = client_by_id.get(t["clientId"])
                return cl and cl.get("country") == country
        filtered = [t for t in filtered if keep(t)]

    if category and category != "All":
        def keep_cat(t):
            p = prod_by_id.get(t["productId"])
            return p and p.get("category") == category
        filtered = [t for t in filtered if keep_cat(t)]

    total = len(filtered)
    page = filtered[offset: offset + limit]
    return {"total": total, "items": page}