---
name: 8bit-walk2
hostname: local-workspace
description: Generate a single full-body right-profile walkframe (second pose only) of the character from `{/8bit-profile}` by applying the exact limb configuration of the second figure in assets/walkframetemplate.jpg. Both image references are mandatory. Always apply {/8bit-style} for detailed stylization on solid tan background.
disable-model-invocation: true
---

- **CRITICAL ALIGNMENT:** Before executing any tasks, you must review and strictly adopt the system glossary defined in `@File:LANGUAGE.md`.
- Throughout this workflow, every assessment of `{errors}`, `{correctness}`, `{functionality}`, `{correct required outputs}`, `{sufficient}`, or `{insufficient}` MUST strictly adhere to the exact definitions and qualifiers established in that document.
- Do not rely on baseline assumptions. All sufficiency checks and state evaluations must be objectively measured against this explicit taxonomy.

This is a two-image composition / pose-transfer task. You MUST supply and use BOTH of the following visual references. Do not skip, ignore, or omit the template file.

TWO REFERENCES IN ORDER (both required as image inputs):
(1) The previously generated image from `{/8bit-profile}` — source of face, hair, clothing, identity, likeness and outfit. This exact character must appear. Do not re-generate or re-invoke the profile skill.
(2) `assets/walkframetemplate.jpg` — the ONLY and mandatory source of limb pose. Use ONLY the second figure (second from left / figure 2) for the pose and arm/leg configuration. Load and use this file as a visual reference.

OUTPUT: Produce one single full-body RIGHT-PROFILE sprite of the character from reference (1) in the exact pose of the second figure from the template. Copy the limb positions, stride, and arm swing of template figure 2 exactly. Same grounded stance. Keep the character's likeness and outfit. STRICTLY do NOT copy template colors (no black silhouette fill, no yellow joint dots, no green bone lines).

Do not generate a sheet, additional frames, or any other poses. Second walkframe only.

Apply stylization via `{/8bit-style}` with full force: readable face and outfit, clear clothing seams, fabric creases, folds, and construction details.

HARD NEGATIVES: no jump, leap, airborne, high kick, dance, crossed arms idle, run-leap, action-pose, both feet off ground, freeform poses, or invented limb positions. Do not invent a different person. The exact second-template pose is required.

Run a `{/8bit-walk2}` session.
```