import fs from "node:fs/promises";
import path from "node:path";
import { executeCommand } from "../core/exec.js";
import { recordMetricEvent } from "../metrics/recorder.js";
import { BuiltinSpecEngine } from "./builtin.js";
import { readChangeState, writeChangeState } from "./change-state.js";
import type { ChangeMetadata, CreateChangeOptions, SpecEngine, ValidationResult } from "./types.js";

export class OpenSpecEngine implements SpecEngine {
  readonly id = "openspec" as const;
  private builtin = new BuiltinSpecEngine();

  async init(repoRoot: string, options?: { dryRun?: boolean }): Promise<void> {
    if (options?.dryRun) {
      return;
    }

    // Initialize directory structure directly first
    await this.builtin.init(repoRoot, options);

    // Run openspec init if available in project
    try {
      await executeCommand("npx openspec init --no-animation --force", {
        cwd: repoRoot,
        env: { OPENSPEC_TELEMETRY: "0" },
        silent: true,
      });
    } catch {
      // Non-fatal if offline or npx not in path; filesystem structure was created
    }
  }

  async listChanges(repoRoot: string): Promise<ChangeMetadata[]> {
    return await this.builtin.listChanges(repoRoot);
  }

  async getChange(repoRoot: string, changeId: string): Promise<ChangeMetadata | null> {
    return await this.builtin.getChange(repoRoot, changeId);
  }

  async createChange(
    repoRoot: string,
    changeId: string,
    options?: CreateChangeOptions,
  ): Promise<string> {
    if (options?.dryRun) {
      return path.join(repoRoot, "openspec", "changes", changeId);
    }

    try {
      const res = await executeCommand(`npx openspec change "${changeId}"`, {
        cwd: repoRoot,
        env: { OPENSPEC_TELEMETRY: "0" },
        silent: true,
      });

      if (res.exitCode === 0) {
        const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
        const existingState = await readChangeState(changeDir);
        const createdAt = new Date().toISOString();
        if (!existingState) {
          await writeChangeState(changeDir, {
            change_id: changeId,
            status: "draft",
            created_at: createdAt,
          });
        }
        await recordMetricEvent(repoRoot, {
          type: "change_created",
          changeId,
          timestamp: createdAt,
        });
        return changeDir;
      }
    } catch {
      // Fallback to builtin creation
    }

    return await this.builtin.createChange(repoRoot, changeId, options);
  }

  async validate(repoRoot: string, changeId?: string): Promise<ValidationResult> {
    const builtinResult = await this.builtin.validate(repoRoot, changeId);
    if (!builtinResult.valid) {
      return builtinResult;
    }

    // Run openspec validate CLI if available in environment
    try {
      const cmd = changeId
        ? `npx openspec validate "${changeId}" --strict`
        : "npx openspec validate --strict";

      const res = await executeCommand(cmd, {
        cwd: repoRoot,
        env: { OPENSPEC_TELEMETRY: "0" },
        silent: true,
      });

      if (res.exitCode !== 0) {
        return {
          valid: false,
          issues: [
            ...builtinResult.issues,
            {
              file: changeId ? `openspec/changes/${changeId}` : "openspec",
              message: res.stderr || res.stdout || "OpenSpec validation failed",
              severity: "error",
            },
          ],
          errorsCount: (builtinResult.errorsCount ?? 0) + 1,
          warningsCount: builtinResult.warningsCount ?? 0,
        };
      }
    } catch {
      // Non-fatal if offline or npx not in path; builtin validation was already executed
    }

    return builtinResult;
  }

  async archive(
    repoRoot: string,
    changeId: string,
    options?: { dryRun?: boolean },
  ): Promise<boolean> {
    if (options?.dryRun) {
      return true;
    }

    const changeDir = path.join(repoRoot, "openspec", "changes", changeId);
    const preArchiveState = await readChangeState(changeDir);

    try {
      const res = await executeCommand(`npx openspec archive "${changeId}" -y`, {
        cwd: repoRoot,
        env: { OPENSPEC_TELEMETRY: "0" },
        silent: true,
      });

      if (res.exitCode === 0) {
        // OpenSpec archives to archive/<date>-<changeId> or similar
        // Ensure specty.yaml is updated to archived status
        if (preArchiveState) {
          preArchiveState.status = "archived";
          const archiveRootDir = path.join(repoRoot, "openspec", "changes", "archive");
          try {
            const entries = await fs.readdir(archiveRootDir);
            const matchingArchived = entries.find((e) => e.endsWith(changeId));
            if (matchingArchived) {
              await writeChangeState(path.join(archiveRootDir, matchingArchived), preArchiveState);
            }
          } catch {
            // ignore
          }
        }
        return true;
      }
    } catch {
      // fallback to builtin archiving
    }

    return await this.builtin.archive(repoRoot, changeId, options);
  }
}
