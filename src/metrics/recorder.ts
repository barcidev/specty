import fs from "node:fs/promises";
import path from "node:path";
import type { RecordableMetricEvent, SpectyEvent } from "./types.js";

export async function recordMetricEvent(
  repoRoot: string,
  eventData: RecordableMetricEvent,
): Promise<void> {
  try {
    const metricsDir = path.join(repoRoot, ".specty", "metrics");
    await fs.mkdir(metricsDir, { recursive: true });

    const fullEvent: SpectyEvent = {
      ...eventData,
      timestamp: eventData.timestamp ?? new Date().toISOString(),
    } as SpectyEvent;

    const line = `${JSON.stringify(fullEvent)}\n`;
    const targetFile = path.join(metricsDir, "events.jsonl");

    await fs.appendFile(targetFile, line, "utf8");
  } catch {
    // Non-blocking: Metrics recording failure should never crash developer workflows
  }
}
