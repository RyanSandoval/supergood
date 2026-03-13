"""
+EV Scanner — Finds positive expected value bets on MyBookie
Compares SportsGameOdds fairOdds (sharp consensus) against book lines.
When fairOdds > bookOdds on a prop, MyBookie is likely even softer.

Usage:
  python ev_scanner.py              # Scan NBA today
  python ev_scanner.py --sport nba  # Explicit sport
  python ev_scanner.py --min-edge 3 # Only show 3%+ edge

Output: betting/ev_scan.json + human-readable stdout
"""

import json, os, sys, subprocess, argparse
from datetime import datetime, timezone, timedelta

API_KEY = "aa7319f18870a28b5039982baff84425"
BASE_URL = "https://api.sportsgameodds.com/v2"
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ev_scan.json")
PT = timezone(timedelta(hours=-7))  # PDT

# MyBookie-compatible individual stat props only
INDIVIDUAL_STATS = {"points", "rebounds", "assists", "threePointersMade", "steals", "blocks"}

# MyBookie market availability (as of Mar 9 2026)
# Points: OVER only | Rebounds: OVER only | Assists: OVER + UNDER
# 3PM: OVER only | Steals: OVER only | Blocks: OVER only
MYBOOKIE_SIDES = {
    "points":            ["over"],
    "rebounds":           ["over"],
    "assists":            ["over", "under"],
    "threePointersMade":  ["over"],
    "steals":             ["over"],
    "blocks":             ["over"],
}

STAT_DISPLAY = {
    "points": "PTS", "rebounds": "REB", "assists": "AST",
    "threePointersMade": "3PM", "steals": "STL", "blocks": "BLK",
}


def api_get(url):
    """Fetch via curl to avoid LibreSSL TLS issues."""
    try:
        r = subprocess.run(["curl", "-s", "--max-time", "20", url],
                           capture_output=True, text=True)
        if r.returncode != 0:
            return None, f"curl error: {r.stderr}"
        data = json.loads(r.stdout)
        return data, None
    except json.JSONDecodeError as e:
        return None, f"JSON parse: {e}"
    except Exception as e:
        return None, str(e)


def american_to_implied(odds):
    """Convert American odds string to implied probability (0-1)."""
    try:
        o = int(odds.replace("+", ""))
    except (ValueError, TypeError, AttributeError):
        return None
    if o > 0:
        return 100 / (o + 100)
    elif o < 0:
        return abs(o) / (abs(o) + 100)
    return 0.5


def implied_to_american(prob):
    """Convert probability (0-1) to American odds string."""
    if prob is None or prob <= 0 or prob >= 1:
        return None
    if prob >= 0.5:
        return f"{int(-100 * prob / (1 - prob))}"
    else:
        return f"+{int(100 * (1 - prob) / prob)}"


def calculate_edge(fair_prob, book_prob):
    """Edge = fair probability of winning - implied probability from book odds.
    Positive edge = +EV bet."""
    if fair_prob is None or book_prob is None:
        return None
    return (fair_prob - book_prob) * 100  # as percentage


def kelly_fraction(edge_pct, odds_str):
    """Kelly Criterion: fraction of bankroll to bet.
    f = (bp - q) / b where b=decimal odds-1, p=win prob, q=1-p
    Returns fraction (0-1). We use quarter-Kelly for safety."""
    try:
        o = int(odds_str.replace("+", ""))
    except (ValueError, TypeError, AttributeError):
        return 0

    # Convert to decimal odds
    if o > 0:
        decimal_odds = 1 + o / 100
    else:
        decimal_odds = 1 + 100 / abs(o)

    b = decimal_odds - 1
    p = (edge_pct / 100) + american_to_implied(odds_str)  # true win prob
    q = 1 - p

    if b <= 0:
        return 0

    kelly = (b * p - q) / b
    return max(0, kelly * 0.25)  # quarter-Kelly


def scan_nba():
    """Scan all NBA events for +EV props."""
    print("🔍 Scanning NBA props for +EV opportunities...")
    url = f"{BASE_URL}/events?apiKey={API_KEY}&leagueID=NBA&oddsAvailable=true&limit=20"
    data, err = api_get(url)
    if not data:
        print(f"  ERROR: {err}")
        return []

    pt_now = datetime.now(PT)
    today_str = pt_now.strftime("%Y-%m-%d")
    opportunities = []

    for event in data.get("data", []):
        status = event.get("status", {})
        starts_at = status.get("startsAt", "")

        try:
            ct = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
            ct_pt = ct.astimezone(PT)
        except Exception:
            continue

        # Only today's games
        if ct_pt.strftime("%Y-%m-%d") != today_str:
            continue

        home = event.get("teams", {}).get("home", {}).get("names", {}).get("long", "?")
        away = event.get("teams", {}).get("away", {}).get("names", {}).get("long", "?")
        game_label = f"{away} @ {home}"
        tipoff = ct_pt.strftime("%I:%M %p PT")
        started = status.get("started", False)

        odds = event.get("odds", {})
        if not odds:
            continue

        for key, value in odds.items():
            parts = key.split("-")
            if len(parts) < 4:
                continue

            stat_id = parts[0]
            if stat_id not in INDIVIDUAL_STATS:
                continue

            player_id = parts[1] if len(parts) > 1 else None
            if not player_id or player_id in ("all", "away", "home"):
                continue

            period = parts[2] if len(parts) > 2 else ""
            if period != "game":
                continue

            side = parts[-1]  # "over" or "under"
            if side not in MYBOOKIE_SIDES.get(stat_id, []):
                continue

            fair_odds = value.get("fairOdds")
            book_odds = value.get("bookOdds")
            line = value.get("bookOverUnder") or value.get("fairOverUnder")
            book_available = value.get("bookOddsAvailable", False)
            fair_available = value.get("fairOddsAvailable", False)

            if not fair_odds or not book_odds or not line:
                continue

            fair_prob = american_to_implied(fair_odds)
            book_prob = american_to_implied(book_odds)

            if fair_prob is None or book_prob is None:
                continue

            edge = calculate_edge(fair_prob, book_prob)
            if edge is None or edge <= 0:
                continue

            # Get player name
            market_name = value.get("marketName", "")
            player_name = market_name
            for suffix in [" Over/Under", " Rebounds", " Points", " Assists",
                          " Three Pointers Made", " Steals", " Blocks"]:
                if player_name.endswith(suffix):
                    player_name = player_name[:-len(suffix)]
                    break
            player_name = player_name.replace(" Over/Under", "").strip()

            # MyBookie whole-number line
            try:
                line_float = float(line)
                mb_line = int(line_float)
                push_risk = (line_float == mb_line)
            except (ValueError, TypeError):
                mb_line = line
                push_risk = False

            kelly = kelly_fraction(edge, book_odds)

            opportunities.append({
                "game": game_label,
                "tipoff": tipoff,
                "started": started,
                "player": player_name,
                "stat": STAT_DISPLAY.get(stat_id, stat_id),
                "side": side.upper(),
                "line": mb_line,
                "fair_odds": fair_odds,
                "book_odds": book_odds,
                "fair_prob": round(fair_prob * 100, 1),
                "book_prob": round(book_prob * 100, 1),
                "edge_pct": round(edge, 2),
                "kelly_fraction": round(kelly, 4),
                "push_risk": push_risk,
                "book_available": book_available,
                "fair_available": fair_available,
            })

    # Sort by edge descending
    opportunities.sort(key=lambda x: x["edge_pct"], reverse=True)
    return opportunities


def main():
    parser = argparse.ArgumentParser(description="+EV Scanner for MyBookie")
    parser.add_argument("--sport", default="nba", help="Sport to scan (nba)")
    parser.add_argument("--min-edge", type=float, default=1.0, help="Minimum edge %% to show")
    parser.add_argument("--bankroll", type=float, default=10.0, help="Current bankroll for Kelly sizing")
    parser.add_argument("--json-only", action="store_true", help="Output JSON only, no stdout")
    args = parser.parse_args()

    if args.sport.lower() == "nba":
        opps = scan_nba()
    else:
        print(f"Sport '{args.sport}' not yet supported. Use --sport nba")
        sys.exit(1)

    # Filter by min edge
    filtered = [o for o in opps if o["edge_pct"] >= args.min_edge]

    # Save to JSON
    output = {
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "sport": args.sport.upper(),
        "bankroll": args.bankroll,
        "min_edge": args.min_edge,
        "total_scanned": len(opps),
        "opportunities": filtered,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    if args.json_only:
        print(json.dumps(output, indent=2))
        return

    # Human-readable output
    print(f"\n{'='*70}")
    print(f"  +EV SCANNER — {args.sport.upper()} | Bankroll: ${args.bankroll:.2f}")
    print(f"  Scanned: {len(opps)} total | {len(filtered)} with ≥{args.min_edge}% edge")
    print(f"{'='*70}\n")

    if not filtered:
        print("  No +EV opportunities found above minimum edge threshold.")
        print("  Try lowering --min-edge or waiting for more lines to post.\n")
        return

    for i, o in enumerate(filtered[:15], 1):
        kelly_bet = args.bankroll * o["kelly_fraction"]
        status = "🔴 LIVE" if o["started"] else "🟢 PRE"

        print(f"  #{i} {status} | {o['player']} {o['stat']} {o['side']} {o['line']}")
        print(f"     Game: {o['game']} ({o['tipoff']})")
        print(f"     Fair: {o['fair_odds']} ({o['fair_prob']}%) | Book: {o['book_odds']} ({o['book_prob']}%)")
        print(f"     Edge: +{o['edge_pct']}% | Kelly bet: ${kelly_bet:.2f} ({o['kelly_fraction']*100:.1f}%)")
        if o["push_risk"]:
            print(f"     ⚠️  Push risk (whole number line)")
        print()

    print(f"  Saved to: {OUTPUT_FILE}")
    print(f"  Tip: Place top 3-5 picks as singles. Max 2-leg parlays only.\n")


if __name__ == "__main__":
    main()
