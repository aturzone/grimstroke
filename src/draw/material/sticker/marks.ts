/**
 * The sticker sheet: every mark a sticker can carry, by name.
 *
 * Three families. STAMPS are words in a rubber-stamp box (done, blocked, wip, ship it). SYMBOLS
 * are a few hand-weight shapes on a 24 x 24 grid. BRANDS are the marks of the services a
 * notebook can be connected to, used only to say which service a card or a connection belongs
 * to -- as their guidelines allow.
 *
 * The brand paths are from Simple Icons 13.21.0 (https://simpleicons.org), released under
 * CC0 1.0; the colours are each brand's own. The trademarks remain their owners'.
 */

export type MarkFamily = 'stamp' | 'symbol' | 'brand';

export interface Mark {
  family: MarkFamily;
  label: string;
  /** The ink it is printed in. */
  colour: string;
  /** For a symbol or a brand: an SVG path on a 24 x 24 grid. */
  path?: string;
  /** Symbols are drawn as lines; brands and a few symbols are filled. */
  fill?: boolean;
  /** For a stamp: the words on it. */
  words?: string;
}

export const MARKS = {
  // ---- stamps
  done: { family: 'stamp', label: 'done', colour: '#15803d', words: 'DONE' },
  blocked: { family: 'stamp', label: 'blocked', colour: '#c0262d', words: 'BLOCKED' },
  wip: { family: 'stamp', label: 'in progress', colour: '#c26a00', words: 'WIP' },
  ship: { family: 'stamp', label: 'ship it', colour: '#1f3fd0', words: 'SHIP IT' },
  review: { family: 'stamp', label: 'needs review', colour: '#6b4c9a', words: 'REVIEW' },
  bug: { family: 'stamp', label: 'bug', colour: '#b3122e', words: 'BUG' },
  // ---- symbols
  star: {
    family: 'symbol',
    label: 'star',
    colour: '#e0a21a',
    fill: true,
    path: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z',
  },
  heart: {
    family: 'symbol',
    label: 'heart',
    colour: '#e5484d',
    fill: true,
    path: 'M12 20.3S3.5 15 3.5 9A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20.5 9c0 6-8.5 11.3-8.5 11.3z',
  },
  check: { family: 'symbol', label: 'tick', colour: '#15803d', path: 'M4.5 12.8l4.7 4.7L19.5 6.5' },
  cross: { family: 'symbol', label: 'cross', colour: '#c0262d', path: 'M6 6l12 12M18 6L6 18' },
  arrow: {
    family: 'symbol',
    label: 'arrow',
    colour: '#14110e',
    path: 'M3.5 15.5c4-7 10-9 16-6.5M15.5 5l4 4-4.5 3.2',
  },
  warning: {
    family: 'symbol',
    label: 'careful',
    colour: '#c26a00',
    path: 'M12 3.5l9 16H3zM12 10v4.5M12 17.2v.3',
  },
  question: {
    family: 'symbol',
    label: 'question',
    colour: '#1f3fd0',
    path: 'M8.8 8.6a3.3 3.3 0 1 1 4.6 3c-1 .5-1.4 1.1-1.4 2.2v.6M12 17.6v.3',
  },
  pin: {
    family: 'symbol',
    label: 'pin',
    colour: '#c0262d',
    path: 'M9 3.5h6l-1 5 3 3H7l3-3zM12 11.5V20.5',
  },
  bolt: {
    family: 'symbol',
    label: 'bolt',
    colour: '#e0a21a',
    fill: true,
    path: 'M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z',
  },
  eye: {
    family: 'symbol',
    label: 'look',
    colour: '#14110e',
    path: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  },
  // ---- brands
  github: {
    family: 'brand',
    label: 'GitHub',
    colour: '#181717',
    fill: true,
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  gitlab: {
    family: 'brand',
    label: 'GitLab',
    colour: '#FC6D26',
    fill: true,
    path: 'm23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z',
  },
  gitea: {
    family: 'brand',
    label: 'Gitea',
    colour: '#609926',
    fill: true,
    path: 'M4.209 4.603c-.247 0-.525.02-.84.088-.333.07-1.28.283-2.054 1.027C-.403 7.25.035 9.685.089 10.052c.065.446.263 1.687 1.21 2.768 1.749 2.141 5.513 2.092 5.513 2.092s.462 1.103 1.168 2.119c.955 1.263 1.936 2.248 2.89 2.367 2.406 0 7.212-.004 7.212-.004s.458.004 1.08-.394c.535-.324 1.013-.893 1.013-.893s.492-.527 1.18-1.73c.21-.37.385-.729.538-1.068 0 0 2.107-4.471 2.107-8.823-.042-1.318-.367-1.55-.443-1.627-.156-.156-.366-.153-.366-.153s-4.475.252-6.792.306c-.508.011-1.012.023-1.512.027v4.474l-.634-.301c0-1.39-.004-4.17-.004-4.17-1.107.016-3.405-.084-3.405-.084s-5.399-.27-5.987-.324c-.187-.011-.401-.032-.648-.032zm.354 1.832h.111s.271 2.269.6 3.597C5.549 11.147 6.22 13 6.22 13s-.996-.119-1.641-.348c-.99-.324-1.409-.714-1.409-.714s-.73-.511-1.096-1.52C1.444 8.73 2.021 7.7 2.021 7.7s.32-.859 1.47-1.145c.395-.106.863-.12 1.072-.12zm8.33 2.554c.26.003.509.127.509.127l.868.422-.529 1.075a.686.686 0 0 0-.614.359.685.685 0 0 0 .072.756l-.939 1.924a.69.69 0 0 0-.66.527.687.687 0 0 0 .347.763.686.686 0 0 0 .867-.206.688.688 0 0 0-.069-.882l.916-1.874a.667.667 0 0 0 .237-.02.657.657 0 0 0 .271-.137 8.826 8.826 0 0 1 1.016.512.761.761 0 0 1 .286.282c.073.21-.073.569-.073.569-.087.29-.702 1.55-.702 1.55a.692.692 0 0 0-.676.477.681.681 0 1 0 1.157-.252c.073-.141.141-.282.214-.431.19-.397.515-1.16.515-1.16.035-.066.218-.394.103-.814-.095-.435-.48-.638-.48-.638-.467-.301-1.116-.58-1.116-.58s0-.156-.042-.27a.688.688 0 0 0-.148-.241l.516-1.062 2.89 1.401s.48.218.583.619c.073.282-.019.534-.069.657-.24.587-2.1 4.317-2.1 4.317s-.232.554-.748.588a1.065 1.065 0 0 1-.393-.045l-.202-.08-4.31-2.1s-.417-.218-.49-.596c-.083-.31.104-.691.104-.691l2.073-4.272s.183-.37.466-.497a.855.855 0 0 1 .35-.077z',
  },
  forgejo: {
    family: 'brand',
    label: 'Forgejo',
    colour: '#FB923C',
    fill: true,
    path: 'M16.7773 0c1.6018 0 2.9004 1.2986 2.9004 2.9005s-1.2986 2.9004-2.9004 2.9004c-1.0854 0-2.0315-.596-2.5288-1.4787H12.91c-2.3322 0-4.2272 1.8718-4.2649 4.195l-.0007 2.1175a7.0759 7.0759 0 0 1 4.148-1.4205l.1176-.001 1.3385.0002c.4973-.8827 1.4434-1.4788 2.5288-1.4788 1.6018 0 2.9004 1.2986 2.9004 2.9005s-1.2986 2.9004-2.9004 2.9004c-1.0854 0-2.0315-.596-2.5288-1.4787H12.91c-2.3322 0-4.2272 1.8718-4.2649 4.195l-.0007 2.319c.8827.4973 1.4788 1.4434 1.4788 2.5287 0 1.602-1.2986 2.9005-2.9005 2.9005-1.6018 0-2.9004-1.2986-2.9004-2.9005 0-1.0853.596-2.0314 1.4788-2.5287l-.0002-9.9831c0-3.887 3.1195-7.0453 6.9915-7.108l.1176-.001h1.3385C14.7458.5962 15.692 0 16.7773 0ZM7.2227 19.9052c-.6596 0-1.1943.5347-1.1943 1.1943s.5347 1.1943 1.1943 1.1943 1.1944-.5347 1.1944-1.1943-.5348-1.1943-1.1944-1.1943Zm9.5546-10.4644c-.6596 0-1.1944.5347-1.1944 1.1943s.5348 1.1943 1.1944 1.1943c.6596 0 1.1943-.5347 1.1943-1.1943s-.5347-1.1943-1.1943-1.1943Zm0-7.7346c-.6596 0-1.1944.5347-1.1944 1.1943s.5348 1.1943 1.1944 1.1943c.6596 0 1.1943-.5347 1.1943-1.1943s-.5347-1.1943-1.1943-1.1943Z',
  },
} as const satisfies Record<string, Mark>;

export type MarkName = keyof typeof MARKS;

export function markOf(name: string | undefined): Mark | undefined {
  return name && name in MARKS ? (MARKS as Record<string, Mark>)[name] : undefined;
}

/**
 * The shortcodes a note or an issue body can write, as in GitHub and GitLab: `:rocket:` is a
 * small sticker of a rocket. Only the common ones -- a word that is not here stays a word.
 */
export const SHORTCODES: Readonly<Record<string, string>> = {
  rocket: '\u{1F680}',
  bug: '\u{1F41B}',
  fire: '\u{1F525}',
  tada: '\u{1F389}',
  white_check_mark: '✅',
  heavy_check_mark: '✔️',
  x: '❌',
  warning: '⚠️',
  eyes: '\u{1F440}',
  '+1': '\u{1F44D}',
  thumbsup: '\u{1F44D}',
  '-1': '\u{1F44E}',
  heart: '❤️',
  star: '⭐',
  sparkles: '✨',
  memo: '\u{1F4DD}',
  bulb: '\u{1F4A1}',
  lock: '\u{1F512}',
  zap: '⚡',
  construction: '\u{1F6A7}',
  boom: '\u{1F4A5}',
  question: '❓',
  pushpin: '\u{1F4CC}',
  hourglass: '⌛',
  art: '\u{1F3A8}',
  wrench: '\u{1F527}',
  package: '\u{1F4E6}',
  recycle: '♻️',
  pencil2: '✏️',
};
