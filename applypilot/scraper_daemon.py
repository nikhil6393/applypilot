#!/usr/bin/env python3
"""
ApplyPilot Real-Time Job Scraping Daemon
=========================================
Production-grade, async, multi-source job monitoring system.

Sources: LinkedIn (guest API), Naukri (JSON API), Remotive (public API), Himalayas (public API)

Usage:
  python scraper_daemon.py --query "Software Engineer Intern" --location "India"
  python scraper_daemon.py --query "Backend Engineer" --location "anywhere" --interval 90
  python scraper_daemon.py --query "React Developer" --once
"""

import asyncio, hashlib, json, re, sys, time, argparse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, quote_plus
from typing import Optional

# Force UTF-8 on Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8')
    except Exception: pass

try:
    import aiohttp
except ImportError:
    print("ERROR: pip install aiohttp"); sys.exit(1)

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich import box
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    class _C:
        def print(self, *a, **k): print(*a)
        def rule(self, *a, **k): print("-"*60)
    console = _C()

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
]
_ua_idx = 0

def get_ua():
    global _ua_idx
    ua = USER_AGENTS[_ua_idx % len(USER_AGENTS)]
    _ua_idx += 1
    return ua

def stable_id(src, url):
    return f"{src}_{hashlib.sha1(url.encode()).hexdigest()[:16]}"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def parse_relative(text):
    if not text: return now_iso()
    text = text.lower().strip()
    now = datetime.now(timezone.utc)
    if any(k in text for k in ["just now","moments ago","few seconds","seconds ago"]):
        return (now - timedelta(seconds=30)).isoformat()
    if "today" in text: return (now - timedelta(hours=1)).isoformat()
    if "yesterday" in text: return (now - timedelta(days=1)).isoformat()
    if "30+" in text: return (now - timedelta(days=30)).isoformat()
    m = re.search(r"(\d+)\s*(second|sec|minute|min|hour|hr|day|week|month)", text)
    if not m: return now_iso()
    count = int(m.group(1))
    mults = {"second":1,"sec":1,"minute":60,"min":60,"hour":3600,"hr":3600,"day":86400,"week":604800,"month":2592000}
    return (now - timedelta(seconds=count * mults.get(m.group(2), 0))).isoformat()

def is_intern(title):
    return bool(re.search(r"\bintern(ship)?\b|\bco-?op\b|\btrainee\b|\bapprentice\b", title, re.I))

def is_global(loc):
    return not loc or bool(re.search(r"anywhere|global|worldwide|remote", loc, re.I))


class RateLimiter:
    def __init__(self):
        self._delays = {}; self._last = {}
    def get_delay(self, d): return self._delays.get(d, 0.5)
    def ok(self, d): self._delays[d] = max(0.3, self._delays.get(d, 0.5) * 0.9)
    def fail(self, d, s=0):
        c = self._delays.get(d, 0.5)
        self._delays[d] = min(30.0 if s==429 else 5.0, c * (4 if s==429 else 1.5))
    async def wait(self, d):
        last = self._last.get(d, 0.0)
        delay = self.get_delay(d)
        elapsed = time.monotonic() - last
        if elapsed < delay: await asyncio.sleep(delay - elapsed)
        self._last[d] = time.monotonic()

RATE = RateLimiter()

async def _get(session, url, domain, headers=None, as_json=False, timeout=15):
    await RATE.wait(domain)
    hdrs = {"User-Agent": get_ua(), "Accept": "application/json" if as_json else "text/html,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9", "Referer": f"https://{domain}/"}
    if headers: hdrs.update(headers)
    try:
        async with session.get(url, headers=hdrs, timeout=aiohttp.ClientTimeout(total=timeout)) as r:
            if r.status == 200:
                RATE.ok(domain)
                return (await r.json(content_type=None)) if as_json else (await r.text(errors="replace"))
            RATE.fail(domain, r.status)
            console.print(f"  [yellow]⚠ {domain} HTTP {r.status}[/yellow]")
            return None
    except Exception as e:
        RATE.fail(domain)
        console.print(f"  [red]✗ {domain}: {str(e)[:60]}[/red]")
        return None


async def scrape_linkedin(session, query, location, max_r=40):
    if not HAS_BS4:
        console.print("  [yellow]⚠ beautifulsoup4 not installed, skipping LinkedIn[/yellow]")
        return []
    DOMAIN = "www.linkedin.com"
    global_search = is_global(location)
    eff_loc = "Worldwide" if global_search else location
    is_intern_q = is_intern(query)

    params_base = {"keywords": query, "location": eff_loc, "sortBy": "DD", "count": 25}
    if global_search: params_base["f_WT"] = 2
    if is_intern_q: params_base["f_E"] = 1

    out, seen = [], set()
    windows = [("r3600", 0), ("r86400", 0), ("r86400", 25)]

    for tpr, start in windows:
        params = {**params_base, "f_TPR": tpr, "start": start}
        url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?{urlencode(params)}"
        html = await _get(session, url, DOMAIN)
        if not html: continue

        soup = BeautifulSoup(html, "html.parser")
        for card in soup.select(".base-card, .job-search-card"):
            try:
                title_el = card.select_one(".base-search-card__title, h3")
                co_el = card.select_one(".base-search-card__subtitle, h4")
                loc_el = card.select_one(".job-search-card__location")
                link_el = card.select_one("a[href*='/jobs/view/']")
                time_el = card.select_one("time")
                title = (title_el.get_text(strip=True) if title_el else "")
                href = (link_el.get("href") or "").split("?")[0] if link_el else ""
                if not title or not href: continue
                uid = stable_id("linkedin", href)
                if uid in seen: continue
                seen.add(uid)
                company = co_el.get_text(strip=True) if co_el else ""
                loc = loc_el.get_text(strip=True) if loc_el else eff_loc
                time_str = (time_el.get("datetime","") or time_el.get_text(strip=True)) if time_el else ""
                intern = is_intern(title)
                out.append({
                    "id": uid, "title": title, "company": company, "location": loc,
                    "source": "linkedin", "url": href, "applyUrl": href,
                    "postedAt": parse_relative(time_str), "postedRelative": time_str or "Recent",
                    "remote": global_search or bool(re.search(r"remote|wfh", loc, re.I)),
                    "isInternship": intern, "employmentType": "internship" if intern else "full-time",
                    "description": f"{title} at {company} – {loc}.", "skills": [], "tags": ["⚡ LinkedIn"],
                    "fetchedAt": now_iso(),
                })
            except: continue
        if len(out) >= max_r: break

    out.sort(key=lambda j: j["postedAt"], reverse=True)
    console.print(f"  [green]✓ LinkedIn: {len(out)} jobs[/green]")
    return out[:max_r]


async def scrape_remotive(session, query, max_r=25):
    DOMAIN = "remotive.com"
    categories = {"software":"software-dev","engineer":"software-dev","developer":"software-dev",
                  "data":"data","design":"design","devops":"devops-sysadmin"}
    q_lower = query.lower()
    cat = next((v for k,v in categories.items() if k in q_lower), "software-dev")
    data = await _get(session, f"https://remotive.com/api/remote-jobs?category={cat}&limit=50", DOMAIN, as_json=True)
    if not data or "jobs" not in data: return []

    out = []
    for job in data["jobs"]:
        title = job.get("title","")
        desc = job.get("description","")[:500]
        q_terms = [t for t in query.lower().split() if len(t) > 2]
        if not any(t in title.lower() or t in desc.lower() for t in q_terms): continue
        href = job.get("url","")
        uid = stable_id("remotive", href)
        try: posted = datetime.fromisoformat(job.get("publication_date","").replace("Z","+00:00")).isoformat()
        except: posted = now_iso()
        intern = is_intern(title)
        out.append({
            "id": uid, "title": title, "company": job.get("company_name",""), "location": "Remote",
            "source": "remotive", "url": href, "applyUrl": href,
            "postedAt": posted, "postedRelative": job.get("publication_date","")[:10],
            "remote": True, "isInternship": intern, "employmentType": "internship" if intern else "full-time",
            "description": re.sub("<[^>]+>","",desc)[:300], "skills": job.get("tags",[])[:8],
            "tags": ["🌍 Remote","Remotive"], "fetchedAt": now_iso(),
        })
    out.sort(key=lambda j: j["postedAt"], reverse=True)
    console.print(f"  [green]✓ Remotive: {len(out)} jobs[/green]")
    return out[:max_r]


async def scrape_himalayas(session, query, max_r=20):
    DOMAIN = "himalayas.app"
    data = await _get(session, f"https://himalayas.app/jobs/api?q={quote_plus(query)}&limit=30", DOMAIN, as_json=True)
    if not data or "jobs" not in data: return []
    out = []
    for job in data["jobs"]:
        title = job.get("title","")
        href = job.get("applicationLink") or f"https://himalayas.app/jobs/{job.get('slug','')}"
        uid = stable_id("himalayas", href)
        try: posted = datetime.fromisoformat(job.get("createdAt","").replace("Z","+00:00")).isoformat()
        except: posted = now_iso()
        intern = is_intern(title)
        out.append({
            "id": uid, "title": title, "company": job.get("companyName",""), "location": "Remote",
            "source": "himalayas", "url": href, "applyUrl": href,
            "postedAt": posted, "postedRelative": job.get("createdAt","")[:10],
            "remote": True, "isInternship": intern, "employmentType": "internship" if intern else "full-time",
            "description": job.get("description","")[:300], "skills": job.get("skills",[])[:8],
            "tags": ["🏔️ Himalayas","Remote"], "fetchedAt": now_iso(),
        })
    out.sort(key=lambda j: j["postedAt"], reverse=True)
    console.print(f"  [green]✓ Himalayas: {len(out)} jobs[/green]")
    return out[:max_r]


async def scrape_naukri(session, query, location, max_r=25):
    DOMAIN = "www.naukri.com"
    global_search = is_global(location)
    params = {"noOfResults":30,"urlType":"search_by_key_loc","searchType":"adv",
              "keyword":query,"location":"" if global_search else location,"sort":"1"}
    hdrs = {"appid":"109","systemid":"109","Accept":"application/json",
            "Referer":"https://www.naukri.com/","x-requested-with":"XMLHttpRequest"}
    data = await _get(session, f"https://www.naukri.com/api/v1/jobs?{urlencode(params)}", DOMAIN, headers=hdrs, as_json=True)

    out = []
    if data and "jobDetails" in data:
        for job in data["jobDetails"]:
            title = job.get("title","")
            href = job.get("jdURL","") or f"https://www.naukri.com/job/{job.get('jobId','')}"
            uid = stable_id("naukari", href)
            raw_time = job.get("footerPlaceholderLabel","") or job.get("createdDate","")
            ph = job.get("placeholders",[])
            loc = ph[0].get("label", location) if ph else location
            intern = is_intern(title)
            salary = ph[-1].get("label","") if len(ph) > 1 else ""
            out.append({
                "id": uid, "title": title, "company": job.get("companyName",""), "location": loc,
                "source": "naukari", "url": href, "applyUrl": href,
                "postedAt": parse_relative(raw_time), "postedRelative": raw_time,
                "remote": bool(re.search(r"remote|wfh", title+" "+loc, re.I)),
                "isInternship": intern, "employmentType": "internship" if intern else "full-time",
                "description": job.get("jobDescription",title)[:300], "salary": salary,
                "skills": [s.get("label","") for s in job.get("tagsAndSkills",[]) if s.get("label")][:8],
                "tags": ["🇮🇳 Naukri", "Internship" if intern else "Full-Time"], "fetchedAt": now_iso(),
            })
    else:
        console.print("  [yellow]⚠ Naukri API returned no jobDetails, possible block[/yellow]")

    out.sort(key=lambda j: j["postedAt"], reverse=True)
    console.print(f"  [green]✓ Naukri: {len(out)} jobs[/green]")
    return out[:max_r]


async def scrape_weworkremotely(session, query, max_r=25):
    DOMAIN = "weworkremotely.com"
    xml_text = await _get(session, "https://weworkremotely.com/categories/remote-programming-jobs.rss", DOMAIN, as_json=False)
    if not xml_text: return []
    out = []
    try:
        root = ET.fromstring(xml_text)
        for item in root.findall(".//item"):
            title_text = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            region = item.findtext("region", "Remote").strip()
            desc = item.findtext("description", "").strip()
            if not title_text or not link: continue
            colon = title_text.find(":")
            if colon > 0:
                company = title_text[:colon].strip()
                title = title_text[colon+1:].strip()
            else:
                company = "WeWorkRemotely Partner"
                title = title_text
            q_terms = [t for t in query.lower().split() if len(t) > 2]
            if q_terms and not any(t in title.lower() or t in desc.lower() for t in q_terms):
                continue
            intern = is_intern(title)
            uid = stable_id("weworkremotely", link)
            out.append({
                "id": uid, "title": title, "company": company, "location": region or "Remote",
                "source": "weworkremotely", "url": link, "applyUrl": link,
                "postedAt": now_iso(), "postedRelative": pub_date[:16],
                "remote": True, "isInternship": intern, "employmentType": "internship" if intern else "full-time",
                "description": re.sub("<[^>]+>", "", desc)[:300], "skills": [],
                "tags": ["🌐 Remote", "WeWorkRemotely"], "fetchedAt": now_iso(),
            })
            if len(out) >= max_r: break
    except Exception as e:
        console.print(f"  [yellow]⚠ WWR parse error: {e}[/yellow]")
    out.sort(key=lambda j: j["postedAt"], reverse=True)
    console.print(f"  [green]✓ WeWorkRemotely: {len(out)} jobs[/green]")
    return out[:max_r]


class JobMonitor:
    def __init__(self, query, location, push_to=None, interval=120, max_per_source=30):
        self.query = query; self.location = location
        self.push_to = push_to; self.interval = interval; self.max_per_source = max_per_source
        self.seen: set = set(); self.all_jobs: list = []
        self.run_count = 0; self.total_new = 0; self.start = time.monotonic()

    async def run_once(self, session):
        self.run_count += 1
        console.print(f"\n[bold cyan]== Scrape #{self.run_count} | '{self.query}' in '{self.location}' | {now_iso()[:19]}Z ==[/bold cyan]")
        eff_loc = "" if is_global(self.location) else self.location
        tasks = [
            scrape_linkedin(session, self.query, eff_loc or "Worldwide", self.max_per_source),
            scrape_remotive(session, self.query, self.max_per_source),
            scrape_himalayas(session, self.query, self.max_per_source),
            scrape_weworkremotely(session, self.query, self.max_per_source),
            scrape_naukri(session, self.query, eff_loc, self.max_per_source),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        new_jobs = []
        for r in results:
            if isinstance(r, list):
                for j in r:
                    if j["id"] not in self.seen:
                        self.seen.add(j["id"]); new_jobs.append(j); self.all_jobs.append(j)
        new_jobs.sort(key=lambda j: j["postedAt"], reverse=True)
        self.total_new += len(new_jobs)
        console.print(f"\n[bold green]✅ {len(new_jobs)} NEW jobs | Total unique: {len(self.seen)}[/bold green]")
        if new_jobs: self._print_table(new_jobs[:15])
        if self.push_to and new_jobs: await self._push(session, new_jobs)
        self._save()
        return new_jobs

    def _print_table(self, jobs):
        if HAS_RICH:
            t = Table(box=box.ROUNDED, header_style="bold magenta", show_lines=False)
            t.add_column("Title", style="cyan", max_width=38); t.add_column("Company", max_width=20)
            t.add_column("Loc", max_width=14); t.add_column("Posted", style="yellow", max_width=14); t.add_column("Source", style="green", max_width=10)
            for j in jobs:
                t.add_row(j["title"][:38], j["company"][:20], j["location"][:14], j.get("postedRelative","")[:14] or j["postedAt"][:10], j["source"])
            console.print(t)
        else:
            for j in jobs: print(f"  [{j['source']}] {j['title']} @ {j['company']} ({j.get('postedRelative','')})")

    async def _push(self, session, jobs):
        url = f"{self.push_to.rstrip('/')}/api/jobs/ingest"
        try:
            async with session.post(url, json={"jobs": jobs}, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status in (200,201): console.print(f"  [green]→ Pushed {len(jobs)} to Node server ✓[/green]")
                else: console.print(f"  [yellow]⚠ Push HTTP {r.status}[/yellow]")
        except Exception as e:
            console.print(f"  [yellow]⚠ Push skipped: {str(e)[:60]}[/yellow]")

    def _save(self):
        with open("scraped_jobs.json","w",encoding="utf-8") as f:
            json.dump({"lastUpdated":now_iso(),"query":self.query,"location":self.location,
                       "totalJobs":len(self.all_jobs),"jobs":self.all_jobs}, f, ensure_ascii=False, indent=2)
        console.print(f"  [dim]→ scraped_jobs.json updated ({len(self.all_jobs)} total jobs)[/dim]")

    async def monitor(self):
        connector = aiohttp.TCPConnector(limit=10, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            if HAS_RICH:
                console.print(Panel.fit(
                    f"[bold]🚀 ApplyPilot Real-Time Job Monitor[/bold]\n"
                    f"Query: [cyan]{self.query}[/cyan]  |  Location: [cyan]{self.location}[/cyan]\n"
                    f"Interval: [yellow]{self.interval}s[/yellow]  |  Sources: [green]LinkedIn · Naukri · Remotive · Himalayas[/green]\n"
                    f"Press [bold]Ctrl+C[/bold] to stop.", border_style="bright_blue"))
            while True:
                try:
                    await self.run_once(session)
                    elapsed = (time.monotonic()-self.start)/60
                    console.print(f"\n[dim]⏳ Next in {self.interval}s | Runtime: {elapsed:.1f}m | Total found: {self.total_new}[/dim]")
                    await asyncio.sleep(self.interval)
                except (asyncio.CancelledError, KeyboardInterrupt): break
                except Exception as e:
                    console.print(f"[red]Loop error: {e}[/red]"); await asyncio.sleep(30)
            console.print("[yellow]Monitor stopped.[/yellow]")


def main():
    p = argparse.ArgumentParser(description="ApplyPilot Real-Time Job Scraping Daemon")
    p.add_argument("--query","-q", default="Software Engineer Intern")
    p.add_argument("--location","-l", default="India")
    p.add_argument("--interval","-i", type=int, default=120)
    p.add_argument("--max-per-source","-m", type=int, default=30)
    p.add_argument("--push-to","-p", default=None, help="Node.js server URL e.g. http://localhost:5173")
    p.add_argument("--once", action="store_true")
    args = p.parse_args()

    monitor = JobMonitor(args.query, args.location, args.push_to, args.interval, args.max_per_source)

    async def once():
        connector = aiohttp.TCPConnector(limit=10, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as s:
            jobs = await monitor.run_once(s)
            console.print(f"\n[bold green]Done! {len(jobs)} new jobs saved to scraped_jobs.json[/bold green]")

    try:
        asyncio.run(once() if args.once else monitor.monitor())
    except KeyboardInterrupt:
        console.print("[yellow]Exited.[/yellow]")

if __name__=="__main__":
    main()
