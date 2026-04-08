/**
 * goal-detail.js — Project Detail Page
 * Shows goal info, stats/chart, and embedded timer preview with link to timer page
 */

let _currentGoalId    = null;
let _activeGoals      = [];
let _goalDurationMin  = 150;
let _goalColor        = '#07B6D5';
let _todayStats       = [];
let _periodStats      = [];

// ============================================
// HELPERS
// ============================================

function _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function _fmtTimeShort(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

// ============================================
// CONTENT TEMPLATE
// ============================================

function renderProjectDetailContent(goal) {
    const durationMin  = goal.duration_min || 150;
    _goalDurationMin   = durationMin;
    _goalColor         = colorManager.getColor(goal.id, goal.title);
    
    return `
        <div class="goal-detail-container">
            <!-- PAGE TITLE -->
            <h1 class="goal-detail-title">${goal.title}</h1>

            <!-- PROGRESS BAR CARD -->
            <div class="progress-card">
                <!-- Toggle Header -->
                <div class="toggle-header">
                    <button class="toggle-btn active" onclick="window.switchProgressTab('today', this, event)">Today</button>
                    <button class="toggle-btn" onclick="window.switchProgressTab('total', this, event)">Total</button>
                </div>

                <!-- Progress Bar Row -->
                <div class="progress-row">
                    <div class="time-label" id="progressTimeLabel">0h 00m</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    <div class="percentage-label" id="percentageLabel">0%</div>
                </div>
            </div>

            <!-- INSIGHTS CARD -->
            <div class="insights-card">
                <h2 class="card-title">Insights</h2>

                <!-- Period Selector -->
                <div class="period-tabs">
                    <button class="period-tab active" onclick="window.switchPeriod('week', this)">Week</button>
                    <button class="period-tab" onclick="window.switchPeriod('month', this)">Month</button>
                    <button class="period-tab" onclick="window.switchPeriod('3months', this)">3 Months</button>
                </div>

                <!-- Date Navigator -->
                <div class="date-navigator">
                    <div class="date-row">
                        <button class="nav-arrow" onclick="window.prevPeriod()">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M11 1L3 7L11 13" stroke="#515C70" stroke-width="2"/>
                            </svg>
                        </button>
                        <div class="date-range" id="dateRange">This Week</div>
                        <button class="nav-arrow" onclick="window.nextPeriod()">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 1L11 7L3 13" stroke="#515C70" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="stats-row">
                        <div class="nav-stat">
                            <span class="nav-label">Total:</span>
                            <span class="nav-value" id="navTotal">0h</span>
                        </div>
                        <div class="nav-stat">
                            <span class="nav-label">Avg:</span>
                            <span class="nav-value" id="navAvg">0h</span>
                        </div>
                    </div>
                </div>

                <!-- Bar Chart -->
                <div class="bar-chart-container">
                    <div class="chart-area">
                        <div class="grid-lines" id="gridLines"></div>
                        <div class="y-axis-labels" id="yAxisLabels"></div>
                        <div class="bars-container" id="barsContainer"></div>
                    </div>
                </div>

                <!-- Play Button -->
                <button class="play-button" onclick="window.openFocusModal('${goal.id}')" title="Start Timer">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// ============================================
// PAGE RENDER (async — fetches real goal data)
// ============================================

async function renderProjectDetail(projectId) {
    _currentGoalId = parseInt(projectId);
    const appContainer = document.getElementById('app');

    appContainer.innerHTML = `<div style="padding:60px;text-align:center;color:#999;">Loading...</div>`;

    let goal = { id: projectId, title: `Project ${projectId}`, duration_min: 150 };
    try {
        const [fetchedGoal, allGoals] = await Promise.all([
            goalsService.fetchGoal(projectId),
            goalsService.fetchGoals()
        ]);
        goal             = fetchedGoal;
        _activeGoals     = allGoals.filter(g => !g.is_complete && g.status !== 'completed');
    } catch (_) {
        _activeGoals = [];
    }

    appContainer.innerHTML = createLayout(renderProjectDetailContent(goal), `/goal/${projectId}`);
    attachNavigationListeners();
    
    // Load today's stats and period data
    await Promise.all([
        _loadTodayStats(),
        _loadPeriodData()
    ]);
    
    // Update progress bar with today's data
    _updateProgressBar('today');
}

function renderGoal(goalId) {
    renderProjectDetail(goalId);
}

// ============================================
// TAB HANDLERS & PERIOD NAVIGATION
// ============================================

let _currentPeriodType = 'week';
let _periodOffset = 0;

window.switchProgressTab = function(tab, btn, event) {
    event?.preventDefault();
    document.querySelectorAll('.toggle-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    _updateProgressBar(tab);
};

window.switchPeriod = function(period, btn) {
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    _currentPeriodType = period;
    _periodOffset = 0;
    _loadPeriodData();
};

window.prevPeriod = function() {
    _periodOffset--;
    _loadPeriodData();
};

window.nextPeriod = function() {
    _periodOffset++;
    _loadPeriodData();
};

function _updateProgressBar(tab) {
    const stats = tab === 'today' ? _todayStats : _periodStats;
    const totalMin = stats.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalSec = totalMin * 60;
    const goalSec  = _goalDurationMin * 60;
    const percentage = goalSec > 0 ? Math.min((totalSec / goalSec) * 100, 100) : (totalSec > 0 ? 100 : 0);

    const timeLabel = document.getElementById('progressTimeLabel');
    if (timeLabel) timeLabel.textContent = _fmtTimeShort(totalMin);
    
    const percentage_label = document.getElementById('percentageLabel');
    if (percentage_label) percentage_label.textContent = Math.round(percentage) + '%';

    const bar = document.getElementById('progressBar');
    if (bar) {
        bar.style.background = `linear-gradient(90deg, ${_goalColor} ${percentage}%, #DFDEE0 ${percentage}%)`;
    }
}

function _getDateRange() {
    const today = new Date();
    let start = new Date(today);
    let label = '';

    if (_currentPeriodType === 'week') {
        const daysOffset = today.getDay() + (_periodOffset * 7);
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - (Math.abs(_periodOffset) * 7));
        if (_periodOffset > 0) start.setDate(start.getDate() + 7);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        label = `${fmt(start)} – ${fmt(end)}`;
    } else if (_currentPeriodType === 'month') {
        start = new Date(today.getFullYear(), today.getMonth() + _periodOffset, 1);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        label = fmt(start);
    } else {
        start = new Date(today.getFullYear(), today.getMonth() + (_periodOffset * 3), 1);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const end = new Date(start);
        end.setMonth(end.getMonth() + 2);
        label = `${fmt(start)} – ${fmt(end)}`;
    }

    return { start, label };
}

async function _loadTodayStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(new Date().getTime() + 24*60*60*1000).toISOString().split('T')[0];
        
        const stats = await api.get(`/stats/${_currentGoalId}/by-date-range?start_date=${today}&end_date=${today}`);
        _todayStats = stats;
    } catch (err) {
        console.error('Failed to load today stats:', err);
        _todayStats = [];
    }
}

async function _loadPeriodData() {
    try {
        const { start, label } = _getDateRange();
        const today = new Date();
        const fmt = d => d.toISOString().split('T')[0];

        let end = new Date(start);
        if (_currentPeriodType === 'week') end.setDate(end.getDate() + 6);
        else if (_currentPeriodType === 'month') end.setMonth(end.getMonth() + 1);
        else end.setMonth(end.getMonth() + 3);

        const stats = await api.get(`/stats/${_currentGoalId}/by-date-range?start_date=${fmt(start)}&end_date=${fmt(end)}`);
        _periodStats = stats;

        const totalMin = stats.reduce((sum, s) => sum + s.duration_minutes, 0);
        const days = new Set(stats.map(s => s.occurred_at.split('T')[0])).size;
        const avgMin = days > 0 ? Math.round(totalMin / days) : 0;

        document.getElementById('dateRange').textContent = label;
        document.getElementById('navTotal').textContent = _fmtTimeShort(totalMin);
        document.getElementById('navAvg').textContent = _fmtTimeShort(avgMin);

        _renderChart(stats);
        _updateProgressBar('today');
    } catch (err) {
        console.error('Failed to load period data:', err);
    }
}

function _renderChart(stats) {
    const container = document.getElementById('barsContainer');
    if (!container) return;

    let labels = [];
    let data = {};

    if (_currentPeriodType === 'week') {
        labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
        const { start } = _getDateRange();
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            data[dateStr] = 0;
        }
    } else if (_currentPeriodType === 'month') {
        labels = ['W1', 'W2', 'W3', 'W4'];
        for (let i = 1; i <= 4; i++) {
            data[i] = 0;
        }
    } else {
        labels = [];
        for (let i = 1; i <= 12; i++) {
            labels.push(`W${i}`);
            data[i] = 0;
        }
    }

    // Aggregate stats by period
    stats.forEach(stat => {
        if (_currentPeriodType === 'week') {
            const dateStr = stat.occurred_at.split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + stat.duration_minutes;
        } else if (_currentPeriodType === 'month') {
            const d = new Date(stat.occurred_at);
            const week = Math.ceil(d.getDate() / 7);
            data[week] = (data[week] || 0) + stat.duration_minutes;
        } else {
            const d = new Date(stat.occurred_at);
            const weekNum = Math.ceil(d.getDate() / 7) + (d.getMonth() % 3) * 4;
            data[weekNum] = (data[weekNum] || 0) + stat.duration_minutes;
        }
    });

    const values = Object.values(data);
    const maxVal = Math.max(...values, 60);
    const barCount = labels.length;
    const barWidth = barCount > 10 ? 20 : 28;
    const barGap = barCount > 10 ? 14 : 21;

    // Render grid lines
    const gridContainer = document.getElementById('gridLines');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line';
            gridContainer.appendChild(line);
        }
    }

    // Render Y-axis labels
    const yAxisContainer = document.getElementById('yAxisLabels');
    if (yAxisContainer) {
        yAxisContainer.innerHTML = '';
        const intervals = ['3h', '2h', '1h', '0h'];  // Reversed: top to bottom
        intervals.forEach(label => {
            const span = document.createElement('span');
            span.textContent = label;
            yAxisContainer.appendChild(span);
        });
    }

    // Render bars
    let html = '';
    labels.forEach((label, idx) => {
        const val = values[idx] || 0;
        const height = (val / maxVal) * 142;
        html += `
            <div style="text-align: center; flex: 0 0 auto;">
                <div style="width: ${barWidth}px; height: ${height}px; background: ${_goalColor}; border-radius: 3px; margin: 0 auto;"></div>
                <div style="margin-top: 8px; font-size: ${barCount > 10 ? '12px' : '18px'}; font-weight: 700; color: #000; opacity: 0.4; font-family: 'Inter', sans-serif;">${label}</div>
            </div>
        `;
    });

    container.innerHTML = html;
    container.style.gap = barGap + 'px';
    container.style.justifyContent = 'space-around';
}

// ============================================
// EXPORTS
// ============================================

window.renderProjectDetail = renderProjectDetail;
window.renderGoal          = renderGoal;
