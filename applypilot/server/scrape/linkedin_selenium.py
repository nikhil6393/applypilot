import sys
import json
import re
import time
import argparse
from datetime import datetime, timezone, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def parse_relative_time(raw_text):
    now = datetime.now(timezone.utc)
    text = (raw_text or '').strip().lower()
    
    m = re.search(r'(\d+)\s*(?:minutes?|mins?|m)\b', text)
    if m:
        mins = int(m.group(1))
        dt = now - timedelta(minutes=mins)
        return dt.isoformat(), f"{mins}m ago"
        
    m = re.search(r'(\d+)\s*(?:hours?|hrs?|h)\b', text)
    if m:
        hours = int(m.group(1))
        dt = now - timedelta(hours=hours)
        return dt.isoformat(), f"{hours}h ago"
        
    m = re.search(r'(\d+)\s*(?:days?|d)\b', text)
    if m:
        days = int(m.group(1))
        dt = now - timedelta(days=days)
        return dt.isoformat(), f"{days}d ago"
        
    m = re.search(r'(\d+)\s*(?:weeks?|w)\b', text)
    if m:
        weeks = int(m.group(1))
        dt = now - timedelta(weeks=weeks)
        return dt.isoformat(), f"{weeks}w ago"

    return now.isoformat(), "Active"

def parse_applicant_count(raw_text):
    if not raw_text:
        return None
    m = re.search(r'(\d+)\s*applicant', raw_text, re.I)
    if m:
        return int(m.group(1))
    if re.search(r'first\s*10|be among first 10', raw_text, re.I):
        return 10
    if re.search(r'first\s*25|be among first 25', raw_text, re.I):
        return 25
    return None

def extract_skills(title, text):
    combined = f"{title} {text}".lower()
    keywords = [
        "python", "javascript", "typescript", "react", "node.js", "next.js",
        "java", "c++", "c#", "go", "golang", "rust", "aws", "docker",
        "kubernetes", "sql", "postgres", "mongodb", "graphql", "rest",
        "spring", "django", "flask", "fastapi", "vue", "angular", "devops"
    ]
    found = [k for k in keywords if re.search(r'\b' + re.escape(k) + r'\b', combined)]
    return found[:8]

def scrape_linkedin(query, location, time_window, job_type, limit=25):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--blink-settings=imagesEnabled=false')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    options.page_load_strategy = 'eager'

    tpr_map = {
        '1h': 'r3600',
        '4h': 'r14400',
        '12h': 'r43200',
        '24h': 'r86400',
        '3d': 'r259200',
        '7d': 'r604800',
        'all': ''
    }
    tpr = tpr_map.get(time_window, 'r604800')
    tpr_param = f"&f_TPR={tpr}" if tpr else ""
    
    emp_param = ""
    is_intern = job_type == 'internship' or bool(re.search(r'\bintern(ship)?\b', query, re.I))
    if is_intern:
        emp_param = "&f_E=1"
    elif job_type == 'fulltime':
        emp_param = "&f_E=2,4"

    loc_str = location if location and location.lower() not in ['worldwide', 'global', 'anywhere'] else ''
    loc_param = f"&location={loc_str}" if loc_str else ""
    
    url = f"https://www.linkedin.com/jobs/search?keywords={query}{loc_param}{tpr_param}{emp_param}&sortBy=DD"

    driver = None
    jobs = []
    seen = set()

    try:
        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(12)
        driver.get(url)
        time.sleep(1.2)

        cards = driver.find_elements(By.CSS_SELECTOR, '.base-card, .job-search-card, li[class*="jobs-search-results"]')
        now_iso = datetime.now(timezone.utc).isoformat()

        for card in cards:
            if len(jobs) >= limit:
                break
            try:
                title_elem = card.find_elements(By.CSS_SELECTOR, '.base-search-card__title, h3, [class*="job-title"]')
                title = title_elem[0].text.strip() if title_elem else ''
                
                link_elem = card.find_elements(By.CSS_SELECTOR, 'a.base-card__full-link, a[href*="/jobs/view/"]')
                raw_href = link_elem[0].get_attribute('href') if link_elem else ''
                
                if not title or not raw_href:
                    continue

                clean_url = raw_href.split('?')[0].rstrip('/')
                id_match = re.search(r'/jobs/view/(?:[a-zA-Z0-9_.-]+-)?(\d+)', clean_url) or re.search(r'(\d{8,12})', clean_url)
                num_id = id_match.group(1) if id_match else str(abs(hash(clean_url)))
                job_id = f"linkedin_{num_id}"
                
                if job_id in seen:
                    continue
                seen.add(job_id)

                apply_url = f"https://www.linkedin.com/jobs/view/{num_id}" if id_match else clean_url

                comp_elem = card.find_elements(By.CSS_SELECTOR, '.base-search-card__subtitle, [class*="company"], h4')
                company = comp_elem[0].text.strip() if comp_elem else 'Verified Employer'

                loc_elem = card.find_elements(By.CSS_SELECTOR, '.job-search-card__location, [class*="location"]')
                loc = loc_elem[0].text.strip() if loc_elem else (location or 'Remote / Hybrid')

                time_elem = card.find_elements(By.CSS_SELECTOR, 'time, .job-search-card__listdate')
                time_text = time_elem[0].text.strip() if time_elem else ''
                datetime_attr = time_elem[0].get_attribute('datetime') if time_elem else ''
                
                posted_iso, posted_rel = parse_relative_time(time_text or datetime_attr)

                benefit_elem = card.find_elements(By.CSS_SELECTOR, '.job-search-card__benefits, [class*="applicant"], .base-card__label')
                benefit_text = benefit_elem[0].text.strip() if benefit_elem else ''
                applicant_count = parse_applicant_count(benefit_text)

                full_text = f"{title} {loc} {company} {benefit_text}".lower()
                is_hybrid = bool(re.search(r'\bhybrid\b', full_text, re.I))
                is_remote = not is_hybrid and bool(re.search(r'\b(remote|wfh|work from home|anywhere|worldwide)\b', full_text, re.I))
                workplace_mode = 'Hybrid' if is_hybrid else ('Remote' if is_remote else 'Onsite')

                has_visa_pos = bool(re.search(r'visa\s*sponsorship|willing\s*to\s*sponsor|relocation\s*(assistance|package|support)', full_text, re.I))
                has_visa_neg = bool(re.search(r'no\s*visa\s*sponsorship|unable\s*to\s*sponsor|cannot\s*sponsor|will\s*not\s*sponsor|must\s*be\s*authorized|citizenship\s*required', full_text, re.I))
                sponsors_visa = True if has_visa_pos else (False if has_visa_neg else None)

                is_card_intern = bool(re.search(r'\b(intern(ship)?|trainee|apprentice|co-?op)\b', full_text, re.I))

                skills = extract_skills(title, full_text)
                tags = [
                    'Internship (Verified)' if is_card_intern else 'Full-Time',
                    workplace_mode,
                    'LinkedIn Live'
                ]

                desc = f"{title} at {company} in {loc}. Live posting on LinkedIn. Work mode: {workplace_mode}. {benefit_text}".strip()

                jobs.append({
                    "id": job_id,
                    "title": title,
                    "company": company,
                    "companyLogo": None,
                    "source": "linkedin",
                    "url": apply_url,
                    "applyUrl": apply_url,
                    "location": loc,
                    "workplace": workplace_mode,
                    "workMode": workplace_mode,
                    "remote": is_remote,
                    "isRemote": is_remote,
                    "isHybrid": is_hybrid,
                    "sponsorsVisa": sponsors_visa,
                    "description": desc,
                    "postedDate": posted_iso,
                    "postedAt": posted_iso,
                    "postedRelative": posted_rel,
                    "applicantCount": applicant_count,
                    "isInternship": is_card_intern,
                    "employmentType": "internship" if is_card_intern else "full-time",
                    "skills": skills,
                    "tags": tags,
                    "fetchedAt": now_iso
                })
            except Exception:
                continue

    except Exception as e:
        sys.stderr.write(f"Selenium LinkedIn Scraper Error: {e}\n")
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

    return jobs

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', default='Software Engineer')
    parser.add_argument('--location', default='India')
    parser.add_argument('--timeWindow', default='7d')
    parser.add_argument('--jobType', default='any')
    parser.add_argument('--limit', type=int, default=25)
    args = parser.parse_args()

    jobs = scrape_linkedin(args.query, args.location, args.timeWindow, args.jobType, args.limit)
    print(json.dumps(jobs))
