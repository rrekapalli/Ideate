import { cleanReportBody, resolveReportTitle } from './report-display';

describe('report display', () => {
  const messy = `**TITLE:** How a Compass Finds North

TITLE: How a Compass Finds North

SUMMARY: Repeated lede.

BODY:
### Question
How does a compass find north?

## Established Facts
A compass needle aligns with the field.
`;

  it('uses the workspace question instead of a generic Title heading', () => {
    expect(
      resolveReportTitle({
        versionTitle: 'Question',
        body: messy,
        workspaceName: 'How does a compass find north',
        questionTitle: 'How does a compass find north?',
      }),
    ).toBe('How does a compass find north?');
  });

  it('strips repeated TITLE SUMMARY BODY labels from the markdown body', () => {
    const body = cleanReportBody(messy, 'How does a compass find north?');
    expect(body).toContain('Established Facts');
    expect(body).not.toContain('TITLE:');
    expect(body).not.toContain('SUMMARY:');
    expect(body).not.toContain('BODY:');
    expect(body.startsWith('#')).toBe(false);
  });
});
