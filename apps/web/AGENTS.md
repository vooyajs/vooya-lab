# Public Web Application Contract

This file applies to `apps/web`.

- The application owns global chrome, responsive case navigation, routing,
  registry consumption, docs composition, and deployment presentation.
- Keep the case directory visible at the 736-pixel acceptance width. Collapse it
  into a drawer only at a true phone breakpoint; allow the desktop directory to
  be manually collapsed.
- Case routes and navigation come from filesystem-derived metadata. Do not add
  direct case imports or a second route list as the library grows.
- App components consume case/package public APIs. Do not place reusable case
  runtime, Workbench, preview, or compiler behavior in this application by
  default.
- The case detail reading order is outcome, preview, **Why this boundary?**,
  source/copy, then deeper evidence.
- Preserve keyboard navigation, focus, reduced-motion behavior, and source
  readability while applying the visual redesign.
- Do not show enabled source-build controls for a precompiled read-only case.
