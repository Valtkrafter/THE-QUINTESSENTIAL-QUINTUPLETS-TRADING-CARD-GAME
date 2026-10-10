import common from './common.glsl?raw';
import compositeFrag from './composite.frag.glsl?raw';
import flashFrag from './flash.frag.glsl?raw';
import fullscreenVert from './fullscreen.vert.glsl?raw';
import glowFrag from './glow.frag.glsl?raw';
import planeVert from './plane.vert.glsl?raw';
import pointsFrag from './points.frag.glsl?raw';
import pointsVert from './points.vert.glsl?raw';
import raysFrag from './rays.frag.glsl?raw';
import ringFrag from './ring.frag.glsl?raw';
import skyFrag from './sky.frag.glsl?raw';
import trailFrag from './trail.frag.glsl?raw';

const withCommon = (source: string): string => `${common}\n${source}`;

export const fullscreenVertex: string = fullscreenVert;
export const planeVertex: string = planeVert;
export const pointsVertex: string = pointsVert;

export const skyFragment = withCommon(skyFrag);
export const trailFragment = withCommon(trailFrag);
export const glowFragment = withCommon(glowFrag);
export const ringFragment = withCommon(ringFrag);
export const raysFragment = withCommon(raysFrag);
export const pointsFragment: string = pointsFrag;
export const flashFragment: string = flashFrag;
export const compositeFragment: string = compositeFrag;
