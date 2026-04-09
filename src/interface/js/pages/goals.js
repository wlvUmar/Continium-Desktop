/**
 * Goals / Projects Pages
 * From goals-list.js — includes:
 *   - goal colors (from goal.color or localStorage)
 *   - sad-folder image for empty state
 *   - real completed page with happy-calendar image
 */

// ============================================
// GOALS API SERVICE
// ============================================

const goalsService = {
    async fetchGoals() {
        return await api.get('/goals/');
    },
    async fetchGoal(goalId) {
        return await api.get(`/goals/${goalId}`);
    },
    async createGoal(goalData) {
        return await api.post('/goals/', goalData);
    },
    async updateGoal(goalId, goalData) {
        return await api.put(`/goals/${goalId}`, goalData);
    },
    async deleteGoal(goalId) {
        await api.delete(`/goals/${goalId}`);
    }
};


// ============================================
// HELPERS
// ============================================

function _getGoalColor(goal) {
    return colorManager.getColor(goal.id, goal.title);
}

function _fmtMin(durationMin) {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Calculate today's progress percentage for a goal
async function _getTodayProgress(goalId) {
    try {
        const stats = await api.get(`/stats/goal/${goalId}`);
        
        if (!Array.isArray(stats)) {
            return 0;
        }
        
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        
        // Sum all stats from today
        const todayMinutes = stats.reduce((sum, stat) => {
            const statDate = stat.occurred_at.split('T')[0];
            return statDate === today ? sum + (stat.duration_minutes || 0) : sum;
        }, 0);
        
        return todayMinutes;
    } catch (err) {
        console.error(`Failed to load progress for goal ${goalId}:`, err);
        return 0;
    }
}

function _createLoadingState() {
    return `
        <div class="loading-state" style="text-align:center;padding:60px 0;">
            <div class="spinner-large"></div>
            <p style="margin-top:16px;color:#999;">Loading...</p>
        </div>
    `;
}

function _createErrorState(message) {
    return `
        <div class="error-state" style="text-align:center;padding:60px 0;">
            <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
            <h2 style="color:#333;">Failed to load</h2>
            <p style="color:#999;">${message || 'Something went wrong'}</p>
            <button onclick="window.location.reload()" class="btn-primary" style="margin-top:16px;">Try Again</button>
        </div>
    `;
}


// ============================================
// GOAL CARD (active goal)
// ============================================

function createGoalCard(goal) {
    const color       = _getGoalColor(goal);
    const progress    = goal.is_complete ? 100 : 0;  // Will be updated by renderGoalsPage after fetching stats
    const durationMin = goal.duration_min || 0;
    const todayMinutes = 0;  // Will be updated
    const timeDisplay = durationMin > 0 ? `${Math.floor(todayMinutes/60)}h ${todayMinutes%60}m / ${_fmtMin(durationMin)}` : '0h 00m';
    const progressFill = Math.max(0, Math.min(100, progress));

    return `
        <div class="project-card-main" data-goal-id="${goal.id}">
            <button class="project-card-play-btn" 
                onclick="event.stopPropagation(); window.openFocusModal('${goal.id}')" title="Start session">
                <img src="assets/icons/play_vector.svg" alt="Play">
            </button>
            <div class="project-card-title">${goal.title || 'Untitled'}</div>
            <div class="project-card-time">${timeDisplay}</div>
            <div class="project-card-progress-container">
                <div class="project-card-progress-bar">
                    <div class="project-card-progress-fill" style="width:${progressFill}%; background:${color};"></div>
                </div>
            </div>
            <div class="project-card-percentage" style="color:#07B6D5;">${progress}%</div>
            <a href="#" onclick="event.preventDefault(); router.navigate('/goal/${goal.id}')">
                <svg class="project-card-chevron" width="19" height="34" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M4.8 0L24 21L4.8 42L0 36.75L14.4 21L0 5.25L4.8 0Z" fill="#D9D9D9"/>
                </svg>
            </a>
        </div>
    `;
}

function createGoalsList(goals) {
    if (!goals || goals.length === 0) {
        return `
            <div class="empty-state">
                <img src="assets/icons/empty-folder.png" alt="No projects" style="width:200px;height:auto;margin-bottom:24px;">
                <h2>No projects yet</h2>
                <p>You haven't created any projects yet.<br>Start by adding your first goal to begin tracking your progress.</p>
                <button onclick="openAddGoalModal()" class="btn-primary" style="margin-top:8px;">Create Goal</button>
            </div>
        `;
    }
    return `
        <div class="project-cards-container">
            ${goals.map(g => createGoalCard(g)).join('')}
        </div>
    `;
}

// Update progress bars after rendering (fetches today's stats)
async function _updateGoalsProgress(goals) {
    // Register callback for live updates
    statsManager.subscribe((goalId, todayMinutes, totalMinutes, percentage) => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const color = _getGoalColor(goal);
        
        // Update card element
        const cardEl = document.querySelector(`[data-goal-id="${goalId}"]`);
        if (cardEl) {
            // Update progress bar
            const fill = cardEl.querySelector('.project-card-progress-fill');
            if (fill) fill.style.width = percentage + '%';
            
            // Update percentage text (keep color #07B6D5, only progress bar changes)
            const percent = cardEl.querySelector('.project-card-percentage');
            if (percent) {
                percent.textContent = percentage + '%';
            }
            
            // Update time display - show TOTAL time worked
            const durationMin = goal.duration_min || 0;
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const timeDisplay = durationMin > 0 ? `${h}h ${String(m).padStart(2, "0")}m / ${_fmtMin(durationMin)}` : `${h}h ${String(m).padStart(2, "0")}m`;
            const timeEl = cardEl.querySelector('.project-card-time');
            if (timeEl) timeEl.textContent = timeDisplay;
        }
    });

    // Initial fetch for all goals using stats manager
    for (const goal of goals) {
        const durationMin = goal.duration_min || 0;
        const color = _getGoalColor(goal);
        const progress = await statsManager.getTodayProgress(goal.id, durationMin, false);
        const progressPercent = progress.percentage;
        const totalMinutes = progress.totalMinutes || 0;
        
        // Update card element
        const cardEl = document.querySelector(`[data-goal-id="${goal.id}"]`);
        if (cardEl) {
            // Update progress bar
            const fill = cardEl.querySelector('.project-card-progress-fill');
            if (fill) fill.style.width = progressPercent + '%';
            
            // Update percentage text (keep color #07B6D5, only progress bar changes)
            const percent = cardEl.querySelector('.project-card-percentage');
            if (percent) {
                percent.textContent = progressPercent + '%';
            }
            
            // Update time display - show TOTAL time worked
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const timeDisplay = durationMin > 0 ? `${h}h ${String(m).padStart(2, "0")}m / ${_fmtMin(durationMin)}` : `${h}h ${String(m).padStart(2, "0")}m`;
            const timeEl = cardEl.querySelector('.project-card-time');
            if (timeEl) timeEl.textContent = timeDisplay;
        }
    }

    // Start polling for updates
    statsManager.startPolling(goals.map(g => g.id));
}


// ============================================
// COMPLETED GOAL CARD
// ============================================

function _createCompletedCard(goal) {
    const color       = _getGoalColor(goal);
    const durationMin = goal.duration_min || 0;
    const timeStr     = durationMin > 0 ? `${_fmtMin(durationMin)} / ${_fmtMin(durationMin)}` : '0h 00m / 0h 00m';

    return `
        <div class="project-card-main">
            <div class="project-card-play-btn" style="background:${color};">
                <img src="assets/icons/checkmark_icon.svg" alt="Done">
            </div>
            <div class="project-card-title">${goal.title || 'Untitled'}</div>
            <div class="project-card-time">${timeStr}</div>
            <div class="project-card-progress-container">
                <div class="project-card-progress-bar">
                    <div class="project-card-progress-fill" style="width:100%; background:${color};"></div>
                </div>
            </div>
            <div class="project-card-percentage" style="color:#07B6D5;">100%</div>
            <img src="assets/icons/checkmark_icon.svg" class="project-card-chevron" alt="">
        </div>
    `;
}


// ============================================
// PROJECTS PAGE (active goals)
// ============================================

async function renderProjectsPageWithGoals() {
    const appContainer = document.getElementById('app');
    const content = `
        <div class="page-header">
            <h1>Projects</h1>
        </div>
        <div class="search-bar-full">
            <input type="text" class="search-input-pill" placeholder="Search projects...">
        </div>
        <div id="projectsContainer">${_createLoadingState()}</div>
    `;
    appContainer.innerHTML = createLayout(content, '/projects');
    attachNavigationListeners();

    try {
        const goals   = await goalsService.fetchGoals();
        const active  = goals.filter(g => !g.is_complete && g.status !== 'completed');
        const el      = document.getElementById('projectsContainer');
        if (el) el.innerHTML = createGoalsList(active);
        
        // Load and update progress bars
        await _updateGoalsProgress(active);
    } catch (err) {
        const el = document.getElementById('projectsContainer');
        if (el) el.innerHTML = _createErrorState(err.message);
        Toast.error('Failed to load projects');
    }
}


// ============================================
// COMPLETED PAGE (completed goals)
// ============================================

let _completedFilter = 'all';

async function renderCompletedPageWithGoals() {
    const appContainer = document.getElementById('app');
    const content = `
        <h1 class="page-title">Completed</h1>
        <div class="completed-filter-row" style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
            <div class="insights-tabs">
                <button class="tab-btn active" onclick="setCompletedFilter('all', this)">All time</button>
                <button class="tab-btn" onclick="setCompletedFilter('week', this)">Past week</button>
            </div>
            <button class="clear-all-btn" onclick="clearCompleted()" style="margin-left:auto;">Clear all</button>
        </div>
        <div id="completedContainer">${_createLoadingState()}</div>
    `;
    appContainer.innerHTML = createLayout(content, '/completed');
    attachNavigationListeners();
    await _loadCompletedGoals();
}

async function _loadCompletedGoals() {
    const el = document.getElementById('completedContainer');
    if (!el) return;
    try {
        const goals     = await goalsService.fetchGoals();
        let completed   = goals.filter(g => g.is_complete || g.status === 'completed');

        const now       = Date.now();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        let filtered    = completed;
        if (_completedFilter === 'week') {
            filtered = completed.filter(g => {
                const ts = g.completed_at || g.updated_at || g.deadline;
                return ts && (now - new Date(ts).getTime()) <= oneWeekMs;
            });
        }

        if (filtered.length === 0) {
            el.innerHTML = `
                <div class="empty-state">
                    <img src="assets/icons/empty-folder.png" alt="Nothing completed" style="width:180px;height:auto;margin-bottom:24px;">
                    <h2>No completed projects</h2>
                    <p>Complete a goal to see it here.</p>
                </div>
            `;
            return;
        }

        const cards     = filtered.map(g => _createCompletedCard(g)).join('');
        const weekCount = completed.filter(g => {
            const ts = g.completed_at || g.updated_at || g.deadline;
            return ts && (now - new Date(ts).getTime()) <= oneWeekMs;
        }).length;

        el.innerHTML = `
            <div class="project-list-outer">${cards}</div>
            ${weekCount > 0 ? `
            <div class="completed-summary-card" style="
                background: white; border-radius: 16px; padding: 24px 28px;
                margin-top: 20px; display: flex; align-items: center;
                justify-content: space-between; gap: 20px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.07);
            ">
                <div>
                    <p style="font-size:18px;font-weight:700;color:#333;margin:0 0 8px 0;">
                        Past week: ${weekCount} project${weekCount !== 1 ? 's' : ''} has been completed!
                    </p>
                    <p style="font-size:14px;color:#666;margin:0;">
                        Great job! You've completed ${weekCount} project${weekCount !== 1 ? 's' : ''} this past week.<br>
                        Keep up the great work!
                    </p>
                </div>
                <img src="assets/icons/happy-calendar.png" alt="Great job!" style="width:110px;height:auto;flex-shrink:0;">
            </div>` : ''}
        `;
    } catch (err) {
        if (el) el.innerHTML = _createErrorState(err.message);
        Toast.error('Failed to load completed projects');
    }
}

window.setCompletedFilter = function(filter, btn) {
    _completedFilter = filter;
    document.querySelectorAll('.completed-filter-row .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _loadCompletedGoals();
};

window.clearCompleted = async function() {
    // Show confirmation before deleting
    if (!confirm('Are you sure you want to permanently delete all completed goals? This cannot be undone.')) {
        return;
    }

    try {
        const goals = await goalsService.fetchGoals();
        const completed = goals.filter(g => g.is_complete || g.status === 'completed');

        if (completed.length === 0) {
            Toast.info('No completed goals to clear.');
            return;
        }

        // Delete all in parallel
        await Promise.all(completed.map(g => goalsService.deleteGoal(g.id)));

        Toast.success(`Cleared ${completed.length} completed goal${completed.length !== 1 ? 's' : ''}.`);

        // Refresh the page
        await _loadCompletedGoals();
    } catch (err) {
        Toast.error(err.message || 'Failed to clear completed goals');
    }
};

// Update sidebar project progress
function _updateSidebarProjectProgress(goalId, progressPercent) {
    // Find sidebar project item and update its progress bar using data-goal-id attribute
    const sidebarItem = document.querySelector(`.project-item[data-goal-id="${goalId}"]`);
    if (sidebarItem) {
        const fill = sidebarItem.querySelector('.project-progress-fill');
        if (fill) fill.style.width = progressPercent + '%';
    }
}


// ============================================
// EXPORT
// ============================================

window.goalsService           = goalsService;
window.createGoalsList        = createGoalsList;
window.renderProjectsPageWithGoals = renderProjectsPageWithGoals;
window.renderCompletedPageWithGoals = renderCompletedPageWithGoals;

// Override main entry points
window.renderProjects  = renderProjectsPageWithGoals;
window.renderCompleted = renderCompletedPageWithGoals;
