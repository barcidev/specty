import path from "node:path";
import { logger } from "../../core/logger.js";
import { createHandoff, formatHandoffMarkdown, listHandoffs } from "../../handoff/manager.js";
import { recordMetricEvent } from "../../metrics/index.js";

export interface HandoffCliOptions {
  cwd?: string;
  from?: string;
  to?: string;
  tasks?: string;
  files?: string;
  decisions?: string;
  notes?: string;
}

export async function executeHandoffCreate(
  changeId: string,
  options: HandoffCliOptions = {},
): Promise<boolean> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const fromRole = options.from || "orchestrator";
  const toRole = options.to || "backend";

  const tasksCompleted = options.tasks
    ? options.tasks
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const filesModified = options.files
    ? options.files
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];
  const decisions = options.decisions
    ? options.decisions
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)
    : [];

  const record = await createHandoff(repoRoot, changeId, {
    fromRole,
    toRole,
    tasksCompleted,
    filesModified,
    decisions,
    notes: options.notes,
  });

  await recordMetricEvent(repoRoot, {
    type: "handoff_recorded",
    changeId,
    handoffId: record.id,
    fromRole,
    toRole,
  });

  logger.success(
    `Handoff created: ${record.id} (${fromRole} ➔ ${toRole}) for change "${changeId}".`,
  );
  return true;
}

export async function executeHandoffList(
  changeId: string,
  options: { cwd?: string } = {},
): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const handoffs = await listHandoffs(repoRoot, changeId);

  if (handoffs.length === 0) {
    logger.info(`No session handoffs found for change "${changeId}".`);
    return;
  }

  logger.info(`Session handoffs for change "${changeId}":\n`);
  for (const h of handoffs) {
    logger.info(`  • ${h.id.padEnd(28)} (${h.fromRole} ➔ ${h.toRole}) - ${h.timestamp}`);
  }
}

export async function executeHandoffShow(
  changeId: string,
  handoffId?: string,
  options: { cwd?: string } = {},
): Promise<void> {
  const repoRoot = path.resolve(options.cwd ?? process.cwd());
  const handoffs = await listHandoffs(repoRoot, changeId);

  if (handoffs.length === 0) {
    logger.warn(`No handoffs found for change "${changeId}".`);
    return;
  }

  const target = handoffId
    ? handoffs.find((h) => h.id === handoffId)
    : handoffs[handoffs.length - 1];

  if (!target) {
    logger.error(`Handoff "${handoffId}" not found for change "${changeId}".`);
    return;
  }

  console.log(formatHandoffMarkdown(target));
}
