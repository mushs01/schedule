/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

// Global state
let currentEditingEvent = null;

// DOM Elements
const eventModal = document.getElementById('eventModal');
const eventDetailModal = document.getElementById('eventDetailModal');
const searchModal = document.getElementById('searchModal');
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
    
    // Person filter buttons (헤더)
    const personFilterBtns = document.querySelectorAll('.person-filter-btn');
    personFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const person = btn.dataset.person;
            
            // 버튼 활성화/비활성화 토글
            btn.classList.toggle('active');
            
            // 필터 적용
            updateCalendarFilterFromButtons();
        });
    });
    
    // View navigation buttons
    const todayBtn = document.getElementById('todayBtn');
    const prevViewBtn = document.getElementById('prevViewBtn');
    const nextViewBtn = document.getElementById('nextViewBtn');
    
    if (todayBtn) todayBtn.addEventListener('click', () => {
        if (window.calendarModule && window.calendarModule.navigateToday) {
            window.calendarModule.navigateToday();
        }
    });
    
    if (prevViewBtn) prevViewBtn.addEventListener('click', () => {
        if (window.calendarModule && window.calendarModule.navigatePrev) {
            window.calendarModule.navigatePrev();
        }
    });
    
    if (nextViewBtn) nextViewBtn.addEventListener('click', () => {
        if (window.calendarModule && window.calendarModule.navigateNext) {
            window.calendarModule.navigateNext();
        }
    });
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) searchBtn.addEventListener('click', openSearchModal);
    if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearchModal);
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Close modal on backdrop click
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) closeEventModal();
    });
    
    eventDetailModal.addEventListener('click', (e) => {
        if (e.target === eventDetailModal) closeEventDetailModal();
    });
    
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) closeSearchModal();
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
        console.log('Create mode - dateInfo:', dateInfo);
        document.getElementById('modalTitle').textContent = '일정 추가';
        
        if (dateInfo) {
            // dateInfo는 FullCalendar의 select 콜백에서 전달된 객체
            // dateInfo.start, dateInfo.end를 사용
            let startDate, endDate;
            
            if (dateInfo.start instanceof Date) {
                startDate = dateInfo.start;
            } else if (typeof dateInfo.start === 'string') {
                startDate = new Date(dateInfo.start);
            } else if (dateInfo instanceof Date) {
                startDate = dateInfo;
            } else {
                startDate = new Date();
            }
            
            if (dateInfo.end) {
                if (dateInfo.end instanceof Date) {
                    endDate = dateInfo.end;
                } else if (typeof dateInfo.end === 'string') {
                    endDate = new Date(dateInfo.end);
                } else {
                    endDate = null;
                }
            } else {
                endDate = null;
            }
            
            console.log('Parsed dates - Start:', startDate, 'End:', endDate);
            
            // 시작 날짜/시간 설정
            const startDateStr = formatDateInput(startDate);
            const startTimeStr = formatTimeInput(startDate);
            
            document.getElementById('eventStartDate').value = startDateStr;
            document.getElementById('eventStartTime').value = startTimeStr;
            
            console.log('Set start date/time:', startDateStr, startTimeStr);
            
            // 종료 날짜/시간 자동 설정
            if (endDate) {
                // 드래그로 선택한 경우 - end 시간이 있음
                const endDateStr = formatDateInput(endDate);
                const endTimeStr = formatTimeInput(endDate);
                
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                
                console.log('🎯 드래그 선택 - 종료 날짜/시간:', endDateStr, endTimeStr);
            } else {
                // 단순 클릭의 경우 - 시작 시간 + 1시간
                const defaultEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                const endDateStr = formatDateInput(defaultEndDate);
                const endTimeStr = formatTimeInput(defaultEndDate);
                
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                
                console.log('👆 클릭 선택 - 종료 시간 +1시간:', endDateStr, endTimeStr);
            }
        } else {
            // 날짜 정보가 없으면 현재 시간 사용
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            
            document.getElementById('eventStartDate').value = formatDateInput(now);
            document.getElementById('eventStartTime').value = formatTimeInput(now);
            document.getElementById('eventEndDate').value = formatDateInput(oneHourLater);
            document.getElementById('eventEndTime').value = formatTimeInput(oneHourLater);
            
            console.log('📅 기본값 사용 (현재 시간)');
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
 * Update calendar filter from buttons
 */
function updateCalendarFilterFromButtons() {
    console.log('updateCalendarFilterFromButtons called');
    
    // 활성화된 버튼에서 담당자 목록 가져오기
    const activeButtons = document.querySelectorAll('.person-filter-btn.active');
    const selectedPersons = [];
    
    activeButtons.forEach(btn => {
        selectedPersons.push(btn.dataset.person);
    });
    
    console.log('Selected persons from buttons:', selectedPersons);
    
    // calendarModule의 filter 함수 호출
    if (window.calendarModule && window.calendarModule.filterByPersons) {
        window.calendarModule.filterByPersons(selectedPersons);
    } else {
        console.error('calendarModule.filterByPersons not found!');
    }
}

/**
 * Search functionality
 */
function openSearchModal() {
    if (!searchModal) return;
    searchModal.classList.add('active');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    // 초기 상태로 리셋
    document.getElementById('searchResults').innerHTML = '<p class="search-hint">키워드를 입력하여 일정을 검색하세요</p>';
}

function closeSearchModal() {
    if (!searchModal) return;
    searchModal.classList.remove('active');
}

async function handleSearch(e) {
    const keyword = e.target.value.trim().toLowerCase();
    const searchResults = document.getElementById('searchResults');
    
    if (!keyword) {
        searchResults.innerHTML = '<p class="search-hint">키워드를 입력하여 일정을 검색하세요</p>';
        return;
    }
    
    try {
        // 전체 일정 가져오기
        const schedules = await api.getSchedules({
            person: 'all'
        });
        
        // 키워드로 필터링
        const filtered = schedules.filter(schedule => 
            schedule.title.toLowerCase().includes(keyword) ||
            (schedule.description && schedule.description.toLowerCase().includes(keyword))
        );
        
        if (filtered.length === 0) {
            searchResults.innerHTML = '<p class="no-results">검색 결과가 없습니다</p>';
            return;
        }
        
        // 결과 표시
        const resultsHTML = filtered.map(schedule => {
            const startDate = new Date(schedule.start);
            const endDate = schedule.end ? new Date(schedule.end) : null;
            const personName = window.PERSON_NAMES[schedule.person] || schedule.person;
            const personColor = window.PERSON_COLORS[schedule.person] || '#808080';
            
            return `
                <div class="search-result-item" data-event-id="${schedule.id}">
                    <div class="search-result-title">${schedule.title}</div>
                    <div class="search-result-info">
                        <span>${formatDate(startDate)} ${formatTime(startDate)}${endDate ? ' - ' + formatTime(endDate) : ''}</span>
                        <span class="search-result-person" style="background: ${personColor}22; color: ${personColor};">
                            ${personName}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        searchResults.innerHTML = resultsHTML;
        
        // 검색 결과 클릭 이벤트
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const eventId = item.dataset.eventId;
                const schedule = filtered.find(s => s.id === eventId);
                if (schedule) {
                    closeSearchModal();
                    // 일정 상세 보기 (FullCalendar 이벤트 객체 형식으로 변환)
                    const event = {
                        id: schedule.id,
                        title: schedule.title,
                        start: schedule.start,
                        end: schedule.end,
                        extendedProps: {
                            description: schedule.description,
                            person: schedule.person
                        }
                    };
                    showEventDetail(event);
                }
            });
        });
        
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<p class="no-results">검색 중 오류가 발생했습니다</p>';
    }
}

// Export functions to window for use in other modules
window.showToast = showToast;
window.openEventModal = openEventModal;

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

