/**
 * Statistics Page
 * From statistics.js — includes multi-color pie chart using goal colors
 */

// ============================================
// STATS API SERVICE
// ============================================

const statsService = {
    async fetchOverallStats() {
        return await api.get('/stats/overall');
    },
    async fetchBreakdown(type) {
        if (!type || type === 'all') {
            return await api.get('/stats/overall');
        }
        return await api.get(`/stats/overall-by-type?type=${encodeURIComponent(type)}`);
    },
    async fetchStatsByDateRange(startDate, endDate) {
        return await api.get(`/stats/overall?start_date=${startDate}&end_date=${endDate}`);
    },
    async fetchGoalStatsByDateRange(goalId, startDate, endDate) {
        return await api.get(`/stats/${goalId}/by-date-range?start_date=${startDate}&end_date=${endDate}`);
    }
};


// ============================================
// CHART UTILITIES
// ============================================

function renderBarChart(canvasId, data, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || !labels || data.length === 0) return;

    const ctx     = canvas.getContext('2d');
    const width   = canvas.width  = canvas.offsetWidth  * 2;
    const height  = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const padding     = 40;
    const chartWidth  = width  / 2 - padding * 2;
    const chartHeight = height / 2 - padding * 2;
    const barWidth    = chartWidth / data.length;
    const maxValue    = Math.max(...data, 1);

    ctx.clearRect(0, 0, width, height);

    data.forEach((value, index) => {
        const barH = (value / maxValue) * chartHeight;
        const x    = padding + index * barWidth + barWidth * 0.2;
        const y    = padding + chartHeight - barH;
        const w    = barWidth * 0.6;

        ctx.fillStyle = '#00BCD4';
        ctx.fillRect(x, y, w, barH);

        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + w / 2, padding + chartHeight + 20);

        if (value > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(_fmtHours(value), x + w / 2, y - 5);
        }
    });

    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const yPos = padding + chartHeight - (chartHeight / 4) * i;
        const val  = (maxValue / 4) * i;
        ctx.fillText(_fmtHours(val), padding - 10, yPos + 4);
        ctx.strokeStyle = '#F0F0F0';
        ctx.beginPath();
        ctx.moveTo(padding, yPos);
        ctx.lineTo(padding + chartWidth, yPos);
        ctx.stroke();
    }
}

/**
 * Multi-color donut chart.
 * segments: [{ color, percentage, timeSpent }]
 */
function renderPieChart(canvasId, segments) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const size   = Math.min(canvas.offsetWidth || 200, canvas.offsetHeight || 200);
    canvas.width  = size * 2;
    canvas.height = size * 2;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const cx        = size / 2;
    const cy        = size / 2;
    const radius    = size / 2 - 18;
    const lineWidth = 20;

    ctx.clearRect(0, 0, size, size);

    // Background ring
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth   = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    if (!segments || segments.length === 0) {
        // Center label
        ctx.fillStyle = '#aaa';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data', cx, cy);
        return;
    }

    // Draw colored segments
    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
        const angle = ((seg.percentage || 0) / 100) * 2 * Math.PI;
        if (angle <= 0) return;
        ctx.strokeStyle = seg.color || '#00BCD4';
        ctx.lineWidth   = lineWidth;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
        ctx.stroke();
        startAngle += angle;
    });

    // Center total time text
    const totalSecs = segments.reduce((s, seg) => s + (seg.timeSpent || 0), 0);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(_fmtTime(totalSecs), cx, cy);
}

function _fmtHours(seconds) {
    if (!seconds) return '0h';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'm' : ''}` : `${m}m`;
}

function _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}


// ============================================
// STATISTICS PAGE HTML
// ============================================

function createStatisticsPageHTML() {
    return `
        <div class="page-header">
            <h1>Statistics</h1>
        </div>
        <div id="statisticsContainer" class="statistics-content">
            <div style="text-align:center;padding:60px 0;">
                <div class="spinner-large"></div>
                <p style="margin-top:16px;color:#999;">Loading statistics...</p>
            </div>
        </div>
    `;
}

function createStatisticsContentHTML(insightsData, breakdownData) {
    return `
        <div class="stats-page-container">
            <!-- Left Card: Insights -->
            <div class="stats-card insights-card">
                <h2 class="stats-card-title">Insights</h2>
                
                <!-- Period Tabs -->
                <div class="stats-period-tabs">
                    <button class="stats-tab-btn ${_currentInsightsPeriod === 'week' ? 'active' : ''}" onclick="changeInsightsPeriod('week')">Week</button>
                    <button class="stats-tab-btn ${_currentInsightsPeriod === '4weeks' ? 'active' : ''}" onclick="changeInsightsPeriod('4weeks')">4 Weeks</button>
                    <button class="stats-tab-btn ${_currentInsightsPeriod === '8weeks' ? 'active' : ''}" onclick="changeInsightsPeriod('8weeks')">8 Weeks</button>
                </div>
                
                <!-- Date Navigator -->
                <div class="stats-date-navigator">
                    <button class="stats-date-arrow" onclick="previousPeriod('insights')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="stats-date-text" id="insightsDateRange">${insightsData.dateRange || 'All time'}</span>
                    <button class="stats-date-arrow" onclick="nextPeriod('insights')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
                
                <!-- Total & Average -->
                <div class="stats-totals-row">
                    <div class="stats-total-column">
                        <span class="stats-label">Total</span>
                        <span class="stats-value" id="insightsTotal">${_fmtTime(insightsData.total || 0)}</span>
                    </div>
                    <div class="stats-total-column">
                        <span class="stats-label">Average</span>
                        <span class="stats-value" id="insightsAverage">${_fmtTime(insightsData.average || 0)}</span>
                    </div>
                </div>
                
                <!-- Bar Chart -->
                <div class="stats-bar-chart-container">
                    <canvas id="insightsBarChart"></canvas>
                </div>
            </div>
            
            <!-- Right Card: Project Breakdown -->
            <div class="stats-card breakdown-card">
                <h2 class="stats-card-title">Project Breakdown</h2>
                
                <!-- Period Tabs -->
                <div class="stats-period-tabs">
                    <button class="stats-tab-btn ${_currentBreakdownPeriod === 'day' ? 'active' : ''}" onclick="changeBreakdownPeriod('day')">Day</button>
                    <button class="stats-tab-btn ${_currentBreakdownPeriod === 'week' ? 'active' : ''}" onclick="changeBreakdownPeriod('week')">Week</button>
                    <button class="stats-tab-btn ${_currentBreakdownPeriod === 'month' ? 'active' : ''}" onclick="changeBreakdownPeriod('month')">Month</button>
                </div>
                
                <!-- Date Navigator -->
                <div class="stats-date-navigator">
                    <button class="stats-date-arrow" onclick="previousPeriod('breakdown')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="stats-date-text" id="breakdownDateRange">${breakdownData.dateRange || 'All time'}</span>
                    <button class="stats-date-arrow" onclick="nextPeriod('breakdown')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
                
                <!-- Donut Chart -->
                <div class="stats-donut-chart-container">
                    <canvas id="breakdownDonutChart"></canvas>
                </div>
                
                <!-- Project Progress Bars -->
                <div class="stats-project-progress" id="projectBreakdown">
                    ${renderProjectBreakdown(breakdownData.projects || [])}
                </div>
            </div>
        </div>
    `;
}

function renderProjectBreakdown(projects) {
    if (!projects || projects.length === 0) {
        return '<p style="color:#aaa;text-align:center;">No project data available</p>';
    }
    const fallbackColors = ['#00FF2F', '#B300FF', '#FFEE00', '#4CAF50', '#00BCD4'];
    return projects.map((project, index) => {
        const color = project.color || fallbackColors[index % fallbackColors.length];
        const percentage = project.percentage || 0;
        return `
            <div class="stats-project-item">
                <div style="display:flex;justify-content:space-between;">
                    <span class="stats-project-name">${project.name || `Project ${index + 1}`}</span>
                    <span class="stats-project-time">${_fmtTime(project.timeSpent || 0)}</span>
                </div>
                <div class="stats-project-bar">
                    <div class="stats-project-bar-fill" style="width:${percentage}%;background:${color};"></div>
                </div>
            </div>
        `;
    }).join('');
}


// ============================================
// DATA TRANSFORM
// ============================================

/**
 * Transform OverallOut {total_stats: {goal_name: minutes}} using goal colors.
 * colorMap: { goalName: color }
 */
function _transformOverallOut(apiResponse, colorMap) {
    const totalStats  = (apiResponse && apiResponse.total_stats) || {};
    const entries     = Object.entries(totalStats);
    const totalMin    = entries.reduce((s, [, m]) => s + m, 0);
    const totalSecs   = totalMin * 60;
    const avgSecs     = entries.length > 0 ? Math.round(totalSecs / 7) : 0;

    const projects = entries.map(([name, minutes]) => ({
        name,
        timeSpent:  minutes * 60,
        percentage: totalMin > 0 ? Math.round((minutes / totalMin) * 100) : 0,
        color:      (colorMap && colorMap[name]) || null,
    }));

    return { totalSecs, avgSecs, projects };
}


// ============================================
// DATE UTILITIES
// ============================================

function _getDateRange(period, offset = 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (period === 'week') {
        // Get start of week (Sunday)
        const day = today.getDay();
        startDate.setDate(today.getDate() - day - (7 * offset));
        endDate.setDate(startDate.getDate() + 6);
    } else if (period === '4weeks') {
        // Get 4 weeks back
        startDate.setDate(today.getDate() - (28 * (offset + 1)) + 1);
        endDate.setDate(today.getDate() - (28 * offset));
    } else if (period === '8weeks') {
        // Get 8 weeks back
        startDate.setDate(today.getDate() - (56 * (offset + 1)) + 1);
        endDate.setDate(today.getDate() - (56 * offset));
    } else if (period === 'day') {
        startDate.setDate(today.getDate() - offset);
        endDate = new Date(startDate);
    } else if (period === 'month') {
        startDate.setMonth(today.getMonth() - offset);
        startDate.setDate(1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    }

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        display: _formatDateRange(startDate, endDate, period)
    };
}

function _formatDateRange(start, end, period) {
    const opts = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', opts);
    if (period === 'day') {
        return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return `${startStr} - ${endStr}`;
}

function _getDayLabels(period) {
    if (period === 'week') return ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    if (period === '4weeks') return ['W1', 'W2', 'W3', 'W4'];
    if (period === '8weeks') return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
    return [];
}

/**
 * Aggregate stats by day for the given period.
 * stats is array of { occurred_at, duration_minutes }
 */
function _aggregateStatsByDay(stats, period) {
    const buckets = {};
    const labels = _getDayLabels(period);
    const numDays = labels.length;

    // Initialize buckets
    for (let i = 0; i < numDays; i++) {
        buckets[i] = 0;
    }

    // Aggregate stats into buckets
    (stats || []).forEach(stat => {
        if (!stat.occurred_at) return;
        const statDate = new Date(stat.occurred_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let dayIndex = -1;
        const daysDiff = Math.floor((today - statDate) / (1000 * 60 * 60 * 24));

        if (period === 'week') {
            const currentDay = today.getDay();
            const statDay = statDate.getDay();
            if (daysDiff < 7) {
                dayIndex = statDay;
            }
        } else if (period === '4weeks') {
            if (daysDiff < 28) {
                dayIndex = Math.floor(daysDiff / 7);
            }
        } else if (period === '8weeks') {
            if (daysDiff < 56) {
                dayIndex = Math.floor(daysDiff / 7);
            }
        } else if (period === 'day') {
            dayIndex = 0;
        }

        if (dayIndex >= 0 && dayIndex < numDays) {
            buckets[dayIndex] += (stat.duration_minutes || 0) * 60; // Convert to seconds
        }
    });

    return Object.values(buckets);
}

// ============================================
// PAGE CONTROLLER
// ============================================

let _currentInsightsPeriod  = 'week';
let _currentBreakdownPeriod = 'day';
let _insightsPeriodOffset   = 0;
let _breakdownPeriodOffset  = 0;

async function loadStatisticsPage() {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;

    try {
        const insightsRange = _getDateRange(_currentInsightsPeriod, _insightsPeriodOffset);
        const breakdownRange = _getDateRange(_currentBreakdownPeriod, _breakdownPeriodOffset);

        // Fetch all goals for color mapping
        const allGoals = await goalsService.fetchGoals().catch(() => []);
        const colorMap = colorManager.buildColorMapByTitle(allGoals);

        // Fetch stats for insights period
        const insightsStatsRaw = await Promise.all(
            (allGoals || []).map(goal => 
                statsService.fetchGoalStatsByDateRange(goal.id, insightsRange.startDate, insightsRange.endDate)
                    .catch(() => [])
            )
        );
        const insightsStats = insightsStatsRaw.flat();

        // Fetch stats for breakdown period
        const breakdownStatsRaw = await Promise.all(
            (allGoals || []).map((goal, idx) => 
                statsService.fetchGoalStatsByDateRange(goal.id, breakdownRange.startDate, breakdownRange.endDate)
                    .then(stats => stats.map(s => ({ ...s, goalTitle: goal.title })))
                    .catch(() => [])
            )
        );
        const breakdownStats = breakdownStatsRaw.flat();

        // Calculate insights data
        const totalSeconds = insightsStats.reduce((sum, s) => sum + (s.duration_minutes || 0) * 60, 0);
        const avgSeconds = _getDayLabels(_currentInsightsPeriod).length > 0 
            ? Math.round(totalSeconds / _getDayLabels(_currentInsightsPeriod).length) 
            : 0;
        const chartData = _aggregateStatsByDay(insightsStats, _currentInsightsPeriod);

        // Calculate breakdown data
        const breakdownByGoal = {};
        breakdownStats.forEach(stat => {
            const title = stat.goalTitle || 'Unknown';
            if (!breakdownByGoal[title]) {
                breakdownByGoal[title] = 0;
            }
            breakdownByGoal[title] += (stat.duration_minutes || 0);
        });

        const breakdownTotal = Object.values(breakdownByGoal).reduce((s, m) => s + m, 0) * 60;
        const breakdownProjects = Object.entries(breakdownByGoal).map(([name, minutes]) => ({
            name,
            timeSpent: minutes * 60,
            percentage: breakdownTotal > 0 ? Math.round((minutes * 60 / breakdownTotal) * 100) : 0,
            color: colorMap[name] || null,
        }));

        const safeInsights = {
            total:     totalSeconds,
            average:   avgSeconds,
            dateRange: insightsRange.display,
            chartData: chartData,
            labels:    _getDayLabels(_currentInsightsPeriod),
        };

        const safeBreakdown = {
            date:     _currentBreakdownPeriod,
            total:    breakdownTotal,
            dateRange: breakdownRange.display,
            projects: breakdownProjects,
        };

        container.innerHTML = createStatisticsContentHTML(safeInsights, safeBreakdown);

        // Update date range text
        document.getElementById('insightsDateRange').textContent = insightsRange.display;
        document.getElementById('breakdownDateRange').textContent = breakdownRange.display;

        setTimeout(() => {
            renderBarChart('insightsBarChart', safeInsights.chartData, safeInsights.labels);
            renderPieChart('breakdownDonutChart', safeBreakdown.projects);
        }, 150);

    } catch (err) {
        console.error('Statistics load error:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:60px 0;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <h2>Failed to load statistics</h2>
                <p style="color:#999;">${err.message || 'Something went wrong'}</p>
                <button onclick="loadStatisticsPage()" class="btn-primary" style="margin-top:16px;">Try Again</button>
            </div>
        `;
    }
}

window.changeInsightsPeriod = async function(period) {
    _currentInsightsPeriod = period;
    _insightsPeriodOffset = 0;
    document.querySelectorAll('.insights-card .stats-tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', 
            (idx === 0 && period === 'week') ||
            (idx === 1 && period === '4weeks') ||
            (idx === 2 && period === '8weeks')
        );
    });
    await loadStatisticsPage();
};

window.changeBreakdownPeriod = async function(period) {
    _currentBreakdownPeriod = period;
    _breakdownPeriodOffset = 0;
    document.querySelectorAll('.breakdown-card .stats-tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active',
            (idx === 0 && period === 'day') ||
            (idx === 1 && period === 'week') ||
            (idx === 2 && period === 'month')
        );
    });
    await loadStatisticsPage();
};

window.previousPeriod = async function(card) {
    if (card === 'insights') {
        _insightsPeriodOffset++;
    } else {
        _breakdownPeriodOffset++;
    }
    await loadStatisticsPage();
};

window.nextPeriod = async function(card) {
    if (card === 'insights') {
        if (_insightsPeriodOffset > 0) _insightsPeriodOffset--;
    } else {
        if (_breakdownPeriodOffset > 0) _breakdownPeriodOffset--;
    }
    await loadStatisticsPage();
};

function renderStatisticsPage() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = createLayout(createStatisticsPageHTML(), '/statistics');
    attachNavigationListeners();
    loadStatisticsPage();
}

window.renderStatistics  = renderStatisticsPage;
window.statsService      = statsService;
window.loadStatisticsPage = loadStatisticsPage;
