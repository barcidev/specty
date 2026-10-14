import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  endAgentSession,
  getAgentSession,
  getAgentSessionPath,
  isAgentSessionActive,
  startAgentSession,
} from "../../../src/governance/agent-session.js";

describe("governance/agent-session", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "specty-agent-session-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no session file exists", async () => {
    const session = await getAgentSession(tmpDir);
    expect(session).toBeNull();

    const isActive = await isAgentSessionActive(tmpDir);
    expect(isActive).toBe(false);
  });

  it("starts agent session and persists active state", async () => {
    const session = await startAgentSession(tmpDir, {
      changeId: "my-feature",
      activity: "Ajustando plan inicial",
      agent: "Antigravity",
      role: "architect",
    });

    expect(session.active).toBe(true);
    expect(session.changeId).toBe("my-feature");
    expect(session.activity).toBe("Ajustando plan inicial");
    expect(session.agent).toBe("Antigravity");
    expect(session.role).toBe("architect");
    expect(session.startedAt).toBeDefined();

    const stored = await getAgentSession(tmpDir);
    expect(stored).not.toBeNull();
    expect(stored?.active).toBe(true);
    expect(stored?.changeId).toBe("my-feature");

    const isActive = await isAgentSessionActive(tmpDir, "my-feature");
    expect(isActive).toBe(true);

    // Si se consulta para otro changeId diferente, no debe reportar activo para ese otro cambio
    const isOtherActive = await isAgentSessionActive(tmpDir, "other-change");
    expect(isOtherActive).toBe(false);
  });

  it("ends agent session and persists inactive state", async () => {
    await startAgentSession(tmpDir, {
      changeId: "my-feature",
      activity: "Escribiendo especificaciones",
    });

    expect(await isAgentSessionActive(tmpDir)).toBe(true);

    const ended = await endAgentSession(tmpDir, "my-feature");
    expect(ended).toBe(true);

    const session = await getAgentSession(tmpDir);
    expect(session).not.toBeNull();
    expect(session?.active).toBe(false);

    expect(await isAgentSessionActive(tmpDir)).toBe(false);
  });

  it("automatically expires sessions older than max allowed inactivity", async () => {
    const filePath = getAgentSessionPath(tmpDir);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Sesión de hace 45 minutos (máximo permitido: 30 minutos)
    const oldTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          active: true,
          changeId: "abandoned-session",
          activity: "Proceso huérfano",
          startedAt: oldTime,
          updatedAt: oldTime,
        },
        null,
        2,
      ),
      "utf8",
    );

    const session = await getAgentSession(tmpDir);
    expect(session?.active).toBe(false);
    expect(await isAgentSessionActive(tmpDir)).toBe(false);
  });
});
