---
name: tqq-vault-rules
description: Strict Developer Rules & Architectural Protocol for TQQ Vault
trigger: always_on
---

# 📜 TQQ Vault - Strict Developer Rules & Architectural Protocol

These rules are mandatory and must be strictly enforced by all developers and AI agents working on the **TQQ Vault** codebase.

---

### Rule 1 (Read First)
At the beginning of any session or task, read `README.md` completely to understand existing systems, architectures, and state contracts before touching code. Never make assumptions about existing state schemas, economic values, or procedural rendering pipelines without verifying the source of truth.

---

### Rule 2 (Continuous Git Pipeline)
After completing each distinct feature, stage, or bug fix:
1. Stage all changes:
   ```bash
   git add .
   ```
2. Write a semantic commit message:
   ```bash
   git commit -m "feat/fix: descriptive summary of change"
   ```
3. Push directly to the remote repository:
   ```bash
   git push origin main
   ```

---

### Rule 3 (Documentation Sync)
Update `README.md` at the conclusion of every stage to reflect new features, economic values, components, state mutations, and CLI scripts. The documentation must stay in lockstep with the running application at all times.

---

### Rule 4 (Zero Placeholders)
Never write `// TODO`, mock stubs, or placeholder implementations for game mechanics. Every line of code must be strictly typed (TypeScript strict mode, zero `any`), fully implemented, and production-ready.

---

### MANDATORY POST-TASK WORKFLOW: VERSIONING & PATCH NOTES

At the end of EVERY completed task, prompt, or bugfix (before git commit & push):

1. **Increment App Version (`src/config/version.ts`):**
   - Use small Minecraft-style patch increments (`MAJOR.MINOR.PATCH`).
   - Bug fixes / visual tweaks / small UI alignments: bump `PATCH` (`2.0.1` -> `2.0.2`).
   - New gameplay mechanics / new screens / substantial features: bump `MINOR` (`2.0.x` -> `2.1.0`).

2. **Overwrite the Active Patchnote (`src/config/patchNotes.ts`):**
   - Replace the previous patchnote completely. Do NOT keep an endless archive in the modal.
   - The note must be short, friendly, and easy to understand for normal players.
   - Format:
     - **Version Header:** e.g., `v2.0.3 - Showcase & Thumbnail Polish`
     - **✨ What's New:** 1–3 bullet points highlighting noticeable changes.
     - **🐛 Bug Fixes:** 1–3 bullet points written simply (e.g., *"Fixed support cards looking tiny in the drawer"* instead of *"Removed double padding on acrylic bumper"*).

3. **Commit & Push Convention:**
   - Commit message must include the new version number:
     `git commit -m "chore(release): bump to vX.Y.Z - <short summary>"`
   - Push directly to `origin main`.
