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

== cat.eat.0
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead 3 7
@cshut 3 7

== cat.eat.1
@gsh
@legS~ 10 21
@legS~ 16 21
@ctail
@cbody
@legS 8 21
@legS 17 21
@chead 3 6
@cshut 3 6

== cshut x=16 y=14
........l..
........o..

== cat.loaf.0
@gsh
@ctaillow 0 5
@cloaf
@chead 0 6
@chalf 0 6

== chalf x=16 y=14
........d..
........o..

== cloaf x=7 y=19
..oooooooooo.
.ollllllllllo
olffsffsfffffo
offsfffsffffdo
odffffffffffdo
.oaaoooooaaoo.

== cat.sleep.0
@gsh
@csleep

== cat.sleep.1
@gsh
@csleep
@csleepb

== csleep x=5 y=13
.......oo....oo.......
......otto..otto......
.....oooooooooooooo...
....olllllllllllllfo..
...ollsllsllsllllffdo.
..olffffllllllllfffdo.
..olfoolllllllooffddo.
.olfffffllnnlffffffddo
.olffffffwwwwffffffddo
.olfffffffffffffffddoo
.oldffffffffffffffddpo
..oddffffffffffffddppo
...ooqqqqqqqqqqqqppoo.
....oooooooooooooooo..

== csleepb x=5 y=15
....oooooooooooooooo..
...olllllllllllllllfo.

== cbow x=5 y=11
..ooooo............
.olllllooo.........
olffsfflllloo......
offsfffsffffllooo..
offffffffffffffllo.
odffffffffffffffflo
.oddbbbbbbbbbbbbbdo
..oooo.......oooo..

== legLong
olfo
olfo
olfo
olfo
olfo
olfo
oaao
oooo

== legFlat
.oooooo
olllllfo
offffaao
.ooooooo

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

== cat.stretch.1
@gsh
@legLong~ 8 18
@legFlat~ 17 22
@ctailup
@cbow
@legLong 6 18
@legFlat 19 23
@chead 2 7

== cat.stretch.2
@gsh
@legLong~ 8 18
@legFlat~ 17 22
@ctailup
@cbow
@legLong 6 18
@legFlat 19 23
@chead 3 8
@cshut 3 8

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

== dsbody x=4 y=12
..oooooooooooooo.
.oLLLLLLLLLLLLLFo
oLFFFFFFFFFFFFFFo
oFFFFFFFFFFFFFFdo
offffffffffffffdo
odffffffffffffddo
.oddbbbbbbbbbbddo
..ooo.......ooo..

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

== dleg
olffo
olffo
olffo
olffo
olffo
oaaao
ooooo

== dlegF
.olffo
.olffo
olffo.
olffo.
olffo.
oaaao.
ooooo.

== dlegB
olffo.
olffo.
.olffo
.olffo
.olffo
.oaaao
.ooooo

== dgsh x=3 y=26
ggggggggggggggggggggggggg

== dog.walk.0
@dgsh
@dlegB~ 8 20
@dlegF~ 15 20
@dstail
@dsbody
@dlegF 5 20
@dlegB 17 20
@dshead

== dog.walk.1
@dgsh
@dleg~ 8 20
@dleg~ 16 20
@dstailw
@dsbody
@dleg 6 20
@dleg 17 20
@dshead

== dog.walk.2
@dgsh
@dlegF~ 8 20
@dlegB~ 15 20
@dstail
@dsbody
@dlegB 5 20
@dlegF 17 20
@dshead

== dog.walk.3
@dgsh
@dleg~ 7 20
@dleg~ 17 20
@dstailw
@dsbody
@dleg 9 20
@dleg 15 20
@dshead

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

== dstailwU x=2 y=4
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

== dlegXF
olffo..
.olffo.
..olffo
..olffo
..oaaao
..ooooo

== dlegXB
..olffo
.olffo.
olffo..
olffo..
oaaao..
ooooo..

== dlegT
olffo
oaaao
ooooo

== dstaillow x=0 y=10
oo.......
oPo......
.oPpoo...
..ooPpoo.
....ooppo
......ooo

== dog.run.0
@dgsh
@dlegXB~ 7 20
@dlegXF~ 15 20
@dstaillow
@dsbody
@dlegXB 5 20
@dlegXF 17 20
@dshead

== dog.run.1
@dgsh
@dleg~ 9 19
@dleg~ 14 19
@dstaillow 0 -1
@dsbody 0 -1
@dleg 7 19
@dleg 16 19
@dshead 0 -1

== dog.run.2
@dgsh
@dlegXF~ 7 20
@dlegXB~ 15 20
@dstaillow
@dsbody
@dlegXB 6 20
@dlegXF 16 20
@dshead

== dog.run.3
@dgsh
@dleg~ 8 18
@dleg~ 15 18
@dstaillow 0 -2
@dsbody 0 -2
@dleg 6 18
@dleg 17 18
@dshead 0 -2

== dog.crouch.0
@dgsh
@dlegT~ 8 23
@dlegT~ 16 23
@dstaillow 0 4
@dsbody 0 5
@dlegT 6 23
@dlegT 17 23
@dshead 0 5

== dog.leap.0
@dlegXB~ 6 17
@dlegXF~ 15 15
@dstaillow 0 -3
@dsbody 0 -4
@dlegXB 4 17
@dlegXF 17 15
@dshead 0 -5

== dog.land.0
@dgsh
@dlegT~ 8 23
@dlegXF~ 15 20
@dstaillow 0 3
@dsbody 0 3
@dlegT 6 23
@dlegXF 17 20
@dshead 0 4

== dog.eat.0
@dgsh
@dleg~ 8 20
@dleg~ 16 20
@dstail
@dsbody
@dleg 6 20
@dleg 17 20
@dshead 2 8
@dsshut 2 8

== dog.eat.1
@dgsh
@dleg~ 8 20
@dleg~ 16 20
@dstailw
@dsbody
@dleg 6 20
@dleg 17 20
@dshead 2 7
@dsshut 2 7

== dsshut x=17 y=10
.........l....
........oo....

== dsloaf x=4 y=19
..oooooooooooooo.
.oLLLLLLLLLLLLLFo
oLFFFFFFFFFFFFFFo
oFFFFFFFFFFFFFFdo
odffffffffffffddo
.oaaaoooooooaaaoo

== dog.loaf.0
@dgsh
@dstaillow 0 8
@dsloaf
@dshead 0 7
@dsshut 0 7

== dlie x=2 y=16
......oooooooooooooooo.....
....oollllllllllllllllfoo..
...ollllllllllllllllllfffo.
..olfffffffffffffffffffffdo
..olfffffffffffffffffffffdo
.olffffffffffffffffffffffddo
.olffffffffffffffffffffffddo
.oldfffffffffffffffffffffddoo
..oddffffffffffffffffffdddqqo
...oooooooooooooooooooooooooo

== dpaws x=6 y=23
..ooooo.......ooooo...
.oaaaaao.....oaaaaao..
.ooooooo.....ooooooo..

== dlieb x=2 y=15
......oooooooooooooooo.....
....oollllllllllllllllfoo..

== dog.sleep.0
@dgsh
@dlie
@dhead 0 9
@dshut 0 9
@dpaws

== dog.sleep.1
@dgsh
@dlie
@dlieb
@dhead 0 9
@dshut 0 9
@dpaws

== dbow x=3 y=10
..oooooo.............
.oLLLLLLooooo........
oLFFFFFFLLLLLoooo....
oFFFFFFFFFFFFLLLLooo.
offffffffffffffffflo.
odffffffffffffffffflo
.oddbbbbbbbbbbbbbbbdo
..oooo..........oooo.

== dlegLong
olffo
olffo
olffo
olffo
olffo
olffo
olffo
oaaao
ooooo

== dlegFlat
.oooooo.
olllllfo
offfffaao
.oooooooo

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

== dog.stretch.0
@dgsh
@dleg~ 8 20
@dleg~ 16 20
@dstail
@dsbody
@dleg 6 20
@dleg 17 20
@dshead

== dog.stretch.1
@dgsh
@dlegLong~ 6 18
@dlegFlat~ 16 23
@dstailup
@dbow
@dlegLong 4 18
@dlegFlat 18 23
@dshead 1 9

== dog.stretch.2
@dgsh
@dlegLong~ 6 18
@dlegFlat~ 16 23
@dstailup
@dbow
@dlegLong 4 18
@dlegFlat 18 23
@dshead 2 10
@dsshut 2 10

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
`;
