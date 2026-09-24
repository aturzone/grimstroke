/**
 * Sticker packs: the sheet, sorted into themes for choosing from -- on covers, on boards and
 * pages, and on the bookcase. An item is a mark from marks.ts (drawn here, crisp at any size) or
 * an emoji (drawn by the system's emoji face, which every browser and every export has).
 */

export interface PackItem {
  mark?: string;
  emoji?: string;
  /** Words to find it by. */
  name: string;
}

export interface Pack {
  id: string;
  label: string;
  items: PackItem[];
}

const e = (emoji: string, name: string): PackItem => ({ emoji, name });
const m = (mark: string, name: string): PackItem => ({ mark, name });

export const PACKS: readonly Pack[] = [
  {
    id: 'status',
    label: 'status',
    items: [
      m('done', 'done'),
      m('blocked', 'blocked'),
      m('wip', 'in progress wip'),
      m('ship', 'ship it'),
      m('review', 'review'),
      m('bug', 'bug'),
      m('check', 'tick yes'),
      m('cross', 'cross no'),
      m('warning', 'careful warning'),
      m('question', 'question'),
      m('pin', 'pin'),
      m('star', 'star'),
    ],
  },
  {
    id: 'code',
    label: 'code',
    items: [
      m('github', 'github'),
      m('gitlab', 'gitlab'),
      m('gitea', 'gitea'),
      m('forgejo', 'forgejo'),
      e('\u{1F4BB}', 'laptop'),
      e('\u{1F41B}', 'bug'),
      e('\u{1F527}', 'wrench'),
      e('⚙️', 'gear settings'),
      e('\u{1F9E9}', 'puzzle'),
      e('\u{1F512}', 'lock'),
      e('\u{1F511}', 'key'),
      e('\u{1F4E6}', 'package'),
      e('\u{1F9EA}', 'test tube'),
      e('\u{1F680}', 'rocket deploy'),
      e('\u{1F4A5}', 'boom crash'),
      e('\u{1F6A7}', 'construction'),
    ],
  },
  {
    id: 'office',
    label: 'office',
    items: [
      e('\u{1F4CE}', 'paperclip'),
      e('\u{1F4CC}', 'pushpin'),
      e('\u{1F5C2}️', 'dividers files'),
      e('\u{1F4CA}', 'bar chart'),
      e('\u{1F4C8}', 'chart up'),
      e('\u{1F4C9}', 'chart down'),
      e('✂️', 'scissors'),
      e('\u{1F4DD}', 'memo note'),
      e('\u{1F5D3}️', 'calendar'),
      e('\u{1F4BC}', 'briefcase'),
      e('\u{1F4E7}', 'email'),
      e('☎️', 'telephone'),
      e('\u{1F58A}️', 'pen'),
      e('\u{1F4CB}', 'clipboard'),
    ],
  },
  {
    id: 'school',
    label: 'school',
    items: [
      e('\u{1F4DA}', 'books'),
      e('✏️', 'pencil'),
      e('\u{1F392}', 'backpack'),
      e('\u{1F4D0}', 'ruler triangle'),
      e('\u{1F52C}', 'microscope'),
      e('\u{1F393}', 'graduation'),
      e('\u{1F4CF}', 'ruler'),
      e('\u{1F58D}️', 'crayon'),
      e('\u{1F9EE}', 'abacus'),
      e('\u{1F9ED}', 'compass'),
      e('\u{1F30D}', 'globe earth'),
      e('\u{1F4A1}', 'idea bulb'),
    ],
  },
  {
    id: 'nature',
    label: 'nature',
    items: [
      e('\u{1F33F}', 'herb leaf'),
      e('\u{1F338}', 'blossom flower'),
      e('\u{1F344}', 'mushroom'),
      e('\u{1F332}', 'tree evergreen'),
      e('\u{1F33B}', 'sunflower'),
      e('\u{1F341}', 'maple leaf autumn'),
      e('\u{1F335}', 'cactus'),
      e('\u{1F319}', 'moon'),
      e('\u{1F30A}', 'wave sea'),
      e('\u{1F340}', 'clover luck'),
      e('\u{1F337}', 'tulip'),
      e('\u{1FAB4}', 'potted plant'),
    ],
  },
  {
    id: 'animals',
    label: 'animals',
    items: [
      e('\u{1F431}', 'cat'),
      e('\u{1F436}', 'dog'),
      e('\u{1F98A}', 'fox'),
      e('\u{1F43C}', 'panda'),
      e('\u{1F438}', 'frog'),
      e('\u{1F989}', 'owl'),
      e('\u{1F419}', 'octopus'),
      e('\u{1F98B}', 'butterfly'),
      e('\u{1F41D}', 'bee'),
      e('\u{1F422}', 'turtle'),
      e('\u{1F427}', 'penguin'),
      e('\u{1F984}', 'unicorn'),
    ],
  },
  {
    id: 'food',
    label: 'food',
    items: [
      e('\u{1F355}', 'pizza'),
      e('\u{1F369}', 'donut'),
      e('\u{1F363}', 'sushi'),
      e('\u{1F35C}', 'noodles ramen'),
      e('☕', 'coffee'),
      e('\u{1F353}', 'strawberry'),
      e('\u{1F951}', 'avocado'),
      e('\u{1F36A}', 'cookie'),
      e('\u{1F9C1}', 'cupcake'),
      e('\u{1F349}', 'watermelon'),
      e('\u{1F375}', 'tea'),
      e('\u{1F950}', 'croissant'),
    ],
  },
  {
    id: 'travel',
    label: 'travel',
    items: [
      e('✈️', 'plane'),
      e('\u{1F5FA}️', 'map'),
      e('\u{1F9F3}', 'luggage'),
      e('\u{1F3DD}️', 'island'),
      e('\u{1F5FC}', 'tower'),
      e('\u{1F682}', 'train'),
      e('\u{1F3D5}️', 'camping'),
      e('\u{1F30B}', 'volcano'),
      e('\u{1F697}', 'car'),
      e('\u{1F3D4}️', 'mountain'),
      e('⛵', 'sailboat'),
      e('\u{1F4F7}', 'camera'),
    ],
  },
  {
    id: 'weather',
    label: 'weather',
    items: [
      e('☀️', 'sun'),
      e('\u{1F327}️', 'rain'),
      e('⛈️', 'storm'),
      e('\u{1F308}', 'rainbow'),
      e('❄️', 'snow'),
      e('\u{1F32A}️', 'tornado'),
      e('\u{1F324}️', 'sun cloud'),
      e('☁️', 'cloud'),
      e('\u{1F321}️', 'thermometer'),
      e('\u{1F4A8}', 'wind'),
      e('⚡', 'lightning'),
      e('\u{1F32B}️', 'fog'),
    ],
  },
  {
    id: 'space',
    label: 'space',
    items: [
      e('\u{1F680}', 'rocket'),
      e('\u{1FA90}', 'planet'),
      e('\u{1F30D}', 'earth'),
      e('\u{1F31F}', 'glowing star'),
      e('☄️', 'comet'),
      e('\u{1F47D}', 'alien'),
      e('\u{1F6F8}', 'ufo'),
      e('\u{1F30C}', 'milky way'),
      e('\u{1F52D}', 'telescope'),
      e('\u{1F315}', 'full moon'),
      e('\u{1F468}‍\u{1F680}', 'astronaut'),
      e('\u{1F6F0}️', 'satellite'),
    ],
  },
  {
    id: 'party',
    label: 'celebrate',
    items: [
      e('\u{1F389}', 'party popper'),
      e('\u{1F382}', 'cake birthday'),
      e('\u{1F381}', 'gift'),
      e('\u{1F388}', 'balloon'),
      e('\u{1F38A}', 'confetti'),
      e('\u{1F3C6}', 'trophy'),
      e('\u{1F973}', 'party face'),
      e('\u{1F386}', 'fireworks'),
      e('\u{1F387}', 'sparkler'),
      e('\u{1F37E}', 'champagne'),
      e('\u{1F947}', 'gold medal'),
      e('\u{1F451}', 'crown'),
    ],
  },
  {
    id: 'faces',
    label: 'faces',
    items: [
      e('\u{1F600}', 'grin'),
      e('\u{1F602}', 'laugh'),
      e('\u{1F60D}', 'love eyes'),
      e('\u{1F914}', 'thinking'),
      e('\u{1F60E}', 'cool'),
      e('\u{1F634}', 'sleepy'),
      e('\u{1F92F}', 'mind blown'),
      e('\u{1F62D}', 'cry'),
      e('\u{1F97A}', 'pleading'),
      e('\u{1F62C}', 'grimace'),
      e('\u{1F643}', 'upside down'),
      e('\u{1F917}', 'hug'),
    ],
  },
  {
    id: 'symbols',
    label: 'symbols',
    items: [
      m('heart', 'heart'),
      m('bolt', 'bolt'),
      m('arrow', 'arrow'),
      m('eye', 'look eye'),
      e('\u{1F4AF}', 'hundred'),
      e('\u{1F525}', 'fire'),
      e('✨', 'sparkles'),
      e('⭐', 'star'),
      e('✅', 'check'),
      e('❌', 'cross'),
      e('♻️', 'recycle'),
      e('☮️', 'peace'),
    ],
  },
];

/** Every item whose name has these words in it, from every pack. */
export function findStickers(words: string): PackItem[] {
  const q = words.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: PackItem[] = [];
  for (const pack of PACKS) {
    for (const item of pack.items) {
      const key = item.mark ?? item.emoji ?? '';
      if (seen.has(key) || !(item.name.includes(q) || pack.label.includes(q))) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
