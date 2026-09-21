import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WorkspaceShellComponent } from './workspace/workspace-shell.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'workspaces/:id', component: WorkspaceShellComponent },
  { path: 'workspaces/:id/objects/:objectId', component: WorkspaceShellComponent },
  { path: '**', redirectTo: '' },
];
