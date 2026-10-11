import { useEffect, useMemo } from 'react';
import type { Texture, Vector3 } from 'three';
import type { GradeBandId } from '../domain/grading';
import { createSlabMaterials, getSlabGeometries, SLAB_LABEL_Y } from './slabShape';

export interface SlabProps {
  /** The painted paper label (see useSlabLabel). */
  readonly label: Texture;
  readonly band: GradeBandId;
  /** The scene's light position, mutated by the scene each frame. */
  readonly light: Vector3;
}

/** The case around a graded card. Put it inside the card's pivot (as a child of HoloCard) so it moves with the card. */
export function Slab({ label, band, light }: SlabProps) {
  const geometries = getSlabGeometries();
  const materials = useMemo(() => createSlabMaterials(label, band, light), [label, band, light]);
  useEffect(() => () => materials.dispose(), [materials]);

  return (
    <>
      <mesh geometry={geometries.insert} material={materials.insert} />
      <mesh geometry={geometries.label} material={materials.label} position={[0, SLAB_LABEL_Y, 0.004]} />
      <mesh geometry={geometries.shell} material={materials.plastic} renderOrder={2} />
    </>
  );
}
