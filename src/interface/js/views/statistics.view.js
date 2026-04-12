/**
 * Statistics View — populates the statistics template with chart data.
 */

let _currentInsightsPeriod  = 'week';
let _currentBreakdownPeriod = 'day';
let _insightsPeriodOffset   = 0;
let _breakdownPeriodOffset  = 0;

// ── Formatters ────────────────────────────────────────────────────────────────

function _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function _fmtHours(seconds) {
    if (!seconds) return '0h';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'm' : ''}` : `${m}m`;
}

// ── Date utilities ────────────────────────────────────────────────────────────

function _getDateRange(period, offset = 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    let endDate   = new Date(today);

    if (period === 'week') {
        startDate.setDate(today.getDate() - today.getDay() - (7 * offset));
        endDate.setDate(startDate.getDate() + 6);
    } else if (period === '4weeks') {
        startDate.setDate(today.getDate() - (28 * (offset + 1)) + 1);
        endDate.setDate(today.getDate() - (28 * offset));
    } else if (period === '8weeks') {
        startDate.setDate(today.getDate() - (56 * (offset + 1)) + 1);
        endDate.setDate(today.getDate() - (56 * offset));
    } else if (period === 'day') {
        startDate.setDate(today.getDate() - offset);
        endDate = new Date(startDate);
    } else if (period === 'month') {
        startDate.setMonth(today.getMonth() - offset, 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    }

    const fmt = d => d.toISOString().split('T')[0];
    const opts = { month: 'short', day: 'numeric' };
    let display = period === 'day'
        ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : `${startDate.toLocaleDateString('en-US', opts)} - ${endDate.toLocaleDateString('en-US', opts)}`;

    return { startDate: fmt(startDate), endDate: fmt(endDate), display };
}

function _getDayLabels(period) {
    if (period === 'week')   return ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    if (period === '4weeks') return ['W1', 'W2', 'W3', 'W4'];
    if (period === '8weeks') return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
    return [];
}

function _aggregateByDay(stats, period) {
    const labels  = _getDayLabels(period);
    const buckets = {};
    for (let i = 0; i < labels.length; i++) buckets[i] = 0;

    (stats || []).forEach(stat => {
        const statDate = new Date(stat.occurred_at);
        const today    = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - statDate) / (1000 * 60 * 60 * 24));
        let idx = -1;
        if (period === 'week'   && daysDiff < 7)  idx = statDate.getDay();
        if (period === '4weeks' && daysDiff < 28) idx = Math.floor(daysDiff / 7);
        if (period === '8weeks' && daysDiff < 56) idx = Math.floor(daysDiff / 7);
        if (idx >= 0 && idx < labels.length) buckets[idx] += (stat.duration_minutes || 0) * 60;
    });

    return Object.values(buckets);
}

// ── Charts ────────────────────────────────────────────────────────────────────

function _renderBarChart(canvasId, data, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || !labels || data.length === 0) return;
    const ctx       = canvas.getContext('2d');
    const width     = canvas.width  = canvas.offsetWidth  * 2;
    const height    = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const padding   = 40;
    const cw = width / 2 - padding * 2;
    const ch = height / 2 - padding * 2;
    const bw = cw / data.length;
    const mx = Math.max(...data, 1);
    ctx.clearRect(0, 0, width, height);
    data.forEach((value, i) => {
        const bh = (value / mx) * ch;
        const x  = padding + i * bw + bw * 0.2;
        const y  = padding + ch - bh;
        const w  = bw * 0.6;
        ctx.fillStyle = '#00BCD4';
        ctx.fillRect(x, y, w, bh);
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + w / 2, padding + ch + 20);
        if (value > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(_fmtHours(value), x + w / 2, y - 5);
        }
    });
}

function _renderPieChart(canvasId, segments) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const size = Math.min(canvas.offsetWidth || 200, canvas.offsetHeight || 200);
    canvas.width = canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    const cx = size / 2, cy = size / 2;
    const radius = size / 2 - 18;
    const lw = 20;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#E8E8E8'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI); ctx.stroke();
    if (!segments || segments.length === 0) {
        ctx.fillStyle = '#aaa'; ctx.font = '14px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('No data', cx, cy); return;
    }
    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
        const angle = ((seg.percentage || 0) / 100) * 2 * Math.PI;
        if (angle <= 0) return;
        ctx.strokeStyle = seg.color || '#00BCD4'; ctx.lineWidth = lw; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, radius, startAngle, startAngle + angle); ctx.stroke();
        startAngle += angle;
    });
    const totalSecs = segments.reduce((s, seg) => s + (seg.timeSpent || 0), 0);
    ctx.fillStyle = '#333'; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(_fmtTime(totalSecs), cx, cy);
}

function _renderProjectBreakdown(projects) {
    if (!projects || projects.length === 0) return '<p style="color:#aaa;text-align:center;">No project data available</p>';
    return projects.map((p, i) => {
        const fallback = ['#00FF2F', '#B300FF', '#FFEE00', '#4CAF50', '#00BCD4'];
        const color    = p.color || fallback[i % fallback.length];
        return `
            <div class="stats-project-item">
                <div style="display:flex;justify-content:space-between;">
                    <span class="stats-project-name">${p.name || `Project ${i + 1}`}</span>
                    <span class="stats-project-time">${_fmtTime(p.timeSpent || 0)}</span>
                </div>
                <div class="stats-project-bar">
                    <div class="stats-project-bar-fill" style="width:${p.percentage}%;background:${color};"></div>
                </div>
            </div>`;
    }).join('');
}

// ── Main loader ───────────────────────────────────────────────────────────────

async function _loadStatistics() {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;

    try {
        const insightsRange  = _getDateRange(_currentInsightsPeriod, _insightsPeriodOffset);
        const breakdownRange = _getDateRange(_currentBreakdownPeriod, _breakdownPeriodOffset);
        const allGoals       = await goalsService.fetchGoals().catch(() => []);
        const colorMap       = colorManager.buildColorMapByTitle(allGoals);

        const insightsStatsRaw = await Promise.all(
            (allGoals || []).map(g =>
                api.get(`/stats/${g.id}/by-date-range?start_date=${insightsRange.startDate}&end_date=${insightsRange.endDate}`)
                    .catch(() => [])
            )
        );
        const insightsStats = insightsStatsRaw.flat();

        const breakdownStatsRaw = await Promise.all(
            (allGoals || []).map(g =>
                api.get(`/stats/${g.id}/by-date-range?start_date=${breakdownRange.startDate}&end_date=${breakdownRange.endDate}`)
                    .then(stats => stats.map(s => ({ ...s, goalTitle: g.title })))
                    .catch(() => [])
            )
        );
        const breakdownStats = breakdownStatsRaw.flat();

        const totalSecs  = insightsStats.reduce((s, st) => s + (st.duration_minutes || 0) * 60, 0);
        const labels     = _getDayLabels(_currentInsightsPeriod);
        const avgSecs    = labels.length > 0 ? Math.round(totalSecs / labels.length) : 0;
        const chartData  = _aggregateByDay(insightsStats, _currentInsightsPeriod);

        const byGoal = {};
        breakdownStats.forEach(stat => {
            const t = stat.goalTitle || 'Unknown';
            byGoal[t] = (byGoal[t] || 0) + (stat.duration_minutes || 0);
        });
        const bdTotal = Object.values(byGoal).reduce((s, m) => s + m, 0) * 60;
        const bdProjects = Object.entries(byGoal).map(([name, minutes]) => ({
            name,
            timeSpent:  minutes * 60,
            percentage: bdTotal > 0 ? Math.round((minutes * 60 / bdTotal) * 100) : 0,
            color:      colorMap[name] || null,
        }));

        container.innerHTML = `
            <div class="stats-page-container">
                <div class="stats-card insights-card">
                    <h2 class="stats-card-title">Insights</h2>
                    <div class="stats-period-tabs">
                        <button class="stats-tab-btn ${_currentInsightsPeriod === 'week'   ? 'active' : ''}" onclick="changeInsightsPeriod('week')">Week</button>
                        <button class="stats-tab-btn ${_currentInsightsPeriod === '4weeks' ? 'active' : ''}" onclick="changeInsightsPeriod('4weeks')">4 Weeks</button>
                        <button class="stats-tab-btn ${_currentInsightsPeriod === '8weeks' ? 'active' : ''}" onclick="changeInsightsPeriod('8weeks')">8 Weeks</button>
                    </div>
                    <div class="stats-date-navigator">
                        <button class="stats-date-arrow" onclick="previousPeriod('insights')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <span class="stats-date-text" id="insightsDateRange">${insightsRange.display}</span>
                        <button class="stats-date-arrow" onclick="nextPeriod('insights')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                    <div class="stats-totals-row">
                        <div class="stats-total-column">
                            <span class="stats-label">Total</span>
                            <span class="stats-value">${_fmtTime(totalSecs)}</span>
                        </div>
                        <div class="stats-total-column">
                            <span class="stats-label">Average</span>
                            <span class="stats-value">${_fmtTime(avgSecs)}</span>
                        </div>
                    </div>
                    <div class="stats-bar-chart-container">
                        <canvas id="insightsBarChart"></canvas>
                    </div>
                </div>
                <div class="stats-card breakdown-card">
                    <h2 class="stats-card-title">Project Breakdown</h2>
                    <div class="stats-period-tabs">
                        <button class="stats-tab-btn ${_currentBreakdownPeriod === 'day'   ? 'active' : ''}" onclick="changeBreakdownPeriod('day')">Day</button>
                        <button class="stats-tab-btn ${_currentBreakdownPeriod === 'week'  ? 'active' : ''}" onclick="changeBreakdownPeriod('week')">Week</button>
                        <button class="stats-tab-btn ${_currentBreakdownPeriod === 'month' ? 'active' : ''}" onclick="changeBreakdownPeriod('month')">Month</button>
                    </div>
                    <div class="stats-date-navigator">
                        <button class="stats-date-arrow" onclick="previousPeriod('breakdown')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <span class="stats-date-text" id="breakdownDateRange">${breakdownRange.display}</span>
                        <button class="stats-date-arrow" onclick="nextPeriod('breakdown')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                    <div class="stats-donut-chart-container">
                        <canvas id="breakdownDonutChart"></canvas>
                    </div>
                    <div class="stats-project-progress" id="projectBreakdown">
                        ${_renderProjectBreakdown(bdProjects)}
                    </div>
                </div>
            </div>`;

        setTimeout(() => {
            _renderBarChart('insightsBarChart', chartData, labels);
            _renderPieChart('breakdownDonutChart', bdProjects);
        }, 150);

    } catch (err) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <h2>Failed to load statistics</h2>
                <p style="color:#999;">${err.message || 'Something went wrong'}</p>
                <button onclick="loadStatisticsPage()" class="btn-primary" style="margin-top:16px;">Try Again</button>
            </div>`;
    }
}

export async function initStatisticsView() {
    _currentInsightsPeriod  = 'week';
    _currentBreakdownPeriod = 'day';
    _insightsPeriodOffset   = 0;
    _breakdownPeriodOffset  = 0;
    await _loadStatistics();
}

window.changeInsightsPeriod = async function(period) {
    _currentInsightsPeriod = period;
    _insightsPeriodOffset  = 0;
    await _loadStatistics();
};

window.changeBreakdownPeriod = async function(period) {
    _currentBreakdownPeriod = period;
    _breakdownPeriodOffset  = 0;
    await _loadStatistics();
};

window.previousPeriod = async function(card) {
    if (card === 'insights') _insightsPeriodOffset++;
    else _breakdownPeriodOffset++;
    await _loadStatistics();
};

window.nextPeriod = async function(card) {
    if (card === 'insights') { if (_insightsPeriodOffset > 0) _insightsPeriodOffset--; }
    else { if (_breakdownPeriodOffset > 0) _breakdownPeriodOffset--; }
    await _loadStatistics();
};

window.loadStatisticsPage  = _loadStatistics;
window.renderStatistics    = () => renderer.render('pages/statistics.html', initStatisticsView, {}, { layout: '/statistics' });
