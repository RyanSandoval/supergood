"""
Unified Results Tracker — tracks all bets across sports
Stores in betting/bet_log.json

Usage:
  python results_tracker.py add --sport tennis --pick "Sinner ML" --odds -250 --stake 5
  python results_tracker.py add --sport nba --pick "Giannis PTS OVER 30" --odds -115 --stake 2 --type parlay
  python results_tracker.py result --id 3 --outcome win
  python results_tracker.py result --id 3 --outcome loss --actual 28
  python results_tracker.py report
  python results_tracker.py report --sport nba
  python results_tracker.py report --week   # last 7 days only
  python results_tracker.py list            # show pending bets
  python results_tracker.py list --all      # show all bets
"""

import json, os, sys, argparse
from datetime import datetime, timezone, timedelta

BET_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bet_log.json")
PT = timezone(timedelta(hours=-7))


def load_log():
    if os.path.exists(BET_LOG):
        with open(BET_LOG) as f:
            return json.load(f)
    return {"bets": [], "next_id": 1, "version": "2.0"}


def save_log(data):
    os.makedirs(os.path.dirname(BET_LOG), exist_ok=True)
    with open(BET_LOG, "w") as f:
        json.dump(data, f, indent=2)


def odds_to_decimal(odds):
    """American odds to decimal."""
    if odds > 0:
        return 1 + odds / 100
    else:
        return 1 + 100 / abs(odds)


def calculate_pnl(stake, odds, outcome):
    """Calculate P&L for a bet."""
    if outcome == "win":
        dec = odds_to_decimal(odds)
        return round(stake * (dec - 1), 2)
    elif outcome == "loss":
        return -stake
    elif outcome == "push":
        return 0
    return None


def cmd_add(args, log):
    """Add a new bet."""
    bet = {
        "id": log["next_id"],
        "date": args.date or datetime.now(PT).strftime("%Y-%m-%d"),
        "sport": args.sport.lower(),
        "pick": args.pick,
        "odds": args.odds,
        "stake": args.stake,
        "type": args.type or "straight",
        "outcome": "pending",
        "actual_stat": None,
        "pnl": None,
        "notes": args.notes or "",
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    log["bets"].append(bet)
    log["next_id"] += 1
    save_log(log)
    print(f"✅ Added bet #{bet['id']}: {bet['sport'].upper()} | {bet['pick']} | {bet['odds']} | ${bet['stake']}")
    return bet


def cmd_result(args, log):
    """Log result for a bet."""
    for bet in log["bets"]:
        if bet["id"] == args.id:
            bet["outcome"] = args.outcome
            if args.actual is not None:
                bet["actual_stat"] = args.actual
            bet["pnl"] = calculate_pnl(bet["stake"], bet["odds"], args.outcome)
            bet["settled_at"] = datetime.now(timezone.utc).isoformat()
            save_log(log)
            emoji = {"win": "🟢", "loss": "🔴", "push": "🟡"}.get(args.outcome, "❓")
            print(f"{emoji} Bet #{bet['id']}: {bet['outcome'].upper()} | P&L: ${bet['pnl']:+.2f}")
            return bet
    print(f"❌ Bet #{args.id} not found")
    return None


def cmd_list(args, log):
    """List bets."""
    bets = log["bets"]
    if not args.all:
        bets = [b for b in bets if b["outcome"] == "pending"]

    if not bets:
        print("No bets to show.")
        return

    print(f"\n{'ID':>4} {'Date':>10} {'Sport':>7} {'Pick':<30} {'Odds':>6} {'Stake':>6} {'Result':>7} {'P&L':>7}")
    print("-" * 90)
    for b in bets:
        pnl_str = f"${b['pnl']:+.2f}" if b['pnl'] is not None else "  —"
        outcome = b['outcome'].upper()[:7]
        print(f"{b['id']:>4} {b['date']:>10} {b['sport'].upper():>7} {b['pick']:<30} {b['odds']:>+6} ${b['stake']:>5.2f} {outcome:>7} {pnl_str:>7}")


def cmd_report(args, log):
    """Generate performance report."""
    bets = [b for b in log["bets"] if b["outcome"] != "pending"]

    if args.sport:
        bets = [b for b in bets if b["sport"] == args.sport.lower()]

    if args.week:
        cutoff = (datetime.now(PT) - timedelta(days=7)).strftime("%Y-%m-%d")
        bets = [b for b in bets if b["date"] >= cutoff]

    if not bets:
        print("No settled bets to report on.")
        return

    # Overall stats
    wins = sum(1 for b in bets if b["outcome"] == "win")
    losses = sum(1 for b in bets if b["outcome"] == "loss")
    pushes = sum(1 for b in bets if b["outcome"] == "push")
    total = wins + losses + pushes
    win_rate = wins / max(total - pushes, 1) * 100

    total_staked = sum(b["stake"] for b in bets)
    total_pnl = sum(b["pnl"] for b in bets if b["pnl"] is not None)
    roi = (total_pnl / total_staked * 100) if total_staked > 0 else 0

    title = "OVERALL"
    if args.sport:
        title = args.sport.upper()
    if args.week:
        title += " (Last 7 Days)"

    print(f"\n{'='*55}")
    print(f"  📊 RESULTS — {title}")
    print(f"{'='*55}")
    print(f"  Record: {wins}W - {losses}L - {pushes}P ({total} total)")
    print(f"  Win Rate: {win_rate:.1f}%")
    print(f"  Total Staked: ${total_staked:.2f}")
    print(f"  Total P&L: ${total_pnl:+.2f}")
    print(f"  ROI: {roi:+.1f}%")

    # By sport breakdown
    sports = sorted(set(b["sport"] for b in bets))
    if len(sports) > 1:
        print(f"\n  {'Sport':<10} {'W':>3} {'L':>3} {'P':>3} {'WR%':>6} {'Staked':>8} {'P&L':>8} {'ROI':>7}")
        print(f"  {'-'*50}")
        for sport in sports:
            sb = [b for b in bets if b["sport"] == sport]
            sw = sum(1 for b in sb if b["outcome"] == "win")
            sl = sum(1 for b in sb if b["outcome"] == "loss")
            sp = sum(1 for b in sb if b["outcome"] == "push")
            swr = sw / max(sw + sl, 1) * 100
            ss = sum(b["stake"] for b in sb)
            spnl = sum(b["pnl"] for b in sb if b["pnl"] is not None)
            sroi = (spnl / ss * 100) if ss > 0 else 0
            print(f"  {sport.upper():<10} {sw:>3} {sl:>3} {sp:>3} {swr:>5.1f}% ${ss:>7.2f} ${spnl:>+7.2f} {sroi:>+6.1f}%")

    # By bet type
    types = sorted(set(b.get("type", "straight") for b in bets))
    if len(types) > 1:
        print(f"\n  {'Type':<10} {'W':>3} {'L':>3} {'WR%':>6} {'P&L':>8}")
        print(f"  {'-'*35}")
        for t in types:
            tb = [b for b in bets if b.get("type", "straight") == t]
            tw = sum(1 for b in tb if b["outcome"] == "win")
            tl = sum(1 for b in tb if b["outcome"] == "loss")
            twr = tw / max(tw + tl, 1) * 100
            tpnl = sum(b["pnl"] for b in tb if b["pnl"] is not None)
            print(f"  {t:<10} {tw:>3} {tl:>3} {twr:>5.1f}% ${tpnl:>+7.2f}")

    # Recent bets
    recent = sorted(bets, key=lambda b: b["date"], reverse=True)[:5]
    if recent:
        print(f"\n  Last 5 settled:")
        for b in recent:
            emoji = {"win": "🟢", "loss": "🔴", "push": "🟡"}.get(b["outcome"], "❓")
            pnl = f"${b['pnl']:+.2f}" if b["pnl"] is not None else "—"
            print(f"  {emoji} {b['date']} {b['sport'].upper()} {b['pick'][:25]:<25} {pnl}")

    print()


def migrate_old_results(log):
    """Migrate basketball/results.json into unified tracker."""
    old_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "basketball", "results.json")
    if not os.path.exists(old_file):
        return 0

    with open(old_file) as f:
        old = json.load(f)

    existing_dates_picks = {(b["date"], b["pick"]) for b in log["bets"]}
    migrated = 0

    for pick in old.get("picks", []):
        key = (pick["date"], f"{pick['player']} {pick['prop']} {pick['side'].upper()} {pick['line']}")
        if key in existing_dates_picks:
            continue

        bet = {
            "id": log["next_id"],
            "date": pick["date"],
            "sport": "nba",
            "pick": f"{pick['player']} {pick['prop']} {pick['side'].upper()} {pick['line']}",
            "odds": pick.get("mybookie_odds", -110),
            "stake": 1.0,  # Unknown original stake, default $1
            "type": "straight",
            "outcome": pick.get("result", "pending"),
            "actual_stat": pick.get("actual_stat"),
            "pnl": None,
            "notes": pick.get("notes", "") + f" [migrated from basketball/results.json]",
            "added_at": pick.get("logged_at", datetime.now(timezone.utc).isoformat()),
        }
        if bet["outcome"] in ("win", "loss", "push"):
            bet["pnl"] = calculate_pnl(bet["stake"], bet["odds"], bet["outcome"])

        log["bets"].append(bet)
        log["next_id"] += 1
        migrated += 1

    if migrated:
        save_log(log)
    return migrated


def main():
    parser = argparse.ArgumentParser(description="Unified Sports Betting Results Tracker")
    sub = parser.add_subparsers(dest="command")

    # add
    add_p = sub.add_parser("add", help="Add a new bet")
    add_p.add_argument("--sport", required=True, help="Sport (nba, tennis, mlb)")
    add_p.add_argument("--pick", required=True, help="Pick description")
    add_p.add_argument("--odds", type=int, required=True, help="American odds")
    add_p.add_argument("--stake", type=float, required=True, help="Stake amount")
    add_p.add_argument("--type", default="straight", help="Bet type (straight, parlay, handicap)")
    add_p.add_argument("--date", default=None, help="Date YYYY-MM-DD (default: today)")
    add_p.add_argument("--notes", default="", help="Notes")

    # result
    res_p = sub.add_parser("result", help="Log result for a bet")
    res_p.add_argument("--id", type=int, required=True, help="Bet ID")
    res_p.add_argument("--outcome", required=True, choices=["win", "loss", "push"])
    res_p.add_argument("--actual", type=float, default=None, help="Actual stat value")

    # list
    list_p = sub.add_parser("list", help="List bets")
    list_p.add_argument("--all", action="store_true", help="Show all bets (not just pending)")

    # report
    rep_p = sub.add_parser("report", help="Performance report")
    rep_p.add_argument("--sport", default=None, help="Filter by sport")
    rep_p.add_argument("--week", action="store_true", help="Last 7 days only")

    # migrate
    sub.add_parser("migrate", help="Migrate old basketball/results.json")

    args = parser.parse_args()
    log = load_log()

    if args.command == "add":
        cmd_add(args, log)
    elif args.command == "result":
        cmd_result(args, log)
    elif args.command == "list":
        cmd_list(args, log)
    elif args.command == "report":
        cmd_report(args, log)
    elif args.command == "migrate":
        n = migrate_old_results(log)
        print(f"Migrated {n} bets from basketball/results.json")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
