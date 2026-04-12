/**
 * Completed View — loads completed goals and populates the completed template.
 */

let _completedFilter = 'all';

function _getGoalColor(goal) {
    return colorManager.getColor(goal.id, goal.title);
}

function _fmtMin(durationMin) {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function _createCompletedCard(goal) {
    const color      = _getGoalColor(goal);
    const durationMin = goal.duration_min || 0;
    const timeStr    = durationMin > 0
        ? `${_fmtMin(durationMin)} / ${_fmtMin(durationMin)}`
        : '0h 00m / 0h 00m';

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
        </div>`;
}

async function _loadCompletedGoals() {
    const el = document.getElementById('completedContainer');
    if (!el) return;
    try {
        const goals      = await goalsService.fetchGoals();
        let completed    = goals.filter(g => g.is_complete || g.status === 'completed');
        const now        = Date.now();
        const oneWeekMs  = 7 * 24 * 60 * 60 * 1000;
        let filtered     = completed;

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
                </div>`;
            return;
        }

        const cards     = filtered.map(_createCompletedCard).join('');
        const weekCount = completed.filter(g => {
            const ts = g.completed_at || g.updated_at || g.deadline;
            return ts && (now - new Date(ts).getTime()) <= oneWeekMs;
        }).length;

        el.innerHTML = `
            <div class="project-list-outer">${cards}</div>
            ${weekCount > 0 ? `
            <div class="completed-summary-card" style="
                background:white;border-radius:16px;padding:24px 28px;margin-top:20px;
                display:flex;align-items:center;justify-content:space-between;gap:20px;
                box-shadow:0 2px 12px rgba(0,0,0,0.07);">
                <div>
                    <p style="font-size:18px;font-weight:700;color:#333;margin:0 0 8px 0;">
                        Past week: ${weekCount} project${weekCount !== 1 ? 's' : ''} completed!
                    </p>
                    <p style="font-size:14px;color:#666;margin:0;">
                        Great job! Keep up the great work!
                    </p>
                </div>
                <img src="assets/icons/happy-calendar.png" alt="Great job!" style="width:110px;height:auto;flex-shrink:0;">
            </div>` : ''}`;
    } catch (err) {
        if (el) el.innerHTML = `
            <div class="error-state" style="text-align:center;padding:60px 0;">
                <p style="color:#999;">${err.message || 'Something went wrong'}</p>
            </div>`;
        Toast.error('Failed to load completed projects');
    }
}

export async function initCompletedView() {
    _completedFilter = 'all';
    await _loadCompletedGoals();
}

window.setCompletedFilter = function(filter, btn) {
    _completedFilter = filter;
    document.querySelectorAll('.completed-filter-row .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _loadCompletedGoals();
};

window.clearCompleted = async function() {
    if (!confirm('Are you sure you want to permanently delete all completed goals? This cannot be undone.')) return;
    try {
        const goals     = await goalsService.fetchGoals();
        const completed = goals.filter(g => g.is_complete || g.status === 'completed');
        if (completed.length === 0) { Toast.info('No completed goals to clear.'); return; }
        await Promise.all(completed.map(g => goalsService.deleteGoal(g.id)));
        Toast.success(`Cleared ${completed.length} completed goal${completed.length !== 1 ? 's' : ''}.`);
        await _loadCompletedGoals();
    } catch (err) {
        Toast.error(err.message || 'Failed to clear completed goals');
    }
};

window.renderCompleted = () => renderer.render('pages/completed.html', initCompletedView, {}, { layout: '/completed' });
