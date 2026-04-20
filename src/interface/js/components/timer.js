/**
 * Timer Component Generator - Figma Design 1:1
 * Generates both embedded and fullscreen modal timers
 */

function createTimerEmbedded(goal, sessionCount = 1, goalId = null) {
  const projectName = goal?.title || 'Project';
  const currentGoalId = goalId || (typeof window !== 'undefined' && window._currentGoalId) || null;
  
  return `
    <div class="timer-embedded-container">
      <!-- Project Name -->
      <div class="timer-project-name">${projectName}</div>

      <!-- Session Progress Bar -->
      <div class="timer-session-bar-container">
        <div class="timer-session-info">
          <span id="timerSessionTime">0h 0m 0s</span> / <span id="timerGoalTime">2h 30m 0s</span>
        </div>
        <div class="timer-session-bar" id="timerSessionBar" style="--progress-percent: 0%;"></div>
      </div>

      <!-- Timer Ring -->
      <div class="timer-ring-wrapper">
        <svg class="timer-ring-svg" viewBox="0 0 520 520">
          <!-- Track circle (gray background) -->
          <circle class="timer-ring-circle" cx="260" cy="260" r="252" />
          
          <!-- Progress arc (blue fill) -->
          <circle
            id="timerProgressArc"
            class="timer-ring-progress"
            cx="260"
            cy="260"
            r="252"
          />
        </svg>

        <!-- Inner Content -->
        <div class="timer-inner-content">
          <div class="timer-status-label" id="timerStatusLabel">FOCUS</div>
          <div class="timer-time-display" id="timerTimeDisplay">0 : 00</div>
          <div class="timer-session-badge" id="timerSessionBadge">${sessionCount}</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="timer-controls-wrapper">
        <button class="timer-control-btn" title="Reset" onclick="window.timerReset()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>

        <button class="timer-play-btn timer-control-btn paused" id="timerPlayBtn" title="Play/Pause" onclick="window.timerToggle()">
          <svg id="timerPlayIcon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        </button>

      </div>
    </div>
  `;
}

/**
 * SVG icons for timer - using inline SVGs instead of images
 */
const TIMER_ICONS = {
  play: `<path d="M8 5v14l11-7z" />`,
  pause: `<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />`,
  reset: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />`,
  next: `<polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />`,
};

window.TIMER_ICONS = TIMER_ICONS;
window.createTimerEmbedded = createTimerEmbedded;
