"""
Basketball Props Scraper — pulls real NBA prop lines from SportsGameOdds API
Uses fairOdds (consensus sharp estimate) + bookOdds to find value vs MyBookie.
Outputs to basketball_props.json for the cron agent to analyze.

SportsGameOdds pricing: 1 object = 1 event (very efficient vs The Odds API)
API docs: https://sportsgameodds.com/docs/reference#tag/events/GET/events/

MyBookie rules:
- Individual props (pts, reb, ast, 3PM, stl, blk): can parlay cross-game
- Combo props (P+R+A, P+A, etc.): NOT allowed in parlays
- No same-game parlays
- Whole number lines only (no .5)
- No cash out on parlays
"""

import json, math, os, sys, subprocess
from datetime import datetime, timezone, timedelta

API_KEY = "aa7319f18870a28b5039982baff84425"
OUTPUT_FILE = "/Users/ryansandoval/.openclaw/workspace/basketball/basketball_props.json"
BASE_URL = "https://api.sportsgameodds.com/v2"

# Individual stat types we want (no combo props)
INDIVIDUAL_STATS = ["points", "rebounds", "assists", "threePointersMade", "steals", "blocks"]

# Market display names for Discord posts
STAT_DISPLAY = {
    "points": "POINTS",
    "rebounds": "REBOUNDS",
    "assists": "ASSISTS",
    "threePointersMade": "3PM",
    "steals": "STEALS",
    "blocks": "BLOCKS",
}

def get_pt_tz():
    """Return current US Pacific timezone (PST or PDT based on date).
    Approximates DST: second Sunday of March through first Sunday of November."""
    now_utc = datetime.now(timezone.utc)
    year = now_utc.year
    # Second Sunday of March
    mar1 = datetime(year, 3, 1)
    dst_start = mar1 + timedelta(days=(6 - mar1.weekday()) % 7 + 7)  # 2nd Sunday
    # First Sunday of November
    nov1 = datetime(year, 11, 1)
    dst_end = nov1 + timedelta(days=(6 - nov1.weekday()) % 7)  # 1st Sunday

    dst_start_utc = dst_start.replace(hour=10, tzinfo=timezone.utc)  # 2am PST = 10am UTC
    dst_end_utc = dst_end.replace(hour=9, tzinfo=timezone.utc)   # 2am PDT = 9am UTC

    if dst_start_utc <= now_utc < dst_end_utc:
        return timezone(timedelta(hours=-7))  # PDT
    return timezone(timedelta(hours=-8))  # PST


PT = get_pt_tz()


def api_get(url):
    """Fetch URL via curl (avoids Python LibreSSL TLS issues). Returns (data, error_msg)."""
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "20", url],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return None, f"curl error: {result.stderr}"
        data = json.loads(result.stdout)
        if not data.get("success", True) and "error" in data:
            return None, f"API error: {data['error']}"
        return data, None
    except json.JSONDecodeError as e:
        return None, f"JSON parse error: {e} | raw: {result.stdout[:200]}"
    except Exception as e:
        return None, str(e)


def get_all_games_with_props():
    """
    Fetch today's NBA games with odds from SportsGameOdds API.
    Returns games that:
      - Haven't started yet (pregame), OR
      - Are in-progress but still have odds available (bookOddsAvailable=true)
    Skips completed/cancelled games.
    Uses pagination (nextCursor) to ensure we don't miss late-night West Coast games.
    """
    pt_now = datetime.now(PT)
    today_str = pt_now.strftime("%Y-%m-%d")

    # NBA games on a PT "day" can span from ~4pm PT to ~10:30pm PT tipoff.
    # In UTC that means games from ~11pm-today to ~6:30am-tomorrow.
    # The API returns events sorted by start time; use a generous limit + pagination.
    all_events = []
    cursor = None
    for _ in range(3):  # max 3 pages
        url = f"{BASE_URL}/events?apiKey={API_KEY}&leagueID=NBA&oddsAvailable=true&limit=20"
        if cursor:
            url += f"&cursor={cursor}"
        data, err = api_get(url)
        if not data:
            print(f"  ERROR fetching events: {err}")
            return [], False
        all_events.extend(data.get("data", []))
        cursor = data.get("nextCursor")
        if not cursor:
            break

    games = []
    for event in all_events:
        status = event.get("status", {})
        starts_at = status.get("startsAt", "")
        if not starts_at:
            continue

        # Skip completed or cancelled games
        if status.get("completed", False) or status.get("cancelled", False):
            continue

        try:
            ct = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
            ct_pt = ct.astimezone(PT)
        except Exception:
            continue

        game_date_pt = ct_pt.strftime("%Y-%m-%d")

        # Include games from today (PT date). Also include tomorrow-UTC games
        # that are actually tonight PT (e.g., 1am UTC = 5/6pm PT).
        if game_date_pt != today_str:
            # Check if it's within the next 12 hours (catches late games)
            hours_until = (ct - datetime.now(timezone.utc)).total_seconds() / 3600
            if hours_until < 0 or hours_until > 14:
                continue

        home = event["teams"]["home"]["names"]["long"]
        away = event["teams"]["away"]["names"]["long"]

        # For started games: include if not ended (live props may still exist)
        if status.get("started", False):
            if status.get("ended", False):
                print(f"  Skipping (ended): {away} @ {home} ({ct_pt.strftime('%I:%M %p PT')})")
                continue
            # Game in progress — include it, we'll filter at the odds level
            print(f"  Including (in-progress): {away} @ {home}")

        games.append({
            "event": event,
            "ct_pt": ct_pt,
            "tipoff_pt": ct_pt.strftime("%I:%M %p PT"),
        })

    # Deduplicate by eventID
    seen = set()
    unique_games = []
    for g in games:
        eid = g["event"].get("eventID")
        if eid not in seen:
            seen.add(eid)
            unique_games.append(g)

    print(f"  Found {len(unique_games)} NBA games (pregame + live with odds)")
    return unique_games, True


def parse_player_props(event, game_label):
    """
    Extract individual player props from event odds dict.
    Odds keys follow the pattern: {statID}-{playerID}-{periodID}-{betTypeID}-{sideID}
    e.g. "assists-CADE_CUNNINGHAM_1_NBA-game-ou-over"
    Returns list of prop dicts with player, stat, line, fair odds, book odds.
    """
    odds = event.get("odds", {})
    if not odds:
        return []

    # Group by (player_id, stat) -> over and under values
    prop_map = {}

    for key, value in odds.items():
        # Parse the oddID structure: statID-playerID-periodID-betTypeID-sideID
        # playerID can contain hyphens (rare) but we know the last 3 parts are period-betType-side
        # Actually the API uses underscores in playerID, so split on "-" works
        stat_id = value.get("statID")
        player_id = value.get("playerID")
        period_id = value.get("periodID")
        bet_type = value.get("betTypeID")
        side_id = value.get("sideID")

        if not all([stat_id, player_id, period_id, bet_type, side_id]):
            continue

        # Only individual stats, full-game, over/under props
        if stat_id not in INDIVIDUAL_STATS:
            continue
        if period_id != "game":
            continue
        if bet_type != "ou":
            continue
        if side_id not in ("over", "under"):
            continue

        # Skip if no odds data available
        if not value.get("bookOddsAvailable", False) and not value.get("fairOddsAvailable", False):
            continue

        prop_key = (player_id, stat_id)
        if prop_key not in prop_map:
            prop_map[prop_key] = {}
        prop_map[prop_key][side_id] = value

    props = []
    for (player_id, stat_id), sides in prop_map.items():
        over = sides.get("over", {})
        under = sides.get("under", {})

        if not over and not under:
            continue

        ref = over or under

        # Fair (consensus/sharp) line
        fair_line_str = ref.get("fairOverUnder")
        book_line_str = ref.get("bookOverUnder")

        try:
            fair_line = float(fair_line_str) if fair_line_str is not None else None
        except (ValueError, TypeError):
            fair_line = None

        try:
            book_line = float(book_line_str) if book_line_str is not None else None
        except (ValueError, TypeError):
            book_line = None

        sharp_line = fair_line if fair_line is not None else book_line
        if sharp_line is None:
            continue

        # Extract player name from marketName
        # Format: "Cade Cunningham Assists Over/Under"
        market_name = ref.get("marketName", "")
        stat_display = STAT_DISPLAY.get(stat_id, stat_id.upper())

        player_name = market_name
        for suffix in [" Over/Under", " Rebounds", " Points", " Assists",
                       " Three Pointers Made", " Steals", " Blocks"]:
            if player_name.endswith(suffix):
                player_name = player_name[: -len(suffix)]
                break
        if "Over/Under" in player_name:
            player_name = player_name.replace(" Over/Under", "").strip()
        # Clean up remaining stat words from the name
        for word in ["Points", "Rebounds", "Assists", "Steals", "Blocks", "Three Pointers Made"]:
            player_name = player_name.replace(f" {word}", "").strip()

        fair_over = over.get("fairOdds")
        fair_under = under.get("fairOdds")
        book_over = over.get("bookOdds")
        book_under = under.get("bookOdds")

        # MyBookie whole-number line (they don't use .5 lines)
        # Round down for over bets (more conservative)
        mb_line = int(math.floor(sharp_line)) if sharp_line is not None else None

        props.append({
            "game": game_label,
            "player": player_name,
            "player_id": player_id,
            "market": f"player_{stat_id.lower()}",
            "market_short": stat_display,
            "sharp_line": sharp_line,
            "mybookie_line": mb_line,
            "fair_over": fair_over,
            "fair_under": fair_under,
            "book_over": book_over,
            "book_under": book_under,
            "mybookie_note": "Cross-game parlay OK on MyBookie",
        })

    return props


def main():
    pt_now = datetime.now(PT)
    today = pt_now.strftime("%Y-%m-%d")
    print(f"Basketball props scrape — {today} ({pt_now.strftime('%I:%M %p PT')})")
    print(f"  Source: SportsGameOdds API")

    game_data, events_ok = get_all_games_with_props()
    all_props = []
    games_meta = []
    api_errors = []

    for gd in game_data:
        event = gd["event"]
        home = event["teams"]["home"]["names"]["long"]
        away = event["teams"]["away"]["names"]["long"]
        tipoff = gd["tipoff_pt"]
        game_label = f"{away} @ {home} ({tipoff})"

        props = parse_player_props(event, game_label)
        if props:
            print(f"  {game_label}: {len(props)} props | API data: OK")
        else:
            print(f"  {game_label}: 0 props (no odds available)")
            api_errors.append(game_label)

        all_props.extend(props)
        games_meta.append({
            "id": event.get("eventID"),
            "label": f"{away} @ {home}",
            "tipoff_pt": tipoff,
        })

    api_status = "ok" if events_ok and not api_errors else ("partial" if all_props else "failed")

    output = {
        "date": today,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "api_status": api_status,
        "api_errors": api_errors,
        "api_source": "SportsGameOdds",
        "games": games_meta,
        "props": all_props,
        "mybookie_rules": {
            "available_markets": "Points, Rebounds, Assists, 3PM, Steals, Blocks",
            "lines": "Whole numbers only — no .5 lines. Push risk if player hits exactly the line.",
            "parlays": "Cross-game only. No same-game parlays. No combo props in parlays.",
            "cashout": "No cash out available on parlays.",
            "juice": "Typically 15-25% worse than sharp books due to whole-number lines.",
        },
        "notes": {
            "fair_odds": "fairOdds = SportsGameOdds consensus estimate (sharp consensus)",
            "book_odds": "bookOdds = aggregated book offering",
            "mb_line": "MyBookie line is whole number — push risk if player hits exactly",
        },
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Done. {len(all_props)} total props | {len(game_data)} games | API: {api_status.upper()}")
    print(f"Output: {OUTPUT_FILE}")
    return 0 if api_status != "failed" else 1


if __name__ == "__main__":
    sys.exit(main())
