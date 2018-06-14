const events = require('events');
const activeWin = require('active-win');

/**
 * EventEmitter for active Window changes.
 * Uses platform-dependent modules to check the current active window.
 * Checks are performed in an interval and are not perfectly accurate.
 */
class ActiveWinEmitter extends events.EventEmitter {
    constructor(interval = 1000) {
        super();
        this.interval = interval;
        this.lastActive = null;
    }

    /**
     * Called on each interval.
     * Checks for the active window and emits an event if it has changed.
     * @private
     */
    tick() {
        activeWin().then((win) => {
            if (!this.lastActive || this.lastActive.title !== win.title || this.lastActive.app !== win.app) {
                this.lastActive = win;
                this.emit('change', win);
            }
        });
    }

    /**
     * Start the tracking.
     * Checks for the active window and repeats checks in an interval.
     */
    start() {
        this.tick();
        this.timeout = setInterval(this.tick.bind(this), this.interval);
    }

    /**
     * Stop the tracking.
     */
    stop() {
        clearInterval(this.timeout);
        this.lastActive = null;
    }
}

module.exports = ActiveWinEmitter;
