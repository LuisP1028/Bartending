---
name: head-on-character
description: Create a head-on torso shot of a person from a source/reference image as a character asset. Use when the user requests a head-on view, front-facing bust, or head-on patron. Always combine with the 8bit-character-style skill for stylization.
metadata:
  hostname: local-workspace
---

- **CRITICAL ALIGNMENT:** Before executing any tasks, you must review and strictly adopt the system glossary defined in `@File:LANGUAGE.md`.
- Throughout this workflow, every assessment of `{errors}`, `{correctness}`, `{functionality}`, `{correct required outputs}`, `{sufficient}`, or `{insufficient}` MUST strictly adhere to the exact definitions and qualifiers established in that document.
- Do not rely on baseline assumptions. All sufficiency checks and state evaluations must be objectively measured against this explicit taxonomy.

# Head-On Character

## Core Framing Prompt

When generating a head-on character image, use this exact framing:
Create a head-on torso shot of the person in the source image. Bust from head through upper chest. Keep likeness. Full figure not required.
text## Stylization

Do **not** hard-code 8-bit / 16-bit instructions here.  
Instead, always activate and apply the `{/8bit-style}` skill (8bit-character-style) for all stylization, background, isolation, and visual constraints.

## Instructions

1. Apply the Core Framing Prompt above as the pose and crop instruction.
2. Immediately load and follow the `{/8bit-style}` skill for the full visual treatment (8-bit/16-bit video-game style, pure tan background, isolation rules, readability, forbidden styles, etc.).
3. Keep the character recognizably based on the source/reference image while transforming it under the 8bit-character-style rules.
4. Output only the isolated head-on bust on the solid tan background required by the style skill.

## When to Activate

- User requests a head-on shot, front-facing torso, or head-on view of a character/patron.
- A reference image is supplied specifically for a head-on patron asset.
- Any request that pairs a source image with "head-on" framing.