import { edgeTooltip, edgeTypeIcon, edgeTypeTone } from '@ideate/api-client';

describe('edge-style', () => {
  it('maps catalog types to icons and families', () => {
    expect(edgeTypeIcon('supports')).toBe('check');
    expect(edgeTypeIcon('contradicts')).toBe('cancel');
    expect(edgeTypeIcon('tested-by')).toBe('play');
    expect(edgeTypeIcon('evaluated-by')).toBe('checklist');
    expect(edgeTypeIcon('mentions')).toBe('chat');
    expect(edgeTypeIcon('constrains')).toBe('lock');
    expect(edgeTypeIcon('mystery')).toBe('share');
    expect(edgeTypeTone('supports')).toBe('support');
    expect(edgeTypeTone('contradicts')).toBe('oppose');
    expect(edgeTypeTone('mentions')).toBe('neutral');
  });

  it('builds a tooltip from the type label and why', () => {
    expect(edgeTooltip('tested-by', 'small trial')).toBe('Tested By · small trial');
    expect(edgeTooltip('supports')).toBe('Supports');
  });
});
