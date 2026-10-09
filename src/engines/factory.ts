import { BuiltinSpecEngine } from "./builtin.js";
import { OpenSpecEngine } from "./openspec.js";
import type { SpecEngine } from "./types.js";

const builtinInstance = new BuiltinSpecEngine();
const openspecInstance = new OpenSpecEngine();

export function getSpecEngine(engineType: "openspec" | "builtin" = "openspec"): SpecEngine {
  if (engineType === "builtin") {
    return builtinInstance;
  }
  return openspecInstance;
}
