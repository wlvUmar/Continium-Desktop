/**
 * Projects View — loads active goals and populates the projects template.
 */

function _getGoalColor(goal) {
    return colorManager.getColor(goal.id, goal.title);
}

function _fmtMin(durationMin) {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function _createGoalCard(goal) {
    const color      = _getGoalColor(goal);
    const durationMin = goal.duration_min || 0;
    const timeDisplay = durationMin > 0 ? `0h 00m / ${_fmtMin(durationMin)}` : '0h 00m';

    return `
        <div class="project-card-main" data-goal-id="${goal.id}">
            <button class="project-card-play-btn"
                onclick="event.stopPropagation(); window.startTimerForGoal('${goal.id}')" title="Start session">
                <img src="assets/icons/play_vector.svg" alt="Play">
            </button>
            <div class="project-card-title">${goal.title || 'Untitled'}</div>
            <div class="project-card-time">${timeDisplay}</div>
            <div class="project-card-progress-container">
                <div class="project-card-progress-bar">
                    <div class="project-card-progress-fill" style="width:0%; background:${color};"></div>
                </div>
            </div>
            <div class="project-card-percentage" style="color:#07B6D5;">0%</div>
            <a href="#" onclick="event.preventDefault(); router.navigate('/goal/${goal.id}')">
                <svg class="project-card-chevron" width="19" height="34" viewBox="0 0 24 42" fill="none">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M4.8 0L24 21L4.8 42L0 36.75L14.4 21L0 5.25L4.8 0Z" fill="#D9D9D9"/>
                </svg>
            </a>
        </div>`;
}

function _createGoalsList(goals) {
    if (!goals || goals.length === 0) {
        return `
            <div class="empty-state">
                <img src="assets/icons/empty-folder.png" alt="No projects" style="width:200px;height:auto;margin-bottom:24px;">
                <h2>No projects yet</h2>
                <p>You haven't created any projects yet.<br>Start by adding your first goal to begin tracking your progress.</p>
                <button onclick="openAddGoalModal()" class="btn-primary" style="margin-top:8px;">Create Goal</button>
            </div>`;
    }
    return `<div class="project-cards-container">${goals.map(_createGoalCard).join('')}</div>`;
}

async function _updateGoalsProgress(goals) {
    statsManager.subscribe((goalId, todayMinutes, totalMinutes, percentage) => {
        const goal   = goals.find(g => g.id === goalId);
        if (!goal) return;
        const cardEl = document.querySelector(`[data-goal-id="${goalId}"]`);
        if (!cardEl) return;

        const fill = cardEl.querySelector('.project-card-progress-fill');
        if (fill) fill.style.width = percentage + '%';

        const pct = cardEl.querySelector('.project-card-percentage');
        if (pct) pct.textContent = percentage + '%';

        const durationMin = goal.duration_min || 0;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const timeDisplay = durationMin > 0
            ? `${h}h ${String(m).padStart(2, '0')}m / ${_fmtMin(durationMin)}`
            : `${h}h ${String(m).padStart(2, '0')}m`;
        const timeEl = cardEl.querySelector('.project-card-time');
        if (timeEl) timeEl.textContent = timeDisplay;
    });

    for (const goal of goals) {
        const durationMin = goal.duration_min || 0;
        const progress    = await statsManager.getTodayProgress(goal.id, durationMin, false);
        const cardEl      = document.querySelector(`[data-goal-id="${goal.id}"]`);
        if (!cardEl) continue;

        const fill = cardEl.querySelector('.project-card-progress-fill');
        if (fill) fill.style.width = progress.percentage + '%';

        const pct = cardEl.querySelector('.project-card-percentage');
        if (pct) pct.textContent = progress.percentage + '%';

        const totalMinutes = progress.totalMinutes || 0;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const timeDisplay = durationMin > 0
            ? `${h}h ${String(m).padStart(2, '0')}m / ${_fmtMin(durationMin)}`
            : `${h}h ${String(m).padStart(2, '0')}m`;
        const timeEl = cardEl.querySelector('.project-card-time');
        if (timeEl) timeEl.textContent = timeDisplay;
    }

    statsManager.startPolling(goals.map(g => g.id));
}

export async function initProjectsView() {
    try {
        const goals  = await goalsService.fetchGoals();
        const active = goals.filter(g => !g.is_complete && g.status !== 'completed');
        const el     = document.getElementById('projectsContainer');
        if (el) el.innerHTML = _createGoalsList(active);
        await _updateGoalsProgress(active);
    } catch (err) {
        const el = document.getElementById('projectsContainer');
        if (el) el.innerHTML = `
            <div class="error-state" style="text-align:center;padding:60px 0;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <h2>Failed to load</h2>
                <p style="color:#999;">${err.message || 'Something went wrong'}</p>
                <button onclick="window.location.reload()" class="btn-primary" style="margin-top:16px;">Try Again</button>
            </div>`;
        Toast.error('Failed to load projects');
    }

    return () => statsManager.stopPolling?.();
}

// Expose helpers used by add-goal modal to refresh the list
window.createGoalsList       = _createGoalsList;
window.updateGoalsProgress   = _updateGoalsProgress;
window.renderProjects        = () => renderer.render('pages/projects.html', initProjectsView, {}, { layout: '/projects' });
