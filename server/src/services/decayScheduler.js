const pipelineService = require('./pipelineService');

class DecayScheduler {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    start(intervalMs) {
        if (this.intervalId) {
            console.log('[Decay Scheduler] Already running');
            return;
        }

        const interval = intervalMs ||
            parseInt(process.env.DECAY_CHECK_INTERVAL_MS) ||
            60000;

        console.log(
            `[Decay Scheduler] Starting — checking every ${interval / 1000}s`
        );

        // Run once immediately on startup
        this._runCheck();

        // Then repeat on interval
        this.intervalId = setInterval(() => {
            this._runCheck();
        }, interval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Decay Scheduler] Stopped');
        }
    }

    async _runCheck() {
        // Prevent overlapping runs
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        try {
            await pipelineService.checkAndProcessDecays();
        } catch (error) {
            console.error('[Decay Scheduler] Error:', error.message);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new DecayScheduler();