/**
 * TQQ Vault - Examiner Roster Configuration
 * v2.4.0 Academic Opponents & Examination Bosses
 */

import { Examiner } from '../types/battle';

export const EXAMINERS: Examiner[] = [
  {
    id: 'maruo',
    name: 'Maruo Nakano',
    title: 'The Unyielding Examiner',
    portraitPath: '/cards/TQQ/Maruo/maru 1.jpg',
    totalResolve: 1000,
    basePressurePerRound: 180,
    stressVariance: [160, 200],
    weaknessSubject: 'history',
    specialExamPenalty: 'Parental Intimidation: Reduces team Charm by 15%.',
    reward: {
      yen: 4500,
      stardust: 120,
      item: '1x Kiosk Voucher',
    },
  },
  {
    id: 'proctor',
    name: 'School Board Proctor',
    title: 'Standardized Testing Board',
    portraitPath: '/cards/TQQ/isanari/isa 1.jpg',
    totalResolve: 850,
    basePressurePerRound: 110,
    stressVariance: [95, 125],
    weaknessSubject: 'math',
    specialExamPenalty: 'Standardized Scrutiny: Unforgiving scoring without curves.',
    reward: {
      yen: 2000,
      stardust: 50,
    },
  },
  {
    id: 'takeda',
    name: 'Yusuke Takeda',
    title: 'Aspiring Top Student',
    portraitPath: '/cards/TQQ/Yusuke/yusuke 1.jpg',
    totalResolve: 750,
    basePressurePerRound: 140,
    stressVariance: [125, 155],
    weaknessSubject: 'english',
    specialExamPenalty: 'Academic Rivalry: Steals 10 test points if the player scores below 20 in any round.',
    reward: {
      yen: 3200,
      stardust: 80,
      item: '1x Test-Sheet Fast Pass',
    },
  },
];

export function getExaminerById(id: string): Examiner {
  const examiner = EXAMINERS.find((e) => e.id === id);
  return examiner || EXAMINERS[0];
}
