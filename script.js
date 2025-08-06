class AdvancedTodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('advanced-tasks')) || [];
        this.currentFilter = 'all';
        this.currentSort = 'date';
        this.taskIdCounter = Math.max(...this.tasks.map(t => t.id), 0);
        this.searchQuery = '';
        this.selectedTasks = new Set();
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadUserPreferences();
        this.renderTasks();
        this.updateUI();
        this.startPeriodicSave();
    }
    
    initializeElements() {
        // Input elements
        this.taskInput = document.getElementById('taskInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.categorySelect = document.getElementById('categorySelect');
        this.addBtn = document.getElementById('addBtn');
        this.searchInput = document.getElementById('searchInput');
        
        // Control elements
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.sortSelect = document.getElementById('sortSelect');
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        
        // Display elements
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.taskCount = document.getElementById('taskCount');
        this.completionRate = document.getElementById('completionRate');
        this.streak = document.getElementById('streak');
        this.totalTasks = document.getElementById('totalTasks');
        this.completedTasks = document.getElementById('completedTasks');
        
        // Theme and modal elements
        this.themeToggle = document.getElementById('themeToggle');
        this.toast = document.getElementById('toast');
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmYes = document.getElementById('confirmYes');
        this.confirmNo = document.getElementById('confirmNo');
        this.confirmMessage = document.getElementById('confirmMessage');
        
        // Quick action buttons
        this.quickActionBtns = document.querySelectorAll('[data-task]');
    }
    
    initializeEventListeners() {
        // Add task events
        this.addBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTask();
            }
        });
        
        // Quick actions
        this.quickActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const task = e.currentTarget.dataset.task;
                const priority = e.currentTarget.dataset.priority;
                const category = e.currentTarget.dataset.category;
                this.addQuickTask(task, priority, category);
            });
        });
        
        // Filter and sort events
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });
        
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTasks();
            this.saveUserPreferences();
        });
        
        // Search events
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });
        
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.renderTasks();
        });
        
        // Bulk actions
        this.selectAllBtn.addEventListener('click', () => this.toggleSelectAll());
        this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Modal events
        this.confirmNo.addEventListener('click', () => this.hideConfirmModal());
        
        // Auto-save on task input
        this.taskInput.addEventListener('input', () => this.autoSave());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Focus management
        this.taskInput.focus();
    }
    
    addTask(taskText = null, priority = null, category = null) {
        const text = taskText || this.taskInput.value.trim();
        const taskPriority = priority || this.prioritySelect.value;
        const taskCategory = category || this.categorySelect.value;
        
        if (!text) {
            this.showToast('Please enter a task!', 'error');
            this.taskInput.focus();
            return;
        }
        
        if (text.length > 200) {
            this.showToast('Task is too long! Maximum 200 characters.', 'error');
            return;
        }
        
        // Check for duplicate tasks
        if (this.tasks.some(task => task.text.toLowerCase() === text.toLowerCase() && !task.completed)) {
            this.showToast('Similar task already exists!', 'warning');
            return;
        }
        
        const task = {
            id: ++this.taskIdCounter,
            text: text,
            priority: taskPriority,
            category: taskCategory,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            dueDate: null,
            tags: this.extractTags(text),
            estimatedTime: this.estimateTime(text)
        };
        
        this.tasks.unshift(task);
        
        if (!taskText) {
            this.taskInput.value = '';
            this.prioritySelect.value = 'medium';
            this.categorySelect.value = 'personal';
        }
        
        this.renderTasks();
        this.updateUI();
        this.saveToStorage();
        this.showToast('Task added successfully!', 'success');
        
        // Focus back to input for continuous adding
        setTimeout(() => this.taskInput.focus(), 100);
    }
    
    addQuickTask(text, priority, category) {
        this.addTask(text, priority, category);
        this.animateButton(event.currentTarget);
    }
    
    removeTask(taskId) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        
        this.showConfirmModal(`Delete "${task.text}"?`, () => {
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            
            if (taskElement) {
                taskElement.style.transform = 'translateX(100%)';
                taskElement.style.opacity = '0';
                
                setTimeout(() => {
                    this.tasks.splice(taskIndex, 1);
                    this.selectedTasks.delete(taskId);
                    this.renderTasks();
                    this.updateUI();
                    this.saveToStorage();
                    this.showToast('Task deleted!', 'success');
                }, 300);
            }
        });
    }
    
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        
        this.renderTasks();
        this.updateUI();
        this.saveToStorage();
        
        const message = task.completed ? 'Task completed! 🎉' : 'Task reopened!';
        this.showToast(message, task.completed ? 'success' : 'info');
        
        if (task.completed) {
            this.celebrateCompletion();
        }
    }
    
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const newText = prompt('Edit task:', task.text);
        if (newText !== null && newText.trim() !== '') {
            task.text = newText.trim();
            task.tags = this.extractTags(newText);
            this.renderTasks();
            this.saveToStorage();
            this.showToast('Task updated!', 'success');
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
        this.saveUserPreferences();
    }
    
    renderTasks() {
        let filteredTasks = this.getFilteredTasks();
        filteredTasks = this.getSortedTasks(filteredTasks);
        
        this.taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            this.emptyState.classList.add('show');
            this.taskList.style.display = 'none';
            return;
        }
        
        this.emptyState.classList.remove('show');
        this.taskList.style.display = 'block';
        
        filteredTasks.forEach((task, index) => {
            const taskElement = this.createTaskElement(task);
            taskElement.style.animationDelay = `${index * 0.05}s`;
            this.taskList.appendChild(taskElement);
        });
    }
    
    getFilteredTasks() {
        let filtered = this.tasks;
        
        // Apply status filter
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task => 
                task.text.toLowerCase().includes(this.searchQuery) ||
                task.category.toLowerCase().includes(this.searchQuery) ||
                task.priority.toLowerCase().includes(this.searchQuery) ||
                task.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }
        
        return filtered;
    }
    
    getSortedTasks(tasks) {
        const sortedTasks = [...tasks];
        
        switch (this.currentSort) {
            case 'priority':
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return sortedTasks.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                
            case 'alphabetical':
                return sortedTasks.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return a.text.localeCompare(b.text);
                });
                
            case 'category':
                return sortedTasks.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return a.category.localeCompare(b.category);
                });
                
            case 'date':
            default:
                return sortedTasks.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
        }
    }
    
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
        li.setAttribute('data-task-id', task.id);
        
        const isSelected = this.selectedTasks.has(task.id);
        const createdDate = new Date(task.createdAt).toLocaleDateString();
        const timeAgo = this.getTimeAgo(task.createdAt);
        
        li.innerHTML = `
            <input type="checkbox" class="task-select" ${isSelected ? 'checked' : ''}>
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-meta">
                    <span class="task-priority priority-${task.priority}">
                        <i class="fas fa-flag"></i> ${task.priority}
                    </span>
                    <span class="task-category">
                        <i class="fas fa-tag"></i> ${task.category}
                    </span>
                    <span class="task-date">
                        <i class="fas fa-calendar"></i> ${timeAgo}
                    </span>
                    ${task.estimatedTime ? `<span class="task-time"><i class="fas fa-clock"></i> ${task.estimatedTime}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-action-btn remove-btn" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Event listeners
        const selectCheckbox = li.querySelector('.task-select');
        const taskCheckbox = li.querySelector('.task-checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const removeBtn = li.querySelector('.remove-btn');
        
        selectCheckbox.addEventListener('change', () => this.toggleTaskSelection(task.id));
        taskCheckbox.addEventListener('change', () => this.toggleTask(task.id));
        editBtn.addEventListener('click', () => this.editTask(task.id));
        removeBtn.addEventListener('click', () => this.removeTask(task.id));
        
        return li;
    }
    
    toggleTaskSelection(taskId) {
        if (this.selectedTasks.has(taskId)) {
            this.selectedTasks.delete(taskId);
        } else {
            this.selectedTasks.add(taskId);
        }
        this.updateBulkActionsState();
    }
    
    toggleSelectAll() {
        const visibleTasks = this.getFilteredTasks();
        const allSelected = visibleTasks.every(task => this.selectedTasks.has(task.id));
        
        if (allSelected) {
            visibleTasks.forEach(task => this.selectedTasks.delete(task.id));
        } else {
            visibleTasks.forEach(task => this.selectedTasks.add(task.id));
        }
        
        this.renderTasks();
        this.updateBulkActionsState();
    }
    
    deleteSelected() {
        if (this.selectedTasks.size === 0) {
            this.showToast('No tasks selected!', 'warning');
            return;
        }
        
        this.showConfirmModal(`Delete ${this.selectedTasks.size} selected task(s)?`, () => {
            this.tasks = this.tasks.filter(task => !this.selectedTasks.has(task.id));
            this.selectedTasks.clear();
            this.renderTasks();
            this.updateUI();
            this.saveToStorage();
            this.showToast('Selected tasks deleted!', 'success');
        });
    }
    
    clearCompleted() {
        const completedCount = this.tasks.filter(task => task.completed).length;
        
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear!', 'warning');
            return;
        }
        
        this.showConfirmModal(`Clear ${completedCount} completed task(s)?`, () => {
            this.tasks = this.tasks.filter(task => !task.completed);
            this.renderTasks();
            this.updateUI();
            this.saveToStorage();
            this.showToast('Completed tasks cleared!', 'success');
        });
    }
    
    updateUI() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const remaining = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        this.taskCount.textContent = total;
        this.completionRate.textContent = `${rate}%`;
        this.totalTasks.textContent = total;
        this.completedTasks.textContent = completed;
        
        // Calculate and update streak
        const streak = this.calculateStreak();
        this.streak.textContent = streak;
        
        this.updateBulkActionsState();
    }
    
    updateBulkActionsState() {
        const hasSelected = this.selectedTasks.size > 0;
        this.deleteSelectedBtn.style.opacity = hasSelected ? '1' : '0.5';
        this.deleteSelectedBtn.disabled = !hasSelected;
    }
    
    calculateStreak() {
        // Simple streak calculation based on consecutive days with completed tasks
        const today = new Date().toDateString();
        const completedToday = this.tasks.some(task => 
            task.completed && 
            new Date(task.completedAt).toDateString() === today
        );
        
        if (!completedToday) return 0;
        
        let streak = 1;
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        
        for (let i = 0; i < 30; i++) { // Check last 30 days
            const dateStr = checkDate.toDateString();
            const hasCompletedTasks = this.tasks.some(task => 
                task.completed && 
                new Date(task.completedAt).toDateString() === dateStr
            );
            
            if (hasCompletedTasks) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        this.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} theme activated!`, 'info');
    }
    
    showToast(message, type = 'info') {
        const toast = this.toast;
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `toast-icon ${icons[type]}`;
        messageEl.textContent = message;
        
        // Set border color based on type
        const colors = {
            success: 'var(--success-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--primary-color)'
        };
        
        toast.style.borderLeftColor = colors[type];
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    showConfirmModal(message, onConfirm) {
        this.confirmMessage.textContent = message;
        this.confirmModal.classList.add('show');
        
        this.confirmYes.onclick = () => {
            onConfirm();
            this.hideConfirmModal();
        };
    }
    
    hideConfirmModal() {
        this.confirmModal.classList.remove('show');
    }
    
    celebrateCompletion() {
        // Simple celebration animation
        const celebrationEl = document.createElement('div');
        celebrationEl.innerHTML = '🎉';
        celebrationEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4em;
            pointer-events: none;
            z-index: 1000;
            animation: celebrate 1s ease-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes celebrate {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(celebrationEl);
        
        setTimeout(() => {
            document.body.removeChild(celebrationEl);
            document.head.removeChild(style);
        }, 1000);
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter: Add task
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.addTask();
        }
        
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.searchInput.focus();
        }
        
        // Ctrl/Cmd + A: Select all (when not in input)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            this.toggleSelectAll();
        }
        
        // Escape: Clear search or selection
        if (e.key === 'Escape') {
            if (this.searchQuery) {
                this.searchInput.value = '';
                this.searchQuery = '';
                this.renderTasks();
            } else if (this.selectedTasks.size > 0) {
                this.selectedTasks.clear();
                this.renderTasks();
            }
        }
        
        // Delete: Delete selected tasks
        if (e.key === 'Delete' && this.selectedTasks.size > 0) {
            e.preventDefault();
            this.deleteSelected();
        }
    }
    
    // Utility functions
    extractTags(text) {
        const tagRegex = /#(\w+)/g;
        const tags = [];
        let match;
        while ((match = tagRegex.exec(text)) !== null) {
            tags.push(match[1]);
        }
        return tags;
    }
    
    estimateTime(text) {
        const words = text.split(' ').length;
        if (words > 10) return '30+ min';
        if (words > 5) return '15-30 min';
        return '< 15 min';
    }
    
    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 48) return 'Yesterday';
        return `${Math.floor(diffInHours / 24)}d ago`;
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }
    
    // Storage and preferences
    saveToStorage() {
        localStorage.setItem('advanced-tasks', JSON.stringify(this.tasks));
    }
    
    loadUserPreferences() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        const savedFilter = localStorage.getItem('filter') || 'all';
        this.setFilter(savedFilter);
        
        const savedSort = localStorage.getItem('sort') || 'date';
        this.currentSort = savedSort;
        this.sortSelect.value = savedSort;
    }
    
    saveUserPreferences() {
        localStorage.setItem('filter', this.currentFilter);
        localStorage.setItem('sort', this.currentSort);
    }
    
    autoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveToStorage();
        }, 1000);
    }
    
    startPeriodicSave() {
        setInterval(() => {
            this.saveToStorage();
        }, 30000); // Save every 30 seconds
    }
}

// Initialize the advanced app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new AdvancedTodoApp();
});
