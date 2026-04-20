/**
 * Layout Component - Sidebar + main container wrapper
 * Shared across all protected pages
 */

// ============================================
// SIDEBAR
// ============================================

function createSidebar() {
  const user = authService.getUser();
  const userName = user
    ? user.full_name || user.fullName || "Username"
    : "Username";

  return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="user-profile-header user-profile-header--clickable" onclick="openProfileModal()" title="View profile">
                    <div class="user-avatar-header">
                        <img src="assets/icons/si_user-fill.svg" alt="User" style="width:28px;height:28px;filter:brightness(0) invert(1);">
                    </div>
                    <div class="user-info-header">
                        <p class="username-header">${userName}</p>
                    </div>
                    <button class="header-logout-btn" onclick="event.stopPropagation(); handleLogout()" title="Logout">
                        <img src="assets/icons/exit_vector.svg" alt="Logout" style="width:24px;height:24px;">
                    </button>
                </div>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-item">
                        <span class="nav-icon nav-target" onclick="router.navigate('/projects')">
                            <img src="assets/icons/material-symbols_border-all-rounded.svg" alt="Projects" class="icon">
                        </span>
                        <span class="nav-text nav-target" onclick="router.navigate('/projects')">Projects</span>
                        <button class="dropdown-arrow dropdown-arrow-btn" id="projectsArrow" onclick="toggleProjectsDropdown()">
                            <img src="assets/icons/ARROW Frame.svg" alt="▼" class="dropdown-icon">
                        </button>
                        <div class="projects-dropdown" id="projectsDropdown" style="display: none;">
                            <div id="sidebarProjectsList">
                                <div class="sidebar-projects-state">Loading...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <a class="nav-item" href="javascript:void(0)" onclick="openAddGoalModal(); return false;">
                    <span class="nav-icon">
                        <img src="assets/icons/carbon_add-filled.svg" alt="Add Goal" class="icon">
                    </span>
                    <span class="nav-text">Add goal</span>
                </a>

                <a href="#/statistics" class="nav-item" data-route="/statistics">
                    <span class="nav-icon">
                        <img src="assets/icons/solar_chart-bold.svg" alt="Statistics" class="icon">
                    </span>
                    <span class="nav-text">Statistics</span>
                </a>

                <a href="#/completed" class="nav-item" data-route="/completed">
                    <span class="nav-icon">
                        <img src="assets/icons/checkmark_icon.svg" alt="Completed" class="icon">
                    </span>
                    <span class="nav-text">Completed</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <a href="javascript:void(0)" onclick="openHelpCenter(); return false;" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: auto; padding: 16px; color: #5B7B9E; text-decoration: none; font-size: 14px; font-weight: 500; opacity: 0.9; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">
                    <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 2px solid currentColor; border-radius: 50%; font-weight: bold; font-size: 12px; box-sizing: border-box; padding-top: 1px;">?</span>
                    <span>Help Center</span>
                </a>
            </div>
        </aside>
    `;
}

// Toggle projects dropdown (arrow button only)
window.toggleProjectsDropdown = function () {
  const dropdown = document.getElementById("projectsDropdown");
  const arrowImg = document.querySelector("#projectsArrow .dropdown-icon");
  const isOpen = dropdown.style.display !== "none";

  if (isOpen) {
    dropdown.style.display = "none";
    if (arrowImg) arrowImg.style.transform = "rotate(0deg)";
  } else {
    dropdown.style.display = "block";
    if (arrowImg) arrowImg.style.transform = "rotate(180deg)";
    loadSidebarProjects();
  }
};

// Load real projects into sidebar dropdown
window.loadSidebarProjects = async function () {
  const listEl = document.getElementById("sidebarProjectsList");
  if (!listEl) return;
  try {
    const goals = await goalsService.fetchGoals();
    const active = goals.filter(
      (g) => !g.is_complete && g.status !== "completed",
    );
    if (!active.length) {
      listEl.innerHTML = `<div class="sidebar-projects-state">No projects yet</div>`;
      return;
    }
    listEl.innerHTML = active
      .map((g) => {
        const color = colorManager.getColor(g.id, g.title);
        const durationMin = g.duration_min || 0;
        const h = Math.floor(durationMin / 60);
        const m = durationMin % 60;
        const timeStr = `0h 00m / ${h}h ${String(m).padStart(2, "0")}m`;
        return `
                <div class="project-item" data-goal-id="${g.id}" onclick="router.navigate('/goal/${g.id}')">
                    <div class="sidebar-project-button-container">
                        <button class="sidebar-play-btn" onclick="event.stopPropagation(); window.startTimerForGoal('${g.id}')" title="Start">
                            <img src="assets/icons/play_vector.svg" alt="Play">
                        </button>
                    </div>
                    <div class="sidebar-project-content-container">
                        <span class="project-name">${g.title || "Untitled"}</span>
                        <span class="project-progress-text">${timeStr}</span>
                        <div class="project-progress-bar">
                            <div class="project-progress-fill" style="width:0; background:${color};"></div>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
    
    // Fetch and update progress for each sidebar project (initial load)
    active.forEach(g => {
      _fetchAndUpdateSidebarProgress(g.id, g.duration_min);
    });

    // Start polling for updates
    statsManager.startPolling(active.map(g => g.id));
  } catch (err) {
    if (listEl)
      listEl.innerHTML = `<div class="sidebar-projects-state">Failed to load</div>`;
  }
};

// Fetch today's progress for sidebar project and update progress bar
async function _fetchAndUpdateSidebarProgress(goalId, durationMin) {
  try {
    if (!durationMin || durationMin <= 0) {
      // Even if no duration, still show the time worked
      const progress = await statsManager.getTodayProgress(goalId, 1, false);
      const todayMinutes = progress.todayMinutes || 0;
      
      const sidebarItem = document.querySelector(`.project-item[data-goal-id="${goalId}"]`);
      if (sidebarItem) {
        const h = Math.floor(todayMinutes / 60);
        const m = todayMinutes % 60;
        const timeText = sidebarItem.querySelector('.project-progress-text');
        if (timeText) timeText.textContent = `${h}h ${String(m).padStart(2, "0")}m`;
      }
      return;
    }
    
    // Use stats manager for fetching and caching
    const progress = await statsManager.getTodayProgress(goalId, durationMin, false);
    const progressPercent = progress.percentage;
    const totalMinutes = progress.totalMinutes || 0;
    
    // Update sidebar item progress bar
    const sidebarItem = document.querySelector(`.project-item[data-goal-id="${goalId}"]`);
    if (sidebarItem) {
      // Update progress bar width
      const fill = sidebarItem.querySelector('.project-progress-fill');
      if (fill) fill.style.width = progressPercent + '%';
      
      // Update time text - show TOTAL time worked
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const timeText = sidebarItem.querySelector('.project-progress-text');
      if (timeText) timeText.textContent = `${h}h ${String(m).padStart(2, "0")}m / ${Math.floor(durationMin/60)}h ${(durationMin%60).toString().padStart(2, "0")}m`;
    }
  } catch (err) {
    console.error('❌ Failed to update sidebar progress:', err);
  }
}

// Register callback for stats updates from polling
statsManager.subscribe((goalId, todayMinutes, totalMinutes, percentage) => {
  // Find all sidebar items for this goal and update them
  document.querySelectorAll(`.project-item[data-goal-id="${goalId}"]`).forEach(sidebarItem => {
    // Update progress bar
    const fill = sidebarItem.querySelector('.project-progress-fill');
    if (fill) fill.style.width = percentage + '%';
    
    // Update time text - show TOTAL time worked
    const timeText = sidebarItem.querySelector('.project-progress-text');
    if (timeText) {
      const durationStr = timeText.textContent || '';
      const match = durationStr.match(/\/ (\d+)h (\d+)m/);
      if (match) {
        const durationMin = parseInt(match[1]) * 60 + parseInt(match[2]);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        timeText.textContent = `${h}h ${String(m).padStart(2, "0")}m / ${Math.floor(durationMin/60)}h ${(durationMin%60).toString().padStart(2, "0")}m`;
      }
    }
  });
});

// Toggle light/dark theme
window.toggleTheme = function () {
  const isDark = !document.body.classList.contains("dark-mode");
  document.body.classList.toggle("dark-mode", isDark);
  document.documentElement.classList.toggle("dark-mode", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  const lightBtn = document.querySelector(".theme-opt-light");
  const darkBtn = document.querySelector(".theme-opt-dark");
  if (lightBtn) lightBtn.classList.toggle("active", !isDark);
  if (darkBtn) darkBtn.classList.toggle("active", isDark);
  if (typeof window.emitUiTheme === "function") {
    window.emitUiTheme(isDark ? "dark" : "light");
  }
};

// ============================================
// LAYOUT WRAPPER
// ============================================

function createLayout(content, currentRoute = "/projects") {
  const isDark = document.body.classList.contains("dark-mode");
  return `
        <div class="app-layout">
            ${createSidebar(currentRoute)}
            <main class="main-container">
                ${content}
            </main>
        </div>
        <div class="theme-toggle-pill">
            <button class="theme-opt theme-opt-light ${isDark ? "" : "active"}" onclick="toggleTheme()" title="Light mode">
                <img src="assets/icons/Light.svg" alt="Light">
            </button>
            <button class="theme-opt theme-opt-dark ${isDark ? "active" : ""}" onclick="toggleTheme()" title="Dark mode">
                <img src="assets/icons/Dark.svg" alt="Dark">
            </button>
        </div>
    `;
}

function attachNavigationListeners() {
  document
    .querySelectorAll(".nav-item:not(.nav-item-dropdown)")
    .forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const route = item.getAttribute("data-route");
        if (!route) return;
        router.navigate(route);
      });
    });
}

window.createLayout = createLayout;
window.attachNavigationListeners = attachNavigationListeners;
window.createSidebar = createSidebar;
