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
  details?: Record<string, unknown> | null;
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
  sourceWorkspaceId?: string | null;
  sourceObjectId?: string | null;
}

export interface ObjectVersion {
  id: string;
  objectId: string;
  version: number;
  title: string;
  summary: string;
  body: string;
  type: string;
  objectCategory: string;
  details?: Record<string, unknown> | null;
  generatedBy?: string | null;
  sourceUserMessageId?: string | null;
  sourceAssistantMessageId?: string | null;
  createdAt: string;
}

export interface SimilarObject {
  id: string;
  workspaceId: string;
  workspaceName: string;
  displayId: string;
  type: string;
  title: string;
  summary: string;
  objectCategory: string;
  tags: string[];
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

export interface Attachment {
  id: string;
  workspaceId: string;
  objectId?: string | null;
  messageId?: string | null;
  originalName: string;
  contentType: string;
  byteSize: number;
  extractStatus: string;
  createdAt: string;
  folder?: string | null;
}

export const ATTACHMENT_ACCEPT =
  '.png,.jpg,.jpeg,.gif,.webp,.pdf,.docx,.txt,.csv,.md,.xlsx,.pptx,image/png,image/jpeg,image/gif,image/webp,application/pdf';

export const ATTACHMENT_MAX_FILES = 8;
export const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

export interface TurnResult {
  assistantMessageId?: string;
  assistantText: string;
  jobClass: string;
  jobId: string;
  objectIds: string[];
  error?: string;
  userMessageId?: string;
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
  inputTokens?: number;
  outputTokens?: number;
  calls?: number;
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

export type WorkspaceReportStatus = 'preparing' | 'ready' | 'updating' | 'failed';

export interface WorkspaceReport {
  id: string;
  workspaceId: string;
  branchId: string;
  status: WorkspaceReportStatus;
  currentVersion: number;
  title: string;
  error?: string | null;
  lastJobId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceReportVersion {
  id: string;
  reportId: string;
  version: number;
  title: string;
  summary: string;
  body: string;
  generatedBy?: string | null;
  jobId?: string | null;
  createdAt: string;
}

export interface WorkspaceReportBundle {
  report: WorkspaceReport | null;
  versions: WorkspaceReportVersion[];
}

export type ReportExportFormat = 'md' | 'pdf' | 'docx';

export const OBJECT_TYPES = [
  'thought', 'concept', 'unknown', 'question', 'hypothesis', 'assumption',
  'evidence', 'experiment', 'observation', 'claim', 'critique', 'decision',
  'evaluation', 'theory', 'misconception', 'constraint', 'calculation',
  'target', 'design_artifact', 'architecture', 'component', 'citation',
] as const;

/** Lookup labels: question → Question, design_artifact → Design Artifact. */
export function lookupLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

const TYPE_PLURALS: Record<string, string> = {
  hypothesis: 'Hypotheses',
  theory: 'Theories',
  evidence: 'Evidence',
  citation: 'Citations',
};

/** Group headings: question → Questions, hypothesis → Hypotheses. */
export function lookupPluralLabel(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.trim().toLowerCase();
  if (TYPE_PLURALS[key]) {
    return TYPE_PLURALS[key];
  }
  const singular = lookupLabel(value);
  if (/[sxz]$/i.test(singular) || /[cs]h$/i.test(singular)) {
    return singular + 'es';
  }
  if (/[^aeiou]y$/i.test(singular)) {
    return singular.slice(0, -1) + 'ies';
  }
  return singular + 's';
}

const TYPE_ICONS: Record<string, string> = {
  thought: 'type_thought',
  concept: 'type_concept',
  unknown: 'type_unknown',
  question: 'type_question',
  hypothesis: 'type_hypothesis',
  assumption: 'type_assumption',
  evidence: 'type_evidence',
  experiment: 'type_experiment',
  observation: 'type_observation',
  claim: 'type_claim',
  critique: 'type_critique',
  decision: 'type_decision',
  evaluation: 'type_evaluation',
  theory: 'type_theory',
  misconception: 'type_misconception',
  constraint: 'type_constraint',
  calculation: 'type_calculation',
  target: 'type_target',
  design_artifact: 'type_design_artifact',
  architecture: 'type_architecture',
  component: 'type_component',
  citation: 'type_citation',
};

const PERSONA_ICONS: Record<string, string> = {
  student: 'school',
  researcher: 'type_hypothesis',
  inventor: 'type_concept',
  analyst: 'chart',
  explorer: 'explore',
};

export function objectTypeIcon(type: string | null | undefined): string {
  return TYPE_ICONS[type ?? ''] ?? 'type_unknown';
}

const EDGE_ICONS: Record<string, string> = {
  mentions: 'chat',
  'parent-of': 'sitemap',
  supports: 'check',
  contradicts: 'cancel',
  assumes: 'help',
  'tested-by': 'play',
  'evaluated-by': 'checklist',
  'promoted-to': 'north_east',
  produces: 'bolt',
  affects: 'sliders',
  solves: 'check_circle',
  introduces: 'add',
  'led-to': 'arrow_forward',
  'version-of': 'history',
  'abandoned-because': 'delete',
  'resurrected-as': 'refresh',
  constrains: 'lock',
  'calculated-from': 'percent',
  'represented-by': 'article',
  'reused-in': 'share',
  'derived-from': 'arrow_down_left',
  'split-from': 'expand_more',
  'merged-from': 'done_all',
  'merged-into': 'done_all',
  'overlay-on': 'dashboard',
  'branched-from': 'sitemap',
};

const EDGE_SUPPORT = new Set([
  'supports', 'produces', 'solves', 'promoted-to', 'resurrected-as', 'led-to', 'tested-by',
]);
const EDGE_OPPOSE = new Set(['contradicts', 'abandoned-because']);

export type EdgeTone = 'support' | 'oppose' | 'neutral';

export function edgeTypeIcon(type: string | null | undefined): string {
  return EDGE_ICONS[type ?? ''] ?? 'share';
}

export function edgeTypeTone(type: string | null | undefined): EdgeTone {
  const key = type ?? '';
  if (EDGE_SUPPORT.has(key)) {
    return 'support';
  }
  if (EDGE_OPPOSE.has(key)) {
    return 'oppose';
  }
  return 'neutral';
}

export function edgeTooltip(type: string | null | undefined, why?: string | null): string {
  const label = lookupLabel(type);
  const extra = why?.trim();
  return extra ? `${label} · ${extra}` : label;
}

export function personaIcon(persona: string | null | undefined): string {
  return PERSONA_ICONS[persona ?? ''] ?? 'person';
}

export const PERSONAS: Persona[] = ['student', 'researcher', 'inventor', 'analyst', 'explorer'];

export const MODES = ['explore', 'learn', 'challenge', 'research', 'create', 'review', 'explain', 'debate', 'practice'] as const;
