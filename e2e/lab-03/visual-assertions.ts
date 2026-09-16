import { expect, type Page } from '@playwright/test';

type Rgb = { red: number; green: number; blue: number };

function parseRgb(value: string): Rgb | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return { red: Number(match[1]), green: Number(match[2]), blue: Number(match[3]) };
}

function relativeLuminance({ red, green, blue }: Rgb): number {
  return [red, green, blue]
    .map(channel => channel / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Verify rendered status/priority indicators use text and readable colors. */
export async function expectReadableTextIndicators(page: Page): Promise<void> {
  const indicators = await page.locator('.badge, .user-status-badge').evaluateAll(elements => elements
    .filter(element => {
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
    })
    .map(element => {
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent?.trim() ?? '',
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    }));

  expect(indicators.length).toBeGreaterThan(0);
  for (const indicator of indicators) {
    expect(indicator.text).not.toBe('');
    const foreground = parseRgb(indicator.color);
    const background = parseRgb(indicator.backgroundColor);
    expect(foreground, `Unable to read foreground color for ${indicator.text}`).not.toBeNull();
    expect(background, `Unable to read background color for ${indicator.text}`).not.toBeNull();
    expect(
      contrastRatio(foreground!, background!),
      `${indicator.text} contrast ratio`,
    ).toBeGreaterThanOrEqual(4.5);
  }
}
