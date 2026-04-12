/**
 * Goals API Service
 * Extracted from pages/goals.js so it can be shared across views and components.
 */

const goalsService = {
    async fetchGoals() {
        return await api.get('/goals/');
    },
    async fetchGoal(goalId) {
        return await api.get(`/goals/${goalId}`);
    },
    async createGoal(goalData) {
        return await api.post('/goals/', goalData);
    },
    async updateGoal(goalId, goalData) {
        return await api.put(`/goals/${goalId}`, goalData);
    },
    async deleteGoal(goalId) {
        await api.delete(`/goals/${goalId}`);
    }
};

window.goalsService = goalsService;
