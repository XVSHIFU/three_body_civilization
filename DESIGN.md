---
name: 三体文明
description: Three selectable entrance worlds and a protected observation interface.
colors:
  ink: "#eee7d9"
  muted: "#c0c9cb"
  ground: "#202b35"
  panel: "#26343d"
  line: "#607078"
  accent: "#e5d4b5"
  a-ground: "#23343c"
  a-panel: "#2b3b42"
  a-accent: "#d9c9a4"
  c-ground: "#162d43"
  c-panel: "#1e354b"
  c-accent: "#dfc69d"
  action-ink: "#1d2931"
  primary-hover: "#f4e8d3"
  b-entry-neutral: "#27313c"
  b-entry-action: "#f6e8d8"
  b-entry-action-hover: "#fff2e3"
typography:
  display:
    fontFamily: '"Noto Serif SC Title", "Noto Serif SC", serif'
    fontSize: "calc(clamp(48px,5.7vw,96px) * var(--font-scale,1))"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: ".035em"
  display-a:
    fontFamily: '"Noto Sans SC", sans-serif'
    fontWeight: 300
  display-c:
    fontFamily: '"Noto Serif SC Title", "Noto Serif SC", serif'
    fontSize: "calc(clamp(58px,7.2vw,112px) * var(--font-scale,1))"
    fontWeight: 600
  display-b-desktop:
    letterSpacing: "-.025em"
  display-c-desktop:
    fontSize: "clamp(58px,8.6vw,144px)"
    lineHeight: 1.12
  headline:
    fontFamily: '"Noto Serif SC", serif'
    fontSize: "calc(clamp(26px,2.5vw,38px) * var(--font-scale,1))"
    fontWeight: 400
    lineHeight: 1.35
  title:
    fontSize: "calc(23px * var(--font-scale,1))"
    lineHeight: 1.5
  body:
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "calc(16px * var(--font-scale,1))"
    lineHeight: 1.65
  label:
    fontSize: "calc(13px * var(--font-scale,1))"
rounded:
  button: "2px"
  panel: "3px"
spacing:
  compact: "12px"
  control: "20px"
  section: "24px"
  panel: "32px"
  column: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-b-entry-desktop:
    backgroundColor: "{colors.b-entry-action}"
  button-b-entry-desktop-hover:
    backgroundColor: "{colors.b-entry-action-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    width: "min(680px,calc(100% - 48px))"
  select:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    padding: "8px"
---

# Design System: 三体文明

## Overview

**Creative North Star: "A world to enter, with evidence that accumulates"**

The approved visual family offers three coherent worlds: A 遗址测绘 uses slate, mineral and chalk; B 天文台取景框 uses blue-gray, limestone and warm white; C 复古科幻 pairs a rust-colored illustrated sky with deep blue and parchment. B is the default. Their different entrance compositions are intentional, while their reading and operating surfaces share restrained controls and clear Chinese text.

Atmosphere belongs to the entrance art and the real scene. Evidence is readable semantic HTML on protected, dark surfaces. This document records the implemented visual system from source; it does not certify game QA or a visual acceptance gate.

**Key Characteristics:**

- Three selectable themes with shared reading controls.
- Chinese serif display type and practical sans-serif body text.
- Near-square, outlined controls and warm filled primary actions.
- Paused reading surfaces and an unobstructed central sightline.

## Colors

### Primary

The warm accent marks primary actions and selected evidence. Theme A substitutes mineral chalk; theme C substitutes parchment. Hover uses the shared lighter primary-hover token.

### Neutral

Ink and muted text are shared across themes. Ground, panel and line establish dark tonal layers; A and C replace ground and panel without changing the shared body text. Action ink supplies dark text on filled accents. Rust in C is part of the entrance raster, not a reusable CSS accent token. B’s desktop entrance uses the b-entry-neutral color as a color-blend field over the left 31.3% of its art. Its regular-scale desktop primary action uses the b-entry-action pair; C’s primary action retains the parchment accent beneath a parchment material image.

**The Theme Scope Rule.** Preserve theme-specific art, typography and entrance layout; use the shared semantic roles for reading surfaces.

## Typography

B and C entrance titles use the locally bundled Noto Serif SC Title at weight 600, with Noto Serif SC and serif fallbacks. The WOFF2 is a four-character subset for 三体文明 (U+4E09, U+4F53, U+6587, U+660E), loaded with font-display: swap; it is not a general Chinese body font. Panel headings continue to use Noto Serif SC at weight 400. Theme A's entrance title uses Noto Sans SC at light weight. Body text uses Microsoft YaHei, PingFang SC and sans-serif fallbacks. The wordmark is live text with wide tracking; it is decorative to assistive technology.

The frontmatter records the base display, heading, body and label roles. Evidence titles use serif at a scaled 30px. Comparison values use scaled 28px type and tabular numerals; output values also use tabular numerals. Quiet text is .875em. Font scale runs from 100% to 150% in settings; sizes that explicitly use the scale multiply once.

## Layout

The application occupies 100dvh; the entrance scrolls independently. B positions its entrance content at left 5.7%, top 13%, width 22%. A anchors a wider block at the lower left and wraps its actions horizontally. C uses a larger upper-left title and wrapped horizontal actions. Its content is a vertical flex stack: the title comes first, the wordmark stays in normal flow, and the supporting line follows with a 24px top margin. These are entrance compositions, not mandatory layouts for future screens.

The entrance desktop refinements apply only at min-width:1101px and min-height:640px. B isolates its entrance blend layer; the neutral field spans the left 31.3%, with content, footer and location stamp above it. At regular text scale, B tightens title tracking and uses .85em wordmark tracking with 1.6 line-height; C uses the display-c-desktop title, zero bottom title margin, and a clamp(14px,1.15vw,19px) wordmark with 1.25 line-height and .45em tracking. These title and wordmark refinements exclude data-large=true. The local B/C title face and C parchment button material apply at every viewport size. Compact and mobile rules below remain distinct from this desktop composition.

Standard dialogs cap at 680px, wide archive/settings dialogs at 1020px. Headers remain separate from the scrolling content. The archive uses a 230px index beside its reading area with a 36px gap. Settings and reading comparisons use two columns; key settings use three.

At 1100px and below, entrance width increases and HUD menu buttons stack. Below the supported game window (1024 × 640), an explanatory strip appears and the start handler keeps users in the preview. At 640px and below, entrance content becomes a single column, selected theme names hide, dialogs use 12px outer gutters, archive/settings/comparisons become one column and key settings become two. The evidence index becomes a scrolling region capped at 200px. At 1800px and above, entrance content has a 420px cap.

Above 120% text scale, entrance content changes from absolute positioning to normal flow, permits title wrapping and limits menu width to 410px. The footer also returns to flow; mobile margins increase. B adds a near-opaque dark backing and padding to protect enlarged text over its art. The 150% setting uses this layout; source support is not a claim that every game state has passed browser QA.

## Elevation & Depth

Tonal layering is primary. Dialogs, the resume card and toast use the shared structural shadow (0 24px 70px #0006). The modal backdrop darkens the world (#101b26cf); HUD text has a legibility shadow (0 2px 8px #15232ee0). Panels do not use decorative stacked cards or floating hover lifts.

C’s entrance primary button overlays /assets/materials/parchment.webp with cover sizing and centered placement; it is a material treatment on the live HTML action, not rasterized text. B’s desktop neutral field uses mix-blend-mode:color rather than an opaque replacement of the art.

The loading mark rotates over 1.5 seconds. The resume scrim reveals the world over .55 seconds with ease-out. Buttons transition background and color over .16 seconds. Reduced-motion settings and the system preference disable animations and transitions; reduced motion defaults on.

## Shapes

Controls are near-square with fine, one-pixel borders. Buttons use the button radius; dialogs and keycaps use the panel radius. Samples and the central reticle are circles. Divider lines organize sections and comparisons; rounded pill silhouettes are not the navigation language.

## Components

### Buttons

Primary actions are warm filled controls with dark text and a transparent border. Base controls have a 44px minimum height; entrance primary height scales from 54px to 76px. Secondary controls are transparent with line-colored borders; hover adds a translucent white fill. Text actions remove the border and underline their label. Disabled buttons use .5 opacity and a not-allowed cursor. Arrow and close icons are inline 24px stroked SVGs.

**The Visible Focus Rule.** Buttons, inputs, selects and summaries use a 2px accent outline offset by 5px; the file-import wrapper uses the same treatment on focus-within.

### Navigation

The A/B/C selector uses aria-pressed; the selected button adopts the accent fill and action ink and shows its name on larger windows. The archive index uses a warm selected row and secondary metadata. HUD navigation stays at the screen edge, with keyboard hints alongside action names.

### Dialogs and reading surfaces

Native modal dialogs use showModal(), an accessible heading and a named close control. Browser modal behavior confines interaction; Escape closes via the cancel handler, and cleanup restores prior focus. Header padding is 28px 32px 24px, content padding 28px 32px 32px. Reading pauses the world; closing the panel leaves an explicit resume step. Comparison columns, fact/hypothesis sections and consequence rows use dividers rather than decorative cards.

### Inputs and feedback

Selects use ground fill, ink text, line borders and a 44px minimum height. Range controls inherit the accent and have a 28px minimum height; checkbox rows have a 44px minimum height. Read-only key-binding fields accept letter-key rebinding through keyboard handling. Import uses a transparent file input over a bordered label. Toasts use the accent fill, dark text, status semantics and the structural shadow. Errors wrap long text.

## Do's and Don'ts

### Do:

- Do preserve the structural differences between A, B and C.
- Do keep Chinese text semantic, selectable and scalable to 150%.
- Do retain visible keyboard focus and native modal reading behavior.
- Do keep facts, hypotheses and inherited knowledge visually separated.

### Don't:

- Don't treat entrance concept art as the gameplay renderer.
- Don't turn unsampled information into authoritative HUD data.
- Don't replace explicit resume with automatic world motion after reading.
- Don't claim source documentation proves full game QA or visual acceptance.


> 2026-09-29交接注：本文件记录历史原型样式，不是新美术方向的约束。用户对游戏内视觉不满意，下一轮以 docs/PLAN-v0.3.md 的样板审阅为准。
