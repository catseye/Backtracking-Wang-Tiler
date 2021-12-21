Backtracking Wang Tiler
=======================

_Try it online_ [@ catseye.tc](https://catseye.tc/installation/Backtracking_Wang_Tiling)
| _See also:_ [Kolakoski Kurve](https://catseye.tc/node/Kolakoski_Kurve)

- - - -

This repository contains a description and implementation of an algorithm
that generates [Wang tilings][].

You can read the linked article for more information, but in brief, a
Wang tiling is a tiling of the plane by a set of tiles which, by their
nature, tile the plane _aperiodically_ — the tiling pattern never quite
repeats itself.

Even more interestingly, each such aperiodic tiling corresponds to a Turing
machine that does not halt.

Backtracking Wang Tiler
-----------------------

This is a naïve algorithm which works as follows:

*   Place a tile at the origin.
*   Place successive tiles in a spiral: from the origin, move right, then
    down, then left, then up, then right again etc., keeping always
    adjacent to tiles that have previously been placed.
*   Before placing a tile, compute all the allowable possibilities for 
    tiles at that position.
*   If there are no allowable possibilities, backtrack: change the
    previously-placed tile to the next allowable possibility for it
    ("retry" it) and continue; and if there are no more allowable
    possibilities for that previous tile, delete it and retry the tile
    previous to it, and so forth.

Given that Wang tiles do tile the plane (albeit aperiodically,) this will
eventually generate a tiling.

However, it is incredibly efficient, for the following reason: it is entirely
possible that it will lay down a "wall" against which it is impossible to
place any series of Wang tiles, because it contains an "impossible spot."
While trying to place tiles against this wall, it will keep hitting the
"impossible spot" and backtracking, trying possibility after possibility
until it backtracks all the way around the spiral and finally replaces the
"impossible spot" with something not-impossible-to-tile-against.

It is, however, interesting to watch.

This algorithm has been implemented in Javascript, using the [yoob.js][]
framework, depicting the tiles on an HTML5 canvas.

The implementation uses the 13 tiles given by Culik in 1996 (see article
linked to above), but it would be quite easy to modify it to use any given
set of tiles (even ones which tile periodically, for whatever it's worth.)

Other possible algorithms
-------------------------

### Lookahead ###

It should be possible to refine the backtracking algorithm by adding some
lookahead, and ensuring early that no "impossible spots" are created.

In a sense, if you could look ahead infinitely far, you wouldn't need to
backtrack at all.  Of course, that wouldn't be a practical algorithm; in
fact, that strongly implies that you will always need backtracking (or
something equivalent to it.)

### Bogo-tile ###

It might be possible to use "reconciliation" instead of backtracking, in
an algorithm something like:

*   Place the initial tile randomly.
*   Choose a random position adjacent to a placed tile.
*   Place a tile there.
*   If there are any tiles adjacent to it that don't match, delete them.
    *   And if it is not possible to place a tile in that now-empty position,
        delete the tile you just placed.
*   Repeat from step 2.

Once a cluster of tiles do fit together, they will only be deleted starting
from the edges.  But assuming fits are more likely than clashes (are they??),
such clusters would tend to grow, rather than shrink, and eventually tile
the plane.  (Shrinking is the equivalent to backtracking in this scheme.)

I expect this would be even less efficient than explicit backtracking.  But
it, too, might be interesting to watch.  And it has the nice properties of
being simpler and more "statistical".

### Turing machine translation ###

This one should be obvious, since it's how Berger showed the domino problem
is undecidable: since every Turing machine which does not halt corresponds
to a possible Wang tiling, just pick a Turing machine which you know does
not halt, and translate it into a tiling.

Thing is, I haven't looked at Berger's paper, and don't know if his translation
from TM's to tilings (and back) is constructive.  If it isn't, well, there's
no easy algorithm to be had.

There is also the small complication that you'd have to prove that the Turing
machine never halts, first.  This isn't insurmountable; the Halting Problem
is only undecidable in general, and given a particular TM, we can sometimes
prove that it does not halt.  But it does kind of place a practical limit on
the number of tilings you could generate using this method.

[Wang tilings]: http://en.wikipedia.org/wiki/Wang_tile
[yoob.js]: http://catseye.tc/node/yoob.js
