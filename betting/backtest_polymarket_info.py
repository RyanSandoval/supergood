#!/usr/bin/env python3
"""
Polymarket Information Arbitrage Backtest
=========================================
Simulates a "Will BTC close above today's open?" binary market using
real BTC 1-minute candle data. Models a lagged market price vs real-time
true probability to find arbitrage windows when news/moves cause repricing.

Uses Black-Scholes-style probability calculation.
"""

import json
import math
import os
import statistics
import sys
import time
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package required. Install with: pip install requests")
    sys.exit(1)


# ── Constants ──────────────────────────────────────────────────────────
BINANCE_URL = "https://api.binance.us/api/v3/klines"
SYMBOL = "BTCUSDT"
INTERVAL = "1m"
CHUNK_SIZE = 1000
SLEEP_BETWEEN = 0.5
DAYS = 60
MINUTES_PER_DAY = 1440
TOTAL_MINUTES = DAYS * MINUTES_PER_DAY

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "btc_1m_cache.json")
RESULTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backtest_polymarket_results.json")

# Parameter sweep
LAGS = [3, 5, 10, 15]
THRESHOLDS = [0.03, 0.05, 0.08, 0.10]
POSITION_SIZE = 10.0
STARTING_CAPITAL = 100.0


# ── Data Fetching ──────────────────────────────────────────────────────
def fetch_btc_data():
    """Fetch 60 days of 1-minute BTC candles from Binance US."""
    if os.path.exists(CACHE_FILE):
        print(f"  Loading cached data from {os.path.basename(CACHE_FILE)}...")
        with open(CACHE_FILE, "r") as f:
            candles = json.load(f)
        if len(candles) >= TOTAL_MINUTES * 0.8:
            print(f"  Loaded {len(candles)} cached candles.")
            return candles

    print(f"  Fetching {DAYS} days of 1m BTC data from Binance US...")
    end_ms = int(time.time() * 1000)
    start_ms = end_ms - (DAYS * 24 * 60 * 60 * 1000)

    all_candles = []
    current_start = start_ms
    request_count = 0

    while current_start < end_ms:
        params = {
            "symbol": SYMBOL,
            "interval": INTERVAL,
            "startTime": current_start,
            "limit": CHUNK_SIZE,
        }
        try:
            resp = requests.get(BINANCE_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"  WARNING: Request failed ({e}), retrying in 2s...")
            time.sleep(2)
            continue

        if not data:
            break

        for k in data:
            all_candles.append({
                "ts": k[0],           # open time ms
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
            })

        current_start = data[-1][0] + 60000  # next minute
        request_count += 1

        if request_count % 10 == 0:
            print(f"    ... fetched {len(all_candles)} candles so far")

        time.sleep(SLEEP_BETWEEN)

    print(f"  Total candles fetched: {len(all_candles)}")

    # Cache
    with open(CACHE_FILE, "w") as f:
        json.dump(all_candles, f)
    print(f"  Cached to {os.path.basename(CACHE_FILE)}")

    return all_candles


# ── Black-Scholes Binary Probability ──────────────────────────────────
def norm_cdf(x):
    """Standard normal CDF approximation (Abramowitz & Stegun)."""
    a1, a2, a3, a4, a5 = (
        0.254829592, -0.284496736, 1.421413741,
        -1.453152027, 1.061405429,
    )
    p = 0.3275911
    sign = 1 if x >= 0 else -1
    x_abs = abs(x)
    t = 1.0 / (1.0 + p * x_abs)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x_abs * x_abs / 2.0)
    return 0.5 * (1.0 + sign * y)


def binary_probability(current_price, open_price, vol, time_remaining_frac):
    """
    Probability that BTC closes above open_price.
    Uses Black-Scholes digital option: P = N(d2)
    d2 = (ln(S/K) + (r - 0.5*vol^2)*T) / (vol*sqrt(T))
    With r=0 for intraday: d2 = (ln(S/K) - 0.5*vol^2*T) / (vol*sqrt(T))
    
    But per the spec we use:
    d = (ln(current/open) + 0.5*vol^2*T) / (vol*sqrt(T))
    """
    if time_remaining_frac <= 0.001:
        # Near market close: binary outcome is nearly certain
        return 1.0 if current_price > open_price else 0.0

    if vol <= 0 or open_price <= 0 or current_price <= 0:
        return 0.5

    T = time_remaining_frac
    log_ratio = math.log(current_price / open_price)
    d = (log_ratio + 0.5 * vol * vol * T) / (vol * math.sqrt(T))
    prob = norm_cdf(d)

    # Clamp to avoid 0/1 extremes (real markets have some spread)
    return max(0.01, min(0.99, prob))


# ── Day Splitting ─────────────────────────────────────────────────────
def split_into_days(candles):
    """Split candles into per-day lists based on UTC date."""
    days = {}
    for c in candles:
        dt = datetime.fromtimestamp(c["ts"] / 1000, tz=timezone.utc)
        day_key = dt.strftime("%Y-%m-%d")
        if day_key not in days:
            days[day_key] = []
        days[day_key].append(c)

    # Only keep days with enough data (at least 500 minutes)
    valid_days = {k: v for k, v in days.items() if len(v) >= 500}
    return valid_days


def compute_intraday_vol(candles):
    """Compute annualized intraday volatility from 1-min returns."""
    if len(candles) < 10:
        return 0.5  # default

    returns = []
    for i in range(1, len(candles)):
        if candles[i - 1]["close"] > 0:
            r = math.log(candles[i]["close"] / candles[i - 1]["close"])
            returns.append(r)

    if len(returns) < 5:
        return 0.5

    std_1m = statistics.stdev(returns)
    # Scale to "per-day" vol (sqrt of minutes in a day)
    vol_daily = std_1m * math.sqrt(MINUTES_PER_DAY)
    return max(0.01, vol_daily)


# ── Backtest Engine ───────────────────────────────────────────────────
def run_backtest(days_data, lag_minutes, entry_threshold):
    """
    Run the information arbitrage backtest for one parameter combo.
    
    Returns dict with trade stats.
    """
    trades = []

    sorted_days = sorted(days_data.keys())

    for day_key in sorted_days:
        day_candles = sorted(days_data[day_key], key=lambda c: c["ts"])
        n = len(day_candles)

        if n < 60:  # need at least an hour
            continue

        open_price = day_candles[0]["open"]
        close_price = day_candles[-1]["close"]
        actual_outcome = 1.0 if close_price > open_price else 0.0

        # Compute vol from this day's data (or use a rolling estimate)
        vol = compute_intraday_vol(day_candles)

        # Track market price (lagged) and true price (real-time)
        # Market price updates every `lag_minutes` minutes
        last_market_update = 0
        market_price = 0.5  # start at 50/50

        position = None  # None or {"side": "YES"/"NO", "entry_price": float, "entry_idx": int}

        for i in range(1, n):
            time_remaining = (n - i) / n  # fraction of day remaining
            current_price = day_candles[i]["close"]

            # True probability (updates every minute)
            true_price = binary_probability(current_price, open_price, vol, time_remaining)

            # Market price (updates every lag_minutes)
            if i - last_market_update >= lag_minutes:
                market_price = true_price
                last_market_update = i

            mispricing = true_price - market_price

            # ── Entry logic ──
            if position is None and abs(mispricing) > entry_threshold:
                # Don't enter in last 10 minutes (resolution risk)
                if i < n - 10:
                    if mispricing > 0:
                        # True price higher than market → buy YES at market_price
                        position = {
                            "side": "YES",
                            "entry_price": market_price,
                            "entry_idx": i,
                            "true_at_entry": true_price,
                        }
                    else:
                        # True price lower than market → buy NO (sell YES) at market_price
                        position = {
                            "side": "NO",
                            "entry_price": 1.0 - market_price,
                            "entry_idx": i,
                            "true_at_entry": true_price,
                        }

            # ── Exit logic ──
            elif position is not None:
                converged = abs(true_price - market_price) < 0.01
                at_resolution = (i >= n - 1)

                if converged or at_resolution:
                    if at_resolution:
                        # Settle at actual outcome
                        if position["side"] == "YES":
                            exit_value = actual_outcome
                        else:
                            exit_value = 1.0 - actual_outcome
                    else:
                        # Exit at current market price (which has converged)
                        if position["side"] == "YES":
                            exit_value = market_price
                        else:
                            exit_value = 1.0 - market_price

                    pnl = (exit_value - position["entry_price"]) * POSITION_SIZE
                    hold_time = i - position["entry_idx"]

                    trades.append({
                        "day": day_key,
                        "side": position["side"],
                        "entry_price": round(position["entry_price"], 4),
                        "exit_value": round(exit_value, 4),
                        "pnl": round(pnl, 4),
                        "hold_minutes": hold_time,
                        "exit_type": "resolution" if at_resolution else "convergence",
                    })

                    position = None

    # ── Compute summary stats ──
    if not trades:
        return {
            "lag": lag_minutes,
            "threshold": entry_threshold,
            "n_trades": 0,
            "win_rate": 0,
            "avg_profit": 0,
            "total_pnl": 0,
            "roi_pct": 0,
            "avg_hold_min": 0,
        }

    wins = sum(1 for t in trades if t["pnl"] > 0)
    total_pnl = sum(t["pnl"] for t in trades)
    avg_profit = total_pnl / len(trades)
    avg_hold = sum(t["hold_minutes"] for t in trades) / len(trades)

    return {
        "lag": lag_minutes,
        "threshold": entry_threshold,
        "n_trades": len(trades),
        "win_rate": round(wins / len(trades) * 100, 1),
        "avg_profit": round(avg_profit, 4),
        "total_pnl": round(total_pnl, 2),
        "roi_pct": round(total_pnl / STARTING_CAPITAL * 100, 2),
        "avg_hold_min": round(avg_hold, 1),
    }


# ── Output ────────────────────────────────────────────────────────────
def print_table(results):
    """Print results as a clean table."""
    header = f"{'Lag':>4} {'Thresh':>7} {'Trades':>7} {'Win%':>6} {'Avg P/L':>8} {'Total P/L':>10} {'ROI%':>7} {'Hold(m)':>8}"
    sep = "-" * len(header)

    print("\n" + sep)
    print("  POLYMARKET INFO ARBITRAGE BACKTEST RESULTS")
    print(f"  Capital: ${STARTING_CAPITAL}  |  Position: ${POSITION_SIZE}  |  Period: {DAYS} days")
    print(sep)
    print(header)
    print(sep)

    for r in results:
        print(
            f"{r['lag']:>4} "
            f"{r['threshold']:>7.2f} "
            f"{r['n_trades']:>7} "
            f"{r['win_rate']:>5.1f}% "
            f"${r['avg_profit']:>7.4f} "
            f"${r['total_pnl']:>9.2f} "
            f"{r['roi_pct']:>6.2f}% "
            f"{r['avg_hold_min']:>7.1f}"
        )

    print(sep)

    # Best combo
    best = max(results, key=lambda r: r["roi_pct"])
    print(f"\n  Best combo: lag={best['lag']}min, threshold={best['threshold']}")
    print(f"  → {best['n_trades']} trades, {best['win_rate']}% win rate, {best['roi_pct']}% ROI")
    print()


# ── Main ──────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Polymarket Information Arbitrage Backtest")
    print("=" * 60)

    # 1. Fetch data
    print("\n[1/3] Fetching BTC 1-minute data...")
    candles = fetch_btc_data()

    # 2. Split into days
    print("\n[2/3] Processing data...")
    days_data = split_into_days(candles)
    print(f"  {len(days_data)} valid trading days found")

    if len(days_data) < 5:
        print("ERROR: Not enough data. Need at least 5 valid days.")
        sys.exit(1)

    # 3. Run backtest sweep
    print("\n[3/3] Running parameter sweep...")
    results = []

    for lag in LAGS:
        for threshold in THRESHOLDS:
            r = run_backtest(days_data, lag, threshold)
            results.append(r)
            print(f"  lag={lag:>2}, thresh={threshold:.2f} → "
                  f"{r['n_trades']:>4} trades, {r['win_rate']:>5.1f}% win, "
                  f"ROI={r['roi_pct']:>6.2f}%")

    # 4. Output
    print_table(results)

    # 5. Save results
    output = {
        "strategy": "polymarket_info_arbitrage",
        "description": "Simulated binary market arbitrage using BTC price data",
        "parameters": {
            "capital": STARTING_CAPITAL,
            "position_size": POSITION_SIZE,
            "days": DAYS,
            "candles_used": len(candles),
            "valid_days": len(days_data),
        },
        "results": results,
        "best": max(results, key=lambda r: r["roi_pct"]),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    with open(RESULTS_FILE, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Results saved to {os.path.basename(RESULTS_FILE)}")


if __name__ == "__main__":
    main()
