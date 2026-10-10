import type { MaskSetting } from './finishes';

export type ViewMode = 'gallery' | 'inspect';

/** Card frame design for composed cards; three directions to compare before one is locked in. */
export type FrameStyle = 'classic' | 'paper' | 'fade' | 'glass';

/** `cover` fills the card and crops the overflow; `contain` shows the whole image with a backdrop around it. */
export type ArtFit = 'cover' | 'contain';

export interface HoloSettings {
  /** Foil strength. 1 is the tuned default; above 1 overdrives the effect. */
  readonly intensity: number;
  /** Strength of the pointer-following glare. */
  readonly glare: number;
  /** Multiplier on the maximum hover tilt angle. */
  readonly tilt: number;
  readonly maskSetting: MaskSetting;
  readonly artFit: ArtFit;
  readonly frameStyle: FrameStyle;
  /** Which part of the image survives a cover crop: 0 = top edge, 1 = bottom edge. */
  readonly artFocus: number;
  readonly lightFollowsPointer: boolean;
  readonly idleMotion: boolean;
}

export const DEFAULT_SETTINGS: HoloSettings = {
  intensity: 1,
  glare: 0.6,
  tilt: 1,
  maskSetting: 'auto',
  artFit: 'cover',
  frameStyle: 'classic',
  artFocus: 0,
  lightFollowsPointer: false,
  idleMotion: true,
};
