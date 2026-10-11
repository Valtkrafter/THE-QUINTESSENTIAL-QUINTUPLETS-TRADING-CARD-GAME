import commonChunk from './common.glsl?raw';
import vertexShader from './card.vert.glsl?raw';
import frontChunk from './cardFront.frag.glsl?raw';
import backChunk from './cardBack.frag.glsl?raw';
import slabFragment from './slab.frag.glsl?raw';
import slabVertex from './slab.vert.glsl?raw';

export const cardVertexShader: string = vertexShader;
export const cardFrontFragmentShader = `${commonChunk}\n${frontChunk}`;
export const cardBackFragmentShader = `${commonChunk}\n${backChunk}`;
export const slabVertexShader: string = slabVertex;
export const slabFragmentShader: string = slabFragment;
