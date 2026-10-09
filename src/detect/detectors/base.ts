import type { StackDetection } from "../types.js";

export interface StackDetector {
  id: string;
  name: string;
  detect(directoryPath: string): Promise<StackDetection | null>;
}
