---
name: 8bit-character-style
description: Apply a strict 8-bit / 16-bit video-game character style when generating or editing images of people from reference images. Use for pixel-art game characters, sprites, isolated character assets, or any request involving readable face and outfit in retro video-game stylization on pure tan background. Style reference images are located in the `{/8bit-style/assets}` folder. Triggers include 8-bit character, 16-bit style, video-game character, stylePrefix, pixel character, tan background character, add a patron.
metadata:
  hostname: local-workspace
---

- **CRITICAL ALIGNMENT:** Before executing any tasks, you must review and strictly adopt the system glossary defined in `@File:LANGUAGE.md`.
- Throughout this workflow, every assessment of `{errors}`, `{correctness}`, `{functionality}`, `{correct required outputs}`, `{sufficient}`, or `{insufficient}` MUST strictly adhere to the exact definitions and qualifiers established in that document.
- Do not rely on baseline assumptions. All sufficiency checks and state evaluations must be objectively measured against this explicit taxonomy.

# 8-bit / 16-bit Character Style

## Purpose

Enforce a precise, non-negotiable visual style for character image generation and editing. The style produces isolated, readable, retro video-game characters suitable for sprites and game assets on a solid tan background.

## Style References

Use the example images in the `{/8bit-style/assets}` folder as visual style anchors for the required chunky pixels, hard edges, dither patterns, limited palette, and pure tan isolation.

## Core Style Prefix

True low-resolution 8-bit / 16-bit pixel-art character sprite. Pixel art only. Chunky square pixels, hard edges, no anti-aliasing. Limited 16-32 color palette, flat color blocks, hard transitions only. All shading and form created exclusively with visible dither or hard-stepped blocks — never continuous gradients or soft ramps. NES/SNES-era sprite aesthetic. Distinct hard-edged pixel seams, folds, and facial features. STRICTLY not photorealistic, not smooth 3D, not soft lighting, not continuous tones, not photographic skin, not high-detail filtered photo. Isolated character on flat solid pure tan #D2B48C only. No environment, no shadows, no ambient occlusion, no residual lighting from any reference.
text## Instructions

1. **Isolate the character.** Final image must contain only the character on solid pure tan `#D2B48C`. No gradients, textures, environment, floor plates, soft shadows, ambient occlusion, or any lighting that implies 3D form.

2. **Forbidden styles.** Reject and avoid:
   - Photorealistic rendering or photographic skin
   - Smooth 3D / CGI
   - Soft airbrush, continuous gradients, or soft lighting
   - Sub-pixel anti-aliasing or yellow outlines
   - Ambient occlusion or drop shadows
   - High-detail “pixel art” that still reads as filtered photo or 3D
   - Tiny emoji-blob proportions or UI/SVG look

3. **Pixel-art detail only.** Facial features, expression, seams, folds, wrinkles, hems, and buttons must stay readable, but all form and shading must be hard-edged pixel blocks, visible dither, or stepped flat colors. Never continuous gradients or soft ramps.

4. **Reference handling.** Use the reference only for identity cues (face shape, hair, clothing type). Fully transform it into the required low-resolution pixel-art style. Do not preserve photoreal lighting, skin texture, or smooth shading from the source. When available, also consult images in the `8bit-style/assets` folder as style anchors.

5. **Tool usage.** Always put the stylePrefix first and dominant in every generation or edit prompt. Do not dilute it.

6. **Sufficiency check.** Confirm hard pixel edges, visible dither or stepped shading, pure tan isolation, and complete absence of continuous tones, soft lighting, ambient occlusion, or residual photorealism. If any of these fail, strengthen the stylePrefix and regenerate.

## When to Activate

- User requests a character, sprite, or person rendered in 8-bit / 16-bit / pixel / retro video-game style.
- User supplies a reference photo and wants a stylized game-character version.
- **Each time a reference image is provided to add a patron, activate and apply this skill.**
- Any project requiring isolated character assets on tan.
- Any mention of the stylePrefix itself or "isolated character on tan".