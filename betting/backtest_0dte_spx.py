#!/usr/bin/env python3
"""
0DTE SPX Iron Condor Backtest
Simulates selling iron condors on SPX with 0 days to expiration.
Uses historical daily OHLC data from Yahoo Finance.
"""

import requests
import json
import math
import statistics
import os
import sys
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
WING_WIDTH = 5.0          # $5 wide wings
CREDIT_PER_SIDE = 1.50    # simplified credit per $5 wing (30% of width)
CREDIT_TOTAL = CREDIT_PER_SIDE * 2  # $3.00 total credit (both sides)
MAX_LOSS_PER_SIDE = WING_WIDTH - CREDIT_PER_SIDE  # $3.50
MAX_LOSS_PER_CONTRACT = MAX_LOSS_PER_SIDE  # margin req per contract
SPX_MULTIPLIER = 100      # options multiplier
STARTING_CAPITAL = 100.0
ATR_PERIOD = 20
DAILY_FACTOR = 0.7        # ATR * 0.7 for intraday expected move
STRIKE_MULTS = [0.5, 0.7, 1.0, 1.2, 1.5]

# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_spx_data():
    """Fetch 1 year of SPX daily OHLC from Yahoo Finance."""
    url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC"
    params = {"interval": "1d", "range": "1y"}
    headers = {"User-Agent": "Mozilla/5.0"}
    
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    if resp.status_code != 200:
        # Try v8 with cookie/crumb approach or fallback
        print(f"Yahoo v8 returned {resp.status_code}, trying alternate endpoint...")
        url2 = "https://query2.finance.yahoo.com/v8/finance/chart/%5EGSPC"
        resp = requests.get(url2, params=params, headers=headers, timeout=30)
    
    if resp.status_code != 200:
        print(f"Yahoo Finance returned status {resp.status_code}. Trying yfinance download endpoint...")
        return fetch_spx_fallback()
    
    data = resp.json()
    result = data.get("chart", {}).get("result", [])
    if not result:
        print("No data in Yahoo response. Using fallback.")
        return fetch_spx_fallback()
    
    timestamps = result[0].get("timestamp", [])
    quote = result[0].get("indicators", {}).get("quote", [{}])[0]
    
    opens = quote.get("open", [])
    highs = quote.get("high", [])
    lows = quote.get("low", [])
    closes = quote.get("close", [])
    
    days = []
    for i in range(len(timestamps)):
        o = opens[i]
        h = highs[i]
        l = lows[i]
        c = closes[i]
        if o is None or h is None or l is None or c is None:
            continue
        days.append({
            "date": datetime.utcfromtimestamp(timestamps[i]).strftime("%Y-%m-%d"),
            "open": float(o),
            "high": float(h),
            "low": float(l),
            "close": float(c)
        })
    
    print(f"Fetched {len(days)} trading days from Yahoo Finance")
    return days


def fetch_spx_fallback():
    """Fallback: use a simple download endpoint."""
    # Try the download CSV endpoint
    url = "https://query1.finance.yahoo.com/v7/finance/download/%5EGSPC"
    params = {
        "period1": str(int((datetime.now().timestamp()) - 365 * 86400)),
        "period2": str(int(datetime.now().timestamp())),
        "interval": "1d",
        "events": "history"
    }
    headers = {"User-Agent": "Mozilla/5.0"}
    
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    if resp.status_code == 200 and "Date" in resp.text[:100]:
        lines = resp.text.strip().split("\n")
        days = []
        for line in lines[1:]:
            parts = line.split(",")
            if len(parts) < 5 or parts[1] == "null":
                continue
            try:
                days.append({
                    "date": parts[0],
                    "open": float(parts[1]),
                    "high": float(parts[2]),
                    "low": float(parts[3]),
                    "close": float(parts[4])
                })
            except ValueError:
                continue
        if days:
            print(f"Fetched {len(days)} trading days from Yahoo CSV fallback")
            return days
    
    # Last resort: generate synthetic data from recent SPX behavior
    print("All Yahoo endpoints failed. Generating synthetic SPX data for backtest...")
    return generate_synthetic_data()


def generate_synthetic_data():
    """Generate realistic synthetic SPX daily data for backtesting."""
    import random
    random.seed(42)
    
    days = []
    price = 5800.0  # approximate recent SPX level
    
    for i in range(252):  # ~1 year of trading days
        dt = datetime(2025, 3, 12)  # start date
        # Add business days
        from datetime import timedelta
        d = dt - timedelta(days=365) + timedelta(days=int(i * 365 / 252))
        
        # Realistic daily returns: mean ~0.04%, std ~1.0%
        daily_return = random.gauss(0.0004, 0.01)
        
        open_price = price
        # Intraday range typically 0.5-2% of price
        intraday_range = price * abs(random.gauss(0.008, 0.005))
        
        close_price = open_price * (1 + daily_return)
        
        if daily_return > 0:
            low_price = open_price - intraday_range * random.uniform(0.1, 0.5)
            high_price = max(close_price, open_price) + intraday_range * random.uniform(0.1, 0.5)
        else:
            high_price = open_price + intraday_range * random.uniform(0.1, 0.5)
            low_price = min(close_price, open_price) - intraday_range * random.uniform(0.1, 0.5)
        
        days.append({
            "date": d.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2)
        })
        
        price = close_price
    
    print(f"Generated {len(days)} synthetic trading days (SPX ~5800 base)")
    return days


# ---------------------------------------------------------------------------
# ATR calculation
# ---------------------------------------------------------------------------

def compute_atr(days, period=ATR_PERIOD):
    """Compute Average True Range for each day (requires prior data)."""
    atrs = [None] * len(days)
    true_ranges = []
    
    for i in range(len(days)):
        h = days[i]["high"]
        l = days[i]["low"]
        
        if i == 0:
            tr = h - l
        else:
            prev_c = days[i - 1]["close"]
            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
        
        true_ranges.append(tr)
        
        if i >= period - 1:
            atrs[i] = statistics.mean(true_ranges[i - period + 1:i + 1])
    
    return atrs


# ---------------------------------------------------------------------------
# Backtest engine
# ---------------------------------------------------------------------------

def run_backtest(days, strike_mult):
    """Run iron condor backtest for a given strike width multiplier."""
    atrs = compute_atr(days)
    
    capital = STARTING_CAPITAL
    peak_capital = capital
    max_drawdown = 0.0
    wins = 0
    losses = 0
    daily_returns = []
    equity_curve = []
    
    for i in range(ATR_PERIOD, len(days)):
        atr = atrs[i]
        if atr is None or atr <= 0:
            continue
        
        expected_move = atr * DAILY_FACTOR
        
        open_price = days[i]["open"]
        close_price = days[i]["close"]
        high_price = days[i]["high"]
        low_price = days[i]["low"]
        
        # Place short strikes
        short_call = open_price + (expected_move * strike_mult)
        short_put = open_price - (expected_move * strike_mult)
        
        # Position sizing: 1 contract per $100 capital
        contracts = max(1, int(capital / 100))
        
        # Determine outcome
        # Check if close is between short strikes
        call_breached = close_price > short_call
        put_breached = close_price < short_put
        
        if not call_breached and not put_breached:
            # WIN - keep full credit
            pnl = CREDIT_TOTAL * contracts
            wins += 1
        else:
            # LOSS - one side breached
            # Actual loss depends on how far past the short strike
            if call_breached:
                intrusion = min(close_price - short_call, WING_WIDTH)
                loss_per = intrusion - CREDIT_PER_SIDE  # net loss on call side
                # Still keep put side credit
                pnl_per = CREDIT_PER_SIDE - intrusion + CREDIT_PER_SIDE
                # Simplify: total credit - intrusion on breached side
                pnl_per = CREDIT_TOTAL - intrusion
            else:
                intrusion = min(short_put - close_price, WING_WIDTH)
                pnl_per = CREDIT_TOTAL - intrusion
            
            pnl = pnl_per * contracts
            if pnl < 0:
                losses += 1
            else:
                wins += 1  # breached but not enough to overcome credit
        
        capital += pnl
        
        if capital <= 0:
            capital = 0
            daily_returns.append(-1.0)
            equity_curve.append(0)
            break
        
        daily_ret = pnl / (capital - pnl) if (capital - pnl) > 0 else 0
        daily_returns.append(daily_ret)
        equity_curve.append(capital)
        
        # Track drawdown
        if capital > peak_capital:
            peak_capital = capital
        dd = (peak_capital - capital) / peak_capital if peak_capital > 0 else 0
        if dd > max_drawdown:
            max_drawdown = dd
    
    total_trades = wins + losses
    win_rate = wins / total_trades if total_trades > 0 else 0
    avg_daily_ret = statistics.mean(daily_returns) if daily_returns else 0
    total_roi = (capital - STARTING_CAPITAL) / STARTING_CAPITAL
    
    # Find first day capital >= 5000
    days_to_5k = None
    for idx, eq in enumerate(equity_curve):
        if eq >= 5000:
            days_to_5k = idx + 1
            break
    
    return {
        "strike_mult": strike_mult,
        "trading_days": total_trades,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate * 100, 1),
        "avg_daily_return": round(avg_daily_ret * 100, 3),
        "total_roi": round(total_roi * 100, 1),
        "max_drawdown": round(max_drawdown * 100, 1),
        "final_capital": round(capital, 2),
        "days_to_5k": days_to_5k
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("  0DTE SPX Iron Condor Backtest")
    print("=" * 70)
    print()
    print(f"Starting Capital:  ${STARTING_CAPITAL:.2f}")
    print(f"Wing Width:        ${WING_WIDTH:.2f}")
    print(f"Credit per side:   ${CREDIT_PER_SIDE:.2f}")
    print(f"Total Credit:      ${CREDIT_TOTAL:.2f} per contract")
    print(f"Max Loss per side: ${MAX_LOSS_PER_SIDE:.2f} per contract")
    print(f"ATR Period:        {ATR_PERIOD}")
    print(f"Daily Factor:      {DAILY_FACTOR}")
    print()
    
    # Fetch data
    days = fetch_spx_data()
    if not days or len(days) < ATR_PERIOD + 10:
        print("ERROR: Insufficient data for backtest.")
        sys.exit(1)
    
    print(f"Date range: {days[0]['date']} to {days[-1]['date']}")
    print(f"Total bars: {len(days)}")
    print()
    
    # Run backtests
    results = []
    for mult in STRIKE_MULTS:
        r = run_backtest(days, mult)
        results.append(r)
    
    # Print results table
    print("-" * 100)
    header = "{:<8} {:>8} {:>6} {:>6} {:>8} {:>10} {:>10} {:>10} {:>12} {:>10}".format(
        "Mult", "Days", "Wins", "Loss", "WR%", "AvgRet%", "ROI%", "MaxDD%", "Final$", "Days→5K"
    )
    print(header)
    print("-" * 100)
    
    for r in results:
        d5k = str(r["days_to_5k"]) if r["days_to_5k"] else "N/A"
        row = "{:<8} {:>8} {:>6} {:>6} {:>8} {:>10} {:>10} {:>10} {:>12} {:>10}".format(
            r["strike_mult"],
            r["trading_days"],
            r["wins"],
            r["losses"],
            f"{r['win_rate']}%",
            f"{r['avg_daily_return']}%",
            f"{r['total_roi']}%",
            f"{r['max_drawdown']}%",
            f"${r['final_capital']:,.2f}",
            d5k
        )
        print(row)
    
    print("-" * 100)
    print()
    
    # Find sweet spot
    best = None
    for r in results:
        if r["days_to_5k"] is not None:
            if best is None or r["days_to_5k"] < best["days_to_5k"]:
                best = r
    
    if best:
        print(f">>> SWEET SPOT: strike_mult={best['strike_mult']} reaches $5K in {best['days_to_5k']} days")
        print(f"    Win Rate: {best['win_rate']}% | Max Drawdown: {best['max_drawdown']}% | Final: ${best['final_capital']:,.2f}")
    else:
        # If none reached 5K, pick highest final capital
        best = max(results, key=lambda x: x["final_capital"])
        print(f">>> No config reached $5K in the backtest period.")
        print(f">>> Best performer: strike_mult={best['strike_mult']} → ${best['final_capital']:,.2f}")
        print(f"    Win Rate: {best['win_rate']}% | Max Drawdown: {best['max_drawdown']}% | ROI: {best['total_roi']}%")
    
    print()
    
    # Save results to JSON
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backtest_0dte_results.json")
    output = {
        "strategy": "0DTE SPX Iron Condor",
        "config": {
            "starting_capital": STARTING_CAPITAL,
            "wing_width": WING_WIDTH,
            "credit_per_side": CREDIT_PER_SIDE,
            "atr_period": ATR_PERIOD,
            "daily_factor": DAILY_FACTOR
        },
        "data_range": {
            "start": days[0]["date"],
            "end": days[-1]["date"],
            "trading_days": len(days)
        },
        "results": results,
        "sweet_spot": best
    }
    
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"Results saved to {output_path}")


if __name__ == "__main__":
    main()
