/**
 * stats-manager.js — Centralized stats caching and sync service
 * Provides:
 * - Unified stats fetching with caching
 * - Auto-update callbacks for progress bars
 * - Periodic polling to keep data fresh
 * - Cross-page synchronization via callbacks
 */

const statsManager = {
    _cache: {},           // { goalId: { todayMinutes, lastFetch, goalDurationMin } }
    _callbacks: [],       // Registered listeners for updates
    _goalDurations: {},   // Store goal durations for polling
    _goalMeta: {},        // { goalId: { type, frequency } } for period calc
    _pollInterval: null,
    _pollIntervalMs: 5000, // Poll every 5 seconds

    /**
     * Register a callback to be called when stats update
     * Usage: statsManager.subscribe((goalId, todayMinutes) => { ... })
     */
    subscribe(callback) {
        this._callbacks.push(callback);

    },

    /**
     * Unregister a callback
     */
    unsubscribe(callback) {
        this._callbacks = this._callbacks.filter(cb => cb !== callback);
    },

    _periodMinutes(goalId, stats) {
        const meta = this._goalMeta[goalId] || {};
        const type = meta.type || 'Repeating';
        const freq = meta.frequency || 'daily';
        if (type === 'One Time') {
            return stats.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        }
        const now = new Date();
        if (freq === 'weekly') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return stats.filter(s => new Date(s.occurred_at) >= weekStart)
                        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        }
        if (freq === 'monthly') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return stats.filter(s => new Date(s.occurred_at) >= monthStart)
                        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        }
        // daily (default)
        const today = now.toISOString().split('T')[0];
        return stats.filter(s => s.occurred_at.split('T')[0] === today)
                    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    },

    /**
     * Notify all listeners of an update
     */
    _notifyListeners(goalId, todayMinutes, totalMinutes, stats) {
        const durationMin = this._goalDurations[goalId] || 0;
        const periodMin = this._periodMinutes(goalId, stats || []);
        const percentage = durationMin > 0 ? Math.min(100, Math.round((periodMin / durationMin) * 100)) : 0;

        this._callbacks.forEach(cb => {
            try {
                cb(goalId, todayMinutes, totalMinutes, percentage, periodMin);
            } catch (e) {
                console.error('❌ STATS: Callback error:', e);
            }
        });
    },

    /**
     * Get today's progress for a goal (with caching)
     * Returns: { todayMinutes, totalMinutes, percentage }
     */
    async getTodayProgress(goalId, goalDurationMin = 0, forceRefresh = false, goalType = null, goalFrequency = null) {
        const now = Date.now();

        if (goalDurationMin > 0) {
            this._goalDurations[goalId] = goalDurationMin;
        }
        if (goalType !== null) {
            this._goalMeta[goalId] = { type: goalType, frequency: goalFrequency || 'daily' };
        }
        
        // Prevent fetching if unauthenticated
        const hasSession = !!(localStorage.getItem('session_token') || localStorage.getItem('access_token'));
        if (!hasSession) {

            return { todayMinutes: 0, totalMinutes: 0, percentage: 0, stats: [] };
        }

        const cached = this._cache[goalId];

        // Return cached if still fresh (< 3 seconds old)
        if (cached && !forceRefresh && (now - cached.lastFetch < 3000)) {
            return cached.data;
        }

        try {
            const stats = await api.get(`/stats/goal/${goalId}`);
            const today = new Date().toISOString().split('T')[0];
            

            
            const todayStats = stats.filter(s => s.occurred_at.split('T')[0] === today);
            const todayMinutes = todayStats.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
            const totalMinutes = stats.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

            const durationMin = this._goalDurations[goalId] || goalDurationMin;
            const periodMin = this._periodMinutes(goalId, stats);
            const percentage = durationMin > 0 ? Math.min(100, Math.round((periodMin / durationMin) * 100)) : 0;

            const data = { todayMinutes, totalMinutes, periodMinutes: periodMin, percentage, stats };

            this._cache[goalId] = { data, lastFetch: now };

            this._notifyListeners(goalId, todayMinutes, totalMinutes, stats);


            return data;
        } catch (err) {
            console.error(`❌ STATS: Failed to fetch progress for goal ${goalId}:`, err);
            return { todayMinutes: 0, totalMinutes: 0, percentage: 0, stats: [] };
        }
    },

    /**
     * Force clear cache for a goal (call after save)
     */
    invalidateCache(goalId) {
        delete this._cache[goalId];

    },

    /**
     * Start periodic polling to refresh all cached goals
     */
    startPolling(goalIds = []) {
        if (this._pollInterval) {

            return;
        }

        this._pollInterval = setInterval(() => {
            if (!goalIds.length) return;
            

            goalIds.forEach(goalId => {
                // Just fetch without waiting - updates happen via callbacks
                this.getTodayProgress(goalId, 0, true).catch(() => {});
            });
        }, this._pollIntervalMs);


    },

    /**
     * Stop periodic polling
     */
    stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;

        }
    },

    /**
     * Update polling interval
     */
    setPollingInterval(ms) {
        this._pollIntervalMs = ms;
        if (this._pollInterval) {
            this.stopPolling();
        }
    }
};

window.statsManager = statsManager;
