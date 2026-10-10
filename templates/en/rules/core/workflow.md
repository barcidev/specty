# Core Rule: Workflow

Development in specty strictly follows 5 versioned states:

```text
draft ──► approved ──► in-progress ──► verifying ──► done
             │
             ▼
      (re-approval if spec changes)
```

1. **Phase 1: draft (Planning)**
   - The orchestrator drafts `proposal.md`, `design.md`, spec deltas in `specs/`, and tasks in `tasks.md`.
   - Production code modifications are forbidden in this phase.
   - State in `specty.yaml`: `status: draft`.

2. **Phase 2: approved (Human Approval)**
   - The human reviews and approves via `specty approve <change>`.
   - The AI assistant is strictly forbidden from self-approving or modifying `specty.yaml` status.
   - Records approver, timestamp, and cryptographic content hash.
   - If any spec artifact is edited subsequently, the hash invalidates and re-approval is required.

3. **Phase 3: in-progress (Implementation)**
   - The agent executes tasks sequentially respecting roles and file scopes.
   - Checkboxes are marked `- [x]` immediately upon task completion.

4. **Phase 4: verifying (Verification)**
   - Test and lint verification commands run via `specty verify <change>`.
   - On failure, the change transitions back to `in-progress` for fixes.

5. **Phase 5: done (Completion & Archive)**
   - When all checks pass, the change is archived and consolidated into `openspec/specs/`.
