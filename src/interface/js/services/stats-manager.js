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

    /**
     * Notify all listeners of an update
     */
    _notifyListeners(goalId, todayMinutes, totalMinutes) {
        // Pass percentage so callbacks don't need to recalculate
        const durationMin = this._goalDurations[goalId] || 0;
        // Calculate percentage based on TOTAL progress, not just today
        const percentage = durationMin > 0 ? Math.min(100, Math.round((totalMinutes / durationMin) * 100)) : 0;
        
        this._callbacks.forEach(cb => {
            try {
                cb(goalId, todayMinutes, totalMinutes, percentage);
            } catch (e) {
                console.error('❌ STATS: Callback error:', e);
            }
        });
    },

    /**
     * Get today's progress for a goal (with caching)
     * Returns: { todayMinutes, totalMinutes, percentage }
     */
    async getTodayProgress(goalId, goalDurationMin = 0, forceRefresh = false) {
        const now = Date.now();
        
        // Store goal duration for polling later
        if (goalDurationMin > 0) {
            this._goalDurations[goalId] = goalDurationMin;
        }
        
        // Prevent fetching if unauthenticated
        if (!localStorage.getItem('access_token')) {

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
            
            // Use stored duration or fallback to parameter
            const durationMin = this._goalDurations[goalId] || goalDurationMin;
            // Calculate percentage based on TOTAL progress, not just today
            const percentage = durationMin > 0 ? Math.min(100, Math.round((totalMinutes / durationMin) * 100)) : 0;

            const data = { todayMinutes, totalMinutes, percentage, stats };

            // Cache the result
            this._cache[goalId] = { data, lastFetch: now };

            // Notify listeners
            this._notifyListeners(goalId, todayMinutes, totalMinutes);


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
