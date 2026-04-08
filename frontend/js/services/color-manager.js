/**
 * Color Manager Service
 * Assigns consistent, unique colors to each project/goal
 * Colors are stored in localStorage and persist across sessions
 */

const colorManager = {
    // Predefined palette - high contrast, visually distinct colors
    PALETTE: [
        '#00BCD4', // Cyan (primary)
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Sky Blue
        '#FFA07A', // Light Salmon
        '#98D8C8', // Mint
        '#F7DC6F', // Yellow
        '#BB8FCE', // Purple
        '#85C1E2', // Light Blue
        '#F8B88B', // Peach
        '#52B788', // Green
        '#E56B6F', // Coral
    ],

    init() {
        try {
            const stored = localStorage.getItem('goalColors');
            if (!stored) {
                localStorage.setItem('goalColors', JSON.stringify({}));
            }
        } catch (e) {
            console.error('COLOR: Failed to initialize:', e);
        }
    },

    getStoredColors() {
        try {
            const stored = localStorage.getItem('goalColors');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('COLOR: Failed to get stored colors:', e);
            return {};
        }
    },

    getColor(goalId, goalTitle = null) {
        const stored = this.getStoredColors();
        const key = String(goalId);

        if (stored[key]) {
            return stored[key];
        }

        const usedColors = Object.values(stored);
        const unusedColors = this.PALETTE.filter(c => !usedColors.includes(c));
        const color = unusedColors.length > 0 ? unusedColors[0] : this.PALETTE[Object.keys(stored).length % this.PALETTE.length];

        stored[key] = color;
        try {
            localStorage.setItem('goalColors', JSON.stringify(stored));
        } catch (e) {
            console.error('COLOR: Failed to store color:', e);
        }

        return color;
    },

    getColorByTitle(goalTitle, allGoals = []) {
        if (!goalTitle) return this.PALETTE[0];

        const goal = allGoals.find(g => g.title === goalTitle);
        if (goal) {
            return this.getColor(goal.id, goal.title);
        }

        const stored = this.getStoredColors();
        if (stored[goalTitle]) {
            return stored[goalTitle];
        }

        const usedColors = Object.values(stored);
        const unusedColors = this.PALETTE.filter(c => !usedColors.includes(c));
        const color = unusedColors.length > 0 ? unusedColors[0] : this.PALETTE[Object.keys(stored).length % this.PALETTE.length];

        stored[goalTitle] = color;
        try {
            localStorage.setItem('goalColors', JSON.stringify(stored));
        } catch (e) {
            console.error('COLOR: Failed to store title-based color:', e);
        }

        return color;
    },

    buildColorMap(goals = []) {
        const map = {};
        goals.forEach(goal => {
            map[goal.id] = this.getColor(goal.id, goal.title);
        });
        return map;
    },

    buildColorMapByTitle(goals = []) {
        const map = {};
        goals.forEach(goal => {
            map[goal.title] = this.getColor(goal.id, goal.title);
        });
        return map;
    },

    clear() {
        try {
            localStorage.setItem('goalColors', JSON.stringify({}));
        } catch (e) {
            console.error('COLOR: Failed to clear colors:', e);
        }
    },

    debug() {
        const stored = this.getStoredColors();

    }
};

colorManager.init();
