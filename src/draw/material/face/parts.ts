/**
 * The drawings.
 *
 * Every piece is drawn by hand as path data on the one grid the model describes: 200 wide,
 * 220 tall, head centred at (100, 104), eyes on the line y = 104, mouth on y = 142. They are
 * literals rather than anything generated, because a generated face looks generated -- the
 * whole point of a comic face is that somebody decided where the corner of the mouth goes.
 *
 * NO COLOUR IN HERE. Every path carries a class and the stylesheet resolves it against the
 * character's palette, which is why re-colouring a face is six custom-property writes and no
 * redraw at all. The classes are:
 *
 *   fc-skin    filled with the skin colour       fc-hair    filled with the hair colour
 *   fc-ink     filled with the keyline colour    fc-white   the whites of eyes and teeth
 *   fc-eyes    the iris                          fc-mouth   the inside of a mouth
 *   fc-accent  the one loud colour               fc-line    stroked, never filled
 *   fc-dots    the halftone tile, for stubble and blush
 *
 * Mirrored features are written out on both sides rather than reflected with a transform: a
 * hand-drawn face is not symmetrical, and the small disagreements between the two sides are
 * most of what stops it looking like a component.
 */

export interface Part {
  id: string;
  label: string;
  /** SVG markup on the 200x220 grid. */
  d: string;
  /**
   * For a head shape only: its silhouette on its own, with no markup around it.
   *
   * Stubble and blush are clipped to it, so a beard drawn for a wide jaw does not hang off
   * a narrow chin and blush placed for a round face does not sit half on the background.
   */
  outline?: string;
}

const part = (id: string, label: string, d: string): Part => ({ id, label, d });

/** A five-pointed star about a point, as path data: for star eyes and star marks. */
function star(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const k = i % 2 === 0 ? r : r * 0.45;
    points.push(`${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}

/** A head shape: the same silhouette twice, once as markup and once as the clip. */
const head = (id: string, label: string, outline: string): Part => ({
  id,
  label,
  d: `<path class="fc-skin" d="${outline}"/>`,
  outline,
});

// ---------------------------------------------------------------- head

export const SHAPES: readonly Part[] = [
  head(
    'round',
    'Round',
    'M100 36C136 36 158 62 158 101C158 143 132 177 100 177C67 177 42 143 42 101C42 62 64 36 100 36Z',
  ),
  head(
    'square',
    'Square',
    'M100 36C134 36 156 57 156 91L155 129C154 159 131 177 100 177C68 177 46 159 45 129L44 91C44 57 66 36 100 36Z',
  ),
  head(
    'long',
    'Long',
    'M100 33C130 33 152 59 152 98C152 147 128 181 100 181C71 181 48 147 48 98C48 59 70 33 100 33Z',
  ),
  head(
    'heart',
    'Heart',
    'M100 35C139 35 161 59 160 96C159 129 137 161 100 180C62 161 41 129 40 96C39 59 61 35 100 35Z',
  ),
  head(
    'jaw',
    'Jaw',
    'M100 36C133 36 155 55 157 89L152 125C149 155 127 177 100 177C72 177 50 155 47 125L43 89C45 55 67 36 100 36Z',
  ),
];

export const EARS: readonly Part[] = [
  part(
    'plain',
    'Plain',
    '<path class="fc-skin" d="M49 93C34 91 27 106 33 119C38 130 47 132 54 127Z"/>' +
      '<path class="fc-skin" d="M151 93C166 90 174 105 168 118C163 129 154 132 147 127Z"/>' +
      '<path class="fc-line" d="M45 103C40 105 39 114 44 119"/>' +
      '<path class="fc-line" d="M155 103C160 106 161 114 156 119"/>',
  ),
  part(
    'pointed',
    'Pointed',
    '<path class="fc-skin" d="M50 94C36 84 24 92 30 110C34 124 46 132 55 127Z"/>' +
      '<path class="fc-skin" d="M150 94C164 83 177 91 171 110C166 124 154 132 145 127Z"/>' +
      '<path class="fc-line" d="M44 100C40 105 40 115 45 120"/>' +
      '<path class="fc-line" d="M156 100C160 105 160 115 155 120"/>',
  ),
  part(
    'big',
    'Big',
    '<path class="fc-skin" d="M50 88C30 84 20 104 28 122C35 137 49 140 57 132Z"/>' +
      '<path class="fc-skin" d="M150 88C170 83 181 104 173 122C166 137 152 140 144 132Z"/>' +
      '<path class="fc-line" d="M43 98C36 103 35 118 43 125"/>' +
      '<path class="fc-line" d="M157 98C164 104 165 118 157 125"/>',
  ),
];

// ---------------------------------------------------------------- hair

export const HAIR: readonly Part[] = [
  part(
    'crop',
    'Crop',
    '<path class="fc-hair" d="M40 112C36 58 64 27 100 27C136 27 164 58 160 112' +
      'C150 84 132 66 100 66C68 66 50 84 40 112Z"/>',
  ),
  part(
    'fringe',
    'Fringe',
    '<path class="fc-hair" d="M40 116C36 56 64 26 100 26C137 26 164 56 160 116' +
      'C156 92 148 74 138 68C128 84 110 90 92 88C74 86 60 78 52 66C44 78 42 96 40 116Z"/>',
  ),
  part(
    'wave',
    'Wave',
    '<path class="fc-hair" d="M40 114C34 54 66 25 101 25C140 25 166 58 160 114' +
      'C154 88 146 70 134 62C120 80 96 86 76 80C64 76 56 68 51 58C44 70 41 92 40 114Z"/>',
  ),
  part(
    'curls',
    'Curls',
    '<path class="fc-hair" d="M42 112C26 104 26 80 40 74C34 56 50 40 64 46' +
      'C68 28 90 22 102 32C116 22 138 30 140 46C156 42 170 58 162 74' +
      'C176 82 172 106 158 112C150 86 132 70 100 70C68 70 50 86 42 112Z"/>',
  ),
  part(
    'long',
    'Long',
    '<path class="fc-hair" d="M40 172C30 102 28 44 68 30C86 23 116 23 134 31' +
      'C172 46 170 102 160 172C158 132 156 96 150 80C140 66 124 62 100 62' +
      'C76 62 60 66 50 80C44 96 42 132 40 172Z"/>',
  ),
  part(
    'bun',
    'Bun',
    '<path class="fc-hair" d="M40 108C36 56 64 27 100 27C136 27 164 56 160 108' +
      'C150 82 132 66 100 66C68 66 50 82 40 108Z"/>' +
      '<path class="fc-hair" d="M100 30C86 30 78 18 88 10C96 3 110 5 114 14C124 14 128 28 116 31Z"/>',
  ),
  part(
    'buzz',
    'Buzz',
    '<path class="fc-hair" d="M42 100C40 58 66 32 100 32C134 32 160 58 158 100' +
      'C150 80 134 70 100 70C66 70 50 80 42 100Z"/>',
  ),
  part(
    'mohawk',
    'Mohawk',
    '<path class="fc-hair" d="M78 66C76 34 86 12 100 2C115 12 124 34 122 66' +
      'C116 58 108 55 100 55C92 55 84 58 78 66Z"/>' +
      '<path class="fc-dots" d="M44 106C46 82 58 66 78 62C76 76 75 90 76 102' +
      'C64 100 52 102 44 106Z"/>' +
      '<path class="fc-dots" d="M156 106C154 82 142 66 122 62C124 76 125 90 124 102' +
      'C136 100 148 102 156 106Z"/>',
  ),
  part(
    'afro',
    'Afro',
    '<path class="fc-hair" d="M40 118C16 110 12 80 26 66C20 42 40 20 62 25C72 6 102 2 120 13' +
      'C142 6 166 22 168 44C186 58 186 94 162 112C158 90 146 72 100 70C56 70 42 90 40 118Z"/>',
  ),
  part(
    'ponytail',
    'Ponytail',
    '<path class="fc-hair" d="M150 62C178 58 192 88 186 124C182 148 172 162 160 168' +
      'C166 142 168 112 157 92Z"/>' +
      '<path class="fc-hair" d="M40 108C36 56 64 27 100 27C136 27 164 56 160 108' +
      'C150 82 132 66 100 66C68 66 50 82 40 108Z"/>' +
      '<ellipse class="fc-accent" cx="156" cy="66" rx="6" ry="8"/>',
  ),
  part(
    'bob',
    'Bob',
    '<path class="fc-hair" d="M38 152C28 96 36 40 100 30C164 40 172 96 162 152C152 154 146 152 140 147' +
      'C146 118 141 88 129 75C111 86 88 88 71 75C59 88 54 118 60 147C54 152 48 154 38 152Z"/>',
  ),
  part(
    'bald',
    'Bald',
    '<path class="fc-shine" d="M68 54C78 44 90 40 104 40"/><path class="fc-shine" d="M62 66C63 63 65 60 67 58"/>',
  ),
];

// ---------------------------------------------------------------- brows

export const BROWS: readonly Part[] = [
  part(
    'straight',
    'Straight',
    '<path class="fc-ink" d="M60 86C68 82 82 81 91 84L90 90C81 88 69 89 61 92Z"/>' +
      '<path class="fc-ink" d="M140 86C132 82 118 81 109 84L110 90C119 88 131 89 139 92Z"/>',
  ),
  part(
    'arched',
    'Arched',
    '<path class="fc-ink" d="M59 90C64 79 82 75 92 82L90 88C81 83 68 86 62 95Z"/>' +
      '<path class="fc-ink" d="M141 90C136 79 118 75 108 82L110 88C119 83 132 86 138 95Z"/>',
  ),
  part(
    'cross',
    'Cross',
    '<path class="fc-ink" d="M60 80C70 81 84 86 92 92L89 97C81 92 69 88 60 87Z"/>' +
      '<path class="fc-ink" d="M140 80C130 81 116 86 108 92L111 97C119 92 131 88 140 87Z"/>',
  ),
  part(
    'thick',
    'Thick',
    '<path class="fc-ink" d="M57 84C68 78 84 78 93 83L91 93C82 88 69 89 59 94Z"/>' +
      '<path class="fc-ink" d="M143 84C132 78 116 78 107 83L109 93C118 88 131 89 141 94Z"/>',
  ),
  part(
    'worried',
    'Worried',
    '<path class="fc-ink" d="M60 92C66 84 80 80 91 84L90 90C81 87 69 90 62 97Z"/>' +
      '<path class="fc-ink" d="M140 92C134 84 120 80 109 84L110 90C119 87 131 90 138 97Z"/>',
  ),
];

// ---------------------------------------------------------------- eyes

export const EYES: readonly Part[] = [
  part(
    'open',
    'Open',
    '<path class="fc-white" d="M62 104C62 95 70 89 78 89C86 89 93 95 93 104C93 112 86 118 78 118' +
      'C70 118 62 112 62 104Z"/>' +
      '<path class="fc-white" d="M107 104C107 95 114 89 122 89C130 89 138 95 138 104' +
      'C138 112 130 118 122 118C114 118 107 112 107 104Z"/>' +
      '<circle class="fc-eyes" cx="79" cy="105" r="7"/>' +
      '<circle class="fc-eyes" cx="121" cy="105" r="7"/>' +
      '<circle class="fc-white" cx="82" cy="102" r="2.4"/>' +
      '<circle class="fc-white" cx="124" cy="102" r="2.4"/>',
  ),
  part(
    'wide',
    'Wide',
    '<circle class="fc-white" cx="78" cy="104" r="17"/>' +
      '<circle class="fc-white" cx="122" cy="104" r="17"/>' +
      '<circle class="fc-eyes" cx="80" cy="105" r="8.5"/>' +
      '<circle class="fc-eyes" cx="120" cy="105" r="8.5"/>' +
      '<circle class="fc-white" cx="84" cy="101" r="3"/>' +
      '<circle class="fc-white" cx="124" cy="101" r="3"/>',
  ),
  part(
    'happy',
    'Happy',
    '<path class="fc-line fc-wide" d="M64 110C70 99 86 99 92 110"/>' +
      '<path class="fc-line fc-wide" d="M108 110C114 99 130 99 136 110"/>',
  ),
  part(
    'sleepy',
    'Sleepy',
    '<path class="fc-white" d="M62 104C62 97 70 92 78 92C86 92 93 97 93 104Z"/>' +
      '<path class="fc-white" d="M107 104C107 97 114 92 122 92C130 92 138 97 138 104Z"/>' +
      '<circle class="fc-eyes" cx="79" cy="101" r="6"/>' +
      '<circle class="fc-eyes" cx="121" cy="101" r="6"/>' +
      '<path class="fc-line fc-wide" d="M61 104H94"/>' +
      '<path class="fc-line fc-wide" d="M106 104H139"/>',
  ),
  part(
    'wink',
    'Wink',
    '<path class="fc-white" d="M62 104C62 95 70 89 78 89C86 89 93 95 93 104C93 112 86 118 78 118' +
      'C70 118 62 112 62 104Z"/>' +
      '<circle class="fc-eyes" cx="79" cy="105" r="7"/>' +
      '<circle class="fc-white" cx="82" cy="102" r="2.4"/>' +
      '<path class="fc-line fc-wide" d="M108 108C114 98 130 98 136 108"/>',
  ),
  part(
    'cross',
    'Cross',
    '<path class="fc-line fc-wide" d="M68 95L90 114M90 95L68 114"/>' +
      '<path class="fc-line fc-wide" d="M110 95L132 114M132 95L110 114"/>',
  ),
  part(
    'closed',
    'Closed',
    '<path class="fc-line fc-wide" d="M63 104C70 112 86 112 93 104"/>' +
      '<path class="fc-line fc-wide" d="M107 104C114 112 130 112 137 104"/>',
  ),
  part(
    'dot',
    'Dot',
    '<ellipse class="fc-ink" cx="79" cy="105" rx="5.5" ry="7.5"/>' +
      '<ellipse class="fc-ink" cx="121" cy="105" rx="5.5" ry="7.5"/>' +
      '<circle class="fc-white" cx="81" cy="102" r="1.9"/><circle class="fc-white" cx="123" cy="102" r="1.9"/>',
  ),
  part(
    'star',
    'Star',
    `<path class="fc-accent" d="${star(78, 105, 13)}"/><path class="fc-accent" d="${star(122, 105, 13)}"/>`,
  ),
  part(
    'angry',
    'Angry',
    '<path class="fc-white" d="M62 100L93 109C93 115 86 119 78 119C70 119 62 113 62 100Z"/>' +
      '<path class="fc-white" d="M138 100L107 109C107 115 114 119 122 119C130 119 138 113 138 100Z"/>' +
      '<circle class="fc-eyes" cx="80" cy="111" r="5.5"/><circle class="fc-eyes" cx="120" cy="111" r="5.5"/>',
  ),
];

// ---------------------------------------------------------------- nose

export const NOSES: readonly Part[] = [
  part('button', 'Button', '<path class="fc-line fc-wide" d="M95 122C99 127 106 127 110 122"/>'),
  part(
    'hook',
    'Hook',
    '<path class="fc-line fc-wide" d="M99 104C99 114 106 120 108 124C110 129 103 131 97 128"/>',
  ),
  part(
    'wide',
    'Wide',
    '<path class="fc-line fc-wide" d="M89 120C92 128 108 128 111 120"/>' +
      '<circle class="fc-ink" cx="91" cy="124" r="2.2"/>' +
      '<circle class="fc-ink" cx="109" cy="124" r="2.2"/>',
  ),
  part('sharp', 'Sharp', '<path class="fc-line fc-wide" d="M100 103L108 125L96 126"/>'),
];

// ---------------------------------------------------------------- mouth

export const MOUTHS: readonly Part[] = [
  part('smile', 'Smile', '<path class="fc-line fc-wide" d="M80 142C89 154 111 154 120 142"/>'),
  part(
    'grin',
    'Grin',
    '<path class="fc-mouth" d="M76 140C88 137 112 137 124 140C122 156 108 163 100 163' +
      'C92 163 78 156 76 140Z"/>' +
      '<path class="fc-white" d="M78 141C89 138 111 138 122 141L121 146C110 143 90 143 79 146Z"/>',
  ),
  part('flat', 'Flat', '<path class="fc-line fc-wide" d="M82 146H118"/>'),
  part(
    'open',
    'Open',
    '<path class="fc-mouth" d="M100 134C112 134 120 141 120 149C120 158 111 164 100 164' +
      'C89 164 80 158 80 149C80 141 88 134 100 134Z"/>',
  ),
  part('smirk', 'Smirk', '<path class="fc-line fc-wide" d="M82 148C94 152 112 148 120 138"/>'),
  part('oh', 'Oh', '<ellipse class="fc-mouth" cx="100" cy="148" rx="11" ry="14"/>'),
  part('frown', 'Frown', '<path class="fc-line fc-wide" d="M82 153C90 142 110 142 118 153"/>'),
  part(
    'tongue',
    'Tongue',
    '<path class="fc-mouth" d="M78 140H122C120 154 110 160 100 160C90 160 80 154 78 140Z"/>' +
      '<path class="fc-tongue" d="M89 150C89 166 111 166 111 150C104 146 96 146 89 150Z"/>',
  ),
  part(
    'teeth',
    'Teeth',
    '<path class="fc-white" d="M78 140H122V150C122 154 118 156 114 156H86C82 156 78 154 78 150Z"/>' +
      '<path class="fc-line" d="M78 148H122M89 140V156M100 140V156M111 140V156"/>',
  ),
];

// ---------------------------------------------------------------- the rest

export const BEARDS: readonly Part[] = [
  part(
    'stubble',
    'Stubble',
    '<path class="fc-dots" d="M52 122C56 154 74 177 100 177C126 177 144 154 148 122' +
      'C144 146 128 158 100 158C72 158 56 146 52 122Z"/>',
  ),
  part(
    'moustache',
    'Moustache',
    '<path class="fc-hair" d="M100 132C110 124 126 126 128 134C130 142 116 144 100 137' +
      'C84 144 70 142 72 134C74 126 90 124 100 132Z"/>',
  ),
  part(
    'goatee',
    'Goatee',
    '<path class="fc-hair" d="M86 150C92 147 108 147 114 150C116 162 110 172 100 172' +
      'C90 172 84 162 86 150Z"/>',
  ),
  part(
    'full',
    'Full',
    '<path class="fc-hair" d="M52 118C56 156 76 178 100 178C124 178 144 156 148 118' +
      'C144 134 134 142 126 134C118 150 82 150 74 134C66 142 56 134 52 118Z"/>',
  ),
];

export const GLASSES: readonly Part[] = [
  part(
    'round',
    'Round',
    '<circle class="fc-line fc-thick" cx="78" cy="104" r="20"/>' +
      '<circle class="fc-line fc-thick" cx="122" cy="104" r="20"/>' +
      '<path class="fc-line fc-thick" d="M98 104H102M58 100L44 96M142 100L156 96"/>',
  ),
  part(
    'square',
    'Square',
    '<path class="fc-line fc-thick" d="M57 92H99V116H57ZM101 92H143V116H101Z"/>' +
      '<path class="fc-line fc-thick" d="M99 102H101M57 96L44 94M143 96L156 94"/>',
  ),
  part(
    'shades',
    'Shades',
    '<path class="fc-accent" d="M56 90H98C98 112 88 120 76 120C63 120 56 110 56 90Z"/>' +
      '<path class="fc-accent" d="M102 90H144C144 110 137 120 124 120C112 120 102 112 102 90Z"/>' +
      '<path class="fc-line fc-thick" d="M56 90H144M98 96H102M56 92L44 90M144 92L156 90"/>',
  ),
  part(
    'monocle',
    'Monocle',
    '<circle class="fc-line fc-thick" cx="122" cy="104" r="21"/>' +
      '<path class="fc-line fc-thick" d="M122 125C124 140 132 148 142 150"/>',
  ),
];

export const HEADWEAR: readonly Part[] = [
  part(
    'cap',
    'Cap',
    '<path class="fc-accent" d="M40 74C40 44 66 24 100 24C134 24 160 44 160 74' +
      'C140 66 120 62 100 62C80 62 60 66 40 74Z"/>' +
      '<path class="fc-accent" d="M158 70C176 70 188 78 188 86C170 88 150 84 141 78Z"/>' +
      '<path class="fc-line fc-thick" d="M100 24V62"/>',
  ),
  part(
    'beanie',
    'Beanie',
    '<path class="fc-accent" d="M38 82C38 48 64 24 100 24C136 24 162 48 162 82' +
      'C140 74 120 70 100 70C80 70 60 74 38 82Z"/>' +
      '<path class="fc-accent" d="M36 80C40 92 44 96 44 96C64 88 136 88 156 96' +
      'C156 96 160 92 164 80C140 72 60 72 36 80Z"/>',
  ),
  part(
    'band',
    'Band',
    '<path class="fc-accent" d="M40 76C60 66 140 66 160 76C160 84 159 88 158 92' +
      'C138 82 62 82 42 92C41 88 40 84 40 76Z"/>',
  ),
  part(
    'crown',
    'Crown',
    '<path class="fc-accent" d="M48 70L44 26L68 44L100 16L132 44L156 26L152 70' +
      'C130 60 70 60 48 70Z"/>',
  ),
  part(
    'beret',
    'Beret',
    '<path class="fc-accent" d="M34 70C34 44 62 28 98 28C134 28 164 40 166 60C168 74 150 78 100 76' +
      'C64 76 42 82 34 70Z"/>' +
      '<path class="fc-line fc-thick" d="M100 28C100 20 105 16 110 18"/>',
  ),
  part(
    'tophat',
    'Top hat',
    '<path class="fc-ink" d="M62 64V14C62 10 66 8 70 8H130C134 8 138 10 138 14V64Z"/>' +
      '<path class="fc-accent" d="M62 48H138V60H62Z"/>' +
      '<path class="fc-ink" d="M28 70C28 62 58 58 100 58C142 58 172 62 172 70C172 77 142 79 100 79' +
      'C58 79 28 77 28 70Z"/>',
  ),
  part(
    'headphones',
    'Headphones',
    '<path class="fc-line fc-thick" d="M44 104C40 50 66 22 100 22C134 22 160 50 156 104"/>' +
      '<rect class="fc-accent" x="27" y="90" width="23" height="38" rx="9"/>' +
      '<rect class="fc-accent" x="150" y="90" width="23" height="38" rx="9"/>',
  ),
];

export const EARRINGS: readonly Part[] = [
  part(
    'hoop',
    'Hoop',
    '<circle class="fc-line fc-accent-line" cx="42" cy="132" r="8"/>' +
      '<circle class="fc-line fc-accent-line" cx="158" cy="132" r="8"/>',
  ),
  part(
    'stud',
    'Stud',
    '<circle class="fc-accent" cx="42" cy="126" r="5"/>' +
      '<circle class="fc-accent" cx="158" cy="126" r="5"/>',
  ),
  part(
    'drop',
    'Drop',
    '<path class="fc-line fc-accent-line" d="M42 124V132"/>' +
      '<path class="fc-accent" d="M42 132C48 132 50 140 46 145C43 149 41 149 38 145C34 140 36 132 42 132Z"/>' +
      '<path class="fc-line fc-accent-line" d="M158 124V132"/>' +
      '<path class="fc-accent" d="M158 132C164 132 166 140 162 145C159 149 157 149 154 145C150 140 152 132 158 132Z"/>',
  ),
];

export const CHEEKS: readonly Part[] = [
  part(
    'blush',
    'Blush',
    '<ellipse class="fc-dots" cx="62" cy="130" rx="13" ry="8"/>' +
      '<ellipse class="fc-dots" cx="138" cy="130" rx="13" ry="8"/>',
  ),
  part(
    'freckles',
    'Freckles',
    '<circle class="fc-ink" cx="66" cy="126" r="1.8"/><circle class="fc-ink" cx="74" cy="132" r="1.8"/>' +
      '<circle class="fc-ink" cx="60" cy="134" r="1.8"/><circle class="fc-ink" cx="70" cy="139" r="1.6"/>' +
      '<circle class="fc-ink" cx="134" cy="126" r="1.8"/><circle class="fc-ink" cx="126" cy="132" r="1.8"/>' +
      '<circle class="fc-ink" cx="140" cy="134" r="1.8"/><circle class="fc-ink" cx="130" cy="139" r="1.6"/>',
  ),
  part(
    'lines',
    'Lines',
    '<path class="fc-line" d="M58 126C62 132 62 136 59 140"/>' +
      '<path class="fc-line" d="M66 128C70 134 70 138 67 142"/>' +
      '<path class="fc-line" d="M142 126C138 132 138 136 141 140"/>' +
      '<path class="fc-line" d="M134 128C130 134 130 138 133 142"/>',
  ),
];

export const MARKS: readonly Part[] = [
  part(
    'bolt',
    'Bolt',
    '<path class="fc-accent" d="M140 118L128 138H136L130 154L146 132H137L143 118Z"/>',
  ),
  part(
    'star',
    'Star',
    '<path class="fc-accent" d="M138 122L143 133L155 134L146 142L149 154L138 148L127 154' +
      'L130 142L121 134L133 133Z"/>',
  ),
  part(
    'scar',
    'Scar',
    '<path class="fc-line fc-wide" d="M137 110L129 142"/>' +
      '<path class="fc-line fc-wide" d="M128 119L140 122M125 131L137 134"/>',
  ),
  part(
    'heart',
    'Heart',
    '<path class="fc-accent" d="M138 126C143 119 153 122 153 130C153 138 143 145 138 150' +
      'C133 145 123 138 123 130C123 122 133 119 138 126Z"/>',
  ),
  part(
    'plaster',
    'Plaster',
    '<g transform="rotate(-24 133 132)"><rect class="fc-plaster" x="116" y="126" width="34" height="12" rx="4"/>' +
      '<path class="fc-line" d="M129 129V135M137 129V135"/></g>',
  ),
];

/**
 * What they are wearing: a neck and a pair of shoulders.
 *
 * A head on its own is an emoji; a head on shoulders is a person, and a profile card or a
 * notebook cover wants a person. Drawn behind the head, so the chin sits over the neck.
 */
export const OUTFITS: readonly Part[] = [
  part(
    'tee',
    'Tee',
    '<path class="fc-skin" d="M84 158H116V196H84Z"/>' +
      '<path class="fc-cloth" d="M18 224C20 200 40 188 70 184C80 197 120 197 130 184C160 188 180 200 182 224Z"/>' +
      '<path class="fc-line" d="M74 186C84 199 116 199 126 186"/>',
  ),
  part(
    'hoodie',
    'Hoodie',
    '<path class="fc-skin" d="M86 158H114V194H86Z"/>' +
      '<path class="fc-cloth" d="M14 224C16 198 36 184 60 178C56 191 64 205 100 207C136 205 144 191 140 178' +
      'C164 184 184 198 186 224Z"/>' +
      '<path class="fc-line" d="M60 178C66 196 84 205 100 207C116 205 134 196 140 178"/>' +
      '<path class="fc-line" d="M90 207L88 224M110 207L112 224"/>',
  ),
  part(
    'collar',
    'Collar',
    '<path class="fc-skin" d="M86 158H114V196H86Z"/>' +
      '<path class="fc-cloth" d="M18 224C20 200 40 188 72 184L100 206L128 184C160 188 180 200 182 224Z"/>' +
      '<path class="fc-white" d="M72 184L100 206L86 215L64 192Z"/>' +
      '<path class="fc-white" d="M128 184L100 206L114 215L136 192Z"/>',
  ),
  part(
    'jacket',
    'Jacket',
    '<path class="fc-skin" d="M86 158H114V196H86Z"/>' +
      '<path class="fc-white" d="M76 186H124L100 224Z"/>' +
      '<path class="fc-cloth" d="M16 224C18 200 38 188 70 184L96 224Z"/>' +
      '<path class="fc-cloth" d="M184 224C182 200 162 188 130 184L104 224Z"/>' +
      '<path class="fc-line" d="M70 184L85 205M130 184L115 205"/>',
  ),
];

/** Everything, by slot, so the studio can build its own pickers without a second list. */
export const CATALOGUE = {
  outfit: OUTFITS,
  shape: SHAPES,
  ears: EARS,
  hair: HAIR,
  brows: BROWS,
  eyes: EYES,
  nose: NOSES,
  mouth: MOUTHS,
  beard: BEARDS,
  glasses: GLASSES,
  headwear: HEADWEAR,
  earring: EARRINGS,
  cheeks: CHEEKS,
  mark: MARKS,
} as const;
