const WEAK_TITLE = /^(title|question|report|workspace report|untitled|body|summary|markdown report)$/i;
const LABEL_LINE = /^\s*(?:\*{1,2}|_{1,2}|#{1,6}\s*)?(TITLE|SUMMARY|BODY)\s*:\s*(.*)$/i;

export function isStrongReportTitle(value: string | null | undefined): boolean {
  const t = unwrap(value);
  if (!t) return false;
  if (t.length < 8 && !t.includes('?')) return false;
  return !WEAK_TITLE.test(t);
}

export function resolveReportTitle(opts: {
  versionTitle?: string | null;
  body?: string | null;
  workspaceName?: string | null;
  questionTitle?: string | null;
}): string {
  const labeled = labeledValue(opts.body, 'TITLE');
  for (const candidate of [opts.questionTitle, opts.workspaceName, labeled, opts.versionTitle]) {
    if (isStrongReportTitle(candidate)) {
      return unwrap(candidate);
    }
  }
  return unwrap(opts.questionTitle) || unwrap(opts.workspaceName) || unwrap(opts.versionTitle) || unwrap(labeled) || 'Workspace report';
}

export function reportFileName(title: string | null | undefined): string {
  const base = unwrap(title) || 'Workspace report';
  return base.toLowerCase().endsWith('.md') ? base : `${base}.md`;
}

export function cleanReportBody(body: string | null | undefined, title?: string | null): string {
  let text = (body ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  text = afterBody(text);
  text = stripLabelLines(text);
  text = stripLeadingDuplicateHeading(text, title);
  return text.trim();
}

function labeledValue(text: string | null | undefined, label: string): string {
  if (!text) return '';
  for (const line of text.split('\n')) {
    const m = line.match(LABEL_LINE);
    if (m && m[1].toUpperCase() === label) {
      const value = unwrap(m[2]);
      if (value) return value;
    }
  }
  return '';
}

function afterBody(text: string): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const labeled = asLabelLine(lines[i]);
    if (!labeled || labeled.kind !== 'BODY') continue;
    const rest = lines.slice(i + 1).join('\n').trim();
    return labeled.rest ? (labeled.rest + '\n' + rest).trim() : rest;
  }
  return text;
}

function stripLabelLines(text: string): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const labeled = asLabelLine(line);
    if (labeled) {
      if (labeled.kind === 'BODY' && labeled.rest) {
        out.push(labeled.rest);
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n').trim();
}

function asLabelLine(line: string): { kind: string; rest: string } | null {
  const m = line.match(LABEL_LINE);
  if (m) {
    return { kind: m[1].toUpperCase(), rest: unwrap(m[2]) };
  }
  const flattened = line.replace(/[*_`]/g, ' ').replace(/^[#>\s]+/, '').replace(/\s+/g, ' ').trim();
  const loose = flattened.match(/^(TITLE|SUMMARY|BODY)\s*:\s*(.*)$/i);
  if (!loose) return null;
  return { kind: loose[1].toUpperCase(), rest: unwrap(loose[2]) };
}

function stripLeadingDuplicateHeading(body: string, title?: string | null): string {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) break;
    const heading = unwrap(lines[i].trim().replace(/^#+\s*/, ''));
    if (heading && (sameTitle(heading, title) || WEAK_TITLE.test(heading))) {
      i++;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n').trim();
}

function unwrap(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^\*{1,2}\s*|\s*\*{1,2}$/g, '')
    .replace(/^_{1,2}\s*|\s*_{1,2}$/g, '')
    .replace(/^`+|`+$/g, '')
    .trim();
}

function sameTitle(a: string, b?: string | null): boolean {
  const left = unwrap(a);
  const right = unwrap(b);
  return !!left && !!right && left.toLowerCase() === right.toLowerCase();
}
