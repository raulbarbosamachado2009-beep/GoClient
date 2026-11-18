import { describe, expect, it } from 'vitest';
import { automotive, mobile, toCssVariables, typography } from './index';

describe('design tokens', () => {
  it('gera variáveis CSS a partir dos tokens', () => {
    const css = toCssVariables();
    expect(css).toContain('--gc-color-accent: #0A84FF;');
    expect(css).toContain('--gc-color-text-secondary: #A1A1A6;');
    expect(css).toContain('--gc-space-4: 16px;');
  });

  it('Automotive usa alvos de toque e texto maiores que o Mobile', () => {
    expect(automotive.minTouchTarget).toBeGreaterThan(mobile.minTouchTarget);
    expect(automotive.typography.body.fontSize).toBeGreaterThan(typography.body.fontSize);
  });
});
