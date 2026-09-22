export type Persona = 'student' | 'researcher' | 'inventor' | 'analyst' | 'explorer';

export interface Workspace {
  id: string;
  accountId: string;
  name: string;
  persona: Persona;
  mainstreamBranchId: string;
  createdAt: string;
}

export interface WorkspaceBranch {
  id: string;
  workspaceId: string;
  name: string;
  branchRole: 'mainstream' | 'overlay';
  parentBranchId?: string;
}

export interface WorkspaceSummary extends Workspace {
  objectCount: number;
  branchCount: number;
  documentCount: number;
  problemCount: number;
  usageMinor: number;
  lastActivity?: string | null;
}

export interface IdeaObject {
  id: string;
  workspaceId: string;
  branchId: string;
  displayId: string;
  type: string;
  origin: string;
  derivedVia?: string;
  objectCategory: string;
  title: string;
  summary: string;
  body: string;
  version: number;
  generatedBy?: string;
  sourceUserMessageId?: string;
  sourceAssistantMessageId?: string;
  canvasX?: number;
  canvasY?: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  derivedFrom: string[];
}

export interface IdeaEdge {
  id: string;
  workspaceId: string;
  branchId: string;
  displayId: string;
  type: string;
  fromObjectId: string;
  toObjectId: string;
  why?: string;
  createdAt: string;
}

export interface GraphSnapshot {
  nodes: IdeaObject[];
  edges: IdeaEdge[];
}

export interface TranscriptMessage {
  id: string;
  workspaceId: string;
  branchId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: string;
  createdAt: string;
}

export interface TurnResult {
  assistantMessageId?: string;
  assistantText: string;
  jobClass: string;
  jobId: string;
  objectIds: string[];
  error?: string;
}

export interface JobRecord {
  id: string;
  workspaceId: string;
  jobClass: string;
  status: string;
  mode?: string;
  agent?: string;
  focusObjectIds?: string[];
  resultObjectIds: string[];
  error?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface UsageEvent {
  id: string;
  jobId?: string;
  provider: string;
  model: string;
  jobClass: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMinor: number;
  createdAt: string;
}

export interface UsageRollup {
  workspaceId?: string;
  estimatedCostMinorInr: number;
  recent?: UsageEvent[];
}

export interface DocumentFolder {
  id: string;
  parentId?: string;
  name: string;
}

export interface DocumentItem {
  id: string;
  folderId?: string;
  name: string;
  url: string;
  note?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  objectId?: string;
  eventType: string;
  payload: string;
  createdAt: string;
}

export interface GraphProblem {
  id: string;
  kind: string;
  message: string;
  objectIds: string[];
  createdAt: string;
}

export const OBJECT_TYPES = [
  'thought', 'concept', 'unknown', 'question', 'hypothesis', 'assumption',
  'evidence', 'experiment', 'observation', 'claim', 'critique', 'decision',
  'evaluation', 'theory', 'misconception', 'constraint', 'calculation',
  'target', 'design_artifact', 'architecture', 'component',
] as const;

export const PERSONAS: Persona[] = ['student', 'researcher', 'inventor', 'analyst', 'explorer'];

export const MODES = ['explore', 'learn', 'challenge', 'research', 'create', 'review', 'explain', 'debate', 'practice'] as const;
