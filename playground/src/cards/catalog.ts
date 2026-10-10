import { CHARACTERS, resistanceOf, weaknessOf } from './characters';
import {
  DEFAULT_CROP,
  artKey,
  type ArtCrop,
  type ArtKey,
  cardId,
  type Ability,
  type Card,
  type CharacterCard,
  type Move,
  type Rarity,
  type SisterId,
  type Stage,
  type SupporterCard,
  type SupportingId,
} from './model';

export const SET_CODE = 'TQQ01';
const ILLUSTRATOR = 'Unknown';

/**
 * Per-art framing fixes found by reviewing every card face: landscape art zoomed out, and art whose
 * head sits under the top badges nudged down.
 */
const CROPS: Readonly<Partial<Record<string, ArtCrop>>> = {
  'ichika/3': { x: 0.5, y: 0.35, zoom: 0.94 },
  'ichika/4': { x: 0.5, y: 0.4, zoom: 0.92 },
  'miku/6': { x: 0.5, y: 0.3, zoom: 0.56 },
  'itsuki/4': { x: 0.5, y: 0.45, zoom: 0.9 },
};

function cropFor(art: ArtKey): ArtCrop {
  return CROPS[art] ?? DEFAULT_CROP;
}

interface StageKit {
  readonly ability?: Ability;
  readonly moves: readonly Move[];
}

interface SisterKit {
  /** One subtitle per art tier, in the order of the art files 1–7. */
  readonly titles: readonly [string, string, string, string, string, string, string];
  readonly basic: StageKit;
  readonly close: StageKit;
  readonly bride: StageKit;
}

/** How each art tier (file 1–7) maps onto the card: rarity, stage and Prime status. */
const TIER_PLAN: readonly { readonly rarity: Rarity; readonly stage: Stage; readonly prime: boolean }[] = [
  { rarity: 'C', stage: 'basic', prime: false },
  { rarity: 'U', stage: 'basic', prime: false },
  { rarity: 'R', stage: 'close', prime: false },
  { rarity: 'RR', stage: 'close', prime: true },
  { rarity: 'AR', stage: 'basic', prime: false },
  { rarity: 'SAR', stage: 'bride', prime: true },
  { rarity: 'UR', stage: 'bride', prime: true },
];

const HP: Readonly<Record<Stage, { readonly normal: number; readonly prime: number }>> = {
  basic: { normal: 70, prime: 70 },
  close: { normal: 110, prime: 190 },
  bride: { normal: 150, prime: 260 },
};

const KITS: Readonly<Record<SisterId, SisterKit>> = {
  ichika: {
    titles: ['Blazer & Wink', 'Autumn Knit', 'Summer Fireworks', 'Golden Rehearsal', 'Little Black Dress', 'Golden Hour', 'The Bride Who Kept Quiet'],
    basic: {
      moves: [
        { name: 'Stage Smile', cost: ['heart'], damage: 20 },
        { name: 'Rehearsal', cost: ['heart', 'study'], damage: 40, text: 'Look at the top card of your deck. You may put it on the bottom.' },
      ],
    },
    close: {
      ability: { name: 'Leading Lady', text: 'Once during your turn, you may switch your Active Character with 1 of your Benched Characters.' },
      moves: [{ name: 'Dramatic Entrance', cost: ['heart', 'heart', 'study'], damage: 90 }],
    },
    bride: {
      ability: { name: 'Eldest’s Resolve', text: 'This Character takes 30 less damage from attacks.' },
      moves: [{ name: 'Curtain Call', cost: ['heart', 'heart', 'study'], damage: 150, damageSuffix: '+', text: 'Does 30 more damage for each Heart attached to this Character.' }],
    },
  },
  nino: {
    titles: ['Uniform Day', 'Pâtissière', 'Snow-White Furisode', 'A Shy Confession', 'Bridal Bouquet', 'Summer Splash', 'Butterfly Ribbons'],
    basic: {
      moves: [
        { name: 'Sharp Tongue', cost: ['butterfly'], damage: 20 },
        { name: 'Homemade Sweets', cost: ['butterfly', 'study'], damage: 30, text: 'Heal 30 damage from 1 of your Characters.' },
      ],
    },
    close: {
      ability: { name: 'Big Sister’s Care', text: 'Once during your turn, you may heal 20 damage from each of your Benched Characters.' },
      moves: [{ name: 'Pastry Barrage', cost: ['butterfly', 'butterfly', 'study'], damage: 100 }],
    },
    bride: {
      moves: [
        { name: 'Kitchen Command', cost: ['butterfly'], damage: 40, text: 'Draw 2 cards.' },
        { name: 'No More Holding Back', cost: ['butterfly', 'butterfly', 'study'], damage: 180 },
      ],
    },
  },
  miku: {
    titles: ['Headphones On', 'After School', 'Festival Fan', 'Midnight Masquerade', 'Winter White', 'Reaching Out', 'Café Date'],
    basic: {
      moves: [
        { name: 'Quiet Glance', cost: ['melody'], damage: 10 },
        { name: 'Sengoku Trivia', cost: ['melody', 'study'], damage: 40, text: 'Flip a coin. If heads, the Defending Character can’t attack during your opponent’s next turn.' },
      ],
    },
    close: {
      ability: { name: 'Headphones On', text: 'This Character takes 20 less damage from attacks.' },
      moves: [{ name: 'Matcha Soda Break', cost: ['melody', 'melody', 'study'], damage: 90 }],
    },
    bride: {
      ability: { name: 'Third Time’s the Charm', text: 'If this Character would be Knocked Out, flip a coin. If heads, it stays in play with 10 HP.' },
      moves: [{ name: 'Rendezvous', cost: ['melody', 'melody', 'study'], damage: 170 }],
    },
  },
  yotsuba: {
    titles: ['Ready to Run', 'Cheer Captain', 'Spring Kimono', 'Finish Line', 'Laced in White', 'Forest Swing', 'Morning Light'],
    basic: {
      moves: [
        { name: 'Warm-Up Jog', cost: ['clover'], damage: 20 },
        { name: 'Helping Hand', cost: ['clover', 'study'], damage: 30, text: 'Attach a Heart card from your discard pile to 1 of your Benched Characters.' },
      ],
    },
    close: {
      ability: { name: 'Ribbon of Support', text: 'Your Benched Characters’ moves cost 1 less Study Heart.' },
      moves: [{ name: 'Relay Anchor', cost: ['clover', 'clover', 'study'], damage: 110 }],
    },
    bride: {
      moves: [
        { name: 'Cheer Squad', cost: ['clover'], damage: null, text: 'Attach up to 2 Heart cards from your hand to your Characters in any way you like.' },
        { name: 'Promise at the Shrine', cost: ['clover', 'clover', 'study'], damage: 200 },
      ],
    },
  },
  itsuki: {
    titles: ['Top of the Class', 'Snowfall Walk', 'Apple Candy Festival', 'Corn Dog Crisis', 'Bridal Bloom', 'Study Glasses', 'Star Clips'],
    basic: {
      moves: [
        { name: 'Second Helping', cost: ['star'], damage: 20, text: 'Heal 10 damage from this Character.' },
        { name: 'Study Session', cost: ['star', 'study'], damage: 40 },
      ],
    },
    close: {
      ability: { name: 'Future Teacher', text: 'Once during your turn, you may draw a card.' },
      moves: [{ name: 'Meat Bun Rush', cost: ['star', 'star', 'study'], damage: 100 }],
    },
    bride: {
      moves: [{ name: 'Five-Way Promise', cost: ['star', 'star', 'study'], damage: 90, damageSuffix: '×', text: 'Does 30 damage for each of the Quintuplets you have in play.' }],
    },
  },
};

interface SupporterPrint {
  readonly character: SupportingId;
  readonly art: number;
  readonly rarity: Rarity;
  readonly title: string;
  readonly effect: string;
  readonly signed?: boolean;
}

const SUPPORTERS: readonly SupporterPrint[] = [
  { character: 'fuutarou', art: 1, rarity: 'U', title: 'Private Tutor', effect: 'Draw 3 cards.' },
  { character: 'fuutarou', art: 2, rarity: 'R', title: 'Perfect Score', effect: 'Search your deck for a Heart card and attach it to 1 of your Characters. Then, shuffle your deck.' },
  { character: 'fuutarou', art: 3, rarity: 'SAR', title: 'Kyoto Memory', effect: 'Shuffle your hand into your deck. Then, draw 6 cards.', signed: true },
  { character: 'raiha', art: 1, rarity: 'U', title: 'Little Sister’s Bento', effect: 'Heal 60 damage from 1 of your Characters.' },
  { character: 'raiha', art: 2, rarity: 'AR', title: 'Festival Night', effect: 'Search your deck for up to 2 Basic Characters and put them onto your Bench. Then, shuffle your deck.' },
  { character: 'isanari', art: 1, rarity: 'U', title: 'Carefree Father', effect: 'Each player shuffles their hand into their deck and draws 4 cards.' },
  { character: 'maruo', art: 1, rarity: 'R', title: 'Hospital Director', effect: 'Your opponent switches their Active Character with 1 of their Benched Characters.' },
  { character: 'yusuke', art: 1, rarity: 'U', title: 'The Rival', effect: 'Look at the top 5 cards of your deck. Put 1 of them into your hand and the rest on the bottom of your deck.' },
];

function buildCatalog(): readonly Card[] {
  const cards: Card[] = [];
  let number = 1;

  for (const [sister, kit] of Object.entries(KITS) as [SisterId, SisterKit][]) {
    const info = CHARACTERS[sister];
    TIER_PLAN.forEach((plan, index) => {
      const stageKit = kit[plan.stage];
      const card: CharacterCard = {
        id: cardId(`${SET_CODE}-${String(number).padStart(3, '0')}`),
        kind: 'character',
        set: SET_CODE,
        number,
        rarity: plan.rarity,
        name: info.name,
        title: kit.titles[index] ?? '',
        art: artKey(sister, index + 1),
        crop: cropFor(artKey(sister, index + 1)),
        illustrator: ILLUSTRATOR,
        signed: plan.rarity === 'SAR' || plan.rarity === 'UR',
        character: sister,
        stage: plan.stage,
        prime: plan.prime,
        hp: plan.prime ? HP[plan.stage].prime : HP[plan.stage].normal,
        affinity: info.affinity,
        ...(stageKit.ability === undefined ? {} : { ability: stageKit.ability }),
        moves: stageKit.moves,
        weakness: weaknessOf(info.affinity),
        resistance: resistanceOf(info.affinity),
        retreat: plan.stage === 'basic' ? 1 : 2,
      };
      cards.push(card);
      number += 1;
    });
  }

  for (const print of SUPPORTERS) {
    const card: SupporterCard = {
      id: cardId(`${SET_CODE}-${String(number).padStart(3, '0')}`),
      kind: 'supporter',
      set: SET_CODE,
      number,
      rarity: print.rarity,
      name: CHARACTERS[print.character].name,
      title: print.title,
      art: artKey(print.character, print.art),
      crop: cropFor(artKey(print.character, print.art)),
      illustrator: ILLUSTRATOR,
      signed: print.signed ?? false,
      character: print.character,
      effect: print.effect,
    };
    cards.push(card);
    number += 1;
  }

  return cards;
}

export const CATALOG: readonly Card[] = buildCatalog();
export const SET_SIZE = CATALOG.length;
