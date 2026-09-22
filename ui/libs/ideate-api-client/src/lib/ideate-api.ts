import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IDEATE_API_CONFIG } from './provide-ideate-api-client';
import { ApiConfig } from './api-config';
import {
  DocumentFolder,
  DocumentItem,
  GraphProblem,
  GraphSnapshot,
  IdeaObject,
  JobRecord,
  TimelineEvent,
  TranscriptMessage,
  TurnResult,
  UsageRollup,
  Workspace,
  WorkspaceBranch,
  WorkspaceSummary,
} from './models';

@Injectable({ providedIn: 'root' })
export class IdeateApi {
  constructor(
    private readonly http: HttpClient,
    @Inject(IDEATE_API_CONFIG) private readonly config: ApiConfig,
  ) {}

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }

  me() {
    return this.http.get<{ accountId: string; email: string; displayName: string }>(this.url('/me'));
  }

  credits() {
    return this.http.get<{ accountId: string; plan: string; balance: number }>(this.url('/me/credits'));
  }

  listWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.url('/workspaces'));
  }

  dashboard(): Observable<WorkspaceSummary[]> {
    return this.http.get<WorkspaceSummary[]>(this.url('/me/workspaces'));
  }

  createWorkspace(name: string, persona: string): Observable<Workspace> {
    return this.http.post<Workspace>(this.url('/workspaces'), { name, persona });
  }

  deleteWorkspace(id: string) {
    return this.http.delete(this.url(`/workspaces/${id}`));
  }

  getWorkspace(id: string) {
    return this.http.get<{ workspace: Workspace; branches: WorkspaceBranch[] }>(
      this.url(`/workspaces/${id}`),
    );
  }

  createBranch(workspaceId: string, name: string, parentBranchId?: string) {
    return this.http.post<WorkspaceBranch>(this.url(`/workspaces/${workspaceId}/branches`), { name, parentBranchId });
  }

  deleteBranch(workspaceId: string, branchId: string) {
    return this.http.delete(this.url(`/workspaces/${workspaceId}/branches/${branchId}`));
  }

  graph(workspaceId: string, branchId?: string): Observable<GraphSnapshot> {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return this.http.get<GraphSnapshot>(this.url(`/workspaces/${workspaceId}/graph${q}`));
  }

  createObject(workspaceId: string, body: Partial<IdeaObject> & { type: string; title: string }) {
    return this.http.post<IdeaObject>(this.url(`/workspaces/${workspaceId}/objects`), body);
  }

  getObject(workspaceId: string, objectId: string) {
    return this.http.get<IdeaObject>(this.url(`/workspaces/${workspaceId}/objects/${objectId}`));
  }

  updateObject(workspaceId: string, objectId: string, body: Record<string, unknown>) {
    return this.http.patch<IdeaObject>(this.url(`/workspaces/${workspaceId}/objects/${objectId}`), body);
  }

  deleteObject(workspaceId: string, objectId: string) {
    return this.http.delete(this.url(`/workspaces/${workspaceId}/objects/${objectId}`));
  }

  newNode(workspaceId: string, objectId: string, body: { type: string; title: string }) {
    return this.http.post<IdeaObject>(this.url(`/workspaces/${workspaceId}/objects/${objectId}/nodes`), body);
  }

  newBranch(workspaceId: string, objectId: string, name: string) {
    return this.http.post<{ branchId: string }>(
      this.url(`/workspaces/${workspaceId}/objects/${objectId}/branches`),
      { name },
    );
  }

  createEdge(workspaceId: string, body: { type: string; fromObjectId: string; toObjectId: string; why?: string }) {
    return this.http.post(this.url(`/workspaces/${workspaceId}/edges`), body);
  }

  transcript(workspaceId: string, branchId?: string): Observable<TranscriptMessage[]> {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return this.http.get<TranscriptMessage[]>(this.url(`/workspaces/${workspaceId}/transcript${q}`));
  }

  turn(workspaceId: string, body: { content: string; mode?: string; focusObjectIds?: string[] }): Observable<TurnResult> {
    return this.http.post<TurnResult>(this.url(`/workspaces/${workspaceId}/turns`), body);
  }

  jobs(workspaceId: string): Observable<JobRecord[]> {
    return this.http.get<JobRecord[]>(this.url(`/workspaces/${workspaceId}/jobs`));
  }

  enqueueJob(workspaceId: string, body: { jobClass?: string; mode?: string }) {
    return this.http.post<JobRecord>(this.url(`/workspaces/${workspaceId}/jobs`), body);
  }

  usage(workspaceId: string) {
    return this.http.get<UsageRollup>(this.url(`/workspaces/${workspaceId}/usage`));
  }

  documents(workspaceId: string) {
    return this.http.get<{ folders: DocumentFolder[]; items: DocumentItem[] }>(
      this.url(`/workspaces/${workspaceId}/documents`),
    );
  }

  createFolder(workspaceId: string, name: string, parentId?: string) {
    return this.http.post<DocumentFolder>(this.url(`/workspaces/${workspaceId}/document-folders`), { name, parentId });
  }

  createDocument(workspaceId: string, body: { folderId?: string; name: string; url: string; note?: string }) {
    return this.http.post<DocumentItem>(this.url(`/workspaces/${workspaceId}/documents`), body);
  }

  deleteFolder(workspaceId: string, folderId: string) {
    return this.http.delete(this.url(`/workspaces/${workspaceId}/document-folders/${folderId}`));
  }

  deleteDocument(workspaceId: string, itemId: string) {
    return this.http.delete(this.url(`/workspaces/${workspaceId}/documents/${itemId}`));
  }

  attachDocument(workspaceId: string, itemId: string, objectId?: string) {
    return this.http.post<{ objectId: string }>(
      this.url(`/workspaces/${workspaceId}/documents/${itemId}/attach`),
      { objectId },
    );
  }

  search(workspaceId: string, q: string) {
    return this.http.get<{ objects: IdeaObject[]; documents: DocumentItem[] }>(
      this.url(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`),
    );
  }

  timeline(workspaceId: string) {
    return this.http.get<TimelineEvent[]>(this.url(`/workspaces/${workspaceId}/timeline`));
  }

  problems(workspaceId: string) {
    return this.http.get<GraphProblem[]>(this.url(`/workspaces/${workspaceId}/problems`));
  }
}
