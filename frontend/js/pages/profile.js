/**
 * Profile Modal
 * Modal dialog for editing user profile - 1:1 with Figma
 */

function renderProfileModal() {
    const user      = authService.getUser();
    const userName  = user ? (user.full_name || user.fullName || 'User') : 'User';
    const userEmail = user ? (user.email || '') : '';
    const initial   = userName.charAt(0).toUpperCase();
    const isDarkMode = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');

    return `
        <div class="profile-modal-backdrop" onclick="closeProfileModal(event)">
            <div class="profile-modal" onclick="event.stopPropagation()">
                <form class="profile-form" onsubmit="handleProfileSave(event)">
                    <!-- Header: Title + Save Button -->
                    <div class="profile-modal-header">
                        <h2 class="profile-modal-title">Profile</h2>
                        <button type="submit" class="btn-primary" id="profileSaveBtn">Save</button>
                    </div>

                    <div class="profile-modal-content">
                        <!-- User Header: Avatar + Name/Email -->
                        <div class="profile-user-header">
                            <div class="profile-avatar-large">${initial}</div>
                            <div class="profile-user-info">
                                <p class="profile-username">${userName}</p>
                                <p class="profile-user-email">${userEmail}</p>
                            </div>
                        </div>

                        <!-- User Information Section -->
                        <div class="profile-info-section">
                            <p class="profile-section-title">User information</p>

                            <div class="form-group" style="display: flex;">
                                <label class="form-label">Full Name</label>
                                <input type="text" name="full_name" class="form-input" value="${userName}" placeholder="Enter your full name">
                            </div>

                            <div class="form-group" style="display: flex;">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${userEmail}" placeholder="your@email.com">
                            </div>
                        </div>

                        <!-- Settings Section -->
                        <div class="profile-settings-section">

                            <div class="profile-setting-item">
                                <span class="profile-setting-label">Theme</span>
                                <div class="profile-toggle">
                                    <button type="button" class="profile-toggle-option ${!isDarkMode ? 'active' : ''}" onclick="handleThemeChange('light', event)"><img src="assets/icons/Light.svg" alt="Light"> Light mode</button>
                                    <button type="button" class="profile-toggle-option ${isDarkMode ? 'active' : ''}" onclick="handleThemeChange('dark', event)"><img src="assets/icons/Dark.svg" alt="Dark"> Dark mode</button>
                                </div>
                            </div>

                            <div class="profile-setting-item">
                                <span class="profile-setting-label">Notifications</span>
                                <div class="profile-toggle">
                                    <button type="button" class="profile-toggle-option active" onclick="handleNotifications('on', event)">
                                    <img src="assets/icons/basil_notification-on-solid.svg" >Notification on</button>
                                    <button type="button" class="profile-toggle-option" onclick="handleNotifications('off', event)">
                                    <img src="assets/icons/basil_notification-off-solid.svg" >Notification off</button>
                                </div>
                            </div>
                        </div>

                        <!-- Change Password Button -->
                        <button type="button" class="btn-change-password" onclick="handleChangePassword()">Change password</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function openProfileModal() {
    const modal = renderProfileModal();
    document.body.insertAdjacentHTML('beforeend', modal);
    document.body.style.overflow = 'hidden';
}

function closeProfileModal(event) {
    if (event && event.target.className !== 'profile-modal-backdrop') return;
    const backdrop = document.querySelector('.profile-modal-backdrop');
    if (backdrop) {
        backdrop.remove();
        document.body.style.overflow = '';
    }
}

window.handleThemeChange = function(theme, event) {
    event.preventDefault();
    const buttons = event.target.parentElement.querySelectorAll('.profile-toggle-option');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
};

window.handleNotifications = function(status, event) {
    event.preventDefault();
    const buttons = event.target.parentElement.querySelectorAll('.profile-toggle-option');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    localStorage.setItem('notifications', status);
};

window.handleChangePassword = function() {
    // Hide the existing profile modal
    const currentBackdrop = document.querySelector('.profile-modal-backdrop:not(#changePasswordModalBackdrop)');
    if (currentBackdrop) {
        currentBackdrop.style.display = 'none';
    }

    // Render Change Password Modal
    const modalHtml = `
        <div class="profile-modal-backdrop" id="changePasswordModalBackdrop" onclick="closeChangePasswordModal(event)">
            <div class="profile-modal" onclick="event.stopPropagation()">
                <form class="profile-form" onsubmit="handleChangePasswordSubmit(event)">
                    <div class="profile-modal-header" style="justify-content: flex-start; gap: 12px; padding-bottom: 16px;">
                        <button type="button" class="btn-icon" onclick="closeChangePasswordModal(null, true)" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-color, #333);" title="Back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <h2 class="profile-modal-title" style="margin: 0;">Change Password</h2>
                    </div>
                    
                    <div class="profile-modal-content" style="padding-top: 16px;">
                        <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin-bottom: 12px;">
                            <label class="form-label" style="min-width: unset; font-size: 20px; margin: 0;">Current Password</label>
                            <input type="password" name="current_password" class="form-input" style="width: 100%; height: 38px; font-size: 14px;" required placeholder="••••••••">
                        </div>
                        
                        <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin-bottom: 12px;">
                            <label class="form-label" style="min-width: unset; font-size: 20px; margin: 0;">New Password</label>
                            <input type="password" name="new_password" class="form-input" style="width: 100%; height: 38px; font-size: 14px;" required placeholder="••••••••">
                        </div>
                        
                        <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin-bottom: 24px;">
                            <label class="form-label" style="min-width: unset; font-size: 20px; margin: 0;">Confirm New Password</label>
                            <input type="password" name="confirm_password" class="form-input" style="width: 100%; height: 38px; font-size: 14px;" required placeholder="••••••••">
                        </div>

                        <div style="margin-top: 16px;">
                            <button type="submit" class="btn-primary" style="width: 100%; height: 44px; border-radius: 8px; font-size: 14px;" id="changePasswordSubmitBtn">Update Password</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeChangePasswordModal = function(event, goBackToProfile = false) {
    if (event && event.target.className !== 'profile-modal-backdrop') return;
    
    // Remove the change password modal
    const changePasswordBackdrop = document.getElementById('changePasswordModalBackdrop');
    if (changePasswordBackdrop) {
        changePasswordBackdrop.remove();
    }

    if (goBackToProfile) {
        // Unhide the previous profile modal
        const currentBackdrop = document.querySelector('.profile-modal-backdrop:not(#changePasswordModalBackdrop)');
        if (currentBackdrop) {
            currentBackdrop.style.display = 'flex';
        }
    } else {
        // If clicking outside entirely, close both modals and restore scroll
        const allBackdrops = document.querySelectorAll('.profile-modal-backdrop');
        allBackdrops.forEach(b => b.remove());
        document.body.style.overflow = '';
    }
};

window.handleChangePasswordSubmit = async function(event) {
    event.preventDefault();
    const form = event.target;
    const currentPassword = form.current_password.value;
    const newPassword = form.new_password.value;
    const confirmPassword = form.confirm_password.value;

    if (newPassword !== confirmPassword) {
        return Toast.error('New passwords do not match');
    }

    if (newPassword.length < 6) {
        return Toast.error('Password must be at least 6 characters long');
    }

    const saveBtn = document.getElementById('changePasswordSubmitBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Updating...';

    try {
        await authService.changePassword(currentPassword, newPassword);
        Toast.success('Password changed successfully!');
        // Close change password modal and go back to profile modal
        window.closeChangePasswordModal(null, true);
    } catch (err) {
        const message = err.message || 'Failed to change password';
        Toast.error(message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
    }
};

window.handleProfileSave = async function(event) {
    event.preventDefault();
    const form    = event.target;
    const saveBtn = document.getElementById('profileSaveBtn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
        const full_name = form.full_name.value.trim();
        const email     = form.email.value.trim();

        // Call the backend to persist the change
        await authService.updateProfile({ full_name, email });

        // Update sidebar name without requiring a page reload
        const usernameEl = document.querySelector('.username-header');
        if (usernameEl) usernameEl.textContent = full_name;

        Toast.success('Profile saved!');
        closeProfileModal();
    } catch (err) {
        Toast.error(err.message || 'Failed to save profile');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
};

window.renderProfileModal = renderProfileModal;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
