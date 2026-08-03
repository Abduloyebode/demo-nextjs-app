---
name: Northstar Ops
description: Calm operating console for workflows and document extraction
colors:
  ink: "#0b1f2a"
  ink-soft: "#1a3340"
  paper: "#f3f7f8"
  paper-deep: "#e4eef1"
  line: "#c9d8de"
  teal: "#0f6b63"
  teal-bright: "#148f84"
  teal-soft: "#d7f1ee"
  amber: "#b45309"
  amber-soft: "#fff7ed"
  rose: "#be123c"
  rose-soft: "#fff1f2"
  emerald: "#047857"
  emerald-soft: "#ecfdf5"
  muted: "#5b7280"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Plus Jakarta Sans, Avenir Next, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Plus Jakarta Sans, Avenir Next, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, Avenir Next, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "14px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.teal-bright}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  surface:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

## Overview

Operate-mode UI for signed-in work. The visual system is a refined teal ops console: quiet paper atmosphere, sharp hierarchy, and status-first scanning. Marketing pages may be expressive; the dashboard stays task-led.

## Colors

Teal is the only accent for primary actions and active navigation. Neutrals are cool slate-sea, not warm beige. Semantic colors (amber / emerald / rose) are reserved for status and risk—never decorative gradients.

## Typography

**Fraunces** for page titles only. **Plus Jakarta Sans** for UI chrome, lists, and forms. Avoid Inter, Roboto, and system-ui as the primary stack. Labels use small caps-style tracking for section markers.

## Layout

Max content width ~72rem. Dashboard pages share one shell: brand header, optional page intro, tab nav, then one primary work area. Filters and primary actions sit on one toolbar row on desktop; stack cleanly on mobile. Lists use a single column with clear separators—not nested card stacks.

## Elevation & Depth

Prefer tonal surfaces (paper → white panel) over multi-layer shadows. One soft shadow on interactive panels is enough. No glow effects.

## Shapes

Medium radii (14px) on panels; pills on actions and status chips. Avoid perfectly circular icon buttons as decoration.

## Components

- **Primary button:** teal pill, white text, visible focus ring
- **Status chip:** compact, high-contrast semantic fill
- **List row:** white panel, hairline border, name + status first, meta second
- **Empty state:** dashed border, one headline, one supporting line, optional CTA
- **Upload zone:** clear file affordance, immediate success/error messaging, in-flight copy while extraction runs

## Do's and Don'ts

**Do**

- Lead with status and the next action
- Keep empty, loading, error, and success states explicit
- Preserve Northstar teal identity

**Don't**

- Introduce purple gradients, glassmorphism, or dark neon themes
- Wrap every block in a heavy card
- Use Inter/Roboto as the product voice
- Hide processing state behind a generic spinner with no copy
