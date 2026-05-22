import { PulseHash } from './PulseHash';

/**
 * VibeRegistry v1.0
 * Centralizes stylistic definitions and provides hash-based integrity.
 */

export const VibeDictionary = {
  none: { 
    filter: 'none', 
    label: 'RAW',
    ffmpeg: '' 
  },
  tactical: { 
    filter: 'sepia(0.3) hue-rotate(90deg) brightness(1.1) contrast(1.2)', 
    label: 'TACTICAL',
    ffmpeg: 'colorbalance=rs=0.2:gs=0.3:bs=0.1,hue=s=0.8'
  },
  noir: { 
    filter: 'grayscale(1) contrast(1.5) brightness(0.9)', 
    label: 'NOIR',
    ffmpeg: 'hue=s=0,eq=contrast=1.5:brightness=-0.1'
  },
  vapor: { 
    filter: 'hue-rotate(280deg) saturate(2) brightness(1.2)', 
    label: 'VAPOR',
    ffmpeg: 'hue=h=280:s=2'
  },
  glitch: { 
    filter: 'saturate(5) hue-rotate(180deg) invert(0.1)', 
    label: 'GLITCH',
    ffmpeg: 'noise=alls=20:allf=t+u,hue=s=5'
  }
};

export class VibeEngine {
  /**
   * Generates a unique signature for a specific visual configuration.
   */
  public static getVibeSignature(preset: string, transform: any): string {
    const recipe = {
      preset,
      transform: {
        brightness: transform.brightness,
        contrast: transform.contrast,
        maskRadius: transform.maskRadius
      }
    };
    return PulseHash.signature(recipe);
  }

  /**
   * Returns the computed CSS filter based on the preset and transforms.
   */
  public static computeFilter(preset: string, transform: any): string {
    const base = (VibeDictionary as any)[preset]?.filter || 'none';
    return `${base} brightness(${transform.brightness}%) contrast(${transform.contrast}%)`;
  }
}
