# Vooya Lab Visual Identity and Asset Workflow

Status: normative direction for shared brand work, generated imagery, case
covers, and visual references. Read this with `lab-architecture.md`.

## Brand job

Vooya Lab must earn attention before it asks a Web developer to understand
Rust, WASM, or a component ABI. The visual system therefore has two jobs:

1. create immediate curiosity and make the Lab feel like a distinctive creative
   developer instrument; and
2. lead that attention into inspectable evidence: a live case, its host/Rust/GPU
   boundary, source, dependencies, limitations, and copy path.

Brand art may advertise an outcome. It must never impersonate a live case or
replace the running preview.

## Core visual language

- Base material: near-black green rather than neutral SaaS gray.
- Signal colors: acid chartreuse for navigation/action, spectral cyan for
  computation, violet for depth/research, and hot coral for errors.
- Typography: editorial display serif for ideas and outcomes; compact grotesk
  for interface copy; monospace for routes, evidence, status, and measurements.
- Geometry: cropped orbital arcs, indexed grids, thin rules, trace paths, and
  deliberate hard edges. Avoid generic glass cards and unrelated neon blobs.
- Motion: state change, traversal, compilation, and data lineage—not decorative
  perpetual motion. Respect `prefers-reduced-motion`.

### Readability floor

The dense instrument aesthetic does not authorize illegible interface text.
Use these minimum tokens at 100% browser zoom:

- body and explanatory copy: `13px`;
- controls, buttons, tabs, and compact navigation: `11px`;
- metadata, status, routes, and evidence labels: `10–11px`;
- source code: `13px` with at least `1.6` line height.

Text below `10px` is decorative only, cannot carry state or instructions, and
must disappear before it becomes the sole representation of information.

The current `V/` mark is a functional placeholder and a useful seed: `V`
identifies Vooya while `/` suggests source paths, boundaries, and forward
motion. Logo exploration may challenge its construction, but should preserve a
recognizable small-size mark and avoid relying on illegible generated text.

## Logo system to explore

Treat the identity as a family, not one image:

- micro mark for favicon, directory rail, and compiler status;
- horizontal `VOOYA LAB` wordmark;
- square social/repository avatar;
- monochrome mark for code, docs, and terminal contexts;
- motion behavior for loading/build success; and
- clear-space, minimum-size, dark/light, and one-color rules.

Lovart is appropriate for broad concept exploration and material studies. A
selected logo must be redrawn and reviewed as repository-native SVG/vector;
do not ship rasterized AI lettering as the canonical mark.

## Lovart research model

The Lovart features shown in the current product can be used together:

### Design Skill

Encode the stable Vooya Lab brief, palette, typography tension, prohibited
cliches, required deliverables, and review rubric. Use it to generate coherent
families instead of unrelated one-off prompts. Changes to the stable brief are
reviewed like design-system changes.

### Pinterest and external inspiration

Use external sources to build a moodboard around editorial developer tools,
scientific instruments, spectral imaging, cartography, compiler traces, and
experimental typography. References define qualities, not pixels to copy.
Record each retained source URL, author/studio when known, capture date, and the
specific principle being studied.

### Lovart Clipper

Capture a small number of useful fragments—navigation behavior, grid rhythm,
logo construction, information density, motion, or material treatment. Every
clip needs a note explaining what is reusable as a principle and what must not
be imitated.

### Reference Space

Curate the strongest references and accepted Vooya outputs into one project
space. This becomes the consistency anchor for later case covers, documentation
illustrations, launch graphics, and logo iterations. Remove references that no
longer match the selected direction rather than letting the space become an
unfiltered scrapbook.

## Production workflow

1. Write or update the brief under `assets/brand/`.
2. Collect and annotate references; never treat a reference image as a shipping
   asset.
3. Generate contact sheets with clearly different design hypotheses.
4. Review at favicon, navigation, social-avatar, and large-display sizes.
5. Select a direction; redraw canonical marks as SVG and define tokens.
6. Retain original generated files and add provenance metadata.
7. Produce optimized AVIF/WebP/PNG derivatives without modifying originals.
8. Integrate into one real surface and verify contrast, focus, responsive
   behavior, reduced motion, and loading fallback.
9. Keep only assets that strengthen the live product story.

## Provenance contract

Every retained generated or commissioned asset records:

- stable asset ID and owning surface;
- generator/tool and model or mode when exposed;
- source project URL and project ID;
- exact prompt or creative brief;
- generation and download dates;
- reference sources and usage constraints;
- original file digest and derivative paths;
- decorative, cover, brand, or live-result role; and
- reviewer and acceptance status.

Use `assets/brand/provenance.template.json` for shared assets. Case-specific art
uses the same fields inside the owning case's `assets/` directory.

## Review rubric

Reject an asset when it:

- looks like a generic AI/SaaS logo or cyberpunk dashboard;
- depends on misspelled or malformed generated lettering;
- weakens source readability, navigation, or contrast;
- suggests GPU rendering, parallelism, or performance the case does not prove;
- cannot be traced back to its project, prompt, references, and license; or
- is more compelling than the page only because the actual preview is static.
