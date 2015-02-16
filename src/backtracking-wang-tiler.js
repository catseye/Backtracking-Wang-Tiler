"use strict";

function launch(prefix, containerId, config) {
    var config = config || {};
    var deps = [
        "element-factory.js",
        "playfield.js",
        "animation.js"
    ];
    var loaded = 0;
    for (var i = 0; i < deps.length; i++) {
        var elem = document.createElement('script');
        elem.src = prefix + deps[i];
        elem.onload = function() {
            if (++loaded < deps.length) return;
            var container = document.getElementById(containerId);

            var tileSize = 40;
            var gridWidth = 11;  // odd is nicer b/c first tile is in centre
            var gridHeight = 11;
            var canvas = yoob.makeCanvas(
                container, tileSize * gridWidth, tileSize * gridHeight
            );    

            (new WangTiler()).init({
                'canvas': canvas,
                'tileSize': tileSize,
                'gridWidth': gridWidth,
                'gridHeight': gridHeight
            });
        };
        document.body.appendChild(elem);
    }
}

// Clockwise starting from top.

var NORTH = 0;
var EAST = 1;
var SOUTH = 2;
var WEST = 3;

var DELTA = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
];

// R = Red, G = Green, B = Blue, Y = Yellow, K = Grey

var TILES = [
    "GGBR", // 0
    "GBGR",
    "GBBG",
    "RRGG",
    "RRBB",
    "RGGB",
    "YYRY",
    "BYGY",
    "GKRY",
    "GKYY",
    "YKRK",
    "BKGK",
    "GYGK", // 12
];

var COLOURS = {
    'R': '#ff0000',
    'G': '#00ff00',
    'Y': '#ffff00',
    'B': '#0000ff',
    'K': '#808080'
};

var YES = function(t) {
    return true;
};

var Tile = function() {
    this.init = function(cfg) {
        this.x = cfg.x;                         // grid position in playfield
        this.y = cfg.y;                         //   (mostly for backtracking)
        this.possibilities = cfg.possibilities; // list of indices into TILES
        this.prev = cfg.prev;                   // Tile | null
        this.choice = 0;                        // index into possibilities
        this.type = this.possibilities[this.choice];
        return this;
    };

    /*
     * Try the next possibility for this Tile (used during
     * backtracking.)  Returns false if the possibilities
     * for this Tile have been exhausted.
     */
    this.retry = function() {
        this.choice++;
        if (this.choice >= this.possibilities.length) {
            return false;
        }
        this.type = this.possibilities[this.choice];
        return true;        
    };

    /*
     * Draw this Tile in a drawing context.
     * (x, y) is the top-left corner, given in context-units.
     */
    this.draw = function(ctx, x, y, w, h) {
        var td = TILES[this.type];

        /*
         * If there're going to be hairline cracks between the
         * triangles anyway, they look better in black.
         */
        ctx.fillStyle = 'black';
        ctx.fillRect(x, y, w, h);

        ctx.beginPath();
        ctx.fillStyle = COLOURS[td.charAt(NORTH)];
        ctx.moveTo(x, y);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = COLOURS[td.charAt(EAST)];
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = COLOURS[td.charAt(SOUTH)];
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = COLOURS[td.charAt(WEST)];
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);
    };
};

var WangTiler = function() {
    var canvas;
    var ctx;

    var tileSize;
    var pf;
    var t;
    var gridW, gridH;
    var cx, cy;
    var wait;

    /*
     * Find the set of possibilities that fit into cell (x, y)
     * in the playfield, and returns it.
     */
    this.possibilitiesForTile = function(x, y) {
        var n = pf.get(x, y - 1);
        var e = pf.get(x + 1, y);
        var s = pf.get(x, y + 1);
        var w = pf.get(x - 1, y);

        var predN = n ? function(t) {
            return t.charAt(NORTH) === TILES[n.type].charAt(SOUTH);
        } : YES;
        var predE = e ? function(t) {
            return t.charAt(EAST) === TILES[e.type].charAt(WEST);
        } : YES;
        var predS = s ? function(t) {
            return t.charAt(SOUTH) === TILES[s.type].charAt(NORTH);
        } : YES;
        var predW = w ? function(t) {
            return t.charAt(WEST) === TILES[w.type].charAt(EAST);
        } : YES;

        var possibilities = [];
        for (var i = 0; i < TILES.length; i++) {
            var t = TILES[i];
            if (predN(t) && predE(t) && predS(t) && predW(t)) {
                possibilities.push(i);
            }
        }

        return possibilities;
    };

    /*
     * Assuming the last-placed tile is at (x, y), determine where the
     * next-placed tile shall be.
     */
    this.moveAlong = function(x, y) {
        // find tile's neighbours
        var n = pf.get(x, y - 1);
        var ne = pf.get(x + 1, y - 1);
        var e = pf.get(x + 1, y);
        var se = pf.get(x + 1, y + 1);
        var s = pf.get(x, y + 1);
        var sw = pf.get(x - 1, y + 1);
        var w = pf.get(x - 1, y);
        var nw = pf.get(x - 1, y - 1);

        // pick a direction
        var dx, dy;

        // if there is a tile to the E, or if there is a tile to the NE but not the N, go N.
        // if there is a tile to the S, or if there is a tile to the SE but not the E, go E.
        // if there is a tile to the W, or if there is a tile to the SW but not the S, go S.
        // if there is a tile to the N, or if there is a tile to the NW but not the W, go W.
        // else just go east and we'll figure out the rest later.
        if ((e && !n) || (ne && !n)) {
            dx = 0;
            dy = -1;
        } else if ((s && !e) || (se && !e)) {
            dx = 1;
            dy = 0;
        } else if ((w && !s) || (se && !s)) {
            dx = 0;
            dy = 1;
        } else if ((n && !w) || (nw && !w)) {
            dx = -1;
            dy = 0;
        } else {
            dx = 1;
            dy = 0;
        }

        if (pf.get(x + dx, y + dy)) {
            alert("We messed up navigation somehow!")
        }

        return [dx, dy];
    };

    /*
     * Update the state of the tiling -- move to the next position and
     * place a new Tile.  If that turns out to not be possible, backtrack.
     */
    this.update = function() {
        var tile = pf.get(cx, cy);

        var delta = this.moveAlong(cx, cy);
        var nx = cx + delta[0];
        var ny = cy + delta[1];

        var possibilities = this.possibilitiesForTile(nx, ny);
        if (possibilities.length > 0) {

            if (true) {
                var newPossibilities = [];
                while (possibilities.length > 0) {
                    newPossibilities.push(
                        possibilities.splice(
                            Math.random() * possibilities.length, 1
                        )[0]
                    );
                }        
                possibilities = newPossibilities;
            }

            var newTile = (new Tile()).init({
                'x': nx,
                'y': ny,
                'possibilities': possibilities,
                'prev': tile
            });
            cx = nx;
            cy = ny;
            pf.put(cx, cy, newTile);
        } else {
            // backtrack
            var done = false;
            while (!done) {
                if (tile.retry()) {
                    done = true;
                } else {
                    // remove tile from playfield, and backtrack further
                    pf.put(tile.x, tile.y, null);
                    tile = tile.prev;
                    cx = tile.x;
                    cy = tile.y;
                }
            }
        }
    };

    /*
     * Draw the current state of the tiling on the canvas.
     */
    this.draw = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pf.foreach(function(x, y, tile) {
            tile.draw(ctx, x * tileSize, y * tileSize, tileSize, tileSize);
        });
    };

    this.init = function(cfg) {
        canvas = cfg.canvas;
        ctx = canvas.getContext('2d');

        tileSize = cfg.tileSize || 20;
        pf = (new yoob.Playfield()).setDefault(null);
        wait = 0;

        gridW = cfg.gridWidth || 20;
        gridH = cfg.gridHeight || 20;
        cx = Math.trunc(gridW / 2);
        cy = Math.trunc(gridH / 2);

        var possibilities = this.possibilitiesForTile(cx, cy);
        if (possibilities.length === 0) {
            alert('wat');
        }
        var initTile = (new Tile()).init({
            'x': cx,
            'y': cy,
            'possibilities': possibilities
        });
        pf.put(cx, cy, initTile);

        this.animation = (new yoob.Animation()).init({
            'object': this
        });
        this.animation.start();
    };
};
