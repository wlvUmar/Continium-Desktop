/**
 * Add Goal Modal
 * Modal dialog for creating a new goal
 */

function renderAddGoalModal() {
    return `
        <div class="add-goal-modal-backdrop" onclick="closeAddGoalModal(event)">
            <div class="add-goal-modal" onclick="event.stopPropagation()">
                <div class="add-goal-modal-header">
                    <h2 class="add-goal-modal-title">Add goal</h2>
                    <button class="add-goal-modal-close" onclick="closeAddGoalModal()" aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="add-goal-modal-content">
                    <form class="add-goal-form" onsubmit="handleAddGoalSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">Goal Name</label>
                            <input type="text" name="title" class="form-input" placeholder="Enter Your Goal" required>
                        </div>

                        <div class="add-goal-time-card">
                            <div class="form-group">
                                <label class="form-label">Frequency</label>
                                <div class="freq-type-tabs">
                                    <button type="button" class="freq-tab active" data-type="repeating" onclick="selectFreqType('repeating', this)">Repeating</button>
                                    <button type="button" class="freq-tab" data-type="onetime" onclick="selectFreqType('onetime', this)">One time</button>
                                </div>
                            </div>

                            <div class="freq-options" id="freqRepeating">
                                <div class="form-group">
                                    <div class="repeat-group">
                                        <button type="button" class="repeat-btn active" onclick="selectRepeat('daily', this)">Daily</button>
                                        <button type="button" class="repeat-btn" onclick="selectRepeat('weekly', this)">Weekly</button>
                                        <button type="button" class="repeat-btn" onclick="selectRepeat('monthly', this)">Monthly</button>
                                    </div>
                                    <input type="hidden" name="frequency" id="goalFrequency" value="daily">
                                </div>
                            </div>

                            <div class="freq-options hidden" id="freqOnetime">
                                <div class="form-group form-group-row" style="display:flex;">
                                    <div class="form-group-half">
                                        <label class="form-label">Start Date</label>
                                        <input type="text" name="start_date" class="form-input" placeholder="YYYY-MM-DD" pattern="\\d{4}-\\d{2}-\\d{2}">
                                    </div>
                                    <div class="form-group-half">
                                        <label class="form-label">Deadline</label>
                                        <input type="text" name="end_date" class="form-input" placeholder="YYYY-MM-DD" pattern="\\d{4}-\\d{2}-\\d{2}">
                                    </div>
                                </div>
                                
                            </div>

                            <div class="form-group">
                                <label class="form-label">Duration</label>
                                <div style="display:flex;gap:8px;align-items:center;">
                                    <input type="number" name="duration_hours" class="form-input" placeholder="0" min="0" max="23" value="1" style="flex:1;text-align:center;">
                                    <span style="font-weight:600;color:var(--text-color);">h</span>
                                    <input type="number" name="duration_minutes" class="form-input" placeholder="0" min="0" max="59" value="0" style="flex:1;text-align:center;">
                                    <span style="font-weight:600;color:var(--text-color);">m</span>
                                </div>
                            </div>
                        </div>

                        <div class="add-goal-modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeAddGoalModal()">Cancel</button>
                            <button type="submit" class="btn-primary" id="addGoalSubmitBtn">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function openAddGoalModal() {
    const modal = renderAddGoalModal();
    document.body.insertAdjacentHTML('beforeend', modal);
    document.body.style.overflow = 'hidden';
}

function closeAddGoalModal(event) {
    if (event && event.target.className !== 'add-goal-modal-backdrop') return;
    const backdrop = document.querySelector('.add-goal-modal-backdrop');
    if (backdrop) {
        backdrop.remove();
        document.body.style.overflow = '';
    }
}

window.selectFreqType = function(type, btn) {
    document.querySelectorAll('.freq-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('freqRepeating').classList.toggle('hidden', type !== 'repeating');
    document.getElementById('freqOnetime').classList.toggle('hidden', type !== 'onetime');
};

window.selectRepeat = function(freq, btn) {
    document.querySelectorAll('.repeat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('goalFrequency').value = freq;
};

window.handleAddGoalSubmit = async function(event) {
    event.preventDefault();
    const form      = event.target;
    const submitBtn = document.getElementById('addGoalSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    const freqType = document.querySelector('.freq-tab.active')?.dataset.type || 'repeating';
    const today        = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const goalData = {
        title:       form.title.value.trim(),
        type:        freqType === 'onetime' ? 'One Time' : 'Repeating',
        start_date:  freqType === 'onetime' ? (form.start_date?.value || today) : today,
        deadline:    freqType === 'onetime' ? (form.end_date?.value || oneYearLater) : oneYearLater,
        frequency:   freqType === 'onetime' ? 'daily' : (form.frequency.value || 'daily'),
        duration_min: (parseInt(form.duration_hours.value) || 0) * 60 + (parseInt(form.duration_minutes.value) || 0),
    };

    try {
        await goalsService.createGoal(goalData);
        Toast.success('Goal created successfully!');
        closeAddGoalModal();

        // Refresh sidebar immediately
        if (window.loadSidebarProjects) await window.loadSidebarProjects();

        // Refresh projects page list if currently visible
        const projectsContainer = document.getElementById('projectsContainer');
        if (projectsContainer) {
            const goals = await goalsService.fetchGoals();
            const active = goals.filter(g => !g.is_complete && g.status !== 'completed');
            projectsContainer.innerHTML = createGoalsList(active);
            _updateGoalsProgress(active);
        }
    } catch (err) {
        const message = err.message || 'Failed to create goal';
        const backdrop = document.querySelector('.add-goal-modal-backdrop');
        if (backdrop) {
            Toast.error(message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Goal';
        }
    }
};

window.renderAddGoalModal = renderAddGoalModal;
window.openAddGoalModal = openAddGoalModal;
window.closeAddGoalModal = closeAddGoalModal;
