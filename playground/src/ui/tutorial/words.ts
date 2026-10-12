// Every sentence of the introduction. They are part of `text` (see ui/text.ts, `text.tutorial`); they live in this file because
// there are so many. Plain words, short sentences, and the game's own words from docs/glossary.md.

import { formatYen } from '../format';

export const tutorialWords = {
  ui: {
    region: 'Tutorial',
    label: (tab: string) => `Tutorial · ${tab}`,
    step: (number: number, total: number) => `Step ${number} of ${total}`,
    next: 'Next',
    finish: 'Finish',
    clickIt: 'Press the lit-up spot to go on.',
    doIt: 'Do it yourself to go on.',
    tapOn: 'Tap through the show to go on.',
    watchOn: 'Watch to the end to go on.',
    waiting: 'One moment …',
    locked: 'Finish the tutorial of this tab first.',
    newHere: 'New: a short tutorial waits here.',
    restart: 'Start the tutorials again',
    restartHint: 'Every tab explains itself again the next time you open it, starting with Packs.',
  },
  gift: {
    yen: (amount: number) => `Gift: we added ${formatYen(amount)} to your money for this step.`,
    card: (name: string) => `Gift: we gave you a card (${name}) for this step.`,
  },

  packs: {
    welcome: {
      title: 'Welcome to TQQ!',
      text: 'A free game about the Nakano sisters: collect cards, build decks and battle. This guide shows you every tab, one step at a time. First, the best part: opening a pack.',
    },
    wallet: { title: 'Your money', text: 'This is your money, in yen. You start with ¥1,500. You earn more in battles and with the daily bonus.' },
    daily: { title: 'Daily bonus', text: 'Come back every day for free yen. Press the button to take your bonus.' },
    kinds: {
      title: 'Four kinds of packs',
      text: 'The Booster is cheap and gives mostly common cards. Select and Premium cost more and give better ones. The Halloween Wish is only here for a short time.',
    },
    odds: { title: 'Look at the odds', text: 'Every pack tells you exactly what it can give. Open the Odds page of the Booster.' },
    oddsRead: { title: 'Big cards are rare', text: 'Here you see how likely each kind of card is. The best cards are rare on purpose: it takes many packs to find them.' },
    oddsBack: { title: 'Back to the packs', text: 'Press the button to go back.' },
    open: { title: 'Open your first pack', text: 'Press the button. A Booster costs ¥300 and has 5 cards.' },
    tear: { title: 'Tear it open', text: 'Swipe along the top edge of the pack, or just tap it.' },
    show: { title: 'Watch the show', text: 'Tap to see the next card. Better cards get a bigger show. You can leave the show with Escape or the Skip button.' },
    summary: { title: 'Your new cards', text: 'These are your five cards. “New” means you did not have that card yet. They are in your Binder now.' },
    close: { title: 'Close the result', text: 'Press Close.' },
    pity: {
      title: 'Bad-luck protection',
      text: 'Each pack counts the packs you opened without a big card. When a bar is full, the next pack gives you one for sure.',
    },
    done: { title: 'Packs: done!', text: 'Your cards wait in the Binder. Every other tab has a short guide like this one the first time you open it. Pick one from the menu.' },
  },

  binder: {
    intro: { title: 'Your Binder', text: 'Every card you own lives here, with the shine it really has. Let us see how to find a card.' },
    search: { title: 'Search', text: 'Type a name, like “Nino”, to find a card.' },
    searchClear: { title: 'Clear it again', text: 'Delete the text to see all your cards again.' },
    filter: { title: 'Filters', text: 'Press Filter. You can narrow your cards down by character, rarity, finish and grading.' },
    filterPick: { title: 'Pick a filter', text: 'Press one of the buttons, for example a rarity. Cards that do not match disappear.' },
    filterReset: { title: 'Start over', text: 'Press “Reset filters” to see everything again.' },
    sort: { title: 'Sort', text: 'Change the order of your cards, for example to “Newest”.' },
    open: { title: 'Look at a card', text: 'Click a card to see it up close.' },
    turn: { title: 'Turn it around', text: 'Drag the card with the mouse or your finger. The shine moves like on a real foil card. A double-click flips it.' },
    flip: { title: 'Flip it', text: 'Press Flip to see the back of the card.' },
    facts: {
      title: 'About this card',
      text: 'You see its rarity, how it shines (the finish) and when you got it. A card also has a condition: scratches and worn corners matter for Grading.',
    },
    back: { title: 'Back to the Binder', text: 'Press Back.' },
    done: { title: 'Binder: done!', text: 'Next, try the Shop to buy cards, or the Showcase to show off your best one.' },
  },

  shop: {
    intro: { title: 'The Shop', text: 'Buy single cards at the Kiosk, or sell cards you do not need.' },
    kiosk: {
      title: 'The Kiosk',
      text: 'Eight cards are for sale every day, and the shelf changes tomorrow. Only cards up to Double Rare are sold here. The best ones come from packs.',
    },
    buy: { title: 'Buy a card', text: 'Press Buy on the cheapest card. It goes straight into your Binder.' },
    sellTab: { title: 'Selling', text: 'Now open “Sell spare cards”.' },
    sellInfo: {
      title: 'Spare cards',
      text: 'A spare card is a double you do not need. You always keep one of every card, the cards in your decks and your Showcase. Sell the rest for yen.',
    },
    done: { title: 'Shop: done!', text: 'Money is tight at the start, so earn some in battles. The Battle tab explains how.' },
  },

  grading: {
    intro: {
      title: 'Grading',
      text: 'Graders check a card and give it a score from 1 to 10 in a sealed case. A high score makes the card worth much more. A low score makes it worth less.',
    },
    steps: { title: 'How it works', text: 'Pick a card, pay the fee and get a score. You pay the fee whatever the score is, so send in only your best cards.' },
    pick: { title: 'Pick a card', text: 'Click a card. Graders look at it for you, and this one is cheap to grade.' },
    desk: {
      title: 'Check the chances',
      text: 'The desk shows the chance of every score and what the card would be worth in its case. The graders look closer than you can, so even a clean card can lose a point.',
    },
    send: { title: 'Send it in', text: 'Press the button to send the card to the graders.' },
    confirm: { title: 'Pay the fee', text: 'The fee is taken now. This is a lesson, so we picked a cheap card.' },
    ceremony: { title: 'The graders at work', text: 'They check four things: centering, corners, edges and surface. You can click to skip the show.' },
    result: { title: 'Your score', text: 'This is the score. A 9 or better pays off; a lower score makes the card worth less. Grading is a bet, so choose well.' },
    close: { title: 'Done', text: 'Press Done.' },
    slabsTab: { title: 'Your slabs', text: 'Open the tab “Your slabs”. Graded cards wait there.' },
    slabsInfo: { title: 'Slabs', text: 'You see how many slabs have each score, and what they are worth. You can sell a slab on its card page. Keep the good ones.' },
    done: { title: 'Grading: done!', text: 'Look at your cards in 3D in the Binder: the wear you can see tells you which ones to send in.' },
  },

  decks: {
    intro: { title: 'Decks', text: 'A deck has 30 cards. You use it in battles. Loaner decks are ready to play, so you can battle right away.' },
    template: { title: 'Use a template', text: 'Press “Use as template” on a loaner deck. You get your own copy to change.' },
    editor: {
      title: 'The deck builder',
      text: 'On the left are your cards, on the right is your deck. Click a card to add it, and use − and + to change the copies. Messages tell you what is wrong with the deck.',
    },
    name: { title: 'Name your deck', text: 'Type a name for your deck.' },
    save: { title: 'Save it', text: 'Press Save.' },
    back: { title: 'Back to your decks', text: 'Press the arrow to go back.' },
    list: { title: 'Your decks', text: 'Your deck is in the list now. You can edit it, copy it or remove it. You pick a deck when you start a battle.' },
    done: { title: 'Decks: done!', text: 'A deck can be unfinished. It only needs 30 cards from your own Binder when you want to battle with it.' },
  },

  dex: {
    intro: { title: 'Card-Dex', text: 'The Dex lists all 79 cards of the game. Cards you own show in colour, the others are dark.' },
    progress: { title: 'Your progress', text: 'This bar shows how many cards you have found.' },
    claim: { title: 'A reward is waiting!', text: 'You earned a reward. Press Claim to take it.' },
    rewards: { title: 'Rewards', text: 'Every 10 new cards give you a free pack. When you have all the cards of one sister, you get ¥2,000.' },
    sisters: { title: 'The sisters', text: 'Each sister has her own list and her own progress bar. Dark cards are the ones you still need.' },
    done: { title: 'Card-Dex: done!', text: 'Packs, the Shop and rewards all help to fill it.' },
  },

  showcase: {
    intro: { title: 'Showcase', text: 'Show off up to six of your favourite cards here.' },
    add: { title: 'Add a card', text: 'Press the plus.' },
    pick: { title: 'Pick a card', text: 'Click the card you want to show.' },
    shelf: { title: 'Your showcase', text: 'Click a card to look at it. Press ✕ on a card to take it off again.' },
    done: { title: 'Showcase: done!', text: 'Change it whenever you find a better card.' },
  },

  settings: {
    intro: { title: 'Settings', text: 'Make the game fit you.' },
    frame: { title: 'Card frame', text: 'Choose how every card looks. Try one: press a frame.' },
    graphics: { title: 'Graphics', text: 'If the game feels slow, choose Medium or Low. The game already picked a level for your device.' },
    animation: {
      title: 'Pack animation',
      text: 'Full is the whole show, Short is quicker, and Off shows your cards at once. Unless it is Off, you tear every pack open yourself.',
    },
    volume: { title: 'Sound', text: 'Move the slider to change the volume.' },
    backup: {
      title: 'Your saved game',
      text: 'Your game is saved in this browser. Download a backup now and then. A backup also lets you move to another device.',
    },
    done: { title: 'You know it all!', text: 'That was the last tab. Have fun collecting!' },
  },

  battle: {
    intro: { title: 'Battles', text: 'Battle a computer rival to earn money. Every battle pays something, and a win pays more.' },
    watch: { title: 'Watch how it works', text: 'Press the button. A short animation shows one whole turn.' },
    watching: { title: 'Watch the animation', text: 'It takes about two minutes. You can pause it and skip around. Close the window with the lit-up button when you are done.' },
    rival: { title: 'Pick a rival', text: 'Click a rival. Raiha is the easiest. A win pays more against harder rivals.' },
    deck: { title: 'Pick a deck', text: 'Click a deck. A loaner deck is ready to play. Your own decks show up here too.' },
    start: { title: 'Start the battle', text: 'Press the button.' },
    table: {
      title: 'The battle table',
      text: 'Your side is at the bottom, the rival’s side at the top, and your hand is on the right. The steps of a turn are on the left. A line at the bottom always says what to do next.',
    },
    active: { title: 'Put a Character in front', text: 'Click a glowing Basic card in your hand. This is your Active Character: it fights for you.' },
    bench: { title: 'Add a friend to your Bench', text: 'Characters on the Bench wait for their turn. Click another glowing card to put one there.' },
    ready: { title: 'Say you are ready', text: 'Press Ready when your side is set.' },
    turn: {
      title: 'Your turn',
      text: 'A turn has six steps, listed on the left. Do the glowing ones in any order. An attack ends your turn, so it comes last.',
    },
    heart: { title: 'Take your free Heart', text: 'You get one free Heart every turn. Click the Heart on the right.' },
    heartGive: { title: 'Give the Heart', text: 'Click your Active Character to give it the Heart. Moves need Hearts.' },
    attack: { title: 'Attack!', text: 'Pick a move. The number after the arrow is the damage it really does. Weakness doubles it, resistance makes it lower.' },
    endTurn: {
      title: 'End your turn',
      text: 'You cannot attack now: the player who goes first may not attack in the first turn, or your Character needs more Hearts. Press End turn.',
    },
    choose: { title: 'Pick a Character', text: 'Your Active Character was knocked out. Click a glowing Character to bring it to the front.' },
    done: {
      title: 'Your first attack!',
      text: 'You know how a battle goes. Play on, or give up from the Menu. The line at the bottom always tells you what to do next.',
    },
  },
} as const;
