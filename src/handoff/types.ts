export interface HandoffRecord {
  id: string;
  changeId: string;
  fromRole: string;
  toRole: string;
  timestamp: string;
  tasksCompleted: string[];
  filesModified: string[];
  decisions: string[];
  blockers?: string[];
  nextSteps: string[];
  notes?: string;
}

export interface CreateHandoffOptions {
  fromRole: string;
  toRole: string;
  tasksCompleted?: string[];
  filesModified?: string[];
  decisions?: string[];
  blockers?: string[];
  nextSteps?: string[];
  notes?: string;
}
