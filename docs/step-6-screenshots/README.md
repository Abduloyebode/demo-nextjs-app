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

## Mobile (~390px)

The browser automation tool used for this review couldn't resize the actual
browser window below ~1269px in this environment (window manager clamp, not
an app issue). Worked around it with an in-page `<iframe>` sized to 390x900 —
an iframe gets its own independent CSS viewport, so `window.innerWidth`
inside it is genuinely 390 and real mobile media queries fire, verified via
`contentWindow.innerWidth` before capturing.

- `after-workflows-mobile.jpg` — `/dashboard` header, org eyebrow, tabs, and
  filters stack cleanly at mobile width
- `after-documents-mobile.jpg` — `/dashboard/documents` header and tabs
- `after-documents-mobile-upload.jpg` — scrolled down: upload button and the
  in-flight/pending document row, filename and Delete button stack instead
  of overflowing

No `main`/before equivalents for mobile — only `after` shots were captured.
Each screenshot has a small red/teal "N" badge in the bottom-left corner —
that's Next.js's dev-mode indicator (in this case flagging a one-off
hydration warning caused by `toLocaleDateString()` formatting differently
between server and client locale; not reproducible on repeat, unrelated to
Step 6, and never renders in production). Crop or ignore it.
