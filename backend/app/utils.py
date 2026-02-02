"""Shared utilities for backend."""
import time
from datetime import date, datetime, timedelta, timezone


def update_user_on_journal(user, now: float) -> None:
    """Update user total_entries, streak, and last_active_at when a journal is created."""
    if not user:
        return
    prev_active = user.last_active_at
    user.total_entries = (user.total_entries or 0) + 1
    user.last_active_at = now

    if prev_active is None:
        user.journaling_streak = 1
        return

    last_ts = prev_active / 1000 if prev_active > 1e10 else prev_active
    now_ts = now / 1000 if now > 1e10 else now
    last_day = date.fromtimestamp(last_ts)
    today = date.fromtimestamp(now_ts)
    yesterday = today - timedelta(days=1)

    if last_day == today:
        pass  # same day, keep streak
    elif last_day == yesterday:
        user.journaling_streak = (user.journaling_streak or 0) + 1
    else:
        user.journaling_streak = 1


def compute_streak_from_journals(db, user_id: int) -> int:
    """Count consecutive days with at least one journal, ending at today (UTC)."""
    import models

    now = time.time()
    today = datetime.utcfromtimestamp(now).date()
    streak = 0
    check_date = today
    # Cap at 365 days to avoid infinite loop
    for _ in range(365):
        day_start = int(datetime.combine(check_date, datetime.min.time(), tzinfo=timezone.utc).timestamp() * 1000)
        day_end = day_start + 86400 * 1000
        has_entry = (
            db.query(models.Journal)
            .filter(
                models.Journal.user_id == user_id,
                models.Journal.created_at >= day_start,
                models.Journal.created_at < day_end,
                models.Journal.is_archived == False,
            )
            .first()
            is not None
        )
        if not has_entry:
            break
        streak += 1
        check_date -= timedelta(days=1)
    return streak


def compute_longest_streak(db, user_id: int) -> int:
    """Longest consecutive days with at least one journal, from all history."""
    import models

    journals = (
        db.query(models.Journal)
        .filter(
            models.Journal.user_id == user_id,
            models.Journal.is_archived == False,
        )
        .all()
    )
    if not journals:
        return 0

    dates = set()
    for j in journals:
        ts = j.created_at / 1000 if j.created_at > 1e10 else j.created_at
        d = datetime.utcfromtimestamp(ts).date()
        dates.add(d)

    sorted_dates = sorted(dates, reverse=True)
    longest = 1
    current = 1
    for i in range(1, len(sorted_dates)):
        diff = (sorted_dates[i - 1] - sorted_dates[i]).days
        if diff == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest
