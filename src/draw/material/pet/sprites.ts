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

export const ART = String.raw`== fhead x=7 y=7

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

== gsh x=6 y=26
gggggggggggggggg

== chalf x=16 y=14
........d..
........o..

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

== dgsh x=3 y=26
ggggggggggggggggggggggggg

== dtongueU x=5 y=16
.........orro.........
.........orro.........
..........oo..........

== dheadU x=5 y=3
..oLLo..........oLLo..
..oLtLo........oLtLo..
..oLttLo......oLttLo..
..oLttLLooooooLLttLo..
..oLLLLLLLwwLLLLLLLo..
.oLLLLLLLwwwwLLLLLLLo.
.oLLwwwLLwwwwLLwwwLLo.
.oLwwuuwlwwwwlwuuwwLo.
.owwweewlwwwwlweewwwo.
.owwwwwwwwwwwwwwwwwwo.
..ovwwwwwwwwwwwwwwvo..
...ovwwwwwnnwwwwwvo...
....owwwwwwwwwwwwo....
.....owmwwwwwwmwo.....
......oooooooooo......

== dsheadU x=17 y=5
..oo...........
.oLLo..........
.oLtLoooo......
oLLtLLLLLoo....
oLLLLLLLLLLo...
oLlllllluwlo...
oLllllllewwoooo
olllllllwwwwwno
offlllwwwwwwwno
.offdwwwwmmmoo.
..oooowwwwoo...
......oooo.....

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

== dsshut x=17 y=10
.........l....
........oo....

== dhalfU x=5 y=10
.....oo........oo.....
.....ee........ee.....

== dshutU x=5 y=10
.....ww........ww.....
.....oo........oo.....

== dhappyU x=5 y=10
.....oo........oo.....
....owwo......owwo....

== dupU x=5 y=9
.....uu........uu.....
.....ee........ee.....
.....ww........ww.....

== legReach
# The play bow: rear up on long hind legs, chest down, the forearms lying forward on the ground in
# front of it and the head resting over them.
.ooooooooo.
olllllllffo
offffffaaao
.oooooooooo

== dReach
.oooooooooo.
olllllllfffo
offfffffaaao
.ooooooooooo

== fheadP x=7 y=7
# ---------------------------------------------------------------- third pass (the loaf, the
# dog's jump, asleep, a Siamese's mask)
# A Siamese's heads: the same drawings with its points' mask, a soft oval over the muzzle that
# rises round the eyes -- x its edge, y its middle -- so it reads as points and not a moustache.
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

== cloafB x=5 y=15
# The loaf, side-on: a round, compact body with its paws folded under the chest and its tail laid
# along the front, the head up, the eyes half shut.
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

== dloafB x=3 y=16
# A dog's loaf is a sphinx: the haunch a round bump at the back, the forelegs laid out in front,
# the head up and looking.
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

== csleepB x=3 y=13
# Asleep, curled on its side: the back rounded over, the haunch drawn in, the tail wrapped round
# the front, the head laid low on the forepaws with its eyes shut. The second frame is the breath:
# the back rises a pixel.
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

== csleepH x=14 y=18
# Asleep, the ears laid flat and the head tucked low against the tail, well below the line of
# the back: a round mound with a face in it, where the loaf holds its head up with the ears pricked.
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

# ---------------------------------------------------------------- fourth pass: the side-on rigs
# redrawn with anatomy -- a torso with a hip and a chest, forelegs with a wrist, hind legs
# with a thigh and a hock -- eight-phase walks in diagonal pairs with the head bobbing a frame
# behind the body, a gallop that gathers and stretches, and the in-betweens that join the
# poses: standing, sitting down side-on and turning to face you, lying down, curling up.

== ctorso x=6 y=12
..oooooo........
.olllslloooooo..
olllsllsllslllo.
olfffsffsffsfffo
offfffffffffffdo
odffffffffffffdo
.oddfbbooobbbddo
..oooooo...ooooo

== cf0
.78....
.78....
olfo...
olfo...
.olfo..
.olfo..
..olfo.
..oaaao
..ooooo

== cf1
.78...
.78...
olfo..
olfo..
olfo..
.olfo.
.olfo.
.oaaao
.ooooo

== cf2
.78..
.78..
olfo.
olfo.
olfo.
olfo.
olfo.
oaaao
ooooo

== cf3
...78.
...78.
..olfo
.olfo.
.olfo.
olfo..
olfo..
oaaao.
ooooo.

== cf4
...78.
...78.
..olfo
..olfo
.olfo.
olfo..
oaao..
.ooo..

== cf5
..78..
..78..
.olfo.
.olfo.
.olffo
..oaao
..oooo

== cf6
.78....
.78....
olfo...
.olfo..
..olffo
...oaao
...oooo

== cf7
.78....
.78....
olfo...
olfo...
.olfo..
..olfo.
..oaaao
..ooooo

== ch0
.7788...
.7788...
ollffo..
.ollffo.
..olffo.
...olfo.
...olfo.
...oaaao
...ooooo

== ch1
.7788..
.7788..
ollffo.
ollffo.
.olffo.
..olfo.
..olfo.
..oaaao
..ooooo

== ch2
.7788..
.7788..
ollffo.
ollffo.
.olffo.
..olfo.
.olfo..
.oaaao.
.ooooo.

== ch3
..7788.
..7788.
.ollffo
.ollffo
.olffo.
olffo..
olfo...
oaaao..
ooooo..

== ch4
..7788.
..7788.
.ollffo
.ollffo
olffo..
oaao...
oooo...

== ch5
.7788..
.7788..
ollffo.
ollffo.
.olffo.
.oaaao.
.ooooo.

== ch6
.7788...
.7788...
ollffo..
.olffoo.
..olfffo
...oaaao
...ooooo

== ch7
.7788...
.7788...
ollffo..
.ollffo.
..olffo.
...olfo.
...oaaao
...ooooo

== ctw0 x=2 y=1
...oo...
..oPpo..
..opoo..
.opo....
.opo....
.opo....
..opo...
...opo..
...opo..
....opo.
....opoo
.....opo

== ctw1 x=2 y=1
....oo..
...oPpo.
...opoo.
..opo...
.opo....
.opo....
..opo...
...opo..
...opo..
....opo.
....opoo
.....opo

== ctw2 x=2 y=1
..oo....
.oPpo...
.opoo...
.opo....
.opo....
.opo....
..opo...
...opo..
...opo..
....opo.
....opoo
.....opo

== cat.walk.0
@gsh
@cf4~ 16 17
@ch0~ 5 17
@ctw0 0 0
@ctorso 0 0
@ch4 5 17
@cf0 16 17
@chead 0 -2

== cat.walk.1
@gsh
@cf5~ 16 17
@ch1~ 5 17
@ctw0 0 1
@ctorso 0 1
@ch5 5 17
@cf1 16 17
@chead 0 -1

== cat.walk.2
@gsh
@cf6~ 16 17
@ch2~ 5 17
@ctw1 0 0
@ctorso 0 0
@ch6 5 17
@cf2 16 17
@chead 0 -1

== cat.walk.3
@gsh
@cf7~ 16 17
@ch3~ 5 17
@ctw1 0 0
@ctorso 0 0
@ch7 5 17
@cf3 16 17
@chead 0 -2

== cat.walk.4
@gsh
@cf0~ 16 17
@ch4~ 5 17
@ctw0 0 0
@ctorso 0 0
@ch0 5 17
@cf4 16 17
@chead 0 -2

== cat.walk.5
@gsh
@cf1~ 16 17
@ch5~ 5 17
@ctw2 0 1
@ctorso 0 1
@ch1 5 17
@cf5 16 17
@chead 0 -1

== cat.walk.6
@gsh
@cf2~ 16 17
@ch6~ 5 17
@ctw2 0 0
@ctorso 0 0
@ch2 5 17
@cf6 16 17
@chead 0 -1

== cat.walk.7
@gsh
@cf3~ 16 17
@ch7~ 5 17
@ctw0 0 0
@ctorso 0 0
@ch3 5 17
@cf7 16 17
@chead 0 -2

== crx
# ---------------- run (gallop)
.78.....
.78.....
olfo....
.olffo..
...olfoo
....oaao
....oooo

== crt
..78.
..78.
.olfo
olfo.
oaao.
ooo..

== chx
...7788.
...7788.
..ollffo
.olffo..
olfo....
oaao....
oooo....

== cht
.7788...
.7788...
ollffo..
.olfffoo
...oaaao
...ooooo

== ctorsoA x=7 y=11
...oooooooo....
.oolllsllslloo.
olllsllsllslllo
olfffsffsffsffo
offfffffffffffo
odffffffffffddo
.odffbbbbbbbddo
..ooooooooooooo

== crtail x=0 y=12
.oo......
oPpoo....
.oppPoo..
..ooppPoo
....ooopo
.......oo

== cat.run.0
@gsh
@crx~ 15 16
@chx~ 5 16
@crtail 0 -1
@ctorso 0 -1
@chx 3 16
@crx 17 16
@chead 0 -2

== cat.run.1
@gsh
@cf1~ 15 17
@chx~ 5 16
@crtail
@ctorso
@chx 3 16
@cf0 17 17
@chead 0 -1

== cat.run.2
@gsh
@cf2~ 15 17
@cht~ 7 16
@crtail 0 1
@ctorsoA 0 1
@cht 6 16
@cf3 16 17
@chead 0 0

== cat.run.3
@gsh
@crt~ 14 16
@cht~ 8 15
@crtail 0 -1
@ctorsoA 0 -1
@cht 7 15
@crt 15 16
@chead 0 -2

== cat.run.4
@gsh
@crx~ 16 16
@ch0~ 6 17
@crtail
@ctorso
@ch0 4 17
@crx 18 16
@chead 0 -1

== cat.run.5
@gsh
@crx~ 16 15
@ch3~ 5 17
@crtail 0 -1
@ctorso 0 -1
@ch3 3 17
@crx 18 15
@chead 0 -2

== cat.stand.0
# ---------------- stand (side idle)
@gsh
@cf1~ 17 17
@ch1~ 6 17
@ctw0
@ctorso
@ch2 5 17
@cf2 16 17
@chead 0 -1

== cat.stand.1
@gsh
@cf1~ 17 17
@ch1~ 6 17
@ctw1
@ctorso
@ch2 5 17
@cf2 16 17
@chead 0 -1

== cat.stand.2
@gsh
@cf1~ 17 17
@ch1~ 6 17
@ctw2
@ctorso
@ch2 5 17
@cf2 16 17
@chead 0 -1
@chalf 0 -1

== csitB x=4 y=12
# ---------------- sitting down, side-on, and the turn to face you
..........oooooo.
........olllllldo
......ollsllslldo
.....olfsffsfffdo
....olfsffsffffdo
...olfsffsfffffdo
..olfsffsfffffdo.
..olfsffsfffffdo.
.olfsffsffffdo...
.olfsffsffffdo...
.olfffffffffdo...
.odfffffffffdo...
..oddffaaaaao....
...ooooooooooo...

== csitT x=1 y=19
.oo.....
oPpo....
opoo....
opo.....
opo.....
.opoo...
..oppoo.
...oooo.

== c_sitside0
@gsh
@cf2~ 18 17
@csitT
@csitB
@cf2 16 17
@chead 0 -4

== c_turn0
@fbody
@chead -5 -2

== cbow2 x=5 y=13
# ---------------- the bow, anatomically: rump held on normal hind legs, chest to the ground
..ooooo...........
.olllllooo........
olffsfflllooo.....
offsfffsfffllooo..
offffffffffffffloo
odfffffffffffffffo
.oddffbbbbbbbbbfdo
..oooooooobbbbbbdo
..........ooooooo.

== c_bow0
@gsh
@ch2~ 7 17
@legReach~ 17 22
@ctw1 1 1
@cbow2
@ch2 5 17
@legReach 20 22
@chead 0 5

== c_bow1
@gsh
@ch2~ 7 17
@legReach~ 17 22
@ctw2 1 1
@cbow2
@ch2 5 17
@legReach 20 22
@chead 0 6
@chalf 0 6

== cneck x=17 y=12
# ---------------- eating: the neck runs down from the shoulder into the lowered head
oooo......
lllloo....
ffffflo...
fffffflo..
ffffffflo.
dffffffflo

== cat.eat.0
@gsh
@cf1~ 17 17
@ch1~ 6 17
@ctw0
@ctorso
@cneck
@ch2 5 17
@cf2 16 17
@chead 2 5

== cat.eat.1
@gsh
@cf1~ 17 17
@ch1~ 6 17
@ctw1
@ctorso
@cneck
@ch2 5 17
@cf2 16 17
@chead 2 6
@cshut 2 6

== cshut x=16 y=14
# ---------------- eyes shut, side-on
........ll.
.......oo..

== cat.crouch.0
# ---------------- the jump: settle, wiggle, spring, fly, land on the forepaws, recover
@gsh
@cf5~ 17 19
@ch5~ 6 19
@crtail 0 2
@ctorso 0 3
@ch5 5 19
@cf5 16 19
@chead 0 3

== cat.crouch.1
@gsh
@cf5~ 17 19
@ch5~ 6 19
@crtail 1 3
@ctorso 0 4
@ch5 4 19
@cf5 16 19
@chead 0 4

== cat.leap.0
@chx~ 5 14
@crx~ 16 12
@crtail 0 -3
@ctorso 0 -3
@chx 3 14
@crx 18 12
@chead 0 -4

== cat.leap.1
@chx~ 4 13
@crx~ 17 11
@crtail -1 -4
@ctorso 0 -4
@chx 2 13
@crx 19 11
@chead 0 -5

== cat.land.0
@gsh
@cht~ 8 16
@cf1~ 17 18
@crtail 0 1
@ctorsoA 0 3
@cht 7 16
@cf1 16 18
@chead 0 2

== cat.land.1
@gsh
@cf1~ 17 17
@ch1~ 6 17
@crtail 0 1
@ctorso 0 1
@ch1 5 17
@cf1 16 17
@chead 0 0

== c_loafshut0
# ---------------- lying down and curling up
@gsh
@cloafB
@ctailwrap
@chead 0 4
@cshut 0 4
@cfold

== c_curl1
@gsh
@cloafB
@ctailwrap
@chead -1 6
@cshut -1 6
@cfold

== cshutP x=16 y=14
# A Siamese's shut eye, in its mask.
........yy.
.......oo..

== dtorso x=4 y=11
# The dog side-on: a deep chest, a tucked belly, a croup over the hind leg.
...ooooooooooooo..
.ooLLLLLLLLLLLLLo.
oLLFFFFFFFFFFFFFFo
oFFFFFFFFFFFFFFFFo
offfffffffffffffdo
odffffffffffffffdo
.odffffbooobbbffdo
..oddddo...obbbddo
...ooooo...oooooo.

== dtorsoA x=5 y=10
...oooooooooooo.
.ooLLLLLLLLLLLLo
oLLFFFFFFFFFFFFo
oFFFFFFFFFFFFFFo
offffffffffffffo
odffffffffffffdo
.odffbbbbbbbbddo
..oddddddddddddo
...oooooooooooo.

== dneck x=18 y=11
ooooo......
LLLLLoo....
FFFFFFFoo..
fffffffffo.
ffffffffffo
dffffffffffo

== dsitB x=3 y=11
# sitting side-on: the haunch a round mass on the ground, the chest upright
..........oooooooo.
........ooLLLLLLLo.
......ooLLFFFFFFFdo
.....oLFFFFFFFFFFdo
....oFFfffffffffdo.
...offffffffffffdo.
..offffffffffffdo..
..offffffffffffdo..
.offfffffffffdo....
.offfffffffffdo....
.offfffffffffdo....
.odffffffffffdo....
..oddfffaaaaaao....
...oooooooooooo....

== dbow2 x=3 y=12
# the bow: rump up on the hind legs as they stand, chest to the ground
..oooooo............
.oLLLLLLooo.........
oLFFFFFFLLLoooo.....
oFFFFFFFFFFFLLLooo..
offfffffffffffffLoo.
odffffffffffffffffo.
.oddffbbbbbbbbbbbfdo
..ooooooooobbbbbbbdo
...........oooooooo.

== df0
.788....
.788....
olffo...
olffo...
.olffo..
.olffo..
..olffo.
..oaaaao
..oooooo

== df1
.788...
.788...
olffo..
olffo..
olffo..
.olffo.
.olffo.
.oaaaao
.oooooo

== df2
.788..
.788..
olffo.
olffo.
olffo.
olffo.
olffo.
oaaaao
oooooo

== df3
...788.
...788.
..olffo
.olffo.
.olffo.
olffo..
olffo..
oaaaao.
oooooo.

== df4
...788.
...788.
..olffo
..olffo
.olffo.
olffo..
oaaao..
.oooo..

== df5
..788..
..788..
.olffo.
.olffo.
.olfffo
..oaaao
..ooooo

== df6
.788....
.788....
olffo...
.olffo..
..olfffo
...oaaao
...ooooo

== df7
.788....
.788....
olffo...
olffo...
.olffo..
..olffo.
..oaaaao
..oooooo

== dh0
.77888...
.77888...
ollfffo..
.ollfffo.
..olfffo.
...olffo.
...olffo.
...oaaaao
...oooooo

== dh1
.77888..
.77888..
ollfffo.
ollfffo.
.olfffo.
..olffo.
..olffo.
..oaaaao
..oooooo

== dh2
.77888..
.77888..
ollfffo.
ollfffo.
.olfffo.
..olffo.
.olffo..
.oaaaao.
.oooooo.

== dh3
..77888.
..77888.
.ollfffo
.ollfffo
.olfffo.
olfffo..
olffo...
oaaaao..
oooooo..

== dh4
..77888.
..77888.
.ollfffo
.ollfffo
olfffo..
oaaao...
ooooo...

== dh5
.77888..
.77888..
ollfffo.
ollfffo.
.olfffo.
.oaaaao.
.oooooo.

== dh6
.77888...
.77888...
ollfffo..
.olfffoo.
..olffffo
...oaaaao
...oooooo

== dh7
.77888...
.77888...
ollfffo..
.ollfffo.
..olfffo.
...olffo.
...oaaaao
...oooooo

== dtw0 x=0 y=2
# A dog's tail: thicker than a cat's, carried up and back, wagging front to back as it walks.
.oo....
oPpo...
oPpo...
.oPpo..
.oPpo..
..oPpo.
..oPpo.
...oPpo
...oPpo
....ooo

== dtw1 x=0 y=3
oo.....
oPpo...
.oPpo..
.oPpo..
..oPpo.
..oPpo.
...oPpo
...oPpo
....ooo

== dtw2 x=1 y=2
..oo...
.oPpo..
.oPpo..
.oPpo..
.oPpo..
..oPpo.
..oPpo.
...oPpo
...oPpo
....ooo

== dog.walk.0
@dgsh
@df4~ 16 17
@dh0~ 4 17
@dtw0 0 0
@dtorso 0 0
@dh4 4 17
@df0 16 17
@dshead 0 -2

== dog.walk.1
@dgsh
@df5~ 16 17
@dh1~ 4 17
@dtw0 0 1
@dtorso 0 1
@dh5 4 17
@df1 16 17
@dshead 0 -1

== dog.walk.2
@dgsh
@df6~ 16 17
@dh2~ 4 17
@dtw1 0 0
@dtorso 0 0
@dh6 4 17
@df2 16 17
@dshead 0 -1

== dog.walk.3
@dgsh
@df7~ 16 17
@dh3~ 4 17
@dtw1 0 0
@dtorso 0 0
@dh7 4 17
@df3 16 17
@dshead 0 -2

== dog.walk.4
@dgsh
@df0~ 16 17
@dh4~ 4 17
@dtw0 0 0
@dtorso 0 0
@dh0 4 17
@df4 16 17
@dshead 0 -2

== dog.walk.5
@dgsh
@df1~ 16 17
@dh5~ 4 17
@dtw2 0 1
@dtorso 0 1
@dh1 4 17
@df5 16 17
@dshead 0 -1

== dog.walk.6
@dgsh
@df2~ 16 17
@dh6~ 4 17
@dtw2 0 0
@dtorso 0 0
@dh2 4 17
@df6 16 17
@dshead 0 -1

== dog.walk.7
@dgsh
@df3~ 16 17
@dh7~ 4 17
@dtw0 0 0
@dtorso 0 0
@dh3 4 17
@df7 16 17
@dshead 0 -2

== drx
# ---------------- run (gallop)
.788.....
.788.....
olffo....
.olfffo..
...olffoo
....oaaao
....ooooo

== drt
..788.
..788.
.olffo
olffo.
oaaao.
oooo..

== dhx
...77888.
...77888.
..ollfffo
.olfffo..
olffo....
oaaao....
ooooo....

== dht
.77888...
.77888...
ollfffo..
.olffffoo
...oaaaao
...oooooo

== drtail x=0 y=10
.ooo......
oPPpoo....
.ooPPpoo..
...ooPPpoo
.....ooopo
........oo

== dog.run.0
@dgsh
@drx~ 15 16
@dhx~ 4 16
@drtail 0 -1
@dtorso 0 -1
@dhx 2 16
@drx 17 16
@dshead 0 -2

== dog.run.1
@dgsh
@df1~ 15 17
@dhx~ 4 16
@drtail 0 0
@dtorso 0 0
@dhx 2 16
@df0 17 17
@dshead 0 -1

== dog.run.2
@dgsh
@df2~ 15 17
@dht~ 6 16
@drtail 0 1
@dtorsoA 0 1
@dht 5 16
@df3 16 17
@dshead 0 0

== dog.run.3
@dgsh
@drt~ 14 16
@dht~ 7 15
@drtail 0 -1
@dtorsoA 0 -1
@dht 6 15
@drt 15 16
@dshead 0 -2

== dog.run.4
@dgsh
@drx~ 16 16
@dh0~ 5 17
@drtail 0 0
@dtorso 0 0
@dh0 3 17
@drx 18 16
@dshead 0 -1

== dog.run.5
@dgsh
@drx~ 16 15
@dh3~ 4 17
@drtail 0 -1
@dtorso 0 -1
@dh3 2 17
@drx 18 15
@dshead 0 -2

== dog.stand.0
# ---------------- stand (side idle)
@dgsh
@df1~ 17 17
@dh1~ 5 17
@dtw0 0 0
@dtorso 0 0
@dh2 4 17
@df2 16 17
@dshead 0 -1

== dog.stand.1
@dgsh
@df1~ 17 17
@dh1~ 5 17
@dtw1 0 0
@dtorso 0 0
@dh2 4 17
@df2 16 17
@dshead 0 -1

== dog.stand.2
@dgsh
@df1~ 17 17
@dh1~ 5 17
@dtw2 0 0
@dtorso 0 0
@dh2 4 17
@df2 16 17
@dshead 0 -1
@dsshut 0 -1

== dsitT x=0 y=19
# ---------------- sitting down, side-on, and the turn to face you
.oo.....
oPpo....
opoo....
opo.....
opo.....
.opoo...
..oppoo.
...oooo.

== d_sitside0
@dgsh
@df2~ 18 17
@dsitT 0 0
@dsitB 0 0
@df2 16 17
@dshead 0 -4

== d_bow0
@dgsh
@dh2~ 6 17
@dReach~ 17 22
@dtw1 1 1
@dbow2 0 0
@dh2 4 17
@dReach 20 22
@dshead 0 5

== d_bow1
@dgsh
@dh2~ 6 17
@dReach~ 17 22
@dtw2 1 1
@dbow2 0 0
@dh2 4 17
@dReach 20 22
@dshead 0 6
@dsshut 0 6

== dog.eat.0
# ---------------- eating: the neck runs down from the shoulder into the lowered head
@dgsh
@df1~ 17 17
@dh1~ 5 17
@dtw0 0 0
@dtorso 0 0
@dneck 0 0
@dh2 4 17
@df2 16 17
@dshead 2 5

== dog.eat.1
@dgsh
@df1~ 17 17
@dh1~ 5 17
@dtw1 0 0
@dtorso 0 0
@dneck 0 0
@dh2 4 17
@df2 16 17
@dshead 2 6
@dsshut 2 6

== dog.crouch.0
# ---------------- eyes shut, side-on
@dgsh
@df5~ 17 19
@dh5~ 5 19
@drtail 0 2
@dtorso 0 3
@dh5 4 19
@df5 16 19
@dshead 0 3

== dog.crouch.1
@dgsh
@df5~ 17 19
@dh5~ 5 19
@drtail 1 3
@dtorso 0 4
@dh5 3 19
@df5 16 19
@dshead 0 4

== dog.leap.0
@dhx~ 4 14
@drx~ 16 12
@drtail 0 -3
@dtorso 0 -3
@dhx 2 14
@drx 18 12
@dshead 0 -4

== dog.leap.1
@dhx~ 3 13
@drx~ 17 11
@drtail -1 -4
@dtorso 0 -4
@dhx 1 13
@drx 19 11
@dshead 0 -5

== dog.land.0
@dgsh
@dht~ 7 16
@df1~ 17 18
@drtail 0 3
@dtorsoA 0 3
@dht 6 16
@df1 16 18
@dshead 0 2

== dog.land.1
@dgsh
@df1~ 17 17
@dh1~ 5 17
@drtail 0 1
@dtorso 0 1
@dh1 4 17
@df1 16 17
@dshead 0 0

== d_turn0
# ---------------- lying down and curling up
@dtail
@dbody
@dshead -7 -1

== d_loafshut0
@dgsh
@dtailflat
@dloafB
@dfore
@dshead 0 5
@dsshut 0 5

== d_curl1
@dgsh
@dtailflat
@dloafB
@dfore
@dshead -1 7
@dsshut -1 7

== dsitTU x=5 y=8
# A pricked-eared dog sitting side-on: its curled tail rests on the haunch.
..oooo..
.oPPPpo.
oPpooPpo
opo..opo
oPo..opo
.opoopo.
..oooo..

== cat.stretch.0
@cat.stand.0

== cat.stretch.1
@c_bow0

== cat.stretch.2
@c_bow1

== cat.stretch.3
@c_bow0

== cat.sitdown.0
@cat.stand.0

== cat.sitdown.1
@c_sitside0

== cat.sitdown.2
@c_turn0

== cat.standup.0
@c_turn0

== cat.standup.1
@c_sitside0

== cat.standup.2
@cat.stand.0

== cat.liedown.0
@cat.crouch.0

== cat.liedown.1
@cat.crouch.1

== cat.getup.0
@cat.crouch.1

== cat.getup.1
@cat.crouch.0

== cat.getup.2
@cat.stand.0

== cat.curl.0
@c_loafshut0

== cat.curl.1
@c_curl1

== cat.wake.0
@c_curl1

== cat.wake.1
@c_loafshut0

== dog.stretch.0
@dog.stand.0

== dog.stretch.1
@d_bow0

== dog.stretch.2
@d_bow1

== dog.stretch.3
@d_bow0

== dog.sitdown.0
@dog.stand.0

== dog.sitdown.1
@d_sitside0

== dog.sitdown.2
@d_turn0

== dog.standup.0
@d_turn0

== dog.standup.1
@d_sitside0

== dog.standup.2
@dog.stand.0

== dog.liedown.0
@dog.crouch.0

== dog.liedown.1
@dog.crouch.1

== dog.getup.0
@dog.crouch.1

== dog.getup.1
@dog.crouch.0

== dog.getup.2
@dog.stand.0

== dog.curl.0
@d_loafshut0

== dog.curl.1
@d_curl1

== dog.wake.0
@d_curl1

== dog.wake.1
@d_loafshut0
`;
