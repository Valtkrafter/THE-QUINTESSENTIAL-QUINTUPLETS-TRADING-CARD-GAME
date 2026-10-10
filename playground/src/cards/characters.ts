import type { Affinity, CharacterId, LocalizedName } from './model';

export interface AffinityInfo {
  readonly label: string;
  /** Accent used for frames, glows and cost icons. */
  readonly color: string;
}

export const AFFINITY_INFO: Readonly<Record<Affinity, AffinityInfo>> = {
  heart: { label: 'Heart', color: '#f2b84b' },
  butterfly: { label: 'Butterfly', color: '#c06ef0' },
  melody: { label: 'Melody', color: '#4f9dff' },
  clover: { label: 'Clover', color: '#3fcf7a' },
  star: { label: 'Star', color: '#ff6a55' },
  study: { label: 'Study', color: '#a9a7bd' },
};

/** Weakness follows the cycle Heart → Butterfly → Melody → Clover → Star → Heart; resistance runs backwards. */
const CYCLE: readonly Affinity[] = ['heart', 'butterfly', 'melody', 'clover', 'star'];

export function weaknessOf(affinity: Affinity): Affinity | null {
  const index = CYCLE.indexOf(affinity);
  return index === -1 ? null : (CYCLE[(index + 1) % CYCLE.length] ?? null);
}

export function resistanceOf(affinity: Affinity): Affinity | null {
  const index = CYCLE.indexOf(affinity);
  return index === -1 ? null : (CYCLE[(index + CYCLE.length - 1) % CYCLE.length] ?? null);
}

export interface CharacterInfo {
  readonly name: LocalizedName;
  readonly affinity: Affinity;
  /** Two traits printed in the card's bottom strip, e.g. 《五つ子》《料理》. */
  readonly traits: readonly [LocalizedName, LocalizedName];
}

const QUINTUPLETS: LocalizedName = { en: 'Quintuplets', ja: '五つ子' };

export const CHARACTERS: Readonly<Record<CharacterId, CharacterInfo>> = {
  ichika: { name: { en: 'Ichika Nakano', ja: '中野 一花' }, affinity: 'heart', traits: [QUINTUPLETS, { en: 'Actress', ja: '女優' }] },
  nino: { name: { en: 'Nino Nakano', ja: '中野 二乃' }, affinity: 'butterfly', traits: [QUINTUPLETS, { en: 'Cooking', ja: '料理' }] },
  miku: { name: { en: 'Miku Nakano', ja: '中野 三玖' }, affinity: 'melody', traits: [QUINTUPLETS, { en: 'Sengoku', ja: '戦国' }] },
  yotsuba: { name: { en: 'Yotsuba Nakano', ja: '中野 四葉' }, affinity: 'clover', traits: [QUINTUPLETS, { en: 'Sports', ja: 'スポーツ' }] },
  itsuki: { name: { en: 'Itsuki Nakano', ja: '中野 五月' }, affinity: 'star', traits: [QUINTUPLETS, { en: 'Food', ja: '食べ物' }] },
  fuutarou: { name: { en: 'Fūtarō Uesugi', ja: '上杉 風太郎' }, affinity: 'study', traits: [{ en: 'Tutor', ja: '家庭教師' }, { en: 'Study', ja: '勉強' }] },
  raiha: { name: { en: 'Raiha Uesugi', ja: '上杉 らいは' }, affinity: 'study', traits: [{ en: 'Little Sister', ja: '妹' }, { en: 'Cooking', ja: '料理' }] },
  isanari: { name: { en: 'Isanari Uesugi', ja: '上杉 勇也' }, affinity: 'study', traits: [{ en: 'Father', ja: '父' }, { en: 'Carefree', ja: '気楽' }] },
  maruo: { name: { en: 'Maruo Nakano', ja: '中野 マルオ' }, affinity: 'study', traits: [{ en: 'Father', ja: '父' }, { en: 'Doctor', ja: '医者' }] },
  yusuke: { name: { en: 'Yūsuke Takeda', ja: '武田 祐輔' }, affinity: 'study', traits: [{ en: 'Rival', ja: 'ライバル' }, { en: 'Study', ja: '勉強' }] },
};
