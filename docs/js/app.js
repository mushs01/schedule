/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

// Global state
let currentEditingEvent = null;

// DOM Elements - will be initialized after DOM loads
let eventModal;
let eventDetailModal;
let searchModal;
let settingsModal;
let eventForm;
let loadingOverlay;
let toast;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded - calendarModule:', window.calendarModule);
    
    // Initialize DOM elements
    eventModal = document.getElementById('eventModal');
    eventDetailModal = document.getElementById('eventDetailModal');
    searchModal = document.getElementById('searchModal');
    settingsModal = document.getElementById('settingsModal');
    eventForm = document.getElementById('eventForm');
    loadingOverlay = document.getElementById('loadingOverlay');
    toast = document.getElementById('toast');
    
    console.log('📋 DOM Elements initialized:', {
        eventModal: !!eventModal,
        eventDetailModal: !!eventDetailModal,
        searchModal: !!searchModal,
        settingsModal: !!settingsModal,
        eventForm: !!eventForm,
        loadingOverlay: !!loadingOverlay,
        toast: !!toast
    });
    
    // Initialize calendar
    if (window.calendarModule) {
        calendarModule.init();
    } else {
        console.error('❌ calendarModule not found!');
    }
    
    // Load AI summary
    loadAISummary();
    
    // Load Today's Schedule Summary
    loadTodaySummary();
    
    // Initialize Kakao SDK
    if (window.kakaoNotification) {
        window.kakaoNotification.init();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup person checkbox listeners
    setupPersonCheckboxListeners();
    
    // Setup date change listeners for day of week display
    setupDateChangeListeners();
    
    // Check API health
    checkAPIHealth();
});

/**
 * Setup person checkbox listeners
 */
function setupPersonCheckboxListeners() {
    const personAll = document.getElementById('personAll');
    const personCheckboxes = document.querySelectorAll('input[name="eventPerson"]:not(#personAll)');
    
    if (personAll) {
        personAll.addEventListener('change', function() {
            if (this.checked) {
                // '전체' 선택 시 다른 체크박스 모두 해제
                personCheckboxes.forEach(cb => cb.checked = false);
            }
        });
    }
    
    if (personCheckboxes) {
        personCheckboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                if (this.checked && personAll) {
                    // 개별 체크박스 선택 시 '전체' 해제
                    personAll.checked = false;
                }
            });
        });
    }
    
    // 반복 설정 이벤트 리스너 (간소화)
    const repeatSelect = document.getElementById('eventRepeat');
    
    // 반복 설정은 항상 표시, 체크박스 제거했으므로 단순화
}

/**
 * Setup date change listeners for day of week display
 */
function setupDateChangeListeners() {
    const startDateInput = document.getElementById('eventStartDate');
    const endDateInput = document.getElementById('eventEndDate');
    const startDaySpan = document.getElementById('startDayOfWeek');
    const endDaySpan = document.getElementById('endDayOfWeek');
    
    function updateDayOfWeek(dateInput, daySpan) {
        if (!dateInput || !daySpan || !dateInput.value) return;
        
        const date = new Date(dateInput.value);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[date.getDay()];
        daySpan.textContent = dayOfWeek;
    }
    
    if (startDateInput && startDaySpan) {
        startDateInput.addEventListener('change', function() {
            updateDayOfWeek(startDateInput, startDaySpan);
        });
    }
    
    if (endDateInput && endDaySpan) {
        endDateInput.addEventListener('change', function() {
            updateDayOfWeek(endDateInput, endDaySpan);
        });
    }
}

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
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEventModal);
        console.log('✅ Close modal button listener added');
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEventModal);
        console.log('✅ Cancel button listener added');
    }
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', closeEventDetailModal);
        console.log('✅ Close detail modal button listener added');
    }
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', closeEventDetailModal);
        console.log('✅ Close detail button listener added');
    }
    
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
    
    if (searchBtn) {
        searchBtn.addEventListener('click', openSearchModal);
        console.log('✅ Search button listener added');
    }
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', closeSearchModal);
        console.log('✅ Close search button listener added');
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Settings functionality
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
    const kakaoLogoutBtn = document.getElementById('kakaoLogoutBtn');
    const testKakaoBtn = document.getElementById('testKakaoBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
        console.log('✅ Settings button listener added');
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        console.log('✅ Close settings button listener added');
    }
    
    if (kakaoLoginBtn) kakaoLoginBtn.addEventListener('click', () => {
        if (window.kakaoNotification) {
            window.kakaoNotification.login();
        }
    });
    
    if (kakaoLogoutBtn) kakaoLogoutBtn.addEventListener('click', () => {
        if (window.kakaoNotification) {
            window.kakaoNotification.logout();
        }
    });
    
    if (testKakaoBtn) testKakaoBtn.addEventListener('click', () => {
        if (window.kakaoNotification) {
            window.kakaoNotification.sendTest();
        }
    });
    
    // Close modal on backdrop click
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) closeEventModal();
        });
    }
    
    if (eventDetailModal) {
        eventDetailModal.addEventListener('click', (e) => {
            if (e.target === eventDetailModal) closeEventDetailModal();
        });
    }
    
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) closeSearchModal();
        });
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }
}

/**
 * Open event modal for creating/editing
 */
function openEventModal(dateInfo = null, event = null) {
    console.log('🔧 openEventModal called - dateInfo:', dateInfo, 'event:', event);
    
    if (!eventForm) {
        console.error('❌ eventForm not found!');
        return;
    }
    
    if (!eventModal) {
        console.error('❌ eventModal not found!');
        return;
    }
    
    currentEditingEvent = event;
    console.log('📝 currentEditingEvent set to:', currentEditingEvent);
    
    // Reset form
    eventForm.reset();
    
    if (event) {
        // Editing mode - 기존 일정 수정
        console.log('✏️ Edit mode - event:', event);
        console.log('📋 Event ID:', event.id || event.extendedProps?.id);
        console.log('📋 Event extendedProps:', event.extendedProps);
        document.getElementById('modalTitle').textContent = '일정 수정';
        
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : null;
        
        // 폼 필드 채우기
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventStartDate').value = formatDateInput(startDate);
        document.getElementById('eventStartTime').value = formatTimeInput(startDate);
        
        // 요일 업데이트
        updateDayOfWeekDisplay('eventStartDate', 'startDayOfWeek');
        
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
        
        // 종료 요일 업데이트
        updateDayOfWeekDisplay('eventEndDate', 'endDayOfWeek');
        
        // 담당자 설정 (체크박스)
        if (event.extendedProps && event.extendedProps.persons) {
            // 복수 담당자
            const persons = event.extendedProps.persons;
            persons.forEach(person => {
                const checkbox = document.getElementById(`person${person.charAt(0).toUpperCase() + person.slice(1)}`);
                if (checkbox) checkbox.checked = true;
            });
        } else if (event.extendedProps && event.extendedProps.person) {
            // 단일 담당자 (하위 호환성)
            const person = event.extendedProps.person;
            const checkbox = document.getElementById(`person${person.charAt(0).toUpperCase() + person.slice(1)}`);
            if (checkbox) checkbox.checked = true;
        }
        
        // 설명 설정
        const descriptionField = document.getElementById('eventDescription');
        if (descriptionField && event.extendedProps) {
            descriptionField.value = event.extendedProps.description || '';
        }
        
        // 카카오톡 알림 설정
        const kakaoNotificationStartField = document.getElementById('eventKakaoNotificationStart');
        const kakaoNotificationEndField = document.getElementById('eventKakaoNotificationEnd');
        
        console.log('🔔 Loading kakao notification settings:');
        console.log('  - extendedProps:', event.extendedProps);
        console.log('  - kakao_notification_start:', event.extendedProps?.kakao_notification_start);
        console.log('  - kakao_notification_end:', event.extendedProps?.kakao_notification_end);
        
        if (kakaoNotificationStartField && event.extendedProps) {
            kakaoNotificationStartField.checked = event.extendedProps.kakao_notification_start || false;
            console.log('  - Start checkbox set to:', kakaoNotificationStartField.checked);
        }
        if (kakaoNotificationEndField && event.extendedProps) {
            kakaoNotificationEndField.checked = event.extendedProps.kakao_notification_end || false;
            console.log('  - End checkbox set to:', kakaoNotificationEndField.checked);
        }
        
        // 반복 설정
        const repeatSelect = document.getElementById('eventRepeat');
        const repeatEndDateInput = document.getElementById('eventRepeatEndDate');
        
        if (repeatSelect && event.extendedProps) {
            repeatSelect.value = event.extendedProps.repeat_type || 'none';
        }
        if (repeatEndDateInput && event.extendedProps && event.extendedProps.repeat_end_date) {
            repeatEndDateInput.value = event.extendedProps.repeat_end_date.split('T')[0];
        }
        
        console.log('Form filled with event data');
    } else {
        // Creating mode - 새 일정 추가
        console.log('Create mode - dateInfo:', dateInfo);
        document.getElementById('modalTitle').textContent = '일정 추가';
        
        // 카카오톡 알림 체크박스 초기화 (디폴트 OFF)
        const kakaoNotificationStartField = document.getElementById('eventKakaoNotificationStart');
        const kakaoNotificationEndField = document.getElementById('eventKakaoNotificationEnd');
        if (kakaoNotificationStartField) {
            kakaoNotificationStartField.checked = false;
        }
        if (kakaoNotificationEndField) {
            kakaoNotificationEndField.checked = false;
        }
        
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
            
            // 요일 업데이트
            updateDayOfWeekDisplay('eventStartDate', 'startDayOfWeek');
            
            console.log('Set start date/time:', startDateStr, startTimeStr);
            
            // 종료 날짜/시간 자동 설정
            if (endDate) {
                // 드래그로 선택한 경우 - end 시간이 있음
                const endDateStr = formatDateInput(endDate);
                const endTimeStr = formatTimeInput(endDate);
                
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                
                // 요일 업데이트
                updateDayOfWeekDisplay('eventEndDate', 'endDayOfWeek');
                
                console.log('🎯 드래그 선택 - 종료 날짜/시간:', endDateStr, endTimeStr);
            } else {
                // 단순 클릭의 경우 - 시작 시간 + 1시간
                const defaultEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                const endDateStr = formatDateInput(defaultEndDate);
                const endTimeStr = formatTimeInput(defaultEndDate);
                
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                
                // 요일 업데이트
                updateDayOfWeekDisplay('eventEndDate', 'endDayOfWeek');
                
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
            
            // 요일 업데이트
            updateDayOfWeekDisplay('eventStartDate', 'startDayOfWeek');
            updateDayOfWeekDisplay('eventEndDate', 'endDayOfWeek');
            
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
    console.log('📅 Closing event modal');
    if (!eventModal) {
        console.error('❌ Event modal not found!');
        return;
    }
    eventModal.classList.remove('active');
    currentEditingEvent = null;
    console.log('✅ Event modal closed');
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
    const description = document.getElementById('eventDescription').value;
    
    // 담당자 체크박스에서 선택된 값들 가져오기
    const selectedPersons = [];
    document.querySelectorAll('input[name="eventPerson"]:checked').forEach(checkbox => {
        selectedPersons.push(checkbox.value);
    });
    
    // 유효성 검사
    if (!title || !startDate || !startTime || !endDate || !endTime || selectedPersons.length === 0) {
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
    
    // 카카오톡 알림 설정
    const kakaoNotificationStart = document.getElementById('eventKakaoNotificationStart');
    const kakaoNotificationEnd = document.getElementById('eventKakaoNotificationEnd');
    
    console.log('📤 Saving kakao notification settings:');
    console.log('  - Start element:', kakaoNotificationStart);
    console.log('  - Start checked:', kakaoNotificationStart?.checked);
    console.log('  - End element:', kakaoNotificationEnd);
    console.log('  - End checked:', kakaoNotificationEnd?.checked);
    
    const enableNotificationStart = kakaoNotificationStart ? kakaoNotificationStart.checked : false;
    const enableNotificationEnd = kakaoNotificationEnd ? kakaoNotificationEnd.checked : false;
    
    console.log('  - Final start value:', enableNotificationStart);
    console.log('  - Final end value:', enableNotificationEnd);
    
    // 반복 설정
    const repeatSelect = document.getElementById('eventRepeat');
    const repeatEndDateInput = document.getElementById('eventRepeatEndDate');
    
    const repeatType = repeatSelect ? repeatSelect.value : 'none';
    const repeatEndDate = (repeatEndDateInput && repeatEndDateInput.value) 
        ? new Date(repeatEndDateInput.value + 'T23:59:59').toISOString()
        : null;
    
    // '전체' 선택 시 person은 'all', 아니면 첫 번째 담당자
    const person = selectedPersons.includes('all') ? 'all' : selectedPersons[0];
    
    const scheduleData = {
        title,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        person,
        persons: selectedPersons,  // 복수 담당자 정보 추가
        description: description || null,
        kakao_notification_start: enableNotificationStart,
        kakao_notification_end: enableNotificationEnd,
        repeat_type: repeatType,
        repeat_end_date: repeatEndDate
    };
    
    try {
        showLoading(true);
        
        if (currentEditingEvent) {
            // Update existing event
            // FullCalendar event의 ID는 event.id 또는 event.extendedProps.id에 있을 수 있음
            const eventId = currentEditingEvent.id || currentEditingEvent.extendedProps?.id;
            console.log('📝 Updating event with ID:', eventId);
            console.log('📋 Schedule data:', scheduleData);
            
            if (!eventId) {
                console.error('❌ Event ID not found!', currentEditingEvent);
                showToast('일정 ID를 찾을 수 없습니다.', 'error');
                return;
            }
            
            await api.updateSchedule(eventId, scheduleData);
            showToast('일정이 수정되었습니다.', 'success');
        } else {
            // Create new event
            console.log('➕ Creating new event');
            console.log('📋 Schedule data:', scheduleData);
            await api.createSchedule(scheduleData);
            showToast('일정이 추가되었습니다.', 'success');
        }
        
        // Refresh calendar, AI summary, and today's summary
        calendarModule.refresh();
        loadAISummary();
        loadTodaySummary();
        
        closeEventModal();
    } catch (error) {
        console.error('❌ Error saving event:', error);
        showToast('일정 저장에 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Show event detail modal
 */
function showEventDetail(event) {
    console.log('📖 showEventDetail called with event:', event);
    console.log('📋 Event ID:', event.id);
    console.log('📋 Event extendedProps.id:', event.extendedProps?.id);
    
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
    console.log('📝 currentEditingEvent set to:', currentEditingEvent);
    console.log('📋 currentEditingEvent.id:', currentEditingEvent.id);
    console.log('📋 currentEditingEvent.extendedProps:', currentEditingEvent.extendedProps);
    
    eventDetailModal.classList.add('active');
}

/**
 * Close event detail modal
 */
function closeEventDetailModal() {
    eventDetailModal.classList.remove('active');
    // currentEditingEvent는 여기서 null로 설정하지 않음
    // 수정 모드에서 필요할 수 있음
}

/**
 * Handle edit event button
 */
function handleEditEvent() {
    console.log('✏️ handleEditEvent called');
    console.log('📝 currentEditingEvent:', currentEditingEvent);
    console.log('📋 currentEditingEvent.id:', currentEditingEvent?.id);
    console.log('📋 currentEditingEvent.extendedProps:', currentEditingEvent?.extendedProps);
    
    // currentEditingEvent를 임시 변수에 저장
    const eventToEdit = currentEditingEvent;
    
    closeEventDetailModal();
    
    // 저장된 이벤트로 수정 모달 열기
    openEventModal(null, eventToEdit);
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
        loadTodaySummary();
        
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
 * Settings functionality
 */
function openSettingsModal() {
    console.log('🔧 Opening settings modal');
    if (!settingsModal) {
        console.error('❌ Settings modal not found!');
        return;
    }
    settingsModal.classList.add('active');
    console.log('✅ Settings modal opened');
}

function closeSettingsModal() {
    console.log('🔧 Closing settings modal');
    if (!settingsModal) {
        console.error('❌ Settings modal not found!');
        return;
    }
    settingsModal.classList.remove('active');
    console.log('✅ Settings modal closed');
}

/**
 * Search functionality
 */
function openSearchModal() {
    console.log('🔍 Opening search modal');
    if (!searchModal) {
        console.error('❌ Search modal not found!');
        return;
    }
    searchModal.classList.add('active');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    // 초기 상태로 리셋
    document.getElementById('searchResults').innerHTML = '<p class="search-hint">키워드를 입력하여 일정을 검색하세요</p>';
    console.log('✅ Search modal opened');
}

function closeSearchModal() {
    console.log('🔍 Closing search modal');
    if (!searchModal) {
        console.error('❌ Search modal not found!');
        return;
    }
    searchModal.classList.remove('active');
    console.log('✅ Search modal closed');
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

/**
 * Load Today's Schedule Summary
 */
async function loadTodaySummary() {
    try {
        // 오늘 날짜 설정
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        // 오늘 날짜 표시
        const todayDateEl = document.getElementById('todayDate');
        if (todayDateEl) {
            todayDateEl.textContent = `${today.getMonth() + 1}월 ${today.getDate()}일`;
        }
        
        // 모든 일정 가져오기
        const schedules = await api.getSchedules({});
        
        // 오늘 일정 필터링
        const todaySchedules = schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.start);
            return scheduleDate >= todayStart && scheduleDate <= todayEnd;
        });
        
        // 시간순 정렬
        todaySchedules.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        // 일정 목록 표시
        const todaySummaryList = document.getElementById('todaySummaryList');
        if (!todaySummaryList) return;
        
        if (todaySchedules.length === 0) {
            todaySummaryList.innerHTML = '<p class="no-schedule">오늘 예정된 일정이 없습니다</p>';
            return;
        }
        
        const itemsHTML = todaySchedules.map(schedule => {
            const startDate = new Date(schedule.start);
            const endDate = schedule.end ? new Date(schedule.end) : null;
            const personName = window.PERSON_NAMES[schedule.person] || schedule.person;
            const personColor = window.PERSON_COLORS[schedule.person] || '#808080';
            
            const timeText = endDate 
                ? `${formatTime(startDate)} - ${formatTime(endDate)}`
                : formatTime(startDate);
            
            return `
                <div class="today-item" data-event-id="${schedule.id}">
                    <span class="today-item-person" style="background: ${personColor};">${personName}</span>
                    <span class="today-item-time">${timeText}</span>
                    <span class="today-item-title">${schedule.title}</span>
                </div>
            `;
        }).join('');
        
        todaySummaryList.innerHTML = itemsHTML;
        
        // 클릭 이벤트 추가
        document.querySelectorAll('.today-item').forEach(item => {
            item.addEventListener('click', async () => {
                const eventId = item.dataset.eventId;
                const schedule = todaySchedules.find(s => s.id === eventId);
                if (schedule) {
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
        console.error('Error loading today summary:', error);
    }
}

// Export functions to window for use in other modules
window.showToast = showToast;
window.openEventModal = openEventModal;
window.loadTodaySummary = loadTodaySummary;

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
 * Update day of week display
 */
function updateDayOfWeekDisplay(dateInputId, daySpanId) {
    const dateInput = document.getElementById(dateInputId);
    const daySpan = document.getElementById(daySpanId);
    
    if (!dateInput || !daySpan || !dateInput.value) return;
    
    const date = new Date(dateInput.value);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[date.getDay()];
    daySpan.textContent = dayOfWeek;
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

