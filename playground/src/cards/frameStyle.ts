/** Card frame designs for composed cards. The ids live here so settings can store them without importing the renderer. */
export const FRAME_STYLE_IDS = ['classic', 'paper', 'fade', 'glass'] as const;
export type FrameStyle = (typeof FRAME_STYLE_IDS)[number];

export function isFrameStyle(value: string): value is FrameStyle {
  return (FRAME_STYLE_IDS as readonly string[]).includes(value);
}
