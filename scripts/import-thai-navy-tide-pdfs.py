import json
import re
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from pypdf import PdfReader
from scipy.signal import find_peaks

# Station ID -> (PDF URL, station name, locationId)
STATIONS = {
    "hydro-1": {
        "url": "https://hydro.navy.mi.th/storage/frontend/article/22986/file/th/BH2026.pdf",
        "nameTh": "ท่าเรือกรุงเทพ",
        "locationId": "benchmark-upper-gulf-bangkok",
    },
    "hydro-19": {
        "url": "https://hydro.navy.mi.th/storage/frontend/article/22992/file/th/SC2026.pdf",
        "nameTh": "เกาะสีชัง",
        "locationId": "benchmark-middle-gulf-sichang",
    },
    "hydro-21": {
        "url": "https://hydro.navy.mi.th/storage/frontend/article/23020/file/th/SM2026.pdf",
        "nameTh": "เกาะสมุย",
        "locationId": "benchmark-lower-gulf-samui",
    },
    "hydro-36": {
        "url": "https://hydro.navy.mi.th/storage/frontend/article/23036/file/th/TN2026.pdf",
        "nameTh": "เกาะตะเภาน้อย",
        "locationId": "benchmark-andaman-phuket",
    },
}

MONTHS = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def download_pdf(url: str, dest: Path) -> None:
    if dest.exists():
        return
    print(f"Downloading {url} ...")
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urlopen(req).read()
    dest.write_bytes(data)


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n---PAGE BREAK---\n".join(p.extract_text() or "" for p in reader.pages)


def parse_hourly_row(line: str) -> tuple[int, list[float]] | None:
    # day followed by 24 numbers, e.g. "15 1.5 1.8 2.1 ... 1.0"
    parts = re.findall(r"-?\d+\.?\d*", line.replace("-0.1", "-0.1"))
    if not parts:
        return None
    day = int(parts[0])
    values = [float(p) for p in parts[1:]]
    if len(values) != 24 or day < 1 or day > 31:
        return None
    return day, values


def find_month_year(page: str) -> tuple[int, int] | None:
    for name, month in MONTHS.items():
        m = re.search(rf"{name}\s+(20\d{{2}})", page)
        if m:
            return month, int(m.group(1))
    return None


PROMINENCE_METERS = 0.05


def interpolate_time(values: list[float], idx: int) -> tuple[float, float]:
    """Quadratic interpolation around a local extremum at idx.  Returns (hour, level)."""
    a = values[(idx - 1) % 24]
    b = values[idx]
    c = values[(idx + 1) % 24]
    A = (a + c) / 2 - b
    B = (c - a) / 2
    C = b
    if A == 0:
        return float(idx), b
    offset = -B / (2 * A)
    # Clamp the interpolated vertex to the neighbourhood of the three points.
    offset = max(-1, min(1, offset))
    hour = idx + offset
    level = A * offset * offset + B * offset + C
    return hour, level


def _refine_peak(values: list[float], idx: int) -> tuple[float, float]:
    """Refine the time/level of a peak/trough found at integer index idx."""
    if 1 <= idx <= 22:
        return interpolate_time(values, idx)
    if idx == 0:
        return 0.0, values[0]
    return 23.99, values[23]


def find_high_lows(values: list[float]) -> list[dict]:
    """Find principal high and low waters in a 24-hour vector.

    Uses scipy.signal.find_peaks with a small prominence threshold so tiny
    numerical/rounding ripples are ignored while real higher/lower high and
    lower/higher low events are kept.  Boundary peaks are added when the tide
    is at a clear extremum at the start or end of the day.
    """
    events = []

    high_indices, _ = find_peaks(values, prominence=PROMINENCE_METERS)
    for idx in high_indices:
        hour, level = _refine_peak(values, int(idx))
        events.append({"type": "high", "hour": hour, "level": round(level, 2)})

    low_indices, _ = find_peaks([-v for v in values], prominence=PROMINENCE_METERS)
    for idx in low_indices:
        hour, level = _refine_peak(values, int(idx))
        events.append({"type": "low", "hour": hour, "level": round(level, 2)})

    # Boundary checks: if the start or end of the day is itself an extremum,
    # find_peaks will not include it because it has no neighbour on one side.
    if values[0] > values[1] + PROMINENCE_METERS and values[0] > values[-1] + PROMINENCE_METERS:
        events.append({"type": "high", "hour": 0.0, "level": round(values[0], 2)})
    if values[0] < values[1] - PROMINENCE_METERS and values[0] < values[-1] - PROMINENCE_METERS:
        events.append({"type": "low", "hour": 0.0, "level": round(values[0], 2)})
    if values[23] > values[22] + PROMINENCE_METERS and values[23] > values[0] + PROMINENCE_METERS:
        events.append({"type": "high", "hour": 23.99, "level": round(values[23], 2)})
    if values[23] < values[22] - PROMINENCE_METERS and values[23] < values[0] - PROMINENCE_METERS:
        events.append({"type": "low", "hour": 23.99, "level": round(values[23], 2)})

    for e in events:
        if e["hour"] < 0:
            e["hour"] = 0.0
        if e["hour"] >= 24:
            e["hour"] = 23.99

    events.sort(key=lambda e: e["hour"])
    return events


def format_time(hour: float) -> str:
    total_minutes = int(round(hour * 60))
    h = total_minutes // 60
    m = total_minutes % 60
    # Edge case: 23.99*60 = 1439.4 -> round 1439 -> 23:59
    if h >= 24:
        h = 23
        m = 59
    return f"{h:02d}:{m:02d}"


def parse_station(station_id: str, info: dict) -> tuple[list[dict], list[dict]]:
    pdf_path = PROJECT_ROOT / f"tmp-{station_id}.pdf"
    download_pdf(info["url"], pdf_path)
    text = extract_text(pdf_path)

    fixtures = []
    samples = []
    pages = text.split("---PAGE BREAK---")
    for page in pages:
        month_year = find_month_year(page)
        if not month_year:
            continue
        month, year = month_year
        for line in page.splitlines():
            parsed = parse_hourly_row(line)
            if not parsed:
                continue
            day, values = parsed
            try:
                base = datetime(year, month, day, 0, 0, tzinfo=timezone(timedelta(hours=7)))
            except ValueError:
                continue
            events = find_high_lows(values)
            if events:
                fixtures.append({
                    "locationId": info["locationId"],
                    "stationId": station_id,
                    "date": base.strftime("%Y-%m-%d"),
                    "source": "official_prediction",
                    "datum": "LLW",
                    "events": [
                        {
                            "type": e["type"],
                            "time": format_time(e["hour"]),
                            "level": e["level"],
                        }
                        for e in events
                    ],
                })
            for h, level in enumerate(values):
                samples.append({
                    "time": (base + timedelta(hours=h)).isoformat(),
                    "level": level,
                })
    return fixtures, samples


def main():
    fixtures_file = PROJECT_ROOT / "data/tide-validation-events.json"
    existing = json.loads(fixtures_file.read_text(encoding="utf-8"))

    # Remove any fixtures for the stations we are about to re-parse, then add
    # the newly parsed ones. This avoids stale manual fixtures with wrong times
    # or missing levels surviving alongside the official table data.
    station_ids = set(STATIONS.keys())
    existing = [f for f in existing if f.get("stationId") not in station_ids]

    samples_by_station = {}
    new_fixtures = []
    for station_id, info in STATIONS.items():
        station_fixtures, station_samples = parse_station(station_id, info)
        print(f"{station_id}: {len(station_fixtures)} days, {len(station_samples)} hourly samples parsed")
        samples_by_station[station_id] = station_samples
        new_fixtures.extend(station_fixtures)

    existing.extend(new_fixtures)
    fixtures_file.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(existing)} fixtures to {fixtures_file}")

    samples_file = PROJECT_ROOT / "data/tide-hourly-samples.json"
    samples_file.write_text(json.dumps(samples_by_station, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote hourly samples to {samples_file}")


if __name__ == "__main__":
    main()
