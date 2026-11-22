# Job Discovery Expansion Task List

- [x] Install Ponytail project-local and verify it is discoverable.
- [x] Audit provider access; defer new providers because the inspected public-page candidates restrict automated extraction or require approved API access.
- [x] Add regression tests and make active filters consistent, including explicit unverified states for missing metadata.
- [x] Preserve missing source metadata rather than defaulting to Remote, full-time, recent, batch-eligible, or sample skills.
- [x] Simplify cards to the selected essentials and remove fabricated/default display data.
- [x] Run focused and full tests, static checks, and production build.
- [x] Verify local server health (HTTP 200); prior browser check confirmed compact job cards.
- [ ] Recheck interactive feed filters in the browser; the current dashboard did not navigate to the feed during final smoke testing.

## Checkpoints

- [x] Source-selection checkpoint: new provider integrations are intentionally deferred.
- [x] Filter checkpoint: known mismatches are rejected and missing data is marked unverified.
- [x] Multi-source checkpoint: no new provider adapters were added in this pass.
- [ ] Completion checkpoint: tests/build/static checks and server health pass; interactive feed-filter browser smoke remains.
