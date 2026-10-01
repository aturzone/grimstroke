/**
 * The pets' coats, as data: which there are, what they are called, their colours. How a pet is
 * drawn in one is the face's (pet/art.ts).
 */

export type Species = 'cat' | 'dog';

/**
 * A coat: its colours and its pattern. The main fur and a second one (for stripes, points,
 * patches, spots or a saddle), each in three tones, and cream for a chest, muzzle and paws.
 */
export interface Coat {
  id: string;
  label: string;
  species: Species;
  fur: [string, string, string];
  second?: [string, string, string];
  /** A calico's third colour: its black patches. */
  third?: [string, string, string];
  cream: [string, string];
  pattern?: 'tabby' | 'patches' | 'points' | 'spots' | 'saddle' | 'mask';
  /** Where the cream goes: a little (muzzle, chest, paws), a lot (belly too), or none. */
  pale?: 'some' | 'lots' | 'none';
  eye: string;
  nose?: string;
  /** A dog's ears: pricked up (shiba, husky) or hanging (the rest). */
  ears?: 'up' | 'flop';
}

export const COATS: readonly Coat[] = [
  {
    id: 'ginger',
    label: 'ginger tabby',
    species: 'cat',
    fur: ['#f7b56e', '#e58a3e', '#b65a20'],
    second: ['#d06a24', '#b0521a', '#8a3c10'],
    cream: ['#fbf1e0', '#e6cda6'],
    pattern: 'tabby',
    eye: '#6fae3e',
  },
  {
    id: 'grey',
    label: 'grey tabby',
    species: 'cat',
    fur: ['#c6ced6', '#939ca7', '#656e79'],
    second: ['#747c86', '#5a616b', '#434951'],
    cream: ['#f6f6f3', '#d9dbd8'],
    pattern: 'tabby',
    eye: '#d2aa2c',
  },
  {
    id: 'black',
    label: 'black',
    species: 'cat',
    fur: ['#55556a', '#34343f', '#212129'],
    cream: ['#55556a', '#34343f'],
    pale: 'none',
    eye: '#e0bc36',
    nose: '#7a4a52',
  },
  {
    id: 'tuxedo',
    label: 'tuxedo',
    species: 'cat',
    fur: ['#55556a', '#34343f', '#212129'],
    cream: ['#f7f5f0', '#d8d4cc'],
    pale: 'lots',
    eye: '#93c74c',
  },
  {
    id: 'white',
    label: 'white',
    species: 'cat',
    fur: ['#ffffff', '#f1ede6', '#d3cbbf'],
    cream: ['#ffffff', '#e6dfd4'],
    pale: 'none',
    eye: '#5fa8d8',
  },
  {
    id: 'calico',
    label: 'calico',
    species: 'cat',
    fur: ['#fffaf1', '#f3ebdc', '#d8ccb6'],
    second: ['#f3a55a', '#dc833c', '#aa5e24'],
    third: ['#55556a', '#34343f', '#212129'],
    cream: ['#fffaf1', '#e5dac6'],
    pattern: 'patches',
    pale: 'none',
    eye: '#6fae3e',
  },
  {
    id: 'siamese',
    label: 'siamese',
    species: 'cat',
    fur: ['#f8eedc', '#e9d9bd', '#cbb795'],
    second: ['#8a6650', '#654a38', '#443024'],
    cream: ['#fbf4e6', '#e6d5b8'],
    pattern: 'points',
    eye: '#4a90d9',
  },
  {
    id: 'shiba',
    label: 'shiba',
    species: 'dog',
    ears: 'up',
    fur: ['#f4ab5e', '#dc863c', '#aa5e24'],
    cream: ['#fbf1e0', '#e8cfa8'],
    pale: 'lots',
    eye: '#2a1a12',
  },
  {
    id: 'golden',
    label: 'golden',
    species: 'dog',
    fur: ['#f6d383', '#e2b055', '#b98834'],
    cream: ['#fbeccb', '#e8d3a2'],
    pale: 'some',
    eye: '#2a1a12',
  },
  {
    id: 'lab',
    label: 'black lab',
    species: 'dog',
    fur: ['#55555e', '#34343b', '#212126'],
    cream: ['#55555e', '#34343b'],
    pale: 'none',
    eye: '#6b4a2a',
    nose: '#121216',
  },
  {
    id: 'dalmatian',
    label: 'dalmatian',
    species: 'dog',
    fur: ['#ffffff', '#f1ede6', '#d3cbbf'],
    second: ['#34343b', '#212126', '#141418'],
    cream: ['#ffffff', '#e6dfd4'],
    pattern: 'spots',
    pale: 'none',
    eye: '#2a1a12',
  },
  {
    id: 'beagle',
    label: 'beagle',
    species: 'dog',
    fur: ['#eaae63', '#cc8d45', '#9e682a'],
    second: ['#43342a', '#2e241d', '#1c1612'],
    cream: ['#fdf8ef', '#e5dac6'],
    pattern: 'saddle',
    pale: 'lots',
    eye: '#2a1a12',
  },
  {
    id: 'husky',
    label: 'husky',
    species: 'dog',
    ears: 'up',
    fur: ['#a3acb6', '#7b8490', '#58606b'],
    second: ['#6a727d', '#4d545e', '#373d45'],
    cream: ['#f7f7f5', '#d9dbd8'],
    pattern: 'mask',
    pale: 'lots',
    eye: '#5fb0e8',
  },
];

export function coatOf(id: string | undefined, species: Species = 'cat'): Coat {
  return (
    COATS.find((c) => c.id === id && c.species === species) ??
    (COATS.find((c) => c.species === species) as Coat)
  );
}
