#!/usr/bin/env python3
"""
Fetch workout URLs from whatsonzwift.com and optionally generate .zwo files using wozzwo.

Usage:
  pip install requests beautifulsoup4
  # Optional, for ZWO generation: clone https://github.com/markdrayton/wozzwo and install deps (lxml, requests)

  # Only collect URLs (no wozzwo):
  python fetch_zwift_workouts.py --output-dir ./zwift_zwo --urls-only

  # Collect URLs and generate .zwo files (wozzwo must be on PATH or use --wozzwo):
  python fetch_zwift_workouts.py --output-dir ./zwift_zwo [--wozzwo path/to/wozzwo.py] [--delay 2]

Respects whatsonzwift.com; use --delay to throttle requests. See their Terms and conditions.
"""

import argparse
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Install: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

BASE = "https://whatsonzwift.com"
WORKOUTS_PAGE = f"{BASE}/workouts"
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "CyclingForge/1.0 (workout importer)"})


def get_collection_links(main_html: str) -> list[str]:
    """From main workouts page, extract links to collection/plan pages (one segment after /workouts/)."""
    soup = BeautifulSoup(main_html, "html.parser")
    seen = set()
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.startswith("/workouts"):
            continue
        path = urlparse(href).path.rstrip("/")
        parts = [p for p in path.split("/") if p]
        if len(parts) < 2:
            continue
        # Collection page: /workouts/<collection-name> or /workouts/zwift/<name> etc.
        if path in seen:
            continue
        full = urljoin(BASE, href)
        if full == WORKOUTS_PAGE or full == WORKOUTS_PAGE + "/":
            continue
        seen.add(path)
        out.append(full)
    return out


def get_workout_links_from_collection(collection_url: str, html: str) -> list[str]:
    """From a collection page HTML, extract 'View workout' links (full URL)."""
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        text = (a.get_text() or "").strip()
        if "View workout" not in text and "view workout" not in text.lower():
            continue
        href = a["href"].strip()
        if "/workouts/" not in href:
            continue
        full = urljoin(collection_url, href)
        if full not in out:
            out.append(full)
    return out


def url_to_safe_filename(url: str) -> str:
    """Generate a safe filename from workout URL (e.g. build-me-up-week-0-prep-ramp-test.zwo)."""
    path = urlparse(url).path.strip("/")
    safe = re.sub(r"[^\w\-]", "_", path)
    return safe or "workout"


def run_wozzwo(wozzwo_path: str, workout_url: str) -> str | None:
    """Run wozzwo for one URL and return ZWO XML, or None on failure."""
    try:
        result = subprocess.run(
            [sys.executable, wozzwo_path, workout_url],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout
    except Exception:
        pass
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description="Fetch Zwift workout URLs and optionally generate .zwo files")
    ap.add_argument("--output-dir", type=Path, default=Path("zwift_zwo"), help="Directory for URLs list and .zwo files")
    ap.add_argument("--wozzwo", type=Path, default=None, help="Path to wozzwo.py (optional; if set, generate .zwo files)")
    ap.add_argument("--delay", type=float, default=1.5, help="Seconds between requests")
    ap.add_argument("--urls-only", action="store_true", help="Only collect URLs to workout_urls.txt, do not run wozzwo")
    ap.add_argument("--max-collections", type=int, default=0, help="Limit number of collections (0 = all)")
    ap.add_argument("--bike-only", action="store_true", help="Only process Zwift workout collections (skip run/custom)")
    args = ap.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print("Fetching main workouts page...")
    r = SESSION.get(WORKOUTS_PAGE, timeout=30)
    r.raise_for_status()
    collection_urls = get_collection_links(r.text)
    if args.bike_only:
        # Keep only Zwift workout collections (first section); skip "3Run", "Custom", "Legacy" etc. by simple heuristic
        bike_keywords = ("workouts/zwift", "build-me-up", "minutes-to-burn", "ftp", "endurance", "sweet-spot",
                        "threshold", "vo2", "sprint", "recovery", "climbing", "academy", "camp", "fitness")
        collection_urls = [u for u in collection_urls if any(k in u.lower() for k in bike_keywords)]
    if args.max_collections > 0:
        collection_urls = collection_urls[: args.max_collections]
    print(f"Found {len(collection_urls)} collection(s).")

    all_workout_urls: list[str] = []
    for i, col_url in enumerate(collection_urls):
        time.sleep(args.delay)
        print(f"  [{i+1}/{len(collection_urls)}] {col_url}")
        try:
            r2 = SESSION.get(col_url, timeout=30)
            r2.raise_for_status()
            workout_links = get_workout_links_from_collection(col_url, r2.text)
            for wu in workout_links:
                if wu not in all_workout_urls:
                    all_workout_urls.append(wu)
        except Exception as e:
            print(f"    Error: {e}", file=sys.stderr)

    urls_file = args.output_dir / "workout_urls.txt"
    urls_file.write_text("\n".join(all_workout_urls), encoding="utf-8")
    print(f"Saved {len(all_workout_urls)} workout URLs to {urls_file}")

    if args.urls_only or not args.wozzwo:
        if not args.urls_only and args.wozzwo is None:
            print("Tip: Use --wozzwo path/to/wozzwo.py to generate .zwo files, or run wozzwo manually for each URL in workout_urls.txt")
        return

    wozzwo_path = args.wozzwo.resolve()
    if not wozzwo_path.exists():
        print(f"wozzwo not found: {wozzwo_path}", file=sys.stderr)
        sys.exit(1)

    generated = 0
    for j, wu in enumerate(all_workout_urls):
        time.sleep(args.delay)
        zwo_xml = run_wozzwo(str(wozzwo_path), wu)
        if zwo_xml:
            name = url_to_safe_filename(wu) + ".zwo"
            out_path = args.output_dir / name
            out_path.write_text(zwo_xml, encoding="utf-8")
            generated += 1
        if (j + 1) % 20 == 0:
            print(f"  Generated {generated}/{j+1} .zwo files so far...")
    print(f"Done. Generated {generated} .zwo files in {args.output_dir}")


if __name__ == "__main__":
    main()
