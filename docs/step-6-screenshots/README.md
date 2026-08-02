# Step 6 screenshots

Desktop before/after captured by running `main` and this branch side by side
(two dev servers against the same DB, same signed-in session, same seeded
workflow/documents) so the comparisons are pixel-for-pixel the same data.

- `before-workflows-desktop.jpg` / `after-workflows-desktop.jpg` — `/dashboard`,
  same workflow row, old plain-card style vs. redesigned list
- `before-documents-desktop.jpg` / `after-documents-hero-desktop.jpg` +
  `after-documents-list-desktop.jpg` — `/dashboard/documents` upload zone and
  pending/processing rows (old generic text vs. new explicit in-flight copy
  and progress bar)
- `after-documents-completed-desktop.jpg` — completed result row with
  summary/dates/obligations sections (no `main` equivalent worth pairing,
  since the extraction UI itself didn't change, only presentation)

**Mobile screenshots (~390px) are not included.** The browser automation tool
used to drive this review could not resize the viewport below ~1269px in this
environment (window manager clamp, not an app issue) — mobile needs a manual
capture before this PR goes up, or a retry once that tooling limitation is
sorted out.
