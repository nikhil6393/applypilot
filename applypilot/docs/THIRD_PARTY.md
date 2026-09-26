# Third-Party Dependencies, Ported Concepts & License Ledger

> **Specification Reference:** ApplyPilot Production Architecture & Build Plan v2.0 (§11, §37)  
> **Policy:** Prefer MIT/Apache-2.0/BSD permissive licenses. Track source repository, commit/tag, license, and purpose for every ported algorithm or module.

---

## 1. Reference Repositories & Conceptual Ports

| Component / Concept | Reference Repository | License | Purpose & Adaptation in ApplyPilot |
| :--- | :--- | :---: | :--- |
| **Normalized ATS Adapters** | `shunsukefuruyama/ats-jobs` | MIT | Adapter architecture for querying Greenhouse, Lever, and Ashby JSON endpoints. Adapted into `server/scrape/greenhouse.ts`, `lever.ts`, `ashby.ts`. |
| **Multi-ATS Extraction** | `kalil0321/ats-scrapers` | MIT | Structural patterns for parsing Workday, Greenhouse, and Ashby boards without browser automation. |
| **Deduplication Strategy** | `strelov1/freehire` | MIT | Concept for multi-pass deduplication: exact source ID, canonical URL normalization, and content hashing. |
| **Local Resume Parsing** | `dhanushk-offl/resume-parser` | MIT | Heuristic section normalization (contact, summary, experience, education, skills) and date extraction. |
| **ATS Scorer Rules** | `saraprettyman/ResumeParser` | Apache-2.0 | Action verb taxonomy, quantifiable metric extraction, and category weights in `server/scoring/scoring-rules.json`. |
| **Official Lever Postings** | `lever/postings-api` | Public Reference | Official API endpoints and schema structure for public Lever job postings. |

---

## 2. Core Runtime Open-Source Dependencies

All direct dependencies in `package.json` are verified for permissive licensing:

| Package | Version | License | Role in ApplyPilot |
| :--- | :---: | :---: | :--- |
| `react` / `react-dom` | `^19.0.1` | MIT | Frontend UI rendering framework |
| `vite` | `^6.2.0` | MIT | Frontend build tool and development server |
| `express` | `^4.21.2` | MIT | REST API and middleware server |
| `motion` | `^12.23.24` | MIT | GPU-accelerated UI spring animations and micro-interactions |
| `better-sqlite3` | `^13.0.3` | MIT | High-performance synchronous SQLite local storage |
| `drizzle-orm` | `^0.45.2` | Apache-2.0 | Type-safe SQL schema definitions and migrations |
| `cheerio` | `^1.2.0` | MIT | Fast server-side HTML and RSS parsing |
| `mammoth` | `^1.12.1` | BSD-2-Clause | Microsoft Word (.docx) document conversion to text/HTML |
| `pdf-parse` | `^2.4.5` | MIT | PDF document text extraction |
| `canvas-confetti` | `^1.9.4` | ISC | Physics-based celebratory particle animations |
| `lucide-react` | `^0.546.0` | ISC | UI iconography |
| `helmet` | `^8.3.0` | MIT | Security headers for Express |
| `uuid` | `^14.0.2` | MIT | Canonical ID generation |
| `vitest` | `^5.0.1` | MIT | Unit and characterization test runner |
| `supertest` | `^7.2.2` | MIT | HTTP assertion library for API contract testing |

---

## 3. Compliance Rules

1. **No GPL/AGPL in Core Packages:** Strictly avoid importing GPL or AGPL libraries into the distributable application.
2. **Attribution Retention:** Retain all copyright notices and license headers from original open-source authors.
3. **No Unaudited Code Dumps:** When porting patterns from community repositories, port interfaces and algorithms cleanly; do not vendor unmaintained entire repositories.
