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
