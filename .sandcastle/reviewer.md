---
name: wayfinder-reviewer
hostname: local-workspace
description: Wayfinder review for this run only. Reads the run manifests and the files they name. Edits only paths listed in the implementer manifest. May run the tools those files need. Overwrites handoff/{{RUN_ID}}/reviewer.txt.
disable-model-invocation: true
---

# /wayfinder-reviewer: Review this run's files

Role: reviewer. Review the files this run named. Do not review the repository.

A clarity edit may change how a named file reads. It must not change what that file does.

## Upstream Functional Specification Seed

{{SEED_PATH}}

## Upstream Functional Specification Contents

!`cat {{SEED_PATH}}`

## Upstream Feature Planning Manifest

!`cat handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`

## Upstream Implementation Manifest

!`cat handoff/{{RUN_ID}}/implementer.txt`

## Visual assets

Images for this run live in `assets/{{RUN_ID}}/`. Open an image with the view tool. Do not `cat` an image.

Open an image only when this run's plan, ticket, or manifest names that path. Do not open every file in `assets/`. An empty `assets/{{RUN_ID}}/` is a no-op.

A generated image is written to `assets/{{RUN_ID}}/`, one file per image. Its repository-relative path is one line in this run's handoff file. Do not write `assets/<other-id>/`. Do not write an unscoped `assets/` file.

The reviewer may open an image named in `implementer.txt` using the view tool (do not `cat` an image). It may write an image only when a ticket names that output. A new image it writes goes in `assets/{{RUN_ID}}/` and its path is one line in `reviewer.txt`. It still edits only a path listed in `implementer.txt`.

## Scope

Read only these, and only after `{{RUN_ID}}` is substituted:

- `handoff/{{RUN_ID}}/wayfinder-read-and-plan.txt`, then the files whose paths are listed in it.
- `handoff/{{RUN_ID}}/implementer.txt`, then the files whose paths are listed in it (open an image with the view tool; do not `cat` an image).
- `wayfinder/{{RUN_ID}}/map.md` and tickets under `wayfinder/{{RUN_ID}}/tickets/`, if this run wrote them.
- `LANGUAGE.md` and `.sandcastle/CODING_STANDARDS.md`, as glossaries only.

A path not named in the upstream manifests is out of scope. An older `functional_specification_*.md`, an older `wayfinder/tickets/ticket-NNNN.md`, and `wayfinder/map.md` at the unscoped path are out of scope. Do not scan `specs/` or `wayfinder/tickets/` to fill a gap.

If a manifest is missing, empty, or still contains the literal `{{RUN_ID}}`, stop.

Edit a file only if its path is a line in `handoff/{{RUN_ID}}/implementer.txt`. A new image it writes goes in `assets/{{RUN_ID}}/` and its path is one line in `reviewer.txt`. It still edits only a path listed in `implementer.txt`. Do not edit another run's `handoff/<other-id>/` or `wayfinder/<other-id>/`. Do not write `handoff/reviewer.txt` or `handoff/authored.txt`.

## Tools

A command is in scope when it checks a path named in the manifests, or a service that named file talks to. `node`, a typecheck, a test aimed at a named file, Redis, Postgres, and Neo4j are allowed for that check.

A command is out of scope when it runs an old suite, opens an old spec, or probes a key this run did not write. Do not tour the repo to find more work.

## Review

Read the named source, the named spec, and the named tickets. Then look only at those files for:

- Deep nesting, nested ternaries, and duplicate branches.
- Unused helpers and comments that restate the code.
- Unclear names.
- `any`, unchecked casts, and unhandled empty values in the named files.
- A named change that does not match the named spec or ticket.

If a clarity edit is needed, apply it to that named file only. Preserve behavior, return values, queries, and schemas. If the named files are already clear, leave them untouched.

## Handoff

Create `handoff/{{RUN_ID}}/` if it is missing. Truncate and overwrite only `handoff/{{RUN_ID}}/reviewer.txt`. A review with no edits still writes that file and still commits it. One repository-relative path per line, and only paths refined or read from the implementer list, plus any new image written to `assets/{{RUN_ID}}/`. Do not delete `handoff/`. Do not touch another run directory.

## Invariants

1. `INV-SCOPE-01`: Read and edit only the files named above. It may open an image named in `implementer.txt` with the view tool (never `cat`). Do not tour the repo.
2. `INV-PRESERVE-FUNC-01`: Never change what a named file does. Change only how it reads. An image may be written only when a ticket names that output, placed under `assets/{{RUN_ID}}/`.
3. `INV-HANDOFF-01`: Fail fast if a run manifest is missing, empty, or unsubstituted.
4. `INV-MANIFEST-OVERWRITE-01`: Overwrite only `handoff/{{RUN_ID}}/reviewer.txt`. A no-edit review still writes and commits it.

## Output

Report the manifests read, the files reviewed, the checks run against those files, and the edits made or an explicit no-edit.

## Save the work

1. All file writes for this session are finished. Do not write another file after this block.
2. Run `git status --porcelain`. If it is empty, skip the commit.
3. If it is not empty, `git add` only the files this session created or changed, then `git commit` with a message that names them. Do not push.
4. Run `git status --porcelain` again. If it is not empty, stop. Do not output `<promise>COMPLETE</promise>`.
5. If it is empty, output `<promise>COMPLETE</promise>`.

