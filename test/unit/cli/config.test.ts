import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeConfigGet,
  executeConfigSet,
  executeConfigWait,
} from "../../../src/cli/commands/config.js";
import { createDefaultConfig, loadConfig, saveConfig } from "../../../src/core/config.js";

describe("cli/commands/config", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "specty-config-test-"));
    const config = createDefaultConfig();
    await saveConfig(tmp, config);
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("gets and sets configuration keys", async () => {
    await executeConfigSet("governance.wait", "false", { cwd: tmp, json: true });
    let cfg = await loadConfig(tmp);
    expect(cfg.governance.wait).toBe(false);

    await executeConfigGet("governance.wait", { cwd: tmp, json: true });
    await executeConfigGet(undefined, { cwd: tmp, json: true });

    await executeConfigSet("language", "en", { cwd: tmp, json: true });
    cfg = await loadConfig(tmp);
    expect(cfg.language).toBe("en");
  });

  it("toggles wait via executeConfigWait", async () => {
    await executeConfigWait({ cwd: tmp, disable: true, json: true });
    let cfg = await loadConfig(tmp);
    expect(cfg.governance.wait).toBe(false);

    await executeConfigWait({ cwd: tmp, enable: true, json: true });
    cfg = await loadConfig(tmp);
    expect(cfg.governance.wait).toBe(true);
  });
});
