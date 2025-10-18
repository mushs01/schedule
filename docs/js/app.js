/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

// Global state
let currentEditingEvent = null;

// DOM Elements
const eventModal = document.getElementById('eventModal');
const eventDetailModal = document.getElementById('eventDetailModal');
const eventForm = document.getElementById('eventForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize calendar
    calendarModule.init();
    
    // Load AI summary
    loadAISummary();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check API health
    checkAPIHealth();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Add event button
    document.getElementById('addEventBtn').addEventListener('click', () => {
        openEventModal();
    });
    
    // Modal close buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeEventModal);
    document.getElementById('cancelBtn').addEventListener('click', closeEventModal);
    document.getElementById('closeDetailModalBtn').addEventListener('click', closeEventDetailModal);
    document.getElementById('closeDetailBtn').addEventListener('click', closeEventDetailModal);
    
    // Event form submission
    eventForm.addEventListener('submit', handleEventFormSubmit);
    
    // Event detail actions
    document.getElementById('editEventBtn').addEventListener('click', handleEditEvent);
    document.getElementById('deleteEventBtn').addEventListener('click', handleDeleteEvent);
    
    // View switcher
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            changeCalendarView(view);
        });
    });
    
    // Person filter
    document.getElementById('personFilter').addEventListener('change', (e) => {
        calendarModule.filter(e.target.value);
    });
    
    // AI summary refresh
    document.getElementById('refreshSummaryBtn').addEventListener('click', () => {
        loadAISummary();
    });
    
    // Close modal on backdrop click
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) closeEventModal();
    });
    
    eventDetailModal.addEventListener('click', (e) => {
        if (e.target === eventDetailModal) closeEventDetailModal();
    });
}

/**
 * Open event modal for creating/editing
 */
function openEventModal(date = null, event = null) {
    currentEditingEvent = event;
    
    // Reset form
    eventForm.reset();
    
    if (event) {
        // Editing mode
        document.getElementById('modalTitle').textContent = '일정 수정';
        
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : null;
        
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventStartDate').value = formatDateInput(startDate);
        document.getElementById('eventStartTime').value = formatTimeInput(startDate);
        if (endDate) {
            document.getElementById('eventEndTime').value = formatTimeInput(endDate);
        }
        document.getElementById('eventPerson').value = event.extendedProps.person;
        document.getElementById('eventDescription').value = event.extendedProps.description || '';
    } else {
        // Creating mode
        document.getElementById('modalTitle').textContent = '일정 추가';
        
        if (date) {
            document.getElementById('eventStartDate').value = formatDateInput(date);
            document.getElementById('eventStartTime').value = formatTimeInput(date);
        } else {
            const now = new Date();
            document.getElementById('eventStartDate').value = formatDateInput(now);
        }
    }
    
    eventModal.classList.add('active');
}

/**
 * Close event modal
 */
function closeEventModal() {
    eventModal.classList.remove('active');
    currentEditingEvent = null;
}

/**
 * Handle event form submission
 */
async function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value;
    const startDate = document.getElementById('eventStartDate').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const person = document.getElementById('eventPerson').value;
    const description = document.getElementById('eventDescription').value;
    
    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endTime ? new Date(`${startDate}T${endTime}`) : null;
    
    const scheduleData = {
        title,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime ? endDateTime.toISOString() : null,
        person,
        description: description || null
    };
    
    try {
        showLoading(true);
        
        if (currentEditingEvent) {
            // Update existing event
            await api.updateSchedule(currentEditingEvent.id, scheduleData);
            showToast('일정이 수정되었습니다.', 'success');
        } else {
            // Create new event
            await api.createSchedule(scheduleData);
            showToast('일정이 추가되었습니다.', 'success');
        }
        
        // Refresh calendar and AI summary
        calendarModule.refresh();
        loadAISummary();
        
        closeEventModal();
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('일정 저장에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Show event detail modal
 */
function showEventDetail(event) {
    const detail = document.getElementById('eventDetail');
    
    const startDate = new Date(event.start);
    const endDate = event.end ? new Date(event.end) : null;
    const person = PERSON_NAMES[event.extendedProps.person];
    const color = PERSON_COLORS[event.extendedProps.person];
    
    detail.innerHTML = `
        <div class="event-detail-item">
            <i class="fas fa-heading"></i>
            <div>
                <strong>제목:</strong> ${event.title}
            </div>
        </div>
        <div class="event-detail-item">
            <i class="fas fa-calendar"></i>
            <div>
                <strong>날짜:</strong> ${formatDate(startDate)}
            </div>
        </div>
        <div class="event-detail-item">
            <i class="fas fa-clock"></i>
            <div>
                <strong>시간:</strong> ${formatTime(startDate)}${endDate ? ' - ' + formatTime(endDate) : ''}
            </div>
        </div>
        <div class="event-detail-item">
            <i class="fas fa-user"></i>
            <div>
                <strong>담당자:</strong> 
                <span class="event-person-badge" style="background: ${color};">${person}</span>
            </div>
        </div>
        ${event.extendedProps.description ? `
        <div class="event-detail-item">
            <i class="fas fa-align-left"></i>
            <div>
                <strong>설명:</strong><br>${event.extendedProps.description}
            </div>
        </div>
        ` : ''}
    `;
    
    currentEditingEvent = event;
    eventDetailModal.classList.add('active');
}

/**
 * Close event detail modal
 */
function closeEventDetailModal() {
    eventDetailModal.classList.remove('active');
    currentEditingEvent = null;
}

/**
 * Handle edit event button
 */
function handleEditEvent() {
    closeEventDetailModal();
    openEventModal(null, currentEditingEvent);
}

/**
 * Handle delete event button
 */
async function handleDeleteEvent() {
    if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        await api.deleteSchedule(currentEditingEvent.id);
        showToast('일정이 삭제되었습니다.', 'success');
        
        calendarModule.refresh();
        loadAISummary();
        
        closeEventDetailModal();
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('일정 삭제에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Change calendar view
 */
function changeCalendarView(viewName) {
    calendarModule.changeView(viewName);
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });
}

/**
 * Load AI summary
 */
async function loadAISummary() {
    const summaryContent = document.getElementById('aiSummaryContent');
    
    summaryContent.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>AI 요약을 생성하는 중입니다...</span>
        </div>
    `;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const summary = await api.getAISummary(today);
        
        summaryContent.innerHTML = `<p>${summary.summary}</p>`;
    } catch (error) {
        console.error('Error loading AI summary:', error);
        summaryContent.innerHTML = `
            <p style="color: var(--text-secondary);">
                <i class="fas fa-exclamation-triangle"></i>
                AI 요약을 불러올 수 없습니다. OpenAI API 키를 확인해주세요.
            </p>
        `;
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Check API health
 */
async function checkAPIHealth() {
    try {
        await api.healthCheck();
        console.log('API is healthy');
    } catch (error) {
        console.error('API health check failed:', error);
        showToast('서버 연결에 실패했습니다.', 'error');
    }
}

/**
 * Utility: Format date for input
 */
function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Utility: Format time for input
 */
function formatTimeInput(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Utility: Format date for display
 */
function formatDate(date) {
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

/**
 * Utility: Format time for display
 */
function formatTime(date) {
    return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Make globals available
window.showEventDetail = showEventDetail;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.showLoading = showLoading;
window.showToast = showToast;

