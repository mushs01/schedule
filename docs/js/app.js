/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

// Global state
let currentEditingEvent = null;

// DOM Elements
const eventModal = document.getElementById('eventModal');
const eventDetailModal = document.getElementById('eventDetailModal');
const mobileFilterModal = document.getElementById('mobileFilterModal');
const eventForm = document.getElementById('eventForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded - calendarModule:', window.calendarModule);
    
    // Initialize calendar
    if (window.calendarModule) {
        calendarModule.init();
    } else {
        console.error('❌ calendarModule not found!');
    }
    
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
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            openEventModal();
        });
    }
    
    // Modal close buttons
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeEventModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEventModal);
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeEventDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeEventDetailModal);
    
    // Event form submission
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventFormSubmit);
    }
    
    // Event detail actions
    const editEventBtn = document.getElementById('editEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    
    if (editEventBtn) editEventBtn.addEventListener('click', handleEditEvent);
    if (deleteEventBtn) deleteEventBtn.addEventListener('click', handleDeleteEvent);
    
    // View switcher
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            changeCalendarView(view);
        });
    });
    
    // Person filter
    const personFilter = document.getElementById('personFilter');
    if (personFilter) {
        personFilter.addEventListener('change', (e) => {
            calendarModule.filter(e.target.value);
        });
    }
    
    // AI summary refresh
    const refreshSummaryBtn = document.getElementById('refreshSummaryBtn');
    if (refreshSummaryBtn) {
        refreshSummaryBtn.addEventListener('click', () => {
            loadAISummary();
        });
    }
    
    // Sidebar filter (PC)
    const sidebarCheckboxes = document.querySelectorAll('.calendar-item input[type="checkbox"]');
    sidebarCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateCalendarFilter);
    });
    
    // Mobile filter
    const mobileFilterBtn = document.getElementById('mobileFilterBtn');
    const closeMobileFilterBtn = document.getElementById('closeMobileFilterBtn');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    
    if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', openMobileFilter);
    if (closeMobileFilterBtn) closeMobileFilterBtn.addEventListener('click', closeMobileFilter);
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyMobileFilter);
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', resetMobileFilter);
    
    // Close modal on backdrop click
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) closeEventModal();
    });
    
    eventDetailModal.addEventListener('click', (e) => {
        if (e.target === eventDetailModal) closeEventDetailModal();
    });
    
    if (mobileFilterModal) {
        mobileFilterModal.addEventListener('click', (e) => {
            if (e.target === mobileFilterModal) closeMobileFilter();
        });
    }
}

/**
 * Open event modal for creating/editing
 */
function openEventModal(dateInfo = null, event = null) {
    console.log('openEventModal called - dateInfo:', dateInfo, 'event:', event);
    
    if (!eventForm) {
        console.error('eventForm not found!');
        return;
    }
    
    if (!eventModal) {
        console.error('eventModal not found!');
        return;
    }
    
    currentEditingEvent = event;
    
    // Reset form
    eventForm.reset();
    
    if (event) {
        // Editing mode - 기존 일정 수정
        console.log('Edit mode - event:', event);
        document.getElementById('modalTitle').textContent = '일정 수정';
        
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : null;
        
        // 폼 필드 채우기
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventStartDate').value = formatDateInput(startDate);
        document.getElementById('eventStartTime').value = formatTimeInput(startDate);
        
        // 종료 날짜/시간 설정
        if (endDate) {
            document.getElementById('eventEndDate').value = formatDateInput(endDate);
            document.getElementById('eventEndTime').value = formatTimeInput(endDate);
        } else {
            // 종료 시간이 없으면 시작 시간 + 1시간
            const defaultEndDate = new Date(startDate);
            defaultEndDate.setHours(defaultEndDate.getHours() + 1);
            document.getElementById('eventEndDate').value = formatDateInput(defaultEndDate);
            document.getElementById('eventEndTime').value = formatTimeInput(defaultEndDate);
        }
        
        // 담당자 설정
        const personSelect = document.getElementById('eventPerson');
        if (personSelect && event.extendedProps && event.extendedProps.person) {
            personSelect.value = event.extendedProps.person;
        }
        
        // 설명 설정
        const descriptionField = document.getElementById('eventDescription');
        if (descriptionField && event.extendedProps) {
            descriptionField.value = event.extendedProps.description || '';
        }
        
        console.log('Form filled with event data');
    } else {
        // Creating mode - 새 일정 추가
        console.log('Create mode');
        document.getElementById('modalTitle').textContent = '일정 추가';
        
        if (dateInfo) {
            // dateInfo는 FullCalendar의 select 콜백에서 전달된 객체
            const startDate = dateInfo.start || dateInfo;
            const endDate = dateInfo.end || null;
            
            // 시작 날짜/시간 설정
            document.getElementById('eventStartDate').value = formatDateInput(startDate);
            document.getElementById('eventStartTime').value = formatTimeInput(startDate);
            
            // 종료 날짜/시간 자동 설정
            if (endDate) {
                // 드래그로 선택한 경우 - end 시간이 있음
                document.getElementById('eventEndDate').value = formatDateInput(endDate);
                document.getElementById('eventEndTime').value = formatTimeInput(endDate);
            } else {
                // 단순 클릭의 경우 - 시작 시간 + 1시간
                const defaultEndDate = new Date(startDate);
                defaultEndDate.setHours(defaultEndDate.getHours() + 1);
                document.getElementById('eventEndDate').value = formatDateInput(defaultEndDate);
                document.getElementById('eventEndTime').value = formatTimeInput(defaultEndDate);
            }
        } else {
            // 날짜 정보가 없으면 현재 시간 사용
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            
            document.getElementById('eventStartDate').value = formatDateInput(now);
            document.getElementById('eventStartTime').value = formatTimeInput(now);
            document.getElementById('eventEndDate').value = formatDateInput(oneHourLater);
            document.getElementById('eventEndTime').value = formatTimeInput(oneHourLater);
        }
    }
    
    console.log('Opening modal...');
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
    const endDate = document.getElementById('eventEndDate').value;
    const endTime = document.getElementById('eventEndTime').value;
    const person = document.getElementById('eventPerson').value;
    const description = document.getElementById('eventDescription').value;
    
    // 유효성 검사
    if (!title || !startDate || !startTime || !endDate || !endTime || !person) {
        showToast('모든 필수 항목을 입력해주세요.', 'error');
        return;
    }
    
    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    // 종료 시간이 시작 시간보다 빠른지 확인
    if (endDateTime <= startDateTime) {
        showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'error');
        return;
    }
    
    const scheduleData = {
        title,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
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
    const person = window.PERSON_NAMES[event.extendedProps.person];
    const color = window.PERSON_COLORS[event.extendedProps.person];
    
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
    
    // AI Summary 섹션이 없으면 스킵
    if (!summaryContent) {
        console.log('AI Summary section not found, skipping...');
        return;
    }
    
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
    
    if (!toastMessage || !toast) {
        console.log(`Toast: ${message} (${type})`);
        return;
    }
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Mobile Filter Functions
 */
function openMobileFilter() {
    if (!mobileFilterModal) return;
    
    // 사이드바의 체크박스 상태를 모바일 필터에 동기화
    const sidebarCheckboxes = document.querySelectorAll('.calendar-item input[type="checkbox"]');
    const mobileCheckboxes = document.querySelectorAll('.filter-item input[type="checkbox"]');
    
    sidebarCheckboxes.forEach((sidebarCheckbox, index) => {
        if (mobileCheckboxes[index]) {
            mobileCheckboxes[index].checked = sidebarCheckbox.checked;
        }
    });
    
    mobileFilterModal.classList.add('active');
}

function closeMobileFilter() {
    if (!mobileFilterModal) return;
    mobileFilterModal.classList.remove('active');
}

function applyMobileFilter() {
    // 모바일 필터의 체크박스 상태를 사이드바에 동기화
    const mobileCheckboxes = document.querySelectorAll('.filter-item input[type="checkbox"]');
    const sidebarCheckboxes = document.querySelectorAll('.calendar-item input[type="checkbox"]');
    
    mobileCheckboxes.forEach((mobileCheckbox, index) => {
        if (sidebarCheckboxes[index]) {
            sidebarCheckboxes[index].checked = mobileCheckbox.checked;
        }
    });
    
    // 캘린더 필터 적용
    updateCalendarFilter();
    
    closeMobileFilter();
    showToast('필터가 적용되었습니다.', 'success');
}

function resetMobileFilter() {
    // 모든 체크박스 선택
    const mobileCheckboxes = document.querySelectorAll('.filter-item input[type="checkbox"]');
    mobileCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function updateCalendarFilter() {
    console.log('updateCalendarFilter called');
    
    // 선택된 담당자 목록 가져오기
    const checkboxes = document.querySelectorAll('.calendar-item input[type="checkbox"]');
    const selectedPersons = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedPersons.push(checkbox.dataset.person);
        }
    });
    
    console.log('Selected persons:', selectedPersons);
    
    // calendarModule의 filter 함수 호출
    if (window.calendarModule && window.calendarModule.filterByPersons) {
        window.calendarModule.filterByPersons(selectedPersons);
        showToast(`필터 적용: ${selectedPersons.length}개 선택`, 'success');
    } else {
        console.error('calendarModule.filterByPersons not found!');
    }
}

// Export functions to window for use in other modules
window.showToast = showToast;
window.openEventModal = openEventModal;
window.updateCalendarFilter = updateCalendarFilter;

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

