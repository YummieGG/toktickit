import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from '../../src/components/ui/Alert';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';

const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}

function relativeLuminance(hex: string): number {
  return hexToRgb(hex)
    .map(channel => channel / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Lab 3 Zen Green visual and accessibility contract (UI-08)', () => {
  it('keeps required design tokens and text combinations readable', () => {
    for (const token of [
      '--primary-green: #006B3C',
      '--secondary-green: #0B7A46',
      '--page-background: #F5F7F6',
      '--surface: #FFFFFF',
      '--text-primary: #1A2E1A',
      '--text-secondary: #4A5D4A',
      '--error: #C62828',
      '--warning: #8A2E00',
      '--success: #2E7D32',
    ]) {
      expect(stylesheet).toContain(token);
    }

    expect(contrastRatio('#FFFFFF', '#006B3C')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', '#0B7A46')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#1A2E1A', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#4A5D4A', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#C62828', '#FFEBEE')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#8A2E00', '#FFF3E0')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#2E7D32', '#E8F5E9')).toBeGreaterThanOrEqual(4.5);

    for (const [foreground, background] of [
      ['#0D47A1', '#E3F2FD'],
      ['#7A4B00', '#FFF9C4'],
      ['#8A2E00', '#FFE0B2'],
      ['#B71C1C', '#FFCDD2'],
      ['#1B5E20', '#E8F5E9'],
      ['#2E7D32', '#E8F5E9'],
      ['#37474F', '#ECEFF1'],
      ['#4527A0', '#EDE7F6'],
      ['#C62828', '#FFEBEE'],
    ] as const) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('defines visible focus, responsive representations, and mobile touch targets', () => {
    expect(stylesheet).toMatch(/\*:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--secondary-green\)/s);
    expect(stylesheet).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*\.btn,[\s\S]*min-height:\s*44px/s);
    expect(stylesheet).toMatch(/\.staff-queue-cards\s*\{\s*display:\s*none\s*!important;/);
    expect(stylesheet).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*\.staff-queue-cards\s*\{\s*display:\s*grid\s*!important;/s);
    expect(stylesheet).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*\.user-management-cards\s*\{\s*display:\s*grid;/s);
    expect(stylesheet).toMatch(/\.user-management \.form-check-input\s*\{[\s\S]*min-height:\s*44px;[\s\S]*min-width:\s*44px;/s);
  });

  it('uses text and semantic roles in shared status, feedback, and action components', () => {
    render(
      <>
        <Button>Save changes</Button>
        <Alert variant="warning">Read-only view</Alert>
        <Badge type="priority" value="MEDIUM" />
        <Badge type="priority" value="HIGH" />
        <Badge type="status" value="CANCELLED" />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveClass('btn-zen-primary');
    expect(screen.getByText('Read-only view')).toHaveClass('alert-warning');
    expect(screen.getByText('MEDIUM')).toHaveStyle({ color: '#7A4B00' });
    expect(screen.getByText('HIGH')).toHaveStyle({ color: '#8A2E00' });
    expect(screen.getByText('CANCELLED')).toBeVisible();
  });
});
