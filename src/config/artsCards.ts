/**
 * TQQ Vault - Arts-Card Master Catalog & Templates
 * v2.5.0 Arts-Card Combat Engine (Dragon Ball Legends / Modern TCG Style)
 *
 * Defines thematic Arts Cards for Ichika, Nino, Miku, Yotsuba, and Itsuki
 * across Strike, Blast, Support, and Ultimate types.
 */

import { ArtsCard, ArtsCardType } from '../types/battle';

export interface ArtsCardTemplate {
  type: ArtsCardType;
  title: string;
  cost: number;
  basePoints: number;
  healResolve?: number;
  activatesShield?: boolean;
  effectDescription: string;
  defaultThumbnail: string;
}

export const SISTER_ARTS_TEMPLATES: Record<
  'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki',
  ArtsCardTemplate[]
> = {
  ichika: [
    {
      type: 'strike',
      title: 'Script Slap',
      cost: 20,
      basePoints: 16,
      effectDescription: 'Quick physical page strike. Generates fast test points.',
      defaultThumbnail: '/cards/TQQ/Ichika/Ichika Tier ONE.jpg',
    },
    {
      type: 'blast',
      title: 'Spotlight Beam',
      cost: 30,
      basePoints: 26,
      effectDescription: 'Prismatic studio spotlight cutting through tricky equations.',
      defaultThumbnail: '/cards/TQQ/Ichika/Ichika Tier Three.jpg',
    },
    {
      type: 'support',
      title: 'Eldest Sister Care',
      cost: 40,
      basePoints: 10,
      healResolve: 120,
      effectDescription: 'Comforting guidance. Restores +120 team mental stamina.',
      defaultThumbnail: '/cards/TQQ/Ichika/Ichika Tier four.jpg',
    },
    {
      type: 'ultimate',
      title: 'Grand Actress Illusion',
      cost: 70,
      basePoints: 60,
      effectDescription: 'High-stakes masterclass bluff solving the hardest problem.',
      defaultThumbnail: '/cards/TQQ/Ichika/Ichika Tier seven.jpg',
    },
  ],

  nino: [
    {
      type: 'strike',
      title: 'Poison Jab',
      cost: 20,
      basePoints: 18,
      effectDescription: 'Sharp comeback piercing directly through examiner intimidation.',
      defaultThumbnail: '/cards/TQQ/Nino/Nino 1.jpg',
    },
    {
      type: 'blast',
      title: 'Aromatic Brew',
      cost: 30,
      basePoints: 28,
      effectDescription: 'Fragrant Earl Grey steam vaporizing doubt and confusion.',
      defaultThumbnail: '/cards/TQQ/Nino/nino 3.jpg',
    },
    {
      type: 'support',
      title: 'Homemade Cookies',
      cost: 40,
      basePoints: 12,
      healResolve: 140,
      effectDescription: 'Freshly baked pastries restoring +140 team mental stamina.',
      defaultThumbnail: '/cards/TQQ/Nino/nino 4.jpg',
    },
    {
      type: 'ultimate',
      title: 'Love Train Rush',
      cost: 70,
      basePoints: 65,
      effectDescription: 'Unstoppable passionate assault overwhelming the exam sheet.',
      defaultThumbnail: '/cards/TQQ/Nino/nino 7.jpg',
    },
  ],

  miku: [
    {
      type: 'strike',
      title: 'Spear Thrust',
      cost: 20,
      basePoints: 17,
      effectDescription: 'Sengoku infantry spear strike delivering direct academic answers.',
      defaultThumbnail: '/cards/TQQ/Miku/miku 1.jpg',
    },
    {
      type: 'blast',
      title: 'Matchlock Volley',
      cost: 30,
      basePoints: 30,
      effectDescription: 'Nagashino triple-volley firing calculated deductive shots.',
      defaultThumbnail: '/cards/TQQ/Miku/miku 3.jpg',
    },
    {
      type: 'support',
      title: 'Quiet Headphones',
      cost: 40,
      basePoints: 10,
      healResolve: 130,
      effectDescription: 'Wireless audio sanctuary restoring +130 team resolve.',
      defaultThumbnail: '/cards/TQQ/Miku/miku 4.jpg',
    },
    {
      type: 'ultimate',
      title: "Nobunaga's Ambition",
      cost: 70,
      basePoints: 70,
      effectDescription: 'Complete battlefield unification commanding a 100-point triumph.',
      defaultThumbnail: '/cards/TQQ/Miku/miku 7.jpg',
    },
  ],

  yotsuba: [
    {
      type: 'strike',
      title: 'Ribbon Dash',
      cost: 20,
      basePoints: 15,
      effectDescription: 'Light-speed sprint solving quick multiple-choice questions.',
      defaultThumbnail: '/cards/TQQ/Yotsuba/yotsu 1.jpg',
    },
    {
      type: 'blast',
      title: 'Athletic Gale',
      cost: 30,
      basePoints: 25,
      effectDescription: 'Gale-force athletic energy blowing away examiner traps.',
      defaultThumbnail: '/cards/TQQ/Yotsuba/yotsu 3.jpg',
    },
    {
      type: 'support',
      title: 'Cheerleader Spirit',
      cost: 40,
      basePoints: 14,
      healResolve: 160,
      activatesShield: true,
      effectDescription: 'High-voltage cheer restoring +160 stamina & deploying an academic shield.',
      defaultThumbnail: '/cards/TQQ/Yotsuba/yotsu 4.jpg',
    },
    {
      type: 'ultimate',
      title: 'Full Sprint Miracle',
      cost: 70,
      basePoints: 55,
      healResolve: 100,
      effectDescription: '100% full effort breakthrough crossing the passing threshold.',
      defaultThumbnail: '/cards/TQQ/Yotsuba/yotsu 7.jpg',
    },
  ],

  itsuki: [
    {
      type: 'strike',
      title: 'Ahoge Karate Chop',
      cost: 20,
      basePoints: 16,
      effectDescription: 'Disciplinary precision strike correcting careless errors.',
      defaultThumbnail: '/cards/TQQ/Itsuki/istu 1.jpg',
    },
    {
      type: 'blast',
      title: 'Meat Bun Meteor',
      cost: 30,
      basePoints: 32,
      effectDescription: 'Starchy barrage of steamed brain-food energy.',
      defaultThumbnail: '/cards/TQQ/Itsuki/itsu 3.jpg',
    },
    {
      type: 'support',
      title: 'Curry Night Study',
      cost: 40,
      basePoints: 12,
      healResolve: 150,
      effectDescription: 'Heated beef curry restoring +150 mental stamina.',
      defaultThumbnail: '/cards/TQQ/Itsuki/itsu 4.jpg',
    },
    {
      type: 'ultimate',
      title: 'Borgar Supernova',
      cost: 70,
      basePoints: 75,
      effectDescription: 'Devours the entire curriculum in one colossal academic bite.',
      defaultThumbnail: '/cards/TQQ/Itsuki/itsu 7.jpg',
    },
  ],
};

let artsCardIdCounter = 0;

/**
 * Creates an ArtsCard instance for a specific sister and type.
 */
export function generateArtsCard(
  sisterId: 'ichika' | 'nino' | 'miku' | 'yotsuba' | 'itsuki',
  preferredType?: ArtsCardType,
  customThumbnail?: string
): ArtsCard {
  const templates = SISTER_ARTS_TEMPLATES[sisterId] || SISTER_ARTS_TEMPLATES.ichika;
  let template: ArtsCardTemplate;

  if (preferredType) {
    template = templates.find((t) => t.type === preferredType) || templates[0];
  } else {
    // Weighted distribution: 40% strike, 35% blast, 15% support, 10% ultimate
    const roll = Math.random();
    if (roll < 0.40) {
      template = templates.find((t) => t.type === 'strike') || templates[0];
    } else if (roll < 0.75) {
      template = templates.find((t) => t.type === 'blast') || templates[1] || templates[0];
    } else if (roll < 0.90) {
      template = templates.find((t) => t.type === 'support') || templates[2] || templates[0];
    } else {
      template = templates.find((t) => t.type === 'ultimate') || templates[3] || templates[0];
    }
  }

  artsCardIdCounter += 1;
  const uniqueId = `arts_${sisterId}_${template.type}_${Date.now()}_${artsCardIdCounter}`;

  return {
    id: uniqueId,
    sisterId,
    type: template.type,
    title: template.title,
    cost: template.cost,
    basePoints: template.basePoints,
    healResolve: template.healResolve,
    effectDescription: template.effectDescription,
    artThumbnail: customThumbnail || template.defaultThumbnail,
  };
}
