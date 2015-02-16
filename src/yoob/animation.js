/*
 * This file is part of yoob.js version 0.7
 * Available from https://github.com/catseye/yoob.js/
 * This file is in the public domain.  See http://unlicense.org/ for details.
 */
if (window.yoob === undefined) yoob = {};

/*
 * Pretty standard shim to get window.{request,cancelRequest}AnimationFrame
 * functions, synthesized from the theory and the many examples I've seen.
 */

window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(f, elem) {
        return setTimeout(function() {
            f(Date.now());
        }, 1000 / 60);
    };

// it was called "cancelRequestAnimationFrame" in the editor's draft:
// http://webstuff.nfshost.com/anim-timing/Overview.html
// but "cancelAnimationFrame" in the Candidate Recommendation:
// http://www.w3.org/TR/animation-timing/
window.cancelAnimationFrame =
    window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.oCancelAnimationFrame ||
    window.msCancelAnimationFrame ||
    window.cancelRequestAnimationFrame ||
    window.webkitCancelRequestAnimationFrame ||
    window.mozCancelRequestAnimationFrame ||
    window.oCancelRequestAnimationFrame ||
    window.msCancelRequestAnimationFrame ||
    clearTimeout;
window.cancelRequestAnimationFrame = window.cancelAnimationFrame;

/*
 * A yoob.Animation object manages an animation.
 *
 * How many things get animated by one yoob.Animation object is up to
 * you.  For animated demos, it may be sufficient to have only one
 * Animation object which updates many independent graphical objects.
 * However, it may be useful to have multiple Animation objects, if
 * the program can be in different states (for example, one title screen
 * Animation, and a different Animation to use during gameplay.)
 */
yoob.Animation = function() {
    /*
     * Initialize a yoob.Animation.  Takes a configuration dictionary:
     *
     *   mode          'quantum' (default) or 'proportional'
     *   object        the object to call methods on
     *   tickTime      in msec.  for quantum only. default = 1/60th sec
     *   lastTime      internal (but see below)
     *   accumDelta    internal, only used in quantum mode
     *
     * There are two modes that a yoob.Animation can be in,
     * 'quantum' (the default) and 'proportional'.
     *
     * Once the Animation has been started (by calling animation.start()):
     *
     * In the 'quantum' mode, the object's draw() method is called on
     * each animation frame, and the object's update() method is called as
     * many times as necessary to ensure it is called once for every tickTime
     * milliseconds that have passed.  Neither method is passed any
     * parameters.
     *
     * update() (or draw(), in 'proportional' mode only) may return the 
     * exact object 'false' to force the animation to stop immediately.
     *
     * In the 'proportional' mode, the object's draw() method is called on
     * each animation frame, and the amount of time (in milliseconds) that has
     * elapsed since the last time it was called (or 0 if it was never
     * previously called) is passed as the first and only parameter.
     */
    this.init = function(cfg) {
        this.object = cfg.object;
        this.lastTime = cfg.lastTime || null;
        this.accumDelta = cfg.accumDelta || 0;
        this.tickTime = cfg.tickTime || (1000.0 / 60.0);
        this.mode = cfg.mode || 'quantum';
        this.request = null;
        return this;
    };

    this.start = function() {
        if (this.request) {
            return false;
        }
        var $this = this;
        if (this.mode === 'quantum') {
            var animFrame = function(time) {
                $this.object.draw();
                if ($this.lastTime === null) {
                    $this.lastTime = time;
                }
                $this.accumDelta += (time - $this.lastTime);
                while ($this.accumDelta > $this.tickTime) {
                    $this.accumDelta -= $this.tickTime;
                    var result = $this.object.update();
                    if (result === false) {
                        $this.accumDelta = $this.tickTime;
                        $this.request = null;
                    }
                }
                $this.lastTime = time;
                if ($this.request) {
                    $this.request = requestAnimationFrame(animFrame);
                }
            };
        } else if (this.mode === 'proportional') {
            var animFrame = function(time) {
                var timeElapsed = (
                    $this.lastTime == null ? 0 : time - $this.lastTime
                );
                $this.lastTime = time;
                var result = $this.object.draw(timeElapsed);
                if (result === false) {
                    $this.request = null;
                }
                if ($this.request) {
                    $this.request = requestAnimationFrame(animFrame);
                }
            };
        }
        this.request = requestAnimationFrame(animFrame);
        return true;
    };

    this.stop = function() {
        if (this.request) {
            cancelRequestAnimationFrame(this.request);
        }
        this.request = null;
    };

    this.reset = function() {
        this.stop();
        this.lastTime = null;
    };
};
