import { IdeaObject } from '@ideate/api-client';

export function cardTextLength(object: IdeaObject): number {
  return [object.title, object.summary, object.body]
    .filter((p) => !!p && p.trim())
    .join(' ').length;
}

export function cardBox(object: IdeaObject, expanded = false): { width: number; height: number } {
  const title = object.title?.trim() ?? '';
  const summary = object.summary?.trim() ?? '';
  const body = object.body?.trim() ?? '';
  const preview = summary || body.slice(0, 160);
  const shown = expanded ? [title, summary, body].filter(Boolean).join('\n') : [title, preview].filter(Boolean).join('\n');
  const chars = Math.max(shown.length, 24);
  const width = chars > 520 ? 360 : chars > 280 ? 308 : chars > 140 ? 268 : 236;
  const charsPerLine = Math.max(28, Math.floor(width / 7.4));
  const lines = Math.ceil(chars / charsPerLine);
  const extra = expanded && body ? 28 : 0;
  const height = Math.min(expanded ? 580 : 340, Math.max(132, 86 + lines * 17 + extra));
  return { width, height };
}
