/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

// Global state
let currentEditingEvent = null;
let deleteRecurringOption = null; // 'single', 'all', or null

// DOM Elements - will be initialized after DOM loads
let eventModal;
let eventDetailModal;
let searchModal;
let settingsModal;
let deleteRecurringModal;
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
    deleteRecurringModal = document.getElementById('deleteRecurringModal');
    eventForm = document.getElementById('eventForm');
    loadingOverlay = document.getElementById('loadingOverlay');
    toast = document.getElementById('toast');
    
    console.log('📋 DOM Elements initialized:', {
        eventModal: !!eventModal,
        eventDetailModal: !!eventDetailModal,
        searchModal: !!searchModal,
        settingsModal: !!settingsModal,
        deleteRecurringModal: !!deleteRecurringModal,
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
    
    // Load Important Events and Today's Schedule Summary
    loadImportantEvents();
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
    
    // 반복 설정 이벤트 리스너
    const repeatSelect = document.getElementById('eventRepeat');
    const weeklyOptions = document.getElementById('weeklyOptions');
    const monthlyOptions = document.getElementById('monthlyOptions');
    
    if (repeatSelect) {
        repeatSelect.addEventListener('change', function() {
            const repeatValue = this.value;
            
            console.log('🔄 반복 설정 변경:', repeatValue);
            
            // 매주/매월 옵션 숨기기
            if (weeklyOptions) {
                weeklyOptions.style.display = 'none';
                console.log('  - weeklyOptions 숨김');
            }
            if (monthlyOptions) {
                monthlyOptions.style.display = 'none';
                console.log('  - monthlyOptions 숨김');
            }
            
            // 선택에 따라 옵션 표시
            if (repeatValue === 'weekly') {
                if (weeklyOptions) {
                    weeklyOptions.style.display = 'block';
                    console.log('  - weeklyOptions 표시');
                }
            } else if (repeatValue === 'monthly') {
                if (monthlyOptions) {
                    monthlyOptions.style.display = 'block';
                    console.log('  - monthlyOptions 표시');
                }
                // 매월 옵션의 라벨 업데이트
                updateMonthlyLabels();
            }
        });
        
        console.log('✅ 반복 설정 이벤트 리스너 등록 완료');
    } else {
        console.error('❌ repeatSelect 요소를 찾을 수 없음');
    }
    
    // 시작 날짜 변경 시 매월 옵션 라벨 업데이트
    const startDateInput = document.getElementById('eventStartDate');
    if (startDateInput) {
        startDateInput.addEventListener('change', updateMonthlyLabels);
    }
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
    
    // View switcher (both in toolbar and sidebar)
    document.querySelectorAll('.view-btn, .view-switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            changeCalendarView(view);
            
            // Update active state for sidebar buttons
            document.querySelectorAll('.view-switch-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.view-switch-btn[data-view="${view}"]`).forEach(b => b.classList.add('active'));
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
    
    if (deleteRecurringModal) {
        deleteRecurringModal.addEventListener('click', (e) => {
            if (e.target === deleteRecurringModal) closeDeleteRecurringModal();
        });
    }
    
    // Delete recurring event modal buttons
    const closeDeleteRecurringBtn = document.getElementById('closeDeleteRecurringBtn');
    const deleteSingleEventBtn = document.getElementById('deleteSingleEventBtn');
    const deleteAllEventsBtn = document.getElementById('deleteAllEventsBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    
    if (closeDeleteRecurringBtn) {
        closeDeleteRecurringBtn.addEventListener('click', closeDeleteRecurringModal);
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteRecurringModal);
    }
    if (deleteSingleEventBtn) {
        deleteSingleEventBtn.addEventListener('click', () => {
            console.log('🔵 Single delete button clicked');
            deleteRecurringOption = 'single';
            // 모달 닫기 (deleteRecurringOption 유지를 위해 직접 처리)
            if (deleteRecurringModal) {
                deleteRecurringModal.classList.remove('active');
            }
            executeDelete();
        });
    }
    if (deleteAllEventsBtn) {
        deleteAllEventsBtn.addEventListener('click', () => {
            console.log('🔴 All delete button clicked');
            deleteRecurringOption = 'all';
            // 모달 닫기 (deleteRecurringOption 유지를 위해 직접 처리)
            if (deleteRecurringModal) {
                deleteRecurringModal.classList.remove('active');
            }
            executeDelete();
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
        
        // 담당자 설정 (체크박스) - 모든 체크박스 초기화
        document.querySelectorAll('input[name="eventPerson"]').forEach(cb => cb.checked = false);
        
        if (event.extendedProps && event.extendedProps.persons) {
            // 복수 담당자
            const persons = event.extendedProps.persons;
            console.log('📋 Setting persons checkboxes:', persons);
            persons.forEach(person => {
                // person 값을 체크박스 ID로 변환: 'all' -> 'personAll', 'dad' -> 'personDad'
                const checkboxId = `person${person.charAt(0).toUpperCase() + person.slice(1)}`;
                const checkbox = document.getElementById(checkboxId);
                console.log(`  - Looking for checkbox: ${checkboxId}, found:`, !!checkbox);
                if (checkbox) {
                    checkbox.checked = true;
                    console.log(`  - Checked: ${checkboxId}`);
                }
            });
        } else if (event.extendedProps && event.extendedProps.person) {
            // 단일 담당자 (하위 호환성)
            const person = event.extendedProps.person;
            const checkboxId = `person${person.charAt(0).toUpperCase() + person.slice(1)}`;
            const checkbox = document.getElementById(checkboxId);
            console.log('📋 Setting single person checkbox:', checkboxId, 'found:', !!checkbox);
            if (checkbox) {
                checkbox.checked = true;
            }
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
            const repeatType = event.extendedProps.repeat_type || 'none';
            repeatSelect.value = repeatType;
            
            // 반복 옵션 표시 트리거
            const changeEvent = new Event('change');
            repeatSelect.dispatchEvent(changeEvent);
            
            // 매주 반복 - 요일 체크박스 설정
            if (repeatType === 'weekly' && event.extendedProps.repeat_weekdays) {
                const weekdays = event.extendedProps.repeat_weekdays;
                document.querySelectorAll('input[name="repeatWeekday"]').forEach(checkbox => {
                    checkbox.checked = weekdays.includes(parseInt(checkbox.value));
                });
            }
            
            // 매월 반복 - 옵션 설정
            if (repeatType === 'monthly' && event.extendedProps.repeat_monthly_type) {
                const monthlyType = event.extendedProps.repeat_monthly_type;
                document.querySelectorAll('input[name="monthlyType"]').forEach(radio => {
                    radio.checked = (radio.value === monthlyType);
                });
            }
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
    
    console.log('🔄 반복 설정 수집:');
    console.log('  - repeatType:', repeatType);
    console.log('  - repeatEndDate:', repeatEndDate);
    console.log('  - repeatEndDateInput.value:', repeatEndDateInput?.value);
    
    // 매주 반복 - 선택된 요일들
    let repeatWeekdays = [];
    if (repeatType === 'weekly') {
        const weekdayCheckboxes = document.querySelectorAll('input[name="repeatWeekday"]:checked');
        console.log('  - weekdayCheckboxes found:', weekdayCheckboxes.length);
        weekdayCheckboxes.forEach(checkbox => {
            repeatWeekdays.push(parseInt(checkbox.value));
        });
        
        // 요일이 선택되지 않았으면 시작 날짜의 요일로 설정
        if (repeatWeekdays.length === 0) {
            repeatWeekdays.push(startDateTime.getDay());
            console.log('  - No weekdays selected, using start date weekday:', startDateTime.getDay());
        }
        console.log('  - repeatWeekdays:', repeatWeekdays);
    }
    
    // 매월 반복 - 옵션 (dayOfMonth or dayOfWeek)
    let repeatMonthlyType = 'dayOfMonth';
    if (repeatType === 'monthly') {
        const monthlyTypeRadio = document.querySelector('input[name="monthlyType"]:checked');
        if (monthlyTypeRadio) {
            repeatMonthlyType = monthlyTypeRadio.value;
        }
        console.log('  - repeatMonthlyType:', repeatMonthlyType);
    }
    
    // 중요일정 설정
    const importantCheckbox = document.getElementById('eventImportant');
    const isImportant = importantCheckbox ? importantCheckbox.checked : false;
    console.log('⭐ 중요일정:', isImportant);
    
    try {
        showLoading(true);
        
        if (currentEditingEvent) {
            // Update existing event - 담당자 변경을 감지하여 일정 추가/삭제 처리
            console.log('📝 Updating existing event');
            
            // 기존 일정 정보 가져오기
            const originalTitle = currentEditingEvent.title;
            const originalStart = new Date(currentEditingEvent.start).toISOString();
            const originalEnd = new Date(currentEditingEvent.end).toISOString();
            const originalPersons = currentEditingEvent.extendedProps?.persons || [currentEditingEvent.extendedProps?.person || 'all'];
            
            console.log('📋 Original info:');
            console.log('  - title:', originalTitle);
            console.log('  - persons:', originalPersons);
            console.log('  - start:', originalStart);
            console.log('  - end:', originalEnd);
            
            console.log('📋 New info:');
            console.log('  - title:', title);
            console.log('  - persons:', selectedPersons);
            console.log('  - start:', startDateTime.toISOString());
            console.log('  - end:', endDateTime.toISOString());
            
            // 관련 일정 찾기 (같은 시간, 같은 제목의 다른 담당자 일정들)
            const relatedSchedules = await api.findRelatedSchedules(originalTitle, originalStart, originalEnd);
            console.log('🔗 Related schedules:', relatedSchedules.length);
            
            // 기존 담당자 목록 (관련 일정들에서 추출)
            const existingPersons = relatedSchedules.map(s => s.person);
            console.log('👥 Existing persons:', existingPersons);
            console.log('👥 New persons:', selectedPersons);
            
            // 담당자 변경 분석
            const personsToRemove = existingPersons.filter(p => !selectedPersons.includes(p));
            const personsToAdd = selectedPersons.filter(p => !existingPersons.includes(p));
            const personsToUpdate = selectedPersons.filter(p => existingPersons.includes(p));
            
            console.log('🔄 Changes:');
            console.log('  - To remove:', personsToRemove);
            console.log('  - To add:', personsToAdd);
            console.log('  - To update:', personsToUpdate);
            
            // 1. 제거된 담당자의 일정 삭제
            for (const person of personsToRemove) {
                const scheduleToDelete = relatedSchedules.find(s => s.person === person);
                if (scheduleToDelete) {
                    console.log(`🗑️ Deleting schedule for ${person}: ${scheduleToDelete.id}`);
                    await api.deleteSchedule(scheduleToDelete.id);
                }
            }
            
            // 2. 추가된 담당자에 대한 새 일정 생성
            for (const person of personsToAdd) {
                const scheduleData = {
                    title,
                    start_datetime: startDateTime.toISOString(),
                    end_datetime: endDateTime.toISOString(),
                    person: person,
                    persons: [person],
                    description: description || null,
                    kakao_notification_start: enableNotificationStart,
                    kakao_notification_end: enableNotificationEnd,
                    repeat_type: repeatType,
                    repeat_end_date: repeatEndDate,
                    repeat_weekdays: repeatWeekdays,
                    repeat_monthly_type: repeatMonthlyType,
                    is_important: isImportant
                };
                
                console.log(`➕ Creating new schedule for ${person}`);
                await api.createSchedule(scheduleData);
            }
            
            // 3. 유지되는 담당자의 일정 업데이트
            for (const person of personsToUpdate) {
                const scheduleToUpdate = relatedSchedules.find(s => s.person === person);
                if (scheduleToUpdate) {
                    const scheduleData = {
                        title,
                        start_datetime: startDateTime.toISOString(),
                        end_datetime: endDateTime.toISOString(),
                        person: person,
                        persons: [person],
                        description: description || null,
                        kakao_notification_start: enableNotificationStart,
                        kakao_notification_end: enableNotificationEnd,
                        repeat_type: repeatType,
                        repeat_end_date: repeatEndDate,
                        repeat_weekdays: repeatWeekdays,
                        repeat_monthly_type: repeatMonthlyType,
                        is_important: isImportant
                    };
                    
                    console.log(`🔄 Updating schedule for ${person}: ${scheduleToUpdate.id}`);
                    await api.updateSchedule(scheduleToUpdate.id, scheduleData);
                }
            }
            
            // 변경사항에 따른 토스트 메시지
            if (personsToRemove.length > 0 || personsToAdd.length > 0) {
                showToast(`일정이 수정되었습니다. (추가: ${personsToAdd.length}, 삭제: ${personsToRemove.length}, 수정: ${personsToUpdate.length})`, 'success');
            } else {
                showToast('일정이 수정되었습니다.', 'success');
            }
        } else {
            // Create new event - 복수 담당자 선택 시 각각 별도 일정 생성
            console.log('➕ Creating new event(s)');
            console.log('📋 Selected persons:', selectedPersons);
            
            // '전체' 선택 시 하나의 일정만 생성
            if (selectedPersons.includes('all')) {
                const scheduleData = {
                    title,
                    start_datetime: startDateTime.toISOString(),
                    end_datetime: endDateTime.toISOString(),
                    person: 'all',
                    persons: ['all'],
                    description: description || null,
                    kakao_notification_start: enableNotificationStart,
                    kakao_notification_end: enableNotificationEnd,
                    repeat_type: repeatType,
                    repeat_end_date: repeatEndDate,
                    repeat_weekdays: repeatWeekdays,
                    repeat_monthly_type: repeatMonthlyType,
                    is_important: isImportant
                };
                
                await api.createSchedule(scheduleData);
                showToast('일정이 추가되었습니다.', 'success');
            } else {
                // 복수 담당자 선택 시 각 담당자별로 별도 일정 생성
                for (const person of selectedPersons) {
                    const scheduleData = {
                        title,
                        start_datetime: startDateTime.toISOString(),
                        end_datetime: endDateTime.toISOString(),
                        person: person,
                        persons: [person],  // 단일 담당자로 설정
                        description: description || null,
                        kakao_notification_start: enableNotificationStart,
                        kakao_notification_end: enableNotificationEnd,
                        repeat_type: repeatType,
                        repeat_end_date: repeatEndDate,
                        repeat_weekdays: repeatWeekdays,
                        repeat_monthly_type: repeatMonthlyType,
                        is_important: isImportant
                    };
                    
                    console.log(`📋 Creating schedule for ${person}:`, scheduleData);
                    await api.createSchedule(scheduleData);
                }
                
                const personCount = selectedPersons.length;
                showToast(`${personCount}개의 일정이 추가되었습니다.`, 'success');
            }
        }
        
        // Refresh calendar, AI summary, important events, and today's summary
        calendarModule.refresh();
        loadAISummary();
        loadImportantEvents();
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
    
    // persons 배열 사용 (없으면 person 사용)
    const persons = event.extendedProps.persons || [event.extendedProps.person];
    const personNames = persons.map(p => window.PERSON_NAMES[p]).join(', ');
    
    // 카카오톡 알림 상태
    const kakaoNotificationStart = event.extendedProps.kakao_notification_start;
    const kakaoNotificationEnd = event.extendedProps.kakao_notification_end;
    const hasKakaoNotification = kakaoNotificationStart || kakaoNotificationEnd;
    
    let kakaoNotificationText = '';
    if (hasKakaoNotification) {
        const notifications = [];
        if (kakaoNotificationStart) notifications.push('시작 10분 전');
        if (kakaoNotificationEnd) notifications.push('종료 10분 전');
        kakaoNotificationText = notifications.join(', ');
    }
    
    // 반복 설정 텍스트
    let repeatText = '';
    if (event.extendedProps.repeat_type && event.extendedProps.repeat_type !== 'none') {
        const repeatTypeText = event.extendedProps.repeat_type === 'daily' ? '매일' : 
                               event.extendedProps.repeat_type === 'weekly' ? '매주' : 
                               event.extendedProps.repeat_type === 'monthly' ? '매월' : '';
        const endDateText = event.extendedProps.repeat_end_date ? 
                           ` (${formatDate(new Date(event.extendedProps.repeat_end_date))}까지)` : '';
        repeatText = repeatTypeText + endDateText;
    }
    
    detail.innerHTML = `
        <div class="event-detail-row">
            <span class="material-icons detail-icon">title</span>
            <span class="detail-content">${event.title}</span>
        </div>
        <div class="event-detail-row">
            <span class="material-icons detail-icon">event</span>
            <span class="detail-content">${formatDate(startDate)}</span>
        </div>
        <div class="event-detail-row">
            <span class="material-icons detail-icon">schedule</span>
            <span class="detail-content">${formatTime(startDate)}${endDate ? ' - ' + formatTime(endDate) : ''}</span>
        </div>
        <div class="event-detail-row">
            <span class="material-icons detail-icon">person</span>
            <span class="detail-content">${personNames}</span>
        </div>
        ${event.extendedProps.description ? `
        <div class="event-detail-row">
            <span class="material-icons detail-icon">subject</span>
            <span class="detail-content">${event.extendedProps.description}</span>
        </div>
        ` : ''}
        ${hasKakaoNotification ? `
        <div class="event-detail-row">
            <img src="icons/kakao-icon.svg" alt="카카오톡" class="kakao-icon-small">
            <span class="detail-content">${kakaoNotificationText}</span>
        </div>
        ` : ''}
        ${repeatText ? `
        <div class="event-detail-row">
            <span class="material-icons detail-icon">repeat</span>
            <span class="detail-content">${repeatText}</span>
        </div>
        ` : ''}
    `;
    
    currentEditingEvent = event;
    console.log('📝 currentEditingEvent set to:', currentEditingEvent);
    console.log('📋 currentEditingEvent.id:', currentEditingEvent.id);
    console.log('📋 currentEditingEvent.extendedProps:', currentEditingEvent.extendedProps);
    
    // 모달 활성화
    eventDetailModal.classList.add('active');
    
    // 디버깅: 버튼이 제대로 보이는지 확인
    setTimeout(() => {
        const editBtn = document.getElementById('editEventBtn');
        const deleteBtn = document.getElementById('deleteEventBtn');
        const modalActions = eventDetailModal.querySelector('.modal-actions');
        
        console.log('🔍 Button visibility check:');
        console.log('  - editEventBtn exists:', !!editBtn);
        console.log('  - deleteEventBtn exists:', !!deleteBtn);
        console.log('  - modal-actions exists:', !!modalActions);
        console.log('  - modal-actions display:', modalActions ? window.getComputedStyle(modalActions).display : 'N/A');
        console.log('  - editBtn display:', editBtn ? window.getComputedStyle(editBtn).display : 'N/A');
        console.log('  - deleteBtn display:', deleteBtn ? window.getComputedStyle(deleteBtn).display : 'N/A');
    }, 100);
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
function handleDeleteEvent() {
    console.log('🗑️ handleDeleteEvent called');
    console.log('  - currentEditingEvent:', currentEditingEvent);
    console.log('  - repeat_type:', currentEditingEvent?.extendedProps?.repeat_type);
    
    if (!currentEditingEvent) {
        console.error('❌ No currentEditingEvent');
        return;
    }
    
    const isRecurring = currentEditingEvent.extendedProps.repeat_type && 
                       currentEditingEvent.extendedProps.repeat_type !== 'none';
    
    console.log('  - isRecurring:', isRecurring);
    
    if (isRecurring) {
        // 반복 일정인 경우 모달 표시
        console.log('✅ Opening delete recurring modal');
        closeEventDetailModal();
        deleteRecurringOption = null;
        if (deleteRecurringModal) {
            deleteRecurringModal.classList.add('active');
            console.log('✅ Delete recurring modal opened');
        } else {
            console.error('❌ deleteRecurringModal not found');
        }
    } else {
        // 일반 일정인 경우 기존 확인
        console.log('✅ Non-recurring event - showing confirm dialog');
        if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) {
            return;
        }
        deleteRecurringOption = 'single';
        executeDelete();
    }
}

/**
 * Execute delete based on selected option
 */
async function executeDelete() {
    console.log('🗑️ executeDelete called');
    console.log('  - deleteRecurringOption:', deleteRecurringOption);
    console.log('  - currentEditingEvent:', currentEditingEvent);
    
    if (!deleteRecurringOption || !currentEditingEvent) {
        console.error('❌ Missing deleteRecurringOption or currentEditingEvent');
        return;
    }
    
    const isRecurring = currentEditingEvent.extendedProps.repeat_type && 
                       currentEditingEvent.extendedProps.repeat_type !== 'none';
    
    console.log('  - isRecurring:', isRecurring);
    console.log('  - repeat_type:', currentEditingEvent.extendedProps.repeat_type);
    
    try {
        showLoading(true);
        
        if (deleteRecurringOption === 'all') {
            // 모든 반복 일정 삭제 (원본 일정 삭제)
            // extendedProps.original_id를 우선 사용, 없으면 ID에서 추출
            const originalId = currentEditingEvent.extendedProps?.original_id 
                || (currentEditingEvent.id.includes('_') 
                    ? currentEditingEvent.id.split('_')[0] 
                    : currentEditingEvent.id);
            
            console.log('  - Deleting all recurring events');
            console.log('  - Original ID:', originalId);
            console.log('  - Current event ID:', currentEditingEvent.id);
            
            await api.deleteSchedule(originalId);
            showToast('모든 반복 일정이 삭제되었습니다.', 'success');
        } else {
            // 단일 일정 삭제
            if (isRecurring) {
                // 특정 날짜의 반복 일정만 제외
                // extendedProps.original_id를 우선 사용, 없으면 ID에서 추출
                const originalId = currentEditingEvent.extendedProps?.original_id 
                    || (currentEditingEvent.id.includes('_') 
                        ? currentEditingEvent.id.split('_')[0] 
                        : currentEditingEvent.id);
                
                const excludeDate = new Date(currentEditingEvent.start).toISOString().split('T')[0];
                
                console.log('  - Excluding single recurring event');
                console.log('  - Original ID:', originalId);
                console.log('  - Exclude date:', excludeDate);
                
                await api.addExcludeDate(originalId, excludeDate);
                showToast('해당 날짜의 일정이 삭제되었습니다.', 'success');
            } else {
                console.log('  - Deleting single non-recurring event');
                console.log('  - Event ID:', currentEditingEvent.id);
                
                // 반복 일정이 아닌 경우도 original_id 확인
                const eventId = currentEditingEvent.extendedProps?.original_id || currentEditingEvent.id;
                await api.deleteSchedule(eventId);
                showToast('일정이 삭제되었습니다.', 'success');
            }
        }
        
        calendarModule.refresh();
        loadAISummary();
        loadImportantEvents();
        loadTodaySummary();
        
        // 모달 닫기 (detail modal이 아직 열려있을 수 있음)
        closeEventDetailModal();
        closeDeleteRecurringModal();
        
        currentEditingEvent = null;
        deleteRecurringOption = null;
    } catch (error) {
        console.error('❌ Error deleting event:', error);
        showToast('일정 삭제에 실패했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Close delete recurring modal
 */
function closeDeleteRecurringModal() {
    if (deleteRecurringModal) {
        deleteRecurringModal.classList.remove('active');
    }
    deleteRecurringOption = null;
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
                            id: schedule.id,
                            original_id: schedule.id,  // 검색 결과는 원본 일정만 표시
                            description: schedule.description,
                            person: schedule.person,
                            persons: schedule.persons,
                            kakao_notification_start: schedule.kakao_notification_start || false,
                            kakao_notification_end: schedule.kakao_notification_end || false,
                            repeat_type: schedule.repeat_type || 'none',
                            repeat_end_date: schedule.repeat_end_date || null,
                            repeat_weekdays: schedule.repeat_weekdays || [],
                            repeat_monthly_type: schedule.repeat_monthly_type || 'dayOfMonth'
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
 * Load Important Events (D-day)
 */
async function loadImportantEvents() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 모든 일정 가져오기
        const schedules = await api.getSchedules({});
        
        // 중요일정만 필터링 (미래 일정만)
        const importantEvents = schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.start);
            scheduleDate.setHours(0, 0, 0, 0);
            return schedule.is_important && scheduleDate >= today;
        });
        
        // 날짜순 정렬
        importantEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        const importantEventsContainer = document.getElementById('importantEvents');
        const importantEventsList = document.getElementById('importantEventsList');
        
        if (!importantEventsContainer || !importantEventsList) return;
        
        if (importantEvents.length === 0) {
            importantEventsContainer.style.display = 'none';
            return;
        }
        
        // 중요일정 표시
        importantEventsContainer.style.display = 'block';
        
        const itemsHTML = importantEvents.map(schedule => {
            const scheduleDate = new Date(schedule.start);
            scheduleDate.setHours(0, 0, 0, 0);
            
            // D-day 계산
            const diffTime = scheduleDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let ddayText = '';
            let ddayClass = '';
            if (diffDays === 0) {
                ddayText = 'D-DAY';
                ddayClass = 'today';
            } else if (diffDays > 0) {
                ddayText = `D-${diffDays}`;
            }
            
            const startDate = new Date(schedule.start);
            const dateText = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일`;
            
            return `
                <div class="important-event-item" data-event-id="${schedule.id}">
                    <div class="important-event-dday ${ddayClass}">${ddayText}</div>
                    <div class="important-event-details">
                        <div class="important-event-title">${schedule.title}</div>
                        <div class="important-event-date">${dateText}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        importantEventsList.innerHTML = itemsHTML;
        
        // 클릭 이벤트 추가
        document.querySelectorAll('.important-event-item').forEach(item => {
            item.addEventListener('click', async () => {
                const eventId = item.dataset.eventId;
                const schedule = importantEvents.find(s => s.id === eventId);
                if (schedule) {
                    const event = {
                        id: schedule.id,
                        title: schedule.title,
                        start: schedule.start,
                        end: schedule.end,
                        extendedProps: {
                            id: schedule.id,
                            original_id: schedule.id,
                            description: schedule.description,
                            person: schedule.person,
                            persons: schedule.persons,
                            kakao_notification_start: schedule.kakao_notification_start || false,
                            kakao_notification_end: schedule.kakao_notification_end || false,
                            repeat_type: schedule.repeat_type || 'none',
                            repeat_end_date: schedule.repeat_end_date || null,
                            repeat_weekdays: schedule.repeat_weekdays || [],
                            repeat_monthly_type: schedule.repeat_monthly_type || 'dayOfMonth',
                            is_important: schedule.is_important || false
                        }
                    };
                    showEventDetail(event);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading important events:', error);
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
        
        // 모든 일정 가져오기 (반복 일정 포함)
        const schedules = await api.getSchedules({});
        
        // 반복 일정 확장
        const allEvents = [];
        schedules.forEach(schedule => {
            if (schedule.repeat_type && schedule.repeat_type !== 'none') {
                // 반복 일정 확장 (오늘 날짜 범위로)
                const expanded = expandRecurringEvent(schedule, todayStart, todayEnd);
                allEvents.push(...expanded);
            } else {
                allEvents.push(schedule);
            }
        });
        
        // 오늘 일정 필터링
        const todaySchedules = allEvents.filter(schedule => {
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
                            id: schedule.id,
                            original_id: schedule.id,  // 오늘의 일정도 원본 일정 기준
                            description: schedule.description,
                            person: schedule.person,
                            persons: schedule.persons,
                            kakao_notification_start: schedule.kakao_notification_start || false,
                            kakao_notification_end: schedule.kakao_notification_end || false,
                            repeat_type: schedule.repeat_type || 'none',
                            repeat_end_date: schedule.repeat_end_date || null,
                            repeat_weekdays: schedule.repeat_weekdays || [],
                            repeat_monthly_type: schedule.repeat_monthly_type || 'dayOfMonth'
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
 * Update monthly repeat option labels
 */
function updateMonthlyLabels() {
    const startDateInput = document.getElementById('eventStartDate');
    if (!startDateInput || !startDateInput.value) return;
    
    const date = new Date(startDateInput.value);
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    
    // 몇째 주인지 계산
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    const weekNames = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
    const weekName = weekNames[weekOfMonth - 1] || '마지막';
    
    // 라벨 업데이트
    const monthlyDayLabel = document.getElementById('monthlyDayLabel');
    const monthlyWeekLabel = document.getElementById('monthlyWeekLabel');
    
    if (monthlyDayLabel) {
        monthlyDayLabel.textContent = `매월 같은 날 (예: 매월 ${dayOfMonth}일)`;
    }
    
    if (monthlyWeekLabel) {
        monthlyWeekLabel.textContent = `매월 같은 주/요일 (예: ${weekName}주 ${days[dayOfWeek]})`;
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

/**
 * Initialize Today Summary Toggle
 */
function initTodaySummaryToggle() {
    const header = document.getElementById('todaySummaryHeader');
    const list = document.getElementById('todaySummaryList');
    const icon = document.getElementById('todayToggleIcon');
    
    if (!header || !list || !icon) return;
    
    // 기본적으로 숨김 상태 (로컬 스토리지에서 상태 확인)
    const savedState = localStorage.getItem('todaySummaryCollapsed');
    const isCollapsed = savedState === null ? true : savedState === 'true'; // 기본값 숨김
    if (isCollapsed) {
        list.classList.add('collapsed');
        icon.classList.add('collapsed');
    }
    
    header.addEventListener('click', () => {
        list.classList.toggle('collapsed');
        icon.classList.toggle('collapsed');
        
        // 상태 저장
        const collapsed = list.classList.contains('collapsed');
        localStorage.setItem('todaySummaryCollapsed', collapsed);
    });
}

// Make globals available
window.showEventDetail = showEventDetail;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.showLoading = showLoading;
window.showToast = showToast;

// Initialize today summary toggle after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTodaySummaryToggle();
});

