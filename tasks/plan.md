# Implementation Plan: Job Discovery Expansion

## Overview

Improve ApplyPilot job and internship discovery for India and global markets by making selected filters consistent and simplifying job cards without inventing missing job data. Review provider access, but defer new integrations as explicitly chosen by the user. Install and apply the requested Ponytail skill before implementation.

## Understanding and Scope

- Include all workplace types in India and global markets.
- Choose new platforms based on reliable, accessible data; do not add a paid aggregator or brittle/private scraping without approval.
- Exclude jobs that conflict with an active filter. Keep jobs with insufficient source data visible but clearly mark them as unverified.
- Keep title/company, location/work mode, posted date, available salary, match reasons, and source visible on cards.
- Keep additional work focused on discovery quality, not application tracking.

## Architecture Decisions

- Targeted source adapters were considered over an aggregator dependency or broad HTML scraping; after reviewing access constraints, the user chose to defer all new platform integrations in this pass.
- The live SSE search route is the user-facing discovery path. The repository also has a background orchestrator and a typed adapter registry; add source support to relevant source/status surfaces without broad registry consolidation or duplicate scraping implementations.
- Reuse existing normalization, validation, deduplication, and filter helpers where they support the required behavior. Preserve unknown source fields instead of substituting plausible values.
- Prefer canonical posting URLs for deduplication; do not merge distinct jobs based only on similar titles.
- Keep source failures isolated and visible while other sources continue returning partial results.
- After checking provider access constraints, the user chose to defer new platforms rather than scrape against provider terms or introduce an API-key dependency. The existing providers remain in scope for filter/card improvements.

## Assumptions and Constraints

- Prefer official APIs, public feeds, or stable permitted integrations. If a candidate cannot meet that bar, report the limitation rather than silently using private or brittle scraping.
- Do not add a paid service, new user credential requirement, or unnecessary infrastructure.
- Preserve the current progressive search behavior and target the application's current scale.
- Existing worktree changes are pre-existing and must be preserved; edits to already-modified files must be narrow and integrated with their current state.

## Implementation Tasks

### Phase 1: Setup and source feasibility

1. **Install Ponytail** — complete
   - Add the requested skill at the repository's project-local skill path after checking its license and installation guidance.
   - Verify the installed skill is discoverable and apply its smallest-complete-change/test guidance.
2. **Audit provider access** — complete; new sources deferred
   - Compare existing live, background, and typed-registry sources to identify missing India/global coverage.
   - Verify candidate access and reliability against provider documentation.
   - Do not integrate a candidate when public-page extraction is restricted or documented API access is not available; defer new platforms per the user's choice.

### Checkpoint: Source selection

- [x] Existing source registry and live search paths were compared.
- [x] Provider candidates with restricted scraping or gated APIs were excluded; no new provider is added in this pass.

### Phase 2: Filter correctness

3. **Make active filters consistent**
   - Trace filters from the UI through live search and client-side filtering.
   - Add regression tests for known conflicts and missing metadata, then fix only the relevant paths.
   - Mark listings whose missing fields prevent verifying an active filter; do not silently treat missing values as matching.

### Checkpoint: Filter behavior

- [x] Selected filters reject known mismatches consistently across sources.
- [x] Missing filter data is visibly unverified, and unknown posting dates are not represented as fresh.

### Phase 3: New source integrations (deferred)

4. **Defer new provider adapters** — complete
   - Do not add providers requiring restricted page extraction or new API credentials; this is the user's selected scope.
   - Keep changes focused on improving accuracy for existing sources.

### Checkpoint: Provider decision

- [x] New integrations are intentionally deferred; no additional provider adapter or credential requirement is added.

### Phase 4: Card clarity and final verification

5. **Simplify job cards**
   - Keep the six user-selected essentials visible and move secondary metadata into the detail view.
   - Remove unsupported placeholder values, inferred skill tags, and generic match claims that are not grounded in listing data.
   - Test cards with present and absent salary, date, work-mode, and match evidence.
6. **Run focused and end-to-end verification**
   - Run relevant scraper/filter/UI tests, lint or type checks applicable to touched files, and the production build.
   - Verify a local search returns partial results when one source fails and confirm the card hierarchy in the running app.

### Checkpoint: Complete

- [x] Full tests (40 files, 362 tests), production build, typecheck, and lint pass.
- [x] The local server responds with HTTP 200; compact feed cards were observed in the earlier browser check.
- [ ] Recheck interactive feed filters in the browser; this final browser session remained on the dashboard after the feed button was clicked.
- [x] Documentation and this task list reflect the actual source integrations.

## Dependencies

- Card-level unverified indicators depend on the filter behavior contract.
- Final runtime verification depends on filter and card changes.
- Ponytail installation and source research can proceed independently.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Popular boards lack stable or permitted public access | Coverage may be smaller than expected | Verify provider documentation first; report excluded candidates instead of adding fragile scraping |
| Multiple source registries drift | Jobs appear in one search path but not another | Wire only relevant existing surfaces and test live/background behavior without redesigning registries |
| Missing source metadata causes false filter matches | Irrelevant jobs or misleading freshness | Preserve unknown values and mark unverifiable filters explicitly |
| Current job cards contain inferred/default data | Users may trust inaccurate eligibility, skills, or match explanations | Remove unsupported defaults and show only evidence-backed fields |
| Worktree already contains extensive changes | Risk of overwriting unrelated work | Keep patches surgical and inspect diffs for touched files before editing |

## Open Questions

- None. New platform integrations are deferred by the user's explicit decision; filters and cards use the existing providers.

## Provider access research

- [Foundit Terms of Use](https://www.foundit.in/info/terms-of-use) restrict crawling and duplication of platform data unless authorized.
- [Freshersworld Terms of Use](https://www.freshersworld.com/terms-of-use) prohibit automated agents and data mining; its [robots.txt](https://www.freshersworld.com/robots.txt) also disallows job-search paths.
- [Cutshort Terms](https://cutshort.io/terms) prohibit scraping/systematic automated data collection and require approved API access under applicable terms.
- [Wellfound General Terms](https://wellfound.com/terms) restrict scraping and automated harvesting; [Jobs Terms](https://wellfound.com/terms/jobs) govern job listings.
- [NCS](https://ncs.gov.in/) exposes public job-seeker pages, but no stable public feed/API was verified.
- [USAJOBS Search API documentation](https://developer.usajobs.gov/tutorials/search-jobs) describes a U.S. federal jobs API requiring a registered API key; the user chose to defer this credential-backed option.
