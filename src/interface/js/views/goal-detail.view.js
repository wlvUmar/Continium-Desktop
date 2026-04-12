/**
 * Goal Detail View — populates the goal-detail template with live data.
 */

let _currentGoalId   = null;
let _goalDurationMin = 150;
let _goalColor       = '#07B6D5';
let _todayStats      = [];
let _periodStats     = [];
let _currentPeriodType = 'week';
let _periodOffset    = 0;

function _fmtTimeShort(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

export async function initGoalDetailView({ id }) {
    _currentGoalId   = parseInt(id);
    _goalDurationMin = 150;
    _goalColor       = '#07B6D5';
    _todayStats      = [];
    _periodStats     = [];
    _currentPeriodType = 'week';
    _periodOffset    = 0;

    let goal = { id, title: `Project ${id}`, duration_min: 150 };
    try {
        const [fetchedGoal] = await Promise.all([
            goalsService.fetchGoal(id),
            goalsService.fetchGoals()
        ]);
        goal             = fetchedGoal;
        _goalDurationMin = goal.duration_min || 150;
        _goalColor       = colorManager.getColor(goal.id, goal.title);
    } catch (_) {}

    const titleEl = document.getElementById('goalDetailTitle');
    if (titleEl) titleEl.textContent = goal.title || 'Untitled';

    const playBtn = document.getElementById('goalDetailPlayBtn');
    if (playBtn) playBtn.setAttribute('onclick', `window.openFocusModal('${goal.id}')`);

    await Promise.all([_loadTodayStats(), _loadPeriodData()]);
    _updateProgressBar('today');
}

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

window.prevPeriod = function() { _periodOffset--; _loadPeriodData(); };
window.nextPeriod = function() { _periodOffset++; _loadPeriodData(); };

function _updateProgressBar(tab) {
    const stats      = tab === 'today' ? _todayStats : _periodStats;
    const totalMin   = stats.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalSec   = totalMin * 60;
    const goalSec    = _goalDurationMin * 60;
    const percentage = goalSec > 0
        ? Math.min((totalSec / goalSec) * 100, 100)
        : (totalSec > 0 ? 100 : 0);

    const timeLabel = document.getElementById('progressTimeLabel');
    if (timeLabel) timeLabel.textContent = _fmtTimeShort(totalMin);

    const pctLabel = document.getElementById('percentageLabel');
    if (pctLabel) pctLabel.textContent = Math.round(percentage) + '%';

    const bar = document.getElementById('progressBar');
    if (bar) bar.style.background =
        `linear-gradient(90deg, ${_goalColor} ${percentage}%, #DFDEE0 ${percentage}%)`;
}

function _getDateRange() {
    const today = new Date();
    let start = new Date(today);
    let label = '';

    if (_currentPeriodType === 'week') {
        start.setDate(today.getDate() - today.getDay() - (Math.abs(_periodOffset) * 7));
        if (_periodOffset > 0) start.setDate(start.getDate() + 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        label = `${fmt(start)} – ${fmt(end)}`;
    } else if (_currentPeriodType === 'month') {
        start = new Date(today.getFullYear(), today.getMonth() + _periodOffset, 1);
        label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
        start = new Date(today.getFullYear(), today.getMonth() + (_periodOffset * 3), 1);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 2);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        label = `${fmt(start)} – ${fmt(end)}`;
    }
    return { start, label };
}

async function _loadTodayStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        _todayStats = await api.get(`/stats/${_currentGoalId}/by-date-range?start_date=${today}&end_date=${today}`);
    } catch (_) { _todayStats = []; }
}

async function _loadPeriodData() {
    try {
        const { start, label } = _getDateRange();
        const fmt = d => d.toISOString().split('T')[0];
        let end = new Date(start);
        if (_currentPeriodType === 'week') end.setDate(end.getDate() + 6);
        else if (_currentPeriodType === 'month') end.setMonth(end.getMonth() + 1);
        else end.setMonth(end.getMonth() + 3);

        const stats   = await api.get(`/stats/${_currentGoalId}/by-date-range?start_date=${fmt(start)}&end_date=${fmt(end)}`);
        _periodStats  = stats;

        const totalMin = stats.reduce((sum, s) => sum + s.duration_minutes, 0);
        const days     = new Set(stats.map(s => s.occurred_at.split('T')[0])).size;
        const avgMin   = days > 0 ? Math.round(totalMin / days) : 0;

        const dateRangeEl = document.getElementById('dateRange');
        if (dateRangeEl) dateRangeEl.textContent = label;
        const navTotal = document.getElementById('navTotal');
        if (navTotal) navTotal.textContent = _fmtTimeShort(totalMin);
        const navAvg = document.getElementById('navAvg');
        if (navAvg) navAvg.textContent = _fmtTimeShort(avgMin);

        _renderChart(stats);
        _updateProgressBar('today');
    } catch (_) {}
}

function _renderChart(stats) {
    const container = document.getElementById('barsContainer');
    if (!container) return;

    let labels = [];
    let data   = {};

    if (_currentPeriodType === 'week') {
        labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
        const { start } = _getDateRange();
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            data[d.toISOString().split('T')[0]] = 0;
        }
    } else if (_currentPeriodType === 'month') {
        labels = ['W1', 'W2', 'W3', 'W4'];
        for (let i = 1; i <= 4; i++) data[i] = 0;
    } else {
        labels = [];
        for (let i = 1; i <= 12; i++) { labels.push(`W${i}`); data[i] = 0; }
    }

    stats.forEach(stat => {
        if (_currentPeriodType === 'week') {
            const dateStr = stat.occurred_at.split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + stat.duration_minutes;
        } else if (_currentPeriodType === 'month') {
            const week = Math.ceil(new Date(stat.occurred_at).getDate() / 7);
            data[week] = (data[week] || 0) + stat.duration_minutes;
        } else {
            const d = new Date(stat.occurred_at);
            const weekNum = Math.ceil(d.getDate() / 7) + (d.getMonth() % 3) * 4;
            data[weekNum] = (data[weekNum] || 0) + stat.duration_minutes;
        }
    });

    const values   = Object.values(data);
    const maxVal   = Math.max(...values, 60);
    const barCount = labels.length;
    const barWidth = barCount > 10 ? 20 : 28;
    const barGap   = barCount > 10 ? 14 : 21;

    const gridContainer = document.getElementById('gridLines');
    if (gridContainer) {
        gridContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line';
            gridContainer.appendChild(line);
        }
    }

    const yAxis = document.getElementById('yAxisLabels');
    if (yAxis) {
        yAxis.innerHTML = '';
        ['3h', '2h', '1h', '0h'].forEach(lbl => {
            const span = document.createElement('span');
            span.textContent = lbl;
            yAxis.appendChild(span);
        });
    }

    let html = '';
    labels.forEach((label, idx) => {
        const val    = values[idx] || 0;
        const height = (val / maxVal) * 142;
        html += `
            <div style="text-align:center;flex:0 0 auto;">
                <div style="width:${barWidth}px;height:${height}px;background:${_goalColor};border-radius:3px;margin:0 auto;"></div>
                <div style="margin-top:8px;font-size:${barCount > 10 ? '12px' : '18px'};font-weight:700;color:#000;opacity:0.4;">${label}</div>
            </div>`;
    });

    container.innerHTML = html;
    container.style.gap             = barGap + 'px';
    container.style.justifyContent  = 'space-around';
}
