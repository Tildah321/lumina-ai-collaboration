export interface BrandingSettings {
  brandName?: string;
  brandColor?: string;
}

export const loadBranding = (): BrandingSettings => {
  try {
    return JSON.parse(localStorage.getItem('branding') || '{}');
  } catch {
    return {};
  }
};

export const saveBranding = (settings: BrandingSettings) => {
  localStorage.setItem('branding', JSON.stringify(settings));
};

const hexToHSL = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const applyBranding = (settings?: BrandingSettings) => {
  const branding = settings || loadBranding();
  if (branding.brandColor) {
    const hsl = hexToHSL(branding.brandColor);
    const root = document.documentElement.style;
    root.setProperty('--primary', hsl);
    root.setProperty('--primary-glow', hsl);
  }
};
