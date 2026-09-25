/**
 * The pets, drawn by hand: every pixel of every frame, as text.
 *
 * One letter is one pixel, and a letter is a ROLE, not a colour -- `o` the outline, `l` `f` `d` the
 * fur's light, base and shade, `w` the cream of a chest -- so a single drawing is every coat (see
 * colourOf in art.ts). A block is a frame or, when its name starts with `_`, a part:
 *
 *     == name x=NN [y=NN]     where the rows go: the top-left corner, or the bottom row on the
 *                             ground when y is left out
 *     @part dx dy             another block's pixels first, moved; `@part~` draws it in shade,
 *                             for the far legs, and `@part%` only marks the fur it covers
 *     rows                    then these, over them; `.` is nothing, `_` rubs out
 *
 * The roles:
 *
 *     o outline     i a line inside the fur      l f d fur: light, base, shade
 *     s S stripes   P p q points (ears, tail)    y a stripe on the tail
 *     w v cream     b B cream belly (some coats) c C the muzzle      a A paws
 *     e iris        u pupil and lids             k catch-light       n nose
 *     m mouth       t tongue                     r inside an ear     j a dog's hanging ear
 *
 * Drawn to these rules, from pixel-art practice and a study of good pixel cats and dogs:
 *
 * - The head is big -- two fifths of a sitting pet -- set on a smaller body: cute, but a real
 *   animal's shape. Ears grow out of the head outline as clean triangles; eyes sit low and wide,
 *   three pixels square with a pupil and a catch-light.
 * - Light comes from the upper left: a light tone along the top edges, the base colour, a shade
 *   along the underside, wrapped just inside the outline. Never pillow shading round every edge.
 * - The outline is a dark warm brown, not black, and inside the silhouette the fur is separated
 *   by a darker fur line (`i`), not by the outline: selective outlining.
 * - Curves step evenly (3-2-1), with no doubled pixels or stray corners.
 * - Walking is six frames, legs in diagonal pairs with the body lifting a pixel as they pass; the
 *   far legs are the same drawings in shade. Running is a six-frame gallop, the legs thrown out.
 */

/** The cat, and the parts the dog borrows: legs, bodies, a tail streaming as it runs. */
export const CAT_ART = String.raw`
== sit x=12
......o.........o......
......oo.......oo......
.....oPro.....orpo.....
.....oPrro...orrpo.....
.....oPrrooooorrqo.....
....ollllsslslffdo.....
....ollllsslllfffdo....
....oluuullllfuuudo....
...oilkuelllffkuedo....
...olleuellllfeuedo....
..olfilllllcncffffdo...
..olfiffllcCcCcffddo...
.olffifffccccccfddo....
.olfffiffwwwwwwwdo.....
olllsffivvvvvvvvdo.....
ollffsfffiwwwwwvdo.....
olfffsffffiwwwwvdo.....
olffffsffffiwwwwvdo....
olfffsffffffidlffdo....
olffffsfffffidlffdo....
olfffffsffffidlffdo....
offffffsfffdidlffdo....
offfffffffddidlffdo....
offfffffffddidlffdo....
offffffddddiidlffdo....
odddddddaaaiaalffo..oo.
.dddddddaaaiaaaaAo.oPpo
.ddddddaooooooooooooPpo
.oddddooPPPyPPyPPyPpqqo
..ooooooqqqqqqqqqqqqqo.
........oooooooooooooo.

== sit0 x=0
@sit 0 0
== _eyehalf x=18 y=14
lll.....fff
uuu.....uuu
eue.....eue
== _eyeshut x=18 y=14
lll.....fff
ulu.....ufu
lul.....fuf
== _eyehappy x=18 y=14
lll.....fff
lul.....fuf
ulu.....ufu
== _eyewide x=18 y=14
uuu.....uuu
kuu.....kuu
uuu.....uuu
== blink0 x=0
@sit 0 0
@_eyehalf 0 0
== blink1 x=0
@sit 0 0
@_eyeshut 0 0
== blink2 x=0
@sit 0 0
@_eyehalf 0 0

== flick0 x=0
@sit 0 0
== flick1 x=30 y=30
@sit 0 0
______
...oo.
..oPpo
.oPpo.
.oPpo.
== flick2 x=30 y=29
@sit 0 0
..oo..
.oPpo.
.oPpo.
.oPpo.
.oPpo.
.oPpo.
== flick3 x=30 y=30
@sit 0 0
______
.oo...
oPpo..
.oPpo.
.oPpo.

== happy0 x=0
@sit 0 0
@_eyehappy 0 0
== happy1 x=0
@sit 0 -1
@_eyehappy 0 -1
== look0 x=0
@sit 0 0
@_eyewide 0 0

== _yawn1 x=22 y=18
.mmm.
.mtm.
== _yawn2 x=22 y=18
mmmmm
mtttm
.mmm.
== yawn0 x=0
@sit 0 0
@_eyehalf 0 0
@_yawn1 0 0
== yawn1 x=0
@sit 0 0
@_eyeshut 0 0
@_yawn2 0 0
== yawn2 x=0
@sit 0 0
@_eyeshut 0 0
@_yawn2 0 0
@_yawn1 0 2
== yawn3 x=0
@sit 0 0
@_eyehalf 0 0
@_yawn1 0 0

== _head x=27 y=11
..o.........o..
..oo.......oo..
.oPro.....orpo.
.oPrro...orrpo.
.oPrrooooorrqo.
olllsslsllffdo.
ollllslllffffdo
oluuullllfuuudo
ilkuelllffkuedo
ileuellllfeuedo.
illlllcncffffddo
iffllcCcCcffddo.
iffffccccccfddo
.iffwwwwwwwfdo.
..iivvvvvvvoo..

== _body x=6 y=17
....ooooooooo..............
...olllllllllooooooooooo....
..olllllllllllllllllllllo...
.olfffsffffsffffsffffffffo..
.olffsffffsffffsfffffffffo..
.offfsfffsffffsffffffffffwo.
.offffffffffffffffffffffwwvo
.offffffffffffffffffffffwwvo
.odfffffffffffffffffffffwwvo
.oddffffffffffffffffffffwvvo
..oddfbbbbbbbbbbbbbbbbbbwvvo
...odBBBBBBBBBBBBBBBBBBBvvo.
....ooooooooooooooooooooo...

== _tail x=0 y=5
....oo.....
...oPpo....
...oPyo....
..oPpo.....
..oPpo.....
.oPyo......
.oPpo......
.oPpo......
.oPyo......
.oPpo......
..oPpo.....
..oPyo.....
...oPpo....
....oPpoo..
.....oPppo.
......ooPpo

# legs: nine rows, the top one hidden under the body unless it bobs up
== _Lfwd x=0
olffo..
olffo..
olffo..
.olffo.
.olffo.
..olffo
..olffo
..oaaao
..ooooo
== _Lmid x=0
olffo
olffo
olffo
olffo
olffo
olffo
olffo
oaaao
ooooo
== _Lback x=0
..olffo
..olffo
..olffo
.olffo.
.olffo.
olffo..
olffo..
oaaao..
ooooo..
== _Lliftb x=0
.olffo.
.olffo.
.olffo.
olffo..
olffo..
oaao...
.oo....
.......
.......
== _Lswing x=0
olffo..
olffo..
olffo..
olfffo.
.olfaao
..oooo.
.......
.......
.......
== _Lreach x=0
olffo...
olffo...
.olffo..
..olffo.
..olfffo
...oaaao
...ooooo
........
........

# pair A = near front + far hind; pair B = far front + near hind
== walk0 x=0
@_Lback~ 10 0
@_Lfwd~ 21 0
@_Lfwd 5 0
@_Lback 25 0
@_tail 0 0
@_body 0 0
@_head 0 0
== walk1 x=0
@_Lliftb~ 10 0
@_Lmid~ 22 0
@_Lmid 6 0
@_Lliftb 25 0
@_tail 0 -1
@_body 0 -1
@_head 0 -1
== walk2 x=0
@_Lswing~ 10 0
@_Lback~ 21 0
@_Lback 5 0
@_Lswing 25 0
@_tail 0 0
@_body 0 0
@_head 0 0
== walk3 x=0
@_Lfwd~ 10 0
@_Lback~ 21 0
@_Lback 5 0
@_Lfwd 25 0
@_tail 1 0
@_body 0 0
@_head 0 0
== walk4 x=0
@_Lmid~ 11 0
@_Lliftb~ 21 0
@_Lliftb 5 0
@_Lmid 26 0
@_tail 1 -1
@_body 0 -1
@_head 0 -1
== walk5 x=0
@_Lback~ 10 0
@_Lswing~ 21 0
@_Lswing 5 0
@_Lback 25 0
@_tail 1 0
@_body 0 0
@_head 0 0

== _loafbody x=6
........oooooooooo........
.....ooolllllllllloooo....
....ollllllllllllllllllo..
...ollfffsffffsfffffffffo.
..olfffsffffsffffffffffo..
..offffffffffffffffffffdo.
.olfffffffffffffffffffddo.
.offfffffffffffffffffdddo.
.offffffffffffffffffddddo.
.oddffffffffffffffffdddaao
.odddddffffffffffdddddaaao
..oddddddddddddddddddAAAo.
...oooooooooooooooooooooo.
== _loaftail x=0
...oo...
..oPpo..
.oPpo...
.oPyo...
.oPpooo.
..oPPPPo
...oooo.
== loaf0 x=0
@_loaftail 1 0
@_loafbody 0 0
@_head -1 10
@_eyehalf 10 14

# asleep: curled round, head down on the front paws, tail round the front
== sleep0 x=9
......................o....o...
......................oo..oo...
...........ooooooo...olro.orlo.
........ooollllllloooolrrorrrdo
......oolllllllllllllolllllffdo
....olllffsffsffsfffilllllfffdo
...ollfsffsffsffsfffiulullufudo
..olffsfffffffffffffilulllfufdo
..offffffffffffffffilllllcncfdo
.offfffffffffffffffilllcCcCcfdo
.offfffffffffffffffilllcccccfdo
.oddffffffffffffffooiffcccccddo
.odddffoooooooooooolliddvvvvddo
.oddooPPPyPPPPyPPPPPpPiddddddo.
..ooPppppyppppyppppppqdoooooo..
...oqqqqqqqqqqqqqqqqqqo........
....oooooooooooooooooo.........
== sleep1 x=9 y=20
......................o....o...
......................oo..oo...
...........ooooooo...olro.orlo.
........ooollllllloooolrrorrrdo
......oolllllllllllllolllllffdo
....olllffsffsffsfffilllllfffdo
...ollfsffsffsffsfffiulullufudo
..olffsfffffffffffffilulllfufdo
..offffffffffffffffilllllcncfdo
.offfffffffffffffffilllcCcCcfdo
.offfffffffffffffffilllcccccfdo
.offfffffffffffffffilllcccccfdo
.oddffffffffffffffooiffwwwwwddo
.odddffoooooooooooolliddvvvvddo
.oddooPPPyPPPPyPPPPPpPiddddddo.
..ooPppppyppppyppppppqdoooooo..
...oqqqqqqqqqqqqqqqqqqo........
....oooooooooooooooooo.........

# eating: crouched at the bowl, head down, the neck bent to it
== _crouchbody x=6 y=22
....ooooooooo..............
...olllllllllooooooooooo...
..olllllllllllllllllllllo..
.olfffsffffsffffsfffffffffo
.olffsffffsffffsffffffffffo
.offfsfffsffffsfffffffffffo
.offffffffffffffffffffffffo
.odfffffffffffffffffffffffo
..oddbbbbbbbbbbbbbbbbbbbddo
...ooooooooooooooooooooooo.
== _Lbent x=0
.olfo.
olffo.
olffo.
oaaao.
ooooo.
== _Lbentb x=0
olfffo
.olffo
.oaaao
.ooooo
== eat0 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_tail 0 5
@_crouchbody 0 0
@_head 4 11
@_eyehalf 14 14
== eat1 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_tail 0 5
@_crouchbody 0 0
@_head 4 12
@_eyeshut 14 15

# ---- running, leaping: legs thrown forward and back, the tail streaming
== _tailrun x=0 y=16
oo..........
oPo.........
oPpo........
.oPpo.......
.oPypooo....
..oPppPPoo..
...ooopppPo.
......oooPo.
== _Rfwd x=0
olffo....
olfffo...
.olfffoo.
..olffaao
...ooooo.
.........
.........
.........
.........
== _Rback x=0
...olffo
..olfffo
.oolffo.
oaalfo..
.oooo...
........
........
........
........
== _Rtuck x=0
olffo.
olfffo
.olaao
..ooo.
......
......
......
......
......
== run0 x=0
@_Rback~ 8 -1
@_Rfwd~ 23 -1
@_Rback 3 -1
@_Rfwd 27 -1
@_tailrun 0 -1
@_body 0 -1
@_head 0 -1
== run1 x=0
@_Rtuck~ 10 -1
@_Rfwd~ 23 -1
@_Rback 3 -1
@_Lfwd 25 0
@_tailrun 0 -1
@_body 0 -1
@_head 0 -1
== run2 x=0
@_Rtuck~ 11 0
@_Lmid~ 22 0
@_Rtuck 6 0
@_Lback 25 0
@_tailrun 0 0
@_body 0 0
@_head 0 1
== run3 x=0
@_Lfwd~ 11 0
@_Lback~ 20 0
@_Lfwd 8 0
@_Lback 23 0
@_tailrun 1 0
@_body 0 0
@_head 0 1
== run4 x=0
@_Lmid~ 11 0
@_Rtuck~ 23 -1
@_Lback 5 0
@_Rtuck 27 -1
@_tailrun 1 -1
@_body 0 -1
@_head 0 -1
== run5 x=0
@_Lback~ 9 -2
@_Rtuck~ 23 -2
@_Rback 4 -2
@_Rfwd 27 -2
@_tailrun 0 -2
@_body 0 -2
@_head 0 -2

== crouch0 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_tailrun 1 5
@_crouchbody 0 0
@_head 0 6
== leap0 x=0
@_Rback~ 8 -8
@_Rfwd~ 23 -8
@_Rback 3 -8
@_Rfwd 27 -8
@_tailrun 0 -8
@_body 0 -8
@_head 0 -9
@_eyewide 11 -5
== land0 x=0
@_Rtuck~ 11 -2
@_Lfwd~ 22 0
@_Rtuck 6 -2
@_Lfwd 26 0
@_tailrun 0 -2
@_body 0 -2
@_head 0 -1

# ---- stretching: a bow, front paws flat out ahead, the back end up
== _bowbody x=5 y=15
..oooooooo..................
.ollllllllooo...............
olllfffflllllooo............
olffsfffsffllllloooo........
offsfffsfffsfflllllloooo....
offfffffffffffsfffllllllooo.
offfffffffffffffffsffflllllo
oddffffffffffffffffffsffffwo
.oddfffffffffffffffffffffwwo
..oddffffffffffffffffffffwvo
...oodbbbbbffffffffffffffwvo
.....ooBBBbbbbbbbbbbfffffvvo
.......oooooBBBBBBBBbbbbbvvo
............ooooooooBBBBBvvo
....................oooooooo
== _paws x=27
.ooooooooooooo.
olllllllllllaao
offfffffffffaao
.oooooooooooooo
== stretch0 x=0
@_Lmid~ 11 -3
@_Lmid~ 11 0
@_Lmid 6 -3
@_Lmid 6 0
@_paws 0 0
@_tail 2 -4
@_bowbody 0 0
@_head 2 11
@_eyeshut 13 15
== stretch1 x=0
@_Lmid~ 11 -4
@_Lmid~ 11 0
@_Lmid 6 -4
@_Lmid 6 0
@_paws 1 0
@_tail 2 -5
@_bowbody 0 -1
@_head 3 12
@_eyeshut 14 16
@_yawn1 13 16
== stretch2 x=0
@_Lmid~ 22 0
@_Lback~ 11 0
@_Lmid 26 0
@_Rback 0 0
@_tail 0 0
@_body 0 0
@_head 0 0
@_eyehalf 11 4

# ---- washing: the near paw up to the mouth, licked, then wiped over the face
== _washleg x=23 y=16
..ooo...
.oaaao..
.oaaao..
..oalo..
..olffo.
...olffo
...olffo
....olfo
....olfo
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
..AAAAo.
.AAAAAo.
== _washup x=23 y=13
..ooo...
.oaaao..
.oaaao..
..oalo..
..olffo.
..olffo.
...olffo
...olffo
...olffo
....olfo
....olfo
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
...dddo.
..AAAAo.
.AAAAAo.
== wash0 x=0
@sit 0 0
@_eyehalf 0 0
@_washleg 0 0
== wash1 x=27 y=19
@sit 0 0
@_eyeshut 0 0
@_washleg 0 0
t
== wash2 x=0
@sit 0 0
@_eyeshut 0 0
@_washup 0 0
== wash3 x=27 y=19
@sit 0 0
@_eyeshut 0 0
@_washleg 0 0
t

# ---- a leg licked clean: sat back, the near hind leg up, head bowed to it
== _lickbody x=12 y=21
olllsffivvvvvvvvdo.....
ollffsfffiwwwwwvdo.....
olfffsffffiwwwwvdo.....
olffffsffffiwwwwvdo....
olfffsffffffidlffdo....
olffffsfffffidlffdo....
olfffffsffffidlffdo....
offffffsfffdidlffdo....
offfffffffddidlffdo....
offfffffffddidlffdo....
offffffddddiidlffdo....
odddddddaaaiaalffo..oo.
.dddddddaaaiaaaaAo.oPpo
.ddddddaooooooooooooPpo
.oddddooPPPyPPyPPyPpqqo
..ooooooqqqqqqqqqqqqqo.
........oooooooooooooo.
== _upleg x=19 y=10
......oooo.
.....oaaaao
.....oaaaao
......olffo
......olffo
.....olffo.
.....olffo.
....olffo..
....olffo..
...olfffo..
...olfffo..
..olffffo..
..olffffo..
.olfffffo..
.olfffffo..
olffffffo..

== lick0 x=0
@_lickbody 0 0
@_upleg 0 0
@_head 1 6
@_eyeshut 12 10
== lick1 x=35 y=29
@_lickbody 0 0
@_upleg 0 0
@_head 1 6
@_eyeshut 12 10
t
== lick2 x=0
@_lickbody 0 0
@_upleg 0 0
@_head 1 7
@_eyeshut 12 11
== lick3 x=35 y=30
@_lickbody 0 0
@_upleg 0 0
@_head 1 7
@_eyeshut 12 11
t
`;

/** The dog: its own head, ears, tails and sitting body; the rest comes from the cat. */
export const DOG_ART = String.raw`
# ---- the dog's head: a round skull, a cream muzzle, a dark nose; ears are separate parts
== _dface x=27 y=14
....ooooooo....
..oollllllffoo.
.olllllllllfffo
ollllllllllffdo
olllllllllfffdo
olluullllluufdo
ollkulllllkufdo
ollllwwwwwfffdo
olllwwnnnwwffdo
olllwwwnwwwffdo
offlwwmwmwwfddo
.offwwwwwwwfdo.
..oovvvvvvvoo..
== _dearF x=24 y=14
...oo.
..ojjo
.ojjjo
.ojjjo
ojjjo.
ojjjo.
ojjjo.
ojjo..
.oo...
== _dearFR x=38 y=14
oo....
ojjo..
ojjj..
.jjjo.
.jjjo.
.jjjo.
..jjo.
...oo.
== _dearU x=27 y=11
.o.........o...
.oo.......oo...
oPro.....orpo..
oPrro...orrpo..
oPrrro.orrrpo..
== _dhead x=0
@_dface 0 0
@_dearF 0 0
@_dearFR 0 0
== _dheadU x=0
@_dearU 0 0
@_dface 0 0

== _deyehalf x=30 y=19
ll.....ff
ku.....ku
== _deyeshut x=30 y=19
ll.....ff
uu.....uu
== _deyewide x=30 y=19
uu.....uu
kk.....kk
== _dmouth x=32 y=24
.mmm.
.mtm.
== _dpant x=32 y=24
mmmmm
mtttm
.mtm.
..t..

== _dtail x=0 y=8
.oo.......
.oPo......
..oPo.....
..oPpo....
...oPpo...
...oPpo...
....oPpo..
....oPpo..
.....oPpo.
......oPpo
.......oo.
== _dtailU x=2 y=10
...oooo...
..oPPPpo..
.oPpooopo.
.oPo..oPo.
..oo.oPpo.
....oPppo.
...oPppo..
...oooo...
== _dsittail x=2
.ooooooo..
oPPPPPPPo.
oppppppqqo
.ooooooooo
== _dwag x=0
oo........
oPo.......
oPpo......
.oPpooooo.
..oPPPPPPo
...ppppqqo
..oooooooo

# ---- a saddle of darker fur (a beagle's): a mask, recolouring only the fur it covers
== _saddle x=11 y=18
..############..
.##############.
################
################
.##############.
..############..
== _saddleL x=10 y=25
...###########..
.##############.
################
################
.##############.
== _saddleS x=10 y=21
..########
.#########
##########
##########
#########.
########..
#######...

# ---- walking and running: the cat's legs and body, the dog's head and tail
== dwalk0 x=0
@_Lback~ 10 0
@_Lfwd~ 21 0
@_Lfwd 5 0
@_Lback 25 0
@_dtail 0 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 0
== dwalk1 x=0
@_Lliftb~ 10 0
@_Lmid~ 22 0
@_Lmid 6 0
@_Lliftb 25 0
@_dtail 0 -1
@_body 0 -1
@_saddle% 0 -1
@_dhead 0 -1
== dwalk2 x=0
@_Lswing~ 10 0
@_Lback~ 21 0
@_Lback 5 0
@_Lswing 25 0
@_dtail 1 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 0
== dwalk3 x=0
@_Lfwd~ 10 0
@_Lback~ 21 0
@_Lback 5 0
@_Lfwd 25 0
@_dtail 0 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 0
== dwalk4 x=0
@_Lmid~ 11 0
@_Lliftb~ 21 0
@_Lliftb 5 0
@_Lmid 26 0
@_dtail 0 -1
@_body 0 -1
@_saddle% 0 -1
@_dhead 0 -1
== dwalk5 x=0
@_Lback~ 10 0
@_Lswing~ 21 0
@_Lswing 5 0
@_Lback 25 0
@_dtail 1 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 0
== drun0 x=0
@_Rback~ 8 -1
@_Rfwd~ 23 -1
@_Rback 3 -1
@_Rfwd 27 -1
@_tailrun 0 -1
@_body 0 -1
@_saddle% 0 -1
@_dhead 0 -1
@_dpant 0 -1
== drun1 x=0
@_Rtuck~ 10 -1
@_Rfwd~ 23 -1
@_Rback 3 -1
@_Lfwd 25 0
@_tailrun 0 -1
@_body 0 -1
@_saddle% 0 -1
@_dhead 0 -1
@_dpant 0 -1
== drun2 x=0
@_Rtuck~ 11 0
@_Lmid~ 22 0
@_Rtuck 6 0
@_Lback 25 0
@_tailrun 0 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 1
@_dpant 0 1
== drun3 x=0
@_Lfwd~ 11 0
@_Lback~ 20 0
@_Lfwd 8 0
@_Lback 23 0
@_tailrun 1 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 1
@_dpant 0 1
== drun4 x=0
@_Lmid~ 11 0
@_Rtuck~ 23 -1
@_Lback 5 0
@_Rtuck 27 -1
@_tailrun 1 -1
@_body 0 -1
@_saddle% 0 -1
@_dhead 0 -1
@_dpant 0 -1
== drun5 x=0
@_Lback~ 9 -2
@_Rtuck~ 23 -2
@_Rback 4 -2
@_Rfwd 27 -2
@_tailrun 0 -2
@_body 0 -2
@_saddle% 0 -2
@_dhead 0 -2
@_dpant 0 -2

# ---- sitting, and everything done sitting
== _dsitbody x=10
......ooooooooo........
....oolllllllllloo.....
...olllllllllllllfo....
..olllfffffffffffdo....
..olfffffffiwwwwwvdo...
.olffffffffiwwwwwvdo...
.olfffffffffiwwwwvdo...
.olffffffffffiwwwvdo...
olfffffffffffidlffdo...
olffffffffffidlffdo....
olffffffffffidlffdo....
offfffffffffidlffdo....
offfffffffffidlffdo....
offfffffffddidlffdo....
offffffddddiidlffdo....
odddddddaaaiaalffo.....
.dddddddaaaiaaaaAo.....
.oooooooooooooooooo....
== dsit x=0
@_dsittail 0 0
@_dsitbody 0 0
@_saddleS% 0 0
@_dhead -12 0
== dsit0 x=0
@dsit 0 0
== dblink0 x=0
@dsit 0 0
@_deyehalf -12 0
== dblink1 x=0
@dsit 0 0
@_deyeshut -12 0
== dblink2 x=0
@dsit 0 0
@_deyehalf -12 0
== dflick0 x=0
@dsit 0 0
== dflick1 x=0
@_dwag 1 0
@_dsitbody 0 0
@_saddleS% 0 0
@_dhead -12 0
== dflick2 x=0
@dsit 0 0
== dflick3 x=0
@_dwag 1 0
@_dsitbody 0 0
@_saddleS% 0 0
@_dhead -12 0
== dhappy0 x=0
@_dwag 1 0
@_dsitbody 0 0
@_saddleS% 0 0
@_dhead -12 0
@_deyeshut -12 0
@_dpant -12 0
== dhappy1 x=0
@_dsittail 0 0
@_dsitbody 0 -1
@_saddleS% 0 -1
@_dhead -12 -1
@_deyeshut -12 -1
@_dpant -12 -1
== dlook0 x=0
@dsit 0 0
@_dhead -12 -1
@_deyewide -12 -1
== dyawn0 x=0
@dsit 0 0
@_deyehalf -12 0
@_dmouth -12 0
== dyawn1 x=0
@dsit 0 0
@_deyeshut -12 0
@_dpant -12 0
== dyawn2 x=0
@dsit 0 0
@_deyeshut -12 0
@_dpant -12 0
@_dmouth -12 2
== dyawn3 x=0
@dsit 0 0
@_deyehalf -12 0
@_dmouth -12 0

# a scratch behind the ear: the near hind leg up, kicking
== _scratch1 x=8 y=17
....oooo.
...oaaaao
...oaaaao
....olffo
...olffo.
...olffo.
..olffo..
..olfffo.
.olffffo.
.olffffo.
olffffo..
== _scratch2 x=8 y=19
...oooo..
..oaaaao.
..oaaaao.
...olffo.
...olffo.
..olffo..
..olfffo.
.olffffo.
.olffffo.
olffffo..
== dwash0 x=0
@dsit 0 0
@_scratch1 0 0
@_deyehalf -12 0
== dwash1 x=0
@dsit 0 0
@_scratch2 0 0
@_deyeshut -12 0
@_dmouth -12 0
== dwash2 x=0
@dsit 0 0
@_scratch1 0 0
@_deyeshut -12 0
@_dmouth -12 0
== dwash3 x=0
@dsit 0 0
@_scratch2 0 0
@_deyeshut -12 0
@_dmouth -12 0

# ---- lying: a sphinx, paws out in front; asleep curled round
== dloaf0 x=0
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead -1 8
@_deyehalf -1 8
== dlick0 x=0
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 1 11
@_deyeshut 1 11
== dlick1 x=35 y=36
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 1 11
@_deyeshut 1 11
tt
== dlick2 x=0
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 2 11
@_deyeshut 2 11
== dlick3 x=36 y=36
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 2 11
@_deyeshut 2 11
tt
== dsleep0 x=0
@_dsittail -1 0
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 0 11
@_deyeshut 0 11
== dsleep1 x=0
@_dsittail -1 0
@_loafbody 0 -1
@_loafbody 0 0
@_saddleL% 0 0
@_paws 1 0
@_dhead 0 11
@_deyeshut 0 11

# ---- stretching, eating, jumping
== dstretch0 x=0
@_Lmid~ 11 -3
@_Lmid~ 11 0
@_Lmid 6 -3
@_Lmid 6 0
@_paws 0 0
@_dtail 2 -4
@_bowbody 0 0
@_dhead 2 9
@_deyeshut 2 9
== dstretch1 x=0
@_Lmid~ 11 -4
@_Lmid~ 11 0
@_Lmid 6 -4
@_Lmid 6 0
@_paws 1 0
@_dtail 2 -5
@_bowbody 0 -1
@_dhead 3 10
@_deyeshut 3 10
@_dpant 3 10
== dstretch2 x=0
@_Lmid~ 22 0
@_Lback~ 11 0
@_Lmid 26 0
@_Rback 0 0
@_dtail 0 0
@_body 0 0
@_saddle% 0 0
@_dhead 0 0
@_deyehalf 0 0
== deat0 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_dtail 0 5
@_crouchbody 0 0
@_saddle% 0 5
@_dhead 4 9
@_deyehalf 4 9
== deat1 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_dtail 0 5
@_crouchbody 0 0
@_saddle% 0 5
@_dhead 4 10
@_deyeshut 4 10
== dcrouch0 x=0
@_Lbent~ 12 0
@_Lbent~ 24 0
@_Lbentb 6 0
@_Lbent 27 0
@_tailrun 1 5
@_crouchbody 0 0
@_saddle% 0 5
@_dhead 0 4
== dleap0 x=0
@_Rback~ 8 -8
@_Rfwd~ 23 -8
@_Rback 3 -8
@_Rfwd 27 -8
@_tailrun 0 -8
@_body 0 -8
@_saddle% 0 -8
@_dhead 0 -9
@_deyewide 0 -9
== dland0 x=0
@_Rtuck~ 11 -2
@_Lfwd~ 22 0
@_Rtuck 6 -2
@_Lfwd 26 0
@_tailrun 0 -2
@_body 0 -2
@_saddle% 0 -2
@_dhead 0 -1
`;
