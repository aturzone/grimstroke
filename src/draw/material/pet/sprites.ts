/**
 * The pets, drawn by hand: every part and every frame, as text, one letter per pixel.
 *
 * STYLE -- Stardew Valley's pets are the reference for the style, not for the pixels: nothing here
 * is traced or copied. What is taken is how they are made: a small grid shown at a whole-number
 * scale; a big head on a short body; an outline that is a dark shade of the fur, not black; three
 * tones per material, lit from the upper left; eyes as two dark pixels; a pink nose and inner ear;
 * a soft contact shadow; a tail wrapped round the feet. And the thing that made the old sit look
 * wrong: a pet at rest FACES YOU -- sitting, blinking, yawning, washing, sleeping -- and turns
 * side-on only to walk, run, stretch or eat.
 *
 * The grid is 32 x 28; the paws stand on row 25 and the shadow lies on row 26.
 *
 * FORMAT -- `== name x= y=` starts a part; its rows are placed with their top-left at (x, y).
 * `@part dx dy` draws another part first, moved by (dx, dy); `@part~` draws it in the shade tones,
 * for a far leg. `.` is nothing and `_` clears a pixel. Frames are the parts named
 * `cat.<pose>.<n>` and `dog.<pose>.<n>`; a pricked-eared dog swaps in the parts ending in `U`.
 *
 * LETTERS -- roles, not colours (art.ts colours them for a coat):
 *   o outline   l f d fur, light to dark   s S tabby stripe   w v cream   b B belly
 *   a A paws    P p q tail and ear backs (a Siamese's points)   L F saddle (a beagle's back)
 *   t inner ear   u pupil   e eye   n nose   m mouth   r tongue   g shadow
 */

export const ART = String.raw`
== fhead x=7 y=7
...oo........oo...
..otto......otto..
..otpoooooooopto..
..oflllsllslllfo..
..ofllllssllllfo..
.oflllullllulllfo.
.oflllellllelllfo.
.olfflwwnnwwlffdo.
..offfwwwwwwffdo..
...oddfwwwwfddo...

== fhalf x=7 y=12
......d....d......
......o....o......

== fshut x=7 y=12
......l....l......
.....oo....oo.....

== fhappy x=7 y=12
......o....o......
.....olo..olo.....
..t............t..

== fup x=7 y=11
......u....u......
......e....e......
......l....l......

== fyawn1 x=7 y=12
......l....l......
.....oo....oo.....
........oo........
........mm........

== fyawn2 x=7 y=12
......l....l......
.....oo....oo.....
.......mnnm.......
.......mrrm.......
........mm........

== ftongue x=7 y=12
......l....l......
.....oo....oo.....
..................
........rr........

== fbody x=7 y=17
...olffwwwwffdo...
..olfffwwwwfffdo..
..olfffvwwvfffdo..
.olffdlfvvlfdffdo.
.olsfdlffdlfdsfdo.
.olfsdlffdlfdfsdooo.
.olffdlffdlfdfdoqqqo
.oldfdaffdooooooqqpo
..oooaaaaoqqqqqqqpo.
...gggooooooooooog..

== fflick1 x=7 y=21
..................oo
.................opo
.................opo
...............oo.o.

== fflick2 x=7 y=20
.................o..
................opo.
................opo.
................opo.
...............oo...

== fpaw x=7 y=17
..........oooo....
.........oaaaao...
.........oaavao...
..........ofloo...
..........oflo....
..........oflo....
..........oflo....
..........odfo....

== fbodyw x=7 y=17
...olffwwwwffdo...
..olfffwwwwfffdo..
..olfffvwwvfffdo..
.olffdlfvvffdffdo.
.olsfdlffdfffsfdo.
.olfsdlffdffffsdooo.
.olffdlffdffffdoqqqo
.oldfdaffdooooooqqpo
..oooaaaaoqqqqqqqpo.
...gggooooooooooog..

== cat.sit.0
@fbody
@fhead

== cat.sit.1
@fbody
@fhead 0 1

== cat.blink.0
@fbody
@fhead
@fhalf

== cat.blink.1
@fbody
@fhead
@fshut

== cat.blink.2
@fbody
@fhead
@fhalf

== cat.flick.0
@fbody
@fhead
@fflick1

== cat.flick.1
@fbody
@fhead
@fflick2

== cat.flick.2
@fbody
@fhead
@fflick1

== cat.flick.3
@fbody
@fhead

== cat.happy.0
@fbody
@fhead
@fhappy

== cat.happy.1
@fbody
@fhead 0 1
@fhappy 0 1

== cat.look.0
@fbody
@fhead
@fup

== cat.yawn.0
@fbody
@fhead
@fshut

== cat.yawn.1
@fbody
@fhead
@fyawn1

== cat.yawn.2
@fbody
@fhead
@fyawn2

== cat.yawn.3
@fbody
@fhead
@fyawn1

== cat.wash.0
@fbodyw
@fhead
@fpaw 0 0

== cat.wash.1
@fbodyw
@fhead
@fpaw 0 -1
@ftongue

== cat.wash.2
@fbodyw
@fhead 1 0
@fpaw 0 -2
@fshut 1 0

== cat.wash.3
@fbodyw
@fhead
@fpaw 0 -1
@ftongue

== cat.lick.0
@fbody
@fhead 0 2
@fshut 0 2

== cat.lick.1
@fbody
@fhead 0 3
@ftongue 0 3

== cat.lick.2
@fbody
@fhead 0 3
@fshut 0 3

== cat.lick.3
@fbody
@fhead 0 3
@ftongue 0 3

== chead x=16 y=9
..o.....o...
.oto...oto..
.otpoooopto.
.ofllllllfo.
offllllllllo
offlllllulwo
offllllllewn
odfffllllwwo
.oddfffwwwo.
..oooooooo..

== cbody x=7 y=14
..oooooooooo.
.ollllllllllo
olffsffsfffffo
offsfffsffffdo
offffffffffddo
odffffffffffdo
.oddbbbbbbdddo
..oo......ooo.

== ctail x=1 y=5
..oo...
.oPpo..
.opoo..
.opo...
.opo...
..opo..
..opo..
...opo.
...opo.
....opoo
.....opo
......oo

== legS
olfo
olfo
olfo
oaao
oooo

== legF
.olfo
olfo.
olfo.
oaao.
oooo.

== legB
olfo.
.olfo
.olfo
.oaao
.oooo

== cat.walk.0
@gsh
@legB~ 9 21
@legF~ 16 21
@ctail
@cbody
@legF 7 21
@legB 17 21
@chead

== cat.walk.1
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead

== cat.walk.2
@gsh
@legF~ 9 21
@legB~ 16 21
@ctail
@cbody
@legB 7 21
@legF 17 21
@chead

== cat.walk.3
@gsh
@legS~ 8 21
@legS~ 17 21
@ctail
@cbody
@legS 10 21
@legS 16 21
@chead

== gsh x=6 y=26
gggggggggggggggg

== ctaillow x=0 y=12
.oo......
oPpo.....
.oPpoo...
..ooPpoo.
....ooppo
......ooo

== legXF
olfo..
.olfo.
..olfo
..oaao
..oooo

== legXB
..olfo
.olfo.
olfo..
oaao..
oooo..

== legT
olfo
oaao
oooo

== cat.run.0
@gsh
@legXB~ 8 21
@legXF~ 15 21
@ctaillow
@cbody
@legXB 6 21
@legXF 17 21
@chead

== cat.run.1
@gsh
@legS~ 11 20
@legS~ 14 20
@ctaillow 0 -1
@cbody 0 -1
@legS 9 20
@legS 16 20
@chead 0 -1

== cat.run.2
@gsh
@legXF~ 8 21
@legXB~ 15 21
@ctaillow
@cbody
@legXB 7 21
@legXF 16 21
@chead

== cat.run.3
@gsh
@legS~ 10 20
@legS~ 15 20
@ctaillow 0 -2
@cbody 0 -2
@legS 8 19
@legS 17 19
@chead 0 -2

== cat.crouch.0
@gsh
@legT~ 10 23
@legT~ 17 23
@ctaillow 0 3
@cbody 0 3
@legT 8 23
@legT 18 23
@chead 0 3

== cat.leap.0
@legXB~ 7 18
@legXF~ 16 16
@ctaillow 0 -3
@cbody 0 -3
@legXB 5 18
@legXF 18 16
@chead 0 -4

== cat.land.0
@gsh
@legT~ 10 23
@legXF~ 16 21
@ctaillow 0 2
@cbody 0 2
@legT 8 23
@legXF 18 21
@chead 0 3

== chalf x=16 y=14
........d..
........o..

== cbow x=5 y=11
..ooooo............
.olllllooo.........
olffsfflllloo......
offsfffsffffllooo..
offffffffffffffllo.
odffffffffffffffflo
.oddbbbbbbbbbbbbbdo
..oooo.......oooo..

== ctailup x=0 y=3
..oo..
.oPpo.
.opoo.
.opo..
..opo.
..opo.
...opo
...opo
....oo

== cat.stretch.0
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead

== dhead x=6 y=5
......oooooooo......
....oollllllllfoo...
...ollllllllllllfo..
.oooolllllllllllfoooo
oqpqolllllllllllfoqpqo
oqpqollullllullffoqpqo
oqpqollellllellffoqpqo
oqqqofllwwwwwwlffoqqqo
.oqqofwwwwnnwwwwfoqqo.
..ooofwwwwnnwwwwdooo..
....ofwwwwwwwwwwdo....
.....odwwwmmwwwddo....
......oowwwwwwwoo.....

== dtongue x=6 y=16
..........orro......
..........orro......
...........oo.......

== dbody x=7 y=16
.....olfwwwwfdo....
....olffwwwwffdo...
...olfffwwwwfffdo..
...olffdlffldffdo..
..olfffdlffldfffdo.
..olfffdlffldfffdo.
..olfffdlffldfffdo.
..oldffdlffldffddo.
..oldffdaffadffddo.
...oooooaaooaaooooo
....ggggggggggggggg

== dtail x=8 y=17
..................oo.
.................oplo
.................opo.
................opo..
...............opo...

== dtail2 x=8 y=16
...................oo
..................oplo
.................opo.
................opo..
...............opo...
...............oo....

== dog.sit.0
@dtail
@dbody
@dhead
@dtongue

== dog.sit.1
@dtail2
@dbody
@dhead 0 1
@dtongue 0 1

== dshead x=17 y=7
...oooooo.....
..olllllloo...
.ollllllllloo.
.oqqollllulloo
oqpqollllewwwoo
oqpqoflllwwwwno
oqpqofllwwwwwno
oqqqoffddwwwwo.
.oqqodffdmmmoo.
..ooo.ooooooo..

== dstail x=0 y=4
.oo.....
oPpo....
.opo....
.opPo...
..opo...
..opPo..
...opo..
...opPo.
....opoo
.....opo
......oo

== dstailw x=0 y=5
........
oo......
oPpoo...
.oopPo..
...opPo.
....opPo
.....opo
......oo

== dgsh x=3 y=26
ggggggggggggggggggggggggg

== dheadU x=6 y=3
...o..............o...
..oLo............oLo..
..oLvo..........ovLo..
.oLvvFo........oFvvLo.
.oLLLLooooooooooLLLFo.
..olllllllllllllllfo..
...olwwllllllllwwfo...
...owwwullllllulwwo...
...owwwellllllelwwo...
...owwwwwwwwwwwwwwo...
....owwwwwnnwwwwwo....
....owwwwwnnwwwwdo....
....ofwwwwwwwwwwdo....
.....odwwwmmwwwddo....
......oowwwwwwwoo.....

== dsheadU x=17 y=5
...oo.........
..otto........
..otFoooo.....
..oLLLLLLoo...
.oLLLLLLLLLoo.
.olllllllulloo
ollllllllewwwoo
offllllllwwwwno
offdllllwwwwwno
odddffddwwwwo..
.oodffdmmmoo...
..oooooooooo...

== dstailU x=2 y=5
..oooo..
.oPPPpo.
oPpooPpo
opo..opo
oPo..opo
.opoopo.
..oooo..

== dstailwU x=2 y=5
..oooo..
.oPPPpo.
oPpooPpo
opo..opo
oPo..opo
.opoopo.
..oooo..

== dhalf x=6 y=10
.......d....d.........
.......o....o.........

== dshut x=6 y=10
.......l....l.........
......oo....oo........

== dhappy x=6 y=10
.......o....o.........
......olo..olo........

== dup x=6 y=9
.......u....u.........
.......e....e.........
.......l....l.........

== dyawn x=6 y=15
.........ommmmo.......
.........omrrmo.......
..........oooo........

== dlick x=6 y=13
..........or..........
..........rr..........

== dtail3 x=8 y=18
.................oo..
................oplo.
...............opo...
..............opo....

== dog.blink.0
@dtail
@dbody
@dhead
@dhalf

== dog.blink.1
@dtail
@dbody
@dhead
@dshut

== dog.blink.2
@dtail
@dbody
@dhead
@dhalf

== dog.flick.0
@dtail2
@dbody
@dhead
@dtongue

== dog.flick.1
@dtail3
@dbody
@dhead
@dtongue

== dog.flick.2
@dtail2
@dbody
@dhead
@dtongue

== dog.flick.3
@dtail
@dbody
@dhead
@dtongue

== dog.happy.0
@dtail2
@dbody
@dhead
@dhappy
@dtongue

== dog.happy.1
@dtail3
@dbody
@dhead 0 1
@dhappy 0 1
@dtongue 0 1

== dog.look.0
@dtail
@dbody
@dhead
@dup

== dog.yawn.0
@dtail
@dbody
@dhead
@dshut

== dog.yawn.1
@dtail
@dbody
@dhead
@dshut
@dtongue

== dog.yawn.2
@dtail
@dbody
@dhead
@dshut
@dyawn

== dog.yawn.3
@dtail
@dbody
@dhead
@dshut
@dtongue

== dog.wash.0
@dtail
@dbody
@dhead -1 0
@dshut -1 0

== dog.wash.1
@dtail2
@dbody
@dhead 1 0
@dshut 1 0

== dog.wash.2
@dtail
@dbody
@dhead -1 0
@dshut -1 0

== dog.wash.3
@dtail3
@dbody
@dhead

== dog.lick.0
@dtail
@dbody
@dhead
@dlick

== dog.lick.1
@dtail
@dbody
@dhead
@dshut
@dlick 0 -1

== dog.lick.2
@dtail
@dbody
@dhead
@dlick

== dog.lick.3
@dtail
@dbody
@dhead
@dhalf

== dstaillow x=0 y=10
oo.......
oPo......
.oPpoo...
..ooPpoo.
....ooppo
......ooo

== dsshut x=17 y=10
.........l....
........oo....

== dbow x=3 y=10
..oooooo.............
.oLLLLLLooooo........
oLFFFFFFLLLLLoooo....
oFFFFFFFFFFFFLLLLooo.
offffffffffffffffflo.
odffffffffffffffffflo
.oddbbbbbbbbbbbbbbbdo
..oooo..........oooo.

== dstailup x=0 y=1
.oo....
oPpo...
.opo...
.opPo..
..opo..
..opPo.
...opo.
...opPo
....ooo

== dhalfU x=6 y=10
.......d......d.......
.......o......o.......

== dshutU x=6 y=10
.......w......w.......
......oo......oo......

== dhappyU x=6 y=10
.......o......o.......
......owo....owo......

== dupU x=6 y=9
.......u......u.......
.......e......e.......
.......w......w.......

# ---------------------------------------------------------------- second pass (the dog's legs,
# the cat eating, stretching and asleep)
# A dog side-on, second pass. The walk is the chunky kind small sprites use: legs stay upright and
# only their feet travel -- planted, reaching forward (lifted a pixel), pushing back -- in diagonal
# pairs (near hind with far fore), with the body dipping a pixel at each contact.

== dbody2 x=4 y=12
..oooooooooooooo..
.oLLLLLLLLLLLLLLo.
oLFFFFFFFFFFFFFFFo
oFFFFFFFFFFFFFFFFo
offfffffffffffffdo
odffffffffffffffdo
.odffbbbbbbbbffddo
..oooo.......oddo.

== dLP
olffo.
olffo.
olffo.
olffo.
oaaaao
oooooo

== dLF
olffo..
olffo..
.olffo.
.oaaaao
.oooooo

== dLB
..olffo
..olffo
.olffo.
.olffo.
oaaaao.
oooooo.

== dLT
olffo.
.olffo
.oaaao
.ooooo

== dog.walk.0
@dgsh
@dLF~ 8 20
@dLB~ 18 20
@dstail
@dbody2 0 1
@dLB 4 20
@dLF 16 20
@dshead 0 1

== dog.walk.1
@dgsh
@dLP~ 8 20
@dLP~ 18 20
@dstailw
@dbody2
@dLP 5 20
@dLP 16 20
@dshead

== dog.walk.2
@dgsh
@dLB~ 7 20
@dLF~ 18 20
@dstail
@dbody2 0 1
@dLF 5 20
@dLB 15 20
@dshead 0 1

== dog.walk.3
@dgsh
@dLP~ 8 20
@dLP~ 18 20
@dstailw
@dbody2
@dLP 5 20
@dLP 16 20
@dshead

== dog.run.0
@dgsh
@dLB~ 5 20
@dLF~ 19 20
@dstaillow
@dbody2
@dLB 2 20
@dLF 17 20
@dshead

== dog.run.1
@dgsh
@dLT~ 9 19
@dLT~ 15 19
@dstaillow 0 -2
@dbody2 0 -2
@dLT 7 19
@dLT 13 19
@dshead 0 -2

== dog.run.2
@dgsh
@dLF~ 9 20
@dLP~ 17 20
@dstaillow
@dbody2 0 1
@dLF 7 20
@dLP 15 20
@dshead 0 1

== dog.run.3
@dgsh
@dLT~ 8 19
@dLT~ 16 19
@dstaillow 0 -1
@dbody2 0 -1
@dLT 6 19
@dLT 14 19
@dshead 0 -1

# The cat eating: the head drops to the shoulder's height, so the back runs straight into it, and
# the muzzle reaches down to the bowl; the second frame is the chew.

== cat.eat.0
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead 2 5

== cat.eat.1
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead 2 6

# The play bow: rear up on long hind legs, chest down, the forearms lying forward on the ground in
# front of it and the head resting over them.

== legReach
.ooooooooo.
olllllllffo
offffffaaao
.oooooooooo

== legLonger
olfo
olfo
olfo
olfo
olfo
olfo
olfo
olfo
oaao
oooo

== cat.stretch.1
@gsh
@legLonger~ 8 16
@legReach~ 18 22
@ctailup 2 -2
@cbow 0 -2
@legLonger 6 16
@legReach 21 22
@chead 0 5

== cat.stretch.2
@gsh
@legLonger~ 8 16
@legReach~ 18 22
@ctailup 2 -2
@cbow 0 -2
@legLonger 6 16
@legReach 21 22
@chead 0 6

# The dog eating and bowing, drawn as the cat's now are: the same body and legs as its walk, the
# head lowered to the shoulder so the back runs into it, and a play bow with the forearms reaching.

== dog.eat.0
@dgsh
@dLP~ 8 20
@dLP~ 18 20
@dstail
@dbody2
@dLP 5 20
@dLP 16 20
@dshead 2 5

== dog.eat.1
@dgsh
@dLP~ 8 20
@dLP~ 18 20
@dstailw
@dbody2
@dLP 5 20
@dLP 16 20
@dshead 2 6

== dLL
olffo
olffo
olffo
olffo
olffo
olffo
olffo
olffo
oaaaao
oooooo

== dReach
.oooooooooo.
olllllllfffo
offfffffaaao
.ooooooooooo

== dog.stretch.1
@dgsh
@dLL~ 7 16
@dReach~ 16 22
@dstailup 0 -2
@dbow 0 -2
@dLL 4 16
@dReach 19 22
@dshead 0 6

== dog.stretch.2
@dgsh
@dLL~ 7 16
@dReach~ 16 22
@dstailup 0 -2
@dbow 0 -2
@dLL 4 16
@dReach 19 22
@dshead 0 7

== dog.stretch.0
@dgsh
@dLP~ 8 20
@dLP~ 18 20
@dstail
@dbody2
@dLP 5 20
@dLP 16 20
@dshead

# ---------------------------------------------------------------- third pass (the loaf, the
# dog's jump, asleep, a Siamese's mask)
# A Siamese's heads: the same drawings with its points' mask, a soft oval over the muzzle that
# rises round the eyes -- x its edge, y its middle -- so it reads as points and not a moustache.

== fheadP x=7 y=7
...oo........oo...
..otto......otto..
..otpoooooooopto..
..ofllllllllllfo..
..ofllllxxllllfo..
.oflxxuxxxxuxxlfo.
.oflxyeyyyyeyxlfo.
.olfxyyynnyyyxfdo.
..offxyyyyyyxfdo..
...oddfxyyxfddo...

== cheadP x=16 y=9
..o.....o...
.oto...oto..
.otpoooopto.
.ofllllllfo.
offllllxxxlo
offllllxuyyo
offlllxyyeyn
odfffllxyyyo
.oddffxxyyo.
..oooooooo..

# The loaf, side-on: a round, compact body with its paws folded under the chest and its tail laid
# along the front, the head up, the eyes half shut.

== cloafB x=5 y=15
.......oooooo.....
.....oolllllloo...
....ollsllsllllo..
...olfsffsfffffo..
..olffsffsffffffo.
..offffffffffffffo
.offffffffffffffdo
.offffffffffffffdo
.odfffffffffffffdo
.oddffffffffffdddo
..oooooooooooooooo

== ctailwrap x=4 y=21
.oo..............
oPpo.............
oPpooooooooooo...
.oqpppppppppppo..
..ooooooooooooo..

== cfold x=18 y=22
.oooooo.
oaaoaaao
oooooooo

== cat.loaf.0
@gsh
@cloafB
@ctailwrap
@chead 0 4
@chalf 0 4
@cfold

# A dog's loaf is a sphinx: the haunch a round bump at the back, the forelegs laid out in front,
# the head up and looking.

== dloafB x=3 y=16
.......oooooooooooo...
.....ooLLLLLLLLLLLLoo.
...ooLLFFFFFFFFFFFFLLo
..oLFFFFFFFFFFFFFFFFFo
.oLFFFfffffffffffffffdo
.offfdoffffffffffffffdo
.offdfffoffffffffffffdo
.offdfffoffffffffffffdo
.odddfffoddfffffffffddo
.oaaoddoooooooooooooooo

== dfore x=19 y=23
.oooooooooo.
offfffffaaao
oooooooooooo

== dtailflat x=0 y=22
.oo.....
oPpoo...
.oqppoo.
..ooooo.

== dtailflatU x=5 y=12
..oooo..
.oPPPpo.
oPpooPpo
opo..opo
oPo..opo
.opoopo.
..oooo..

== dog.loaf.0
@dgsh
@dtailflat
@dloafB
@dfore
@dshead 0 5

# The dog's crouch, leap and land, on the body and legs it walks with.

== dLXF
olffo..
.olffo.
..olffo
..olffo
..oaaaao
..oooooo

== dLXB
..olffo
.olffo.
olffo..
olffo..
oaaaao.
oooooo.

== dLC
olffo.
oaaaao
oooooo

== dcrouchB x=3 y=12
..oooooo............
.oLLLLLLoo..........
oLFFFFFFFLoo........
oFFFFFFFFFFLooo.....
oFFFFFFFFFFFFLLoo...
offfFFFFFFFFFFFFLo..
offfffffffffffffffo.
offfdddoffffffffffdo
ofdfffffofffffffffdo
ofdffffffoffffffffdo
odffffffoddbbbbbbddo
.oddddfoo.oooooooooo
.oaaaaaao...........
.oooooooo...........

== dog.crouch.0
@dgsh
@dstaillow 0 1
@dcrouchB
@dfore
@dshead 0 7

== dog.leap.0
@dLXB~ 6 16
@dLXF~ 17 14
@dstaillow 0 -4
@dbody2 0 -4
@dLXB 3 16
@dLXF 15 14
@dshead 0 -5

== dog.land.0
@dgsh
@dLT~ 8 22
@dLXF~ 18 20
@dstaillow 0 2
@dbody2 0 2
@dLT 5 22
@dLXF 16 20
@dshead 0 3

# Asleep, curled on its side: the back rounded over, the haunch drawn in, the tail wrapped round
# the front, the head laid low on the forepaws with its eyes shut. The second frame is the breath:
# the back rises a pixel.

== csleepB x=3 y=13
........oooooo........
......oollllllloo.....
.....olllllllllllo....
....ollsllsllsllllo...
...olffsffsffsfffffo..
..olfffsffsffsffffffo.
..offffffffffffffffdo.
.offfffffffffffffffdo.
.offfffffffffffffffdo.
.odffffffffffffffffdo.
.oddfffffffffffffdddo.
..oddddffffffffddddo..
...ooooooooooooooooo..

== csleepR x=3 y=12
........oooooo........
......oollllllloo.....
.....olllllllllllo....

# Asleep, the ears laid flat and the head tucked low against the tail, well below the line of
# the back: a round mound with a face in it, where the loaf holds its head up with the ears pricked.

== csleepH x=14 y=18
.ooo.........
otppooooooo..
.oopllllllloo
..offllllllto
..offlllllllo
..offlloollwn
..odffflwwwwo
...oooooooooo

== csleepHP x=14 y=18
.ooo.........
otppooooooo..
.oopllllllloo
..offlllxxxto
..offllxxyyyo
..offlxooyyyn
..odffxyyyyyo
...oooooooooo

== cat.sleep.0
@gsh
@csleepB
@csleepT
@csleepH

== cat.sleep.1
@gsh
@csleepB
@csleepR
@csleepT
@csleepH

== dsleepB x=2 y=12
........oooooooo.......
.....oooLLLLLLLLooo....
....oLLLFFFFFFFFFFFo...
...oLFFFFFFFFFFFFFFFo..
..oLFFFFFFFFFFFFFFFFo..
..oFFFFFFFFFFFFFFFFFFo.
.oFFffffffffffffffffdo.
.offfffffffffffffffffdo
.offfdddffffffffffffddo
.offdfffdfffffffffffddo
.offdffffdffffffffffddo
.odddffffdfffffffffdddo
..odddddddddddffffdddo.
...ooooooooooooooooooo.

== dsleepR x=2 y=11
........oooooooo.......
.....oooLLLLLLLLooo....
....oLLLFFFFFFFFFFFo...

== dsleepT x=1 y=21
.oo..................
oPpo.................
oPpooooooooooooooo...
.oqppppppppppppppppo.
..oooooooooooooooooo.

== dog.sleep.0
@dgsh
@dsleepB
@dsleepT
@dshead 0 9
@dsshut 0 9

== dog.sleep.1
@dgsh
@dsleepB
@dsleepR
@dsleepT
@dshead 0 9
@dsshut 0 9

== csleepT x=2 y=21
.oo...............
oPpo..............
oPpoooooooooooooo.
.oqppppppppppppppo
..oooooooooooooooo
`;
