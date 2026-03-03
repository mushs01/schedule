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
let betaTestModal;
let deleteRecurringModal;
let eventForm;
let loadingOverlay;
let toast;

/**
 * Floating Action Button 설정
 */
function setupFloatingButton(btn) {
    // 담당자 순환 순서: 주환 -> 태환 -> 엄마 -> 아빠 -> 전체
    const personOrder = ['juhwan', 'taehwan', 'mom', 'dad', 'all'];
    let longPressTimer = null;
    let isLongPress = false;
    
    // 클릭 이벤트 (짧게 누르기 - 담당자 변경)
    btn.addEventListener('click', (e) => {
        if (!isLongPress) {
            const currentPerson = btn.getAttribute('data-person');
            const currentIndex = personOrder.indexOf(currentPerson);
            const nextIndex = (currentIndex + 1) % personOrder.length;
            const nextPerson = personOrder[nextIndex];
            
            btn.setAttribute('data-person', nextPerson);
        }
        isLongPress = false;
    });
    
    // 터치 시작 (모바일)
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isLongPress = false;
        btn.classList.add('long-pressing');
        
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            btn.classList.remove('long-pressing');
            openEventModalWithPerson(btn.getAttribute('data-person'));
        }, 500); // 500ms 길게 누르기
    });
    
    // 터치 끝 (모바일)
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearTimeout(longPressTimer);
        btn.classList.remove('long-pressing');
        
        if (!isLongPress) {
            // 짧게 누른 경우 - 클릭 이벤트가 처리
            btn.click();
        }
    });
    
    // 마우스 누르기 시작 (데스크톱)
    btn.addEventListener('mousedown', (e) => {
        isLongPress = false;
        btn.classList.add('long-pressing');
        
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            btn.classList.remove('long-pressing');
            openEventModalWithPerson(btn.getAttribute('data-person'));
        }, 500); // 500ms 길게 누르기
    });
    
    // 마우스 떼기 (데스크톱)
    btn.addEventListener('mouseup', (e) => {
        clearTimeout(longPressTimer);
        btn.classList.remove('long-pressing');
    });
    
    // 마우스 벗어남 (데스크톱)
    btn.addEventListener('mouseleave', (e) => {
        clearTimeout(longPressTimer);
        btn.classList.remove('long-pressing');
        isLongPress = false;
    });
}

/** 이미 연 일정 모달에서 담당자 체크만 설정 (기본 추가·AI 추가 공용) */
function setEventModalPerson(person) {
    if (!person) return;
    const personCheckboxes = {
        'all': document.getElementById('personAll'),
        'juhwan': document.getElementById('personJuhwan'),
        'taehwan': document.getElementById('personTaehwan'),
        'mom': document.getElementById('personMom'),
        'dad': document.getElementById('personDad')
    };
    Object.values(personCheckboxes).forEach(cb => { if (cb) cb.checked = false; });
    const p = String(person).toLowerCase().trim();
    if (personCheckboxes[p]) {
        personCheckboxes[p].checked = true;
        return;
    }
    // 한글/혼합 입력 대비: value로 매칭
    const byValue = document.querySelector(`input[name="eventPerson"][value="${p}"]`);
    if (byValue) {
        byValue.checked = true;
        return;
    }
    console.warn('setEventModalPerson: 담당자 매칭 실패, person=', person);
}

/**
 * 선택된 담당자로 일정 추가 모달 열기
 */
function openEventModalWithPerson(person) {
    openEventModal();
    setEventModalPerson(person);
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded - calendarModule:', window.calendarModule);
    
    // DOM 요소 먼저 초기화 (setupEventListeners에서 eventForm 등 사용)
    eventModal = document.getElementById('eventModal');
    eventDetailModal = document.getElementById('eventDetailModal');
    searchModal = document.getElementById('searchModal');
    settingsModal = document.getElementById('settingsModal');
    betaTestModal = document.getElementById('betaTestModal');
    deleteRecurringModal = document.getElementById('deleteRecurringModal');
    eventForm = document.getElementById('eventForm');
    loadingOverlay = document.getElementById('loadingOverlay');
    toast = document.getElementById('toast');
    
    // 메뉴·폼 등 리스너 등록 (캘린더 init 실패해도 동작하도록 try-catch)
    try {
        setupEventListeners();
    } catch (e) {
        console.error('❌ setupEventListeners failed:', e);
    }
    
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
    
    // Initialize calendar (try-catch: 실패해도 메뉴/UI는 동작하도록)
    try {
        if (window.calendarModule && typeof calendarModule.init === 'function') {
            calendarModule.init();
        } else {
            console.error('❌ calendarModule not found!');
        }
    } catch (e) {
        console.error('❌ Calendar init failed:', e);
        // 지연 후 재시도 (CDN/레이아웃 지연 대응)
        setTimeout(() => {
            try {
                if (window.calendarModule && typeof calendarModule.init === 'function') {
                    calendarModule.init();
                }
            } catch (e2) {
                console.error('❌ Calendar retry failed:', e2);
            }
        }, 500);
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
    
    // Setup person checkbox listeners
    setupPersonCheckboxListeners();
    
    // Setup date change listeners for day of week display
    setupDateChangeListeners();
    
    // Check API health
    checkAPIHealth();
    
    // Strava OAuth 콜백 (URL에 code 있을 때) - 비차단, 실패해도 앱 정상 실행
    const hadCode = !!new URLSearchParams(window.location.search).get('code');
    if (hadCode && window.stravaModule && typeof window.stravaModule.handleOAuthCallback === 'function') {
        if (window.showToast) window.showToast('Strava 연동 처리 중...', 'info');
        window.stravaModule.handleOAuthCallback()
            .then(ok => {
                if (ok && window.showToast) window.showToast('Strava 연동 완료', 'success');
                else if (!ok && window.showToast) window.showToast('Strava 연동 실패 (앱은 정상 사용 가능)', 'info');
                if (hadCode) setTimeout(() => openBetaTestModal(), 300);
            })
            .catch(e => {
                console.warn('Strava OAuth 오류:', e);
                window._stravaLastError = (e && e.message) || '알 수 없는 오류';
                if (window.showToast) window.showToast('Strava 연동 실패 (앱은 정상 사용 가능)', 'info');
                setTimeout(() => openBetaTestModal(), 300);
            });
    }
    
    window._stravaActivitiesByDate = window._stravaActivitiesByDate || {};
    
    // Strava 연동 유지: 앱 시작 시 토큰 사전 갱신 후 운동 기록 자동 로드
    (async () => {
        try {
            if (window.stravaModule && window.stravaModule.ensureConnectionAtStartup) {
                await window.stravaModule.ensureConnectionAtStartup();
                if (typeof updateStravaUI === 'function') updateStravaUI(); // 갱신 결과(만료 등) 즉시 반영
            }
            await new Promise(r => setTimeout(r, 2500)); // 초기화 대기
            const accounts = (window.stravaModule && window.stravaModule.getStoredAccounts) ? window.stravaModule.getStoredAccounts() : [];
            const hasValidAccount = accounts.some(a => !a.expired);
            if (window.stravaModule && window.stravaModule.isConnected && window.stravaModule.isConnected() && hasValidAccount) {
                handleStravaFetch(true);
            }
        } catch (e) {
            console.warn('Strava 자동 로드 오류 (무시됨):', e);
        }
    })();
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
    const repeatEndOptions = document.getElementById('repeatEndOptions');
    
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
            
            // 반복 종료일: 반복 안함일 때만 숨김
            if (repeatEndOptions) {
                repeatEndOptions.style.display = repeatValue === 'none' ? 'none' : 'flex';
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
        
        // 초기 상태 적용 (반복 안함 디폴트일 때 반복 종료일 숨김)
        repeatSelect.dispatchEvent(new Event('change'));
        
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
 * Setup date change listeners for day of week display and start→end sync
 */
function setupDateChangeListeners() {
    const startDateInput = document.getElementById('eventStartDate');
    const endDateInput = document.getElementById('eventEndDate');
    const startTimeInput = document.getElementById('eventStartTime');
    const endTimeInput = document.getElementById('eventEndTime');
    const startDaySpan = document.getElementById('startDayOfWeek');
    const endDaySpan = document.getElementById('endDayOfWeek');
    
    function updateDayOfWeek(dateInput, daySpan) {
        if (!dateInput || !daySpan || !dateInput.value) return;
        
        const date = new Date(dateInput.value);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[date.getDay()];
        daySpan.textContent = dayOfWeek;
    }
    
    if (startDateInput) {
        function syncEndDateFromStart() {
            if (startDaySpan) updateDayOfWeek(startDateInput, startDaySpan);
            if (endDateInput && startDateInput.value) {
                endDateInput.value = startDateInput.value;
                if (endDaySpan) updateDayOfWeek(endDateInput, endDaySpan);
                if (typeof updateDateTimeDisplays === 'function') updateDateTimeDisplays();
            }
        }
        startDateInput.addEventListener('change', syncEndDateFromStart);
        startDateInput.addEventListener('input', syncEndDateFromStart);
    }
    
    if (endDateInput && endDaySpan) {
        endDateInput.addEventListener('change', function() {
            updateDayOfWeek(endDateInput, endDaySpan);
        });
    }
    
    if (startTimeInput && endTimeInput) {
        function syncEndTimeFromStart() {
            if (startTimeInput.value) {
                endTimeInput.value = startTimeInput.value;
                if (typeof updateDateTimeDisplays === 'function') updateDateTimeDisplays();
            }
        }
        startTimeInput.addEventListener('change', syncEndTimeFromStart);
        startTimeInput.addEventListener('input', syncEndTimeFromStart);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Add event button - 클릭/길게 누르기 처리
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        setupFloatingButton(addEventBtn);
    }
    // AI FAB 말풍선 툴팁 (앱 켤 때마다 12초만 표시)
    const aiFabTooltip = document.getElementById('aiFabTooltip');
    let aiFabTooltipTimer = null;
    function dismissAiFabTooltip() {
        if (aiFabTooltip) aiFabTooltip.style.display = 'none';
        if (aiFabTooltipTimer) { clearTimeout(aiFabTooltipTimer); aiFabTooltipTimer = null; }
    }
    function maybeShowAiFabTooltip() {
        if (!aiFabTooltip) return;
        const fabGroup = document.getElementById('fabGroup');
        if (fabGroup && fabGroup.style.display !== 'none') {
            aiFabTooltip.style.display = 'block';
            if (aiFabTooltipTimer) clearTimeout(aiFabTooltipTimer);
            aiFabTooltipTimer = setTimeout(dismissAiFabTooltip, 12000);
        }
    }
    window.maybeShowAiFabTooltip = maybeShowAiFabTooltip;
    setTimeout(maybeShowAiFabTooltip, 800);

    // AI 일정 추가 FAB
    const aiAddEventBtn = document.getElementById('aiAddEventBtn');
    if (aiAddEventBtn) {
        const aiFabIcon = aiAddEventBtn.querySelector('.fab-ai-icon');
        const aiFabMic = aiAddEventBtn.querySelector('.fab-ai-mic');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition = null;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'ko-KR';
        }
        aiAddEventBtn.addEventListener('click', async () => {
            dismissAiFabTooltip();
            if (!window.naturalLanguageSchedule || !window.naturalLanguageSchedule.isConfigured()) {
                if (window.showToast) window.showToast('Gemini API 키를 설정해주세요. 베타테스트에서 API 키를 입력하고 저장하세요.', 'warning');
                return;
            }
            if (!recognition) {
                if (window.showToast) window.showToast('이 브라우저는 음성 인식을 지원하지 않습니다.', 'error');
                return;
            }
            if (aiAddEventBtn.classList.contains('recording') || aiAddEventBtn.classList.contains('loading')) return;
            aiAddEventBtn.classList.add('recording');
            if (aiFabIcon) aiFabIcon.style.display = 'none';
            if (aiFabMic) aiFabMic.style.display = '';
            if (window.showToast) window.showToast('말씀해 주세요...', 'info');
            recognition.onresult = async (e) => {
                const transcript = (e.results[0][0].transcript || '').trim();
                if (!transcript) {
                    aiAddEventBtn.classList.remove('recording');
                    if (aiFabIcon) aiFabIcon.style.display = '';
                    if (aiFabMic) aiFabMic.style.display = 'none';
                    if (window.showToast) window.showToast('음성이 인식되지 않았습니다.', 'warning');
                    return;
                }
                aiAddEventBtn.classList.remove('recording');
                aiAddEventBtn.classList.add('loading');
                if (aiFabIcon) aiFabIcon.style.display = '';
                if (aiFabMic) aiFabMic.style.display = 'none';
                if (window.showToast) window.showToast('일정 추출 중...', 'info');
                try {
                    const data = await window.naturalLanguageSchedule.extract(transcript);
                    const startDate = new Date(`${data.date}T${data.startTime}`);
                    const endDate = new Date(`${data.date}T${data.endTime}`);
                    openEventModal({ start: startDate, end: endDate }, null, { title: data.title, person: data.person });
                    if (window.showToast) window.showToast('AI 일정 추가 내용을 확인해 주세요', 'info');
                } catch (err) {
                    if (window.showToast) window.showToast(err.message || '추출 실패', 'error');
                } finally {
                    aiAddEventBtn.classList.remove('loading');
                }
            };
            recognition.onerror = (e) => {
                aiAddEventBtn.classList.remove('recording', 'loading');
                if (aiFabIcon) aiFabIcon.style.display = '';
                if (aiFabMic) aiFabMic.style.display = 'none';
                if (e.error !== 'aborted' && window.showToast) {
                    window.showToast(e.error === 'no-speech' ? '음성이 감지되지 않았습니다.' : '음성 인식 오류', 'error');
                }
            };
            recognition.onend = () => {
                if (!aiAddEventBtn.classList.contains('loading')) {
                    aiAddEventBtn.classList.remove('recording');
                    if (aiFabIcon) aiFabIcon.style.display = '';
                    if (aiFabMic) aiFabMic.style.display = 'none';
                }
            };
            try { recognition.start(); } catch (ex) {
                aiAddEventBtn.classList.remove('recording');
                if (aiFabIcon) aiFabIcon.style.display = '';
                if (aiFabMic) aiFabMic.style.display = 'none';
                if (window.showToast) window.showToast('음성 인식 시작 실패', 'error');
            }
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

    // 날짜/시간 가로 배치 + 휠 피커 초기화
    initDateTimeWheel();
    
    // Event detail actions
    const editEventBtn = document.getElementById('editEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    
    if (editEventBtn) editEventBtn.addEventListener('click', handleEditEvent);
    if (deleteEventBtn) deleteEventBtn.addEventListener('click', handleDeleteEvent);
    
    // View switcher (both in toolbar and sidebar)
    document.querySelectorAll('.view-btn, .view-switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            const mode = e.currentTarget.dataset.mode;
            if (mode === 'exercise') {
                showExerciseView();
            } else if (view) {
                showScheduleView();
                changeCalendarView(view);
            }
            
            document.querySelectorAll('.view-switch-btn').forEach(b => b.classList.remove('active'));
            if (mode === 'exercise') {
                document.getElementById('exerciseRecordBtn')?.classList.add('active');
            } else {
                document.querySelectorAll(`.view-switch-btn[data-view="${view}"]`).forEach(b => b.classList.add('active'));
            }
            
            const sidebar = document.querySelector('.gcal-sidebar');
            if (sidebar) {
                if (window.innerWidth <= 768) sidebar.classList.remove('show');
                else sidebar.classList.add('hidden');
            }
        });
    });
    
    // 헤더 일정관리/운동관리 토글
    document.querySelectorAll('.header-mode-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            document.querySelectorAll('.header-mode-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (mode === 'exercise') {
                showExerciseView();
            } else {
                showScheduleView();
            }
            const sidebar = document.querySelector('.gcal-sidebar');
            if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('show');
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
    
    // Hamburger menu button (사이드바 토글)
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.querySelector('.gcal-sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🍔 Menu button clicked');
            
            // 모바일: show 토글, 데스크톱: hidden 토글
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('show');
            } else {
                sidebar.classList.toggle('hidden');
            }
            console.log('🍔 Sidebar toggled, classes:', sidebar.className);
        });
        
        // 사이드바 외부 클릭 시 닫기 (모바일만)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('show') && 
                !sidebar.contains(e.target) && 
                !menuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }
    
    // Person filter buttons (헤더) - 일정관리/운동일정 공통
    const personFilterBtns = document.querySelectorAll('.person-filter-btn');
    personFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const person = btn.dataset.person;
            const exerciseArea = document.getElementById('exerciseArea');
            const isExerciseView = exerciseArea && exerciseArea.style.display !== 'none';
            if (btn.closest('.exercise-person-filter')) return;
            btn.classList.toggle('active');
            if (isExerciseView) {
                renderExerciseCalendar();
            } else {
                updateCalendarFilterFromButtons();
            }
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
        const exerciseArea = document.getElementById('exerciseArea');
        if (exerciseArea && exerciseArea.style.display !== 'none') {
            exerciseCalendarCurrentDate = new Date();
            renderExerciseCalendar();
        }
    });

    if (prevViewBtn) prevViewBtn.addEventListener('click', () => {
        const exerciseArea = document.getElementById('exerciseArea');
        if (exerciseArea && exerciseArea.style.display !== 'none') {
            if (window.calendarModule && window.calendarModule.navigatePrevMonth) {
                window.calendarModule.navigatePrevMonth();
            }
            renderExerciseCalendar();
        } else if (window.calendarModule && window.calendarModule.navigatePrev) {
            window.calendarModule.navigatePrev();
        }
    });

    if (nextViewBtn) nextViewBtn.addEventListener('click', () => {
        const exerciseArea = document.getElementById('exerciseArea');
        if (exerciseArea && exerciseArea.style.display !== 'none') {
            if (window.calendarModule && window.calendarModule.navigateNextMonth) {
                window.calendarModule.navigateNextMonth();
            }
            renderExerciseCalendar();
        } else if (window.calendarModule && window.calendarModule.navigateNext) {
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
    
    // Beta Test functionality
    const betaTestBtn = document.getElementById('betaTestBtn');
    const closeBetaTestBtn = document.getElementById('closeBetaTestBtn');
    const stravaConnectBtn = document.getElementById('stravaConnectBtn');
    const stravaFetchBtn = document.getElementById('stravaFetchBtn');
    const stravaDisconnectBtn = document.getElementById('stravaDisconnectBtn');
    
    if (betaTestBtn) {
        betaTestBtn.addEventListener('click', openBetaTestModal);
    }
    if (closeBetaTestBtn) {
        closeBetaTestBtn.addEventListener('click', closeBetaTestModal);
    }
    const closeExerciseDetailBtn = document.getElementById('closeExerciseDetailBtn');
    document.getElementById('exercisePersonFilter')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.person-filter-btn');
        if (btn && !btn.disabled) {
            btn.classList.toggle('active');
            renderExerciseCalendar();
        }
    });
    const exerciseSwipeArea = document.getElementById('exerciseArea');
    if (exerciseSwipeArea) {
        let touchStartX = 0, touchStartY = 0;
        exerciseSwipeArea.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        exerciseSwipeArea.addEventListener('touchmove', e => {
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 30 && dx > dy * 1.5) {
                e.preventDefault();
            }
        }, { passive: false });
        exerciseSwipeArea.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchStartX - touchEndX;
            const diffY = Math.abs(touchStartY - touchEndY);
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > diffY && window.calendarModule) {
                if (diffX > 0) window.calendarModule.navigateNextMonth();
                else window.calendarModule.navigatePrevMonth();
                renderExerciseCalendar();
            }
        }, { passive: true });
        let mouseStartX = 0;
        exerciseSwipeArea.addEventListener('mousedown', e => { mouseStartX = e.clientX; });
        exerciseSwipeArea.addEventListener('mouseup', e => {
            const diff = mouseStartX - e.clientX;
            if (Math.abs(diff) > 40 && window.calendarModule) {
                if (diff > 0) window.calendarModule.navigateNextMonth();
                else window.calendarModule.navigatePrevMonth();
                renderExerciseCalendar();
            }
        });
    }
    function closeExerciseDetailModal() {
        const modal = document.getElementById('exerciseDetailModal');
        if (modal) modal.classList.remove('active');
        _exerciseDetailMaps.forEach(m => { try { m.remove(); } catch (_) {} });
        _exerciseDetailMaps = [];
    }
    if (closeExerciseDetailBtn) closeExerciseDetailBtn.addEventListener('click', closeExerciseDetailModal);
    const exerciseDetailModal = document.getElementById('exerciseDetailModal');
    if (exerciseDetailModal) {
        exerciseDetailModal.addEventListener('click', (e) => {
            if (e.target === exerciseDetailModal) closeExerciseDetailModal();
            if (e.target.closest('.exercise-more-btn')) handleExerciseMoreClick(e);
        });
    }
    if (stravaConnectBtn) {
        stravaConnectBtn.addEventListener('click', () => {
            try {
                if (window.stravaModule && typeof window.stravaModule.connect === 'function') {
                    window.stravaModule.connect();
                } else {
                    if (window.showToast) window.showToast('Strava 연동 모듈을 불러올 수 없습니다. (베타 기능)', 'error');
                }
            } catch (e) {
                console.warn('Strava 연결 중 오류 (무시됨):', e);
                if (window.showToast) window.showToast('Strava 연결 중 오류가 발생했습니다.', 'error');
            }
        });
    }
    var _stravaAddAccountLastRun = 0;
    function handleStravaAddAccount() {
        var now = Date.now();
        if (now - _stravaAddAccountLastRun < 800) return;
        _stravaAddAccountLastRun = now;
        try {
            var accounts = (window.stravaModule && window.stravaModule.getStoredAccounts) ? window.stravaModule.getStoredAccounts() : [];
            var useLogoutFirst = accounts.length >= 1;
            if (useLogoutFirst && typeof window.stravaModule.connectForAddAccount === 'function') {
                window.stravaModule.connectForAddAccount();
            } else if (window.stravaModule && typeof window.stravaModule.connect === 'function') {
                window.stravaModule.connect();
            } else {
                if (window.showToast) window.showToast('Strava 연동 모듈을 불러올 수 없습니다.', 'error');
            }
        } catch (e) {
            console.warn('Strava 계정 추가 중 오류 (무시됨):', e);
            if (window.showToast) window.showToast('Strava 계정 추가 중 오류가 발생했습니다.', 'error');
        }
    }
    // Strava 계정 추가: 이벤트 위임 + touchend (모바일에서 버튼 click만으로는 반응 없는 경우 대응)
    const stravaConnectSection = document.getElementById('stravaConnectSection');
    if (stravaConnectSection) {
        stravaConnectSection.addEventListener('click', (e) => {
            var addBtn = e.target.closest && e.target.closest('#stravaAddAccountBtn');
            var disconnectBtn = e.target.closest && e.target.closest('.strava-disconnect-one');
            if (addBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleStravaAddAccount();
            } else if (disconnectBtn) {
                e.preventDefault();
                e.stopPropagation();
                var aid = disconnectBtn.getAttribute('data-athlete-id');
                if (aid != null && window.stravaModule && typeof window.stravaModule.disconnectAccount === 'function') {
                    window.stravaModule.disconnectAccount(aid);
                    setStravaPersonMapping(aid, null);
                    updateStravaUI();
                }
            }
        });
        stravaConnectSection.addEventListener('touchend', (e) => {
            var addBtn = e.target.closest && e.target.closest('#stravaAddAccountBtn');
            var disconnectBtn = e.target.closest && e.target.closest('.strava-disconnect-one');
            if (addBtn) {
                e.preventDefault();
                e.stopPropagation();
                handleStravaAddAccount();
            } else if (disconnectBtn) {
                e.preventDefault();
                e.stopPropagation();
                var aid = disconnectBtn.getAttribute('data-athlete-id');
                if (aid != null && window.stravaModule && typeof window.stravaModule.disconnectAccount === 'function') {
                    window.stravaModule.disconnectAccount(aid);
                    setStravaPersonMapping(aid, null);
                    updateStravaUI();
                }
            }
        }, { passive: false });
        stravaConnectSection.addEventListener('change', (e) => {
            var sel = e.target.closest && e.target.closest('.strava-person-select');
            if (sel) {
                var aid = sel.getAttribute('data-athlete-id');
                var person = sel.value;
                if (aid != null && person) {
                    setStravaPersonMapping(aid, person);
                    if (reapplyStravaPersonMapping() && window.renderExerciseCalendar) window.renderExerciseCalendar();
                    updateStravaUI();
                    if (window.showToast) window.showToast('표시가 ' + ((window.PERSON_NAMES && window.PERSON_NAMES[person]) || person) + '로 변경되었습니다.', 'info');
                }
            }
        });
    }
    if (stravaFetchBtn) {
        stravaFetchBtn.addEventListener('click', () => {
            try {
                handleStravaFetch();
            } catch (e) {
                console.warn('Strava 데이터 가져오기 중 오류 (무시됨):', e);
            }
        });
    }
    if (stravaDisconnectBtn) {
        stravaDisconnectBtn.addEventListener('click', () => {
            try {
                if (window.stravaModule && typeof window.stravaModule.disconnect === 'function') {
                    window.stravaModule.disconnect();
                    updateStravaUI();
                }
            } catch (e) {
                console.warn('Strava 연동 해제 중 오류 (무시됨):', e);
            }
        });
    }
    
    document.querySelectorAll('#stravaRefreshStatusBtn, #stravaRefreshStatusBtnNotConnected').forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            updateStravaUI();
            const debug = getStravaDebugInfo();
            if (window.showToast) window.showToast(debug.msg, debug.isConnected ? 'success' : 'info');
        });
    });
    
    const stravaOpenInBrowserBtn = document.getElementById('stravaOpenInBrowserBtn');
    if (stravaOpenInBrowserBtn) {
        stravaOpenInBrowserBtn.addEventListener('click', () => {
            window.open('https://mushs01.github.io/schedule/', '_blank', 'noopener');
            if (window.showToast) window.showToast('브라우저에서 열었습니다. Strava 연결을 진행해주세요.', 'info');
        });
    }
    const stravaOpenInBrowserForAdd = document.getElementById('stravaOpenInBrowserForAdd');
    if (stravaOpenInBrowserForAdd) {
        stravaOpenInBrowserForAdd.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://mushs01.github.io/schedule/', '_blank', 'noopener');
            if (window.showToast) window.showToast('브라우저에서 열었습니다. 베타테스트 → Strava 계정 추가를 진행해주세요.', 'info');
        });
    }

    // 자연어 일정관리 (베타) - API 키 저장/로드
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const geminiApiKeySaveBtn = document.getElementById('geminiApiKeySaveBtn');
    const geminiApiKeyStatus = document.getElementById('geminiApiKeyStatus');
    function updateGeminiApiKeyUI() {
        if (!geminiApiKeyStatus) return;
        const key = typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
        geminiApiKeyStatus.textContent = key ? '✓ API 키가 저장되어 있습니다 (이 기기에서만 사용)' : 'API 키를 입력하고 저장 버튼을 누르세요.';
        if (geminiApiKeyInput && !geminiApiKeyInput.value) geminiApiKeyInput.placeholder = key ? '새 키로 변경하려면 입력 후 저장' : 'API 키를 붙여넣기 한 뒤 저장을 누르세요';
    }
    if (geminiApiKeySaveBtn && geminiApiKeyInput) {
        geminiApiKeySaveBtn.addEventListener('click', () => {
            const val = (geminiApiKeyInput.value || '').trim();
            if (val) {
                try {
                    localStorage.setItem('gemini_api_key', val);
                    window.GEMINI_CONFIG = window.GEMINI_CONFIG || {};
                    window.GEMINI_CONFIG.apiKey = val;
                    geminiApiKeyInput.value = '';
                    updateGeminiApiKeyUI();
                    if (window.showToast) window.showToast('API 키가 저장되었습니다.', 'success');
                } catch (e) {
                    if (window.showToast) window.showToast('저장 실패 (localStorage 접근 불가)', 'error');
                }
            } else {
                try {
                    localStorage.removeItem('gemini_api_key');
                    if (window.GEMINI_CONFIG) delete window.GEMINI_CONFIG.apiKey;
                    updateGeminiApiKeyUI();
                    if (window.showToast) window.showToast('API 키를 삭제했습니다.', 'info');
                } catch (e) {}
            }
        });
    }
    if (typeof updateGeminiApiKeyUI === 'function') window.updateGeminiApiKeyUI = updateGeminiApiKeyUI;

    // 자연어 일정관리 (베타) - 음성 입력
    let _nlExtractedData = null;
    const nlInput = document.getElementById('nlScheduleInput');
    const nlExtractBtn = document.getElementById('nlScheduleExtractBtn');
    const nlMicBtn = document.getElementById('nlScheduleMicBtn');
    const nlMicIcon = document.getElementById('nlScheduleMicIcon');
    const nlResult = document.getElementById('nlScheduleResult');
    const nlResultContent = document.getElementById('nlScheduleResultContent');
    const nlAddBtn = document.getElementById('nlScheduleAddBtn');
    const nlError = document.getElementById('nlScheduleError');
    if (nlMicBtn && nlInput) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition = null;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'ko-KR';
            recognition.onresult = (e) => {
                const transcript = (e.results[0][0].transcript || '').trim();
                if (transcript) {
                    nlInput.value = transcript;
                    nlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    if (nlError) nlError.style.display = 'none';
                    if (window.showToast) window.showToast('음성 인식 완료. 필드 추출을 눌러주세요.', 'success');
                }
            };
            recognition.onerror = (e) => {
                if (e.error !== 'aborted' && window.showToast) {
                    window.showToast(e.error === 'no-speech' ? '음성이 감지되지 않았습니다.' : '음성 인식 오류', 'error');
                }
            };
            recognition.onend = () => {
                if (nlMicIcon) nlMicIcon.textContent = 'mic';
                nlMicBtn?.classList.remove('recording');
            };
        }
        nlMicBtn.addEventListener('click', () => {
            if (!recognition) {
                if (window.showToast) window.showToast('이 브라우저는 음성 인식을 지원하지 않습니다.', 'error');
                return;
            }
            if (nlMicBtn.classList.contains('recording')) {
                recognition.stop();
                return;
            }
            try {
                recognition.start();
                if (nlMicIcon) nlMicIcon.textContent = 'mic';
                nlMicBtn.classList.add('recording');
                if (window.showToast) window.showToast('말씀해 주세요...', 'info');
            } catch (e) {
                if (window.showToast) window.showToast('음성 인식 시작 실패', 'error');
            }
        });
    }

    if (nlExtractBtn && nlInput) {
        nlExtractBtn.addEventListener('click', async () => {
            const text = (nlInput.value || '').trim();
            if (!text) {
                if (window.showToast) window.showToast('일정을 자연어로 입력해주세요.', 'warning');
                return;
            }
            if (!window.naturalLanguageSchedule || !window.naturalLanguageSchedule.isConfigured()) {
                if (nlError) {
                    nlError.textContent = 'Gemini API 키를 입력하고 저장해주세요. 위 링크에서 무료 발급 후 입력란에 붙여넣기 하세요.';
                    nlError.style.display = 'block';
                }
                return;
            }
            if (nlError) nlError.style.display = 'none';
            nlExtractBtn.disabled = true;
            nlExtractBtn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></span> 추출 중...';
            try {
                const data = await window.naturalLanguageSchedule.extract(text);
                const startDate = new Date(`${data.date}T${data.startTime}`);
                const endDate = new Date(`${data.date}T${data.endTime}`);
                closeBetaTestModal();
                openEventModal({ start: startDate, end: endDate }, null, { title: data.title, person: data.person });
                if (window.showToast) window.showToast('AI 일정 추가 내용을 확인해 주세요', 'info');
            } catch (e) {
                console.error('자연어 추출 실패:', e);
                if (nlError) {
                    nlError.textContent = e.message || '추출 실패';
                    nlError.style.display = 'block';
                }
                if (window.showToast) window.showToast(e.message || '추출 실패', 'error');
            } finally {
                nlExtractBtn.disabled = false;
                nlExtractBtn.innerHTML = '<span class="material-icons">auto_awesome</span> 필드 추출';
            }
        });
    }
    if (nlAddBtn) {
        nlAddBtn.addEventListener('click', async () => {
            if (!_nlExtractedData) return;
            const d = _nlExtractedData;
            const startDateTime = new Date(`${d.date}T${d.startTime}`);
            const endDateTime = new Date(`${d.date}T${d.endTime}`);
            const scheduleData = {
                title: d.title,
                person: d.person,
                persons: [d.person],
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                repeat_type: 'none',
                notification_start: false,
                notification_end: false
            };
            try {
                // 해당 사람의 해당 날짜 일정과 겹치는지 확인
                const existing = await window.api.getSchedules({
                    person: d.person,
                    startDate: d.date,
                    endDate: d.date
                });
                const newStart = startDateTime.getTime();
                const newEnd = endDateTime.getTime();
                const overlaps = existing.filter(s => {
                    if (s.repeat_type && s.repeat_type !== 'none') return false; // 반복 일정은 단순 비교 생략
                    const sStart = new Date(s.start).getTime();
                    const sEnd = s.end ? new Date(s.end).getTime() : sStart + 60 * 60 * 1000; // end 없으면 1시간
                    return newStart < sEnd && sStart < newEnd;
                });
                if (overlaps.length > 0) {
                    const names = window.PERSON_NAMES || {};
                    const personName = names[d.person] || d.person;
                    const list = overlaps.map(o => `"${o.title}" (${o.start ? new Date(o.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''})`).join(', ');
                    const msg = `${personName}의 해당 시간에 이미 일정이 있습니다:\n${list}\n\n그래도 추가하시겠습니까?`;
                    if (!confirm(msg)) return;
                }
                showLoading(true);
                await window.api.createSchedule(scheduleData);
                if (window.showToast) window.showToast('일정이 추가되었습니다.', 'success');
                closeBetaTestModal();
                if (window.calendarModule && window.calendarModule.refetchEvents) window.calendarModule.refetchEvents();
            } catch (e) {
                console.error('일정 추가 실패:', e);
                if (window.showToast) window.showToast('일정 추가 실패: ' + (e.message || '오류'), 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Settings functionality
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const selectMomBtn = document.getElementById('selectMomBtn');
    const selectDadBtn = document.getElementById('selectDadBtn');
    const enableNotificationBtn = document.getElementById('enableNotificationBtn');
    const disableNotificationBtn = document.getElementById('disableNotificationBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
        console.log('✅ Settings button listener added');
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        console.log('✅ Close settings button listener added');
    }
    
    // User selection buttons
    if (selectMomBtn) selectMomBtn.addEventListener('click', () => {
        if (window.fcmNotification) {
            window.fcmNotification.selectUser('mom');
        }
    });
    
    if (selectDadBtn) selectDadBtn.addEventListener('click', () => {
        if (window.fcmNotification) {
            window.fcmNotification.selectUser('dad');
        }
    });
    
    if (enableNotificationBtn) enableNotificationBtn.addEventListener('click', async () => {
        if (window.fcmNotification) {
            try {
                await window.fcmNotification.requestPermission();
            } catch (e) {
                console.error('알림 활성화 실패:', e);
                if (typeof showToast === 'function') showToast('알림 설정 중 오류가 발생했습니다.', 'error');
                if (window.fcmNotification.updateUI) window.fcmNotification.updateUI();
            }
        } else {
            if (typeof showToast === 'function') showToast('알림 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
        }
    });
    
    if (disableNotificationBtn) disableNotificationBtn.addEventListener('click', () => {
        if (window.fcmNotification) {
            window.fcmNotification.disable();
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
    
    if (betaTestModal) {
        betaTestModal.addEventListener('click', (e) => {
            if (e.target === betaTestModal) closeBetaTestModal();
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
 * Update notification UI based on FCM status
 */
function updateNotificationUI(isEnabled) {
    const checkboxes = document.getElementById('notificationCheckboxes');
    const message = document.getElementById('notificationMessage');
    
    // Check if notification is enabled (parameter passed from FCM module)
    const enabled = isEnabled !== undefined ? isEnabled : window.fcmNotification?.isEnabled();
    
    if (enabled) {
        // Show checkboxes
        if (checkboxes) checkboxes.style.display = 'flex';
        if (message) message.style.display = 'none';
    } else {
        // Show message
        if (checkboxes) checkboxes.style.display = 'none';
        if (message) message.style.display = 'block';
    }
}

/**
 * Open event modal for creating/editing
 * @param {Object} dateInfo - { start, end } for create mode
 * @param {Object} event - FullCalendar event for edit mode (null = create)
 * @param {Object} aiPrefill - { title, person } for AI-extracted data prefill (create mode only)
 */
function openEventModal(dateInfo = null, event = null, aiPrefill = null) {
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
    
    // Update notification UI based on FCM status
    updateNotificationUI();
    
    // Reset form
    eventForm.reset();
    
    // 새 일정 추가 시 알림 기본값 OFF (reset 직후 적용)
    const notificationStartField = document.getElementById('eventNotificationStart');
    const notificationEndField = document.getElementById('eventNotificationEnd');
    if (!event && notificationStartField) notificationStartField.checked = false;
    if (!event && notificationEndField) notificationEndField.checked = false;
    
    if (event) {
        // Editing mode - 기존 일정 수정
        console.log('✏️ Edit mode - event:', event);
        console.log('📋 Event ID:', event.id || event.extendedProps?.id);
        console.log('📋 Event extendedProps:', event.extendedProps);
        document.getElementById('eventTitle').placeholder = '일정 제목을 입력하세요';
        
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
        
        updateDateTimeDisplays();
        
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
        
        // 푸시 알림 설정 로드
        const notificationStartField = document.getElementById('eventNotificationStart');
        const notificationEndField = document.getElementById('eventNotificationEnd');
        
        if (notificationStartField && notificationEndField) {
            console.log('🔔 [수정 모드] 알림 설정 로드 시작');
            console.log('  - Event ID:', event.id);
            console.log('  - Event title:', event.title);
            console.log('  - extendedProps:', event.extendedProps);
            
            // 반복 일정인 경우 원본 일정에서 로드
            const originalId = event.extendedProps?.original_id;
            
            if (originalId) {
                console.log('  - 🔄 반복 일정 감지! 원본 ID:', originalId);
                console.log('  - 원본 일정에서 알림 설정을 로드합니다...');
                
                // 원본 일정에서 알림 설정 가져오기 (비동기)
                window.api.getSchedule(originalId).then(originalSchedule => {
                    if (originalSchedule) {
                        console.log('  - ✅ 원본 일정 로드 완료:', originalSchedule);
                        console.log('  - notification_start:', originalSchedule.notification_start);
                        console.log('  - notification_end:', originalSchedule.notification_end);
                        
                        notificationStartField.checked = originalSchedule.notification_start === true;
                        notificationEndField.checked = originalSchedule.notification_end === true;
                        
                        console.log('  - ✅ 체크박스 설정 완료');
                        console.log('    - Start:', notificationStartField.checked);
                        console.log('    - End:', notificationEndField.checked);
                    } else {
                        console.warn('  - ⚠️ 원본 일정을 찾을 수 없음, 현재 값 사용');
                        notificationStartField.checked = event.extendedProps.notification_start === true;
                        notificationEndField.checked = event.extendedProps.notification_end === true;
                    }
                }).catch(error => {
                    console.error('  - ❌ 원본 일정 로드 실패:', error);
                    // 오류 시 현재 인스턴스의 값 사용
                    notificationStartField.checked = event.extendedProps.notification_start === true;
                    notificationEndField.checked = event.extendedProps.notification_end === true;
                });
            } else {
                // 일반 일정 (반복 아님) - Firestore에서 최신 데이터 로드 (저장된 값 정확히 반영)
                const scheduleId = event.extendedProps?.id || event.id;
                console.log('  - 📝 일반 일정, Firestore 최신 데이터 로드, ID:', scheduleId);
                
                if (scheduleId && window.api && typeof window.api.getSchedule === 'function') {
                    window.api.getSchedule(scheduleId).then(schedule => {
                        if (schedule) {
                            notificationStartField.checked = schedule.notification_start === true;
                            notificationEndField.checked = schedule.notification_end === true;
                            console.log('  - ✅ Firestore 최신 데이터 적용:', { notification_start: schedule.notification_start, notification_end: schedule.notification_end });
                        } else {
                            notificationStartField.checked = event.extendedProps.notification_start === true;
                            notificationEndField.checked = event.extendedProps.notification_end === true;
                        }
                    }).catch(() => {
                        notificationStartField.checked = event.extendedProps.notification_start === true;
                        notificationEndField.checked = event.extendedProps.notification_end === true;
                    });
                } else {
                    notificationStartField.checked = event.extendedProps.notification_start === true;
                    notificationEndField.checked = event.extendedProps.notification_end === true;
                }
            }
        } else {
            console.log('  - ⚠️ 알림 체크박스를 찾을 수 없음 (FCM 비활성화?)');
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
        
        // 중요일정 설정
        const importantCheckbox = document.getElementById('eventImportant');
        if (importantCheckbox && event.extendedProps) {
            importantCheckbox.checked = event.extendedProps.is_important === true;
            console.log('⭐ Important event checkbox set to:', importantCheckbox.checked);
        }
        
        console.log('Form filled with event data');
    } else {
        // Creating mode - 새 일정 추가
        console.log('Create mode - dateInfo:', dateInfo);
        document.getElementById('eventTitle').placeholder = '일정 제목을 입력하세요';
        
        // (알림 기본값 OFF는 reset 직후 상단에서 이미 적용됨)
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
                const endDateStr = formatDateInput(endDate);
                const endTimeStr = formatTimeInput(endDate);
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                console.log('🎯 드래그 선택 - 종료 날짜/시간:', endDateStr, endTimeStr);
            } else {
                const defaultEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                const endDateStr = formatDateInput(defaultEndDate);
                const endTimeStr = formatTimeInput(defaultEndDate);
                document.getElementById('eventEndDate').value = endDateStr;
                document.getElementById('eventEndTime').value = endTimeStr;
                console.log('👆 클릭 선택 - 종료 시간 +1시간:', endDateStr, endTimeStr);
            }
        } else {
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            document.getElementById('eventStartDate').value = formatDateInput(now);
            document.getElementById('eventStartTime').value = formatTimeInput(now);
            document.getElementById('eventEndDate').value = formatDateInput(oneHourLater);
            document.getElementById('eventEndTime').value = formatTimeInput(oneHourLater);
            console.log('📅 기본값 사용 (현재 시간)');
        }
    }
    // AI 추출 데이터로 미리 채우기 (수동 추가와 동일 - 제목·담당자 동기 설정)
    if (!event && aiPrefill) {
        if (aiPrefill.title) document.getElementById('eventTitle').value = aiPrefill.title;
        if (aiPrefill.person) {
            document.querySelectorAll('input[name="eventPerson"]').forEach(cb => cb.checked = false);
            const p = String(aiPrefill.person).toLowerCase().trim();
            const checkboxId = `person${p.charAt(0).toUpperCase() + p.slice(1)}`;
            const cb = document.getElementById(checkboxId);
            if (cb) cb.checked = true;
            else {
                const byVal = document.querySelector(`input[name="eventPerson"][value="${p}"]`);
                if (byVal) byVal.checked = true;
            }
        }
    }
    
    console.log('Opening modal...');

    updateDateTimeDisplays();

    // 약간의 딜레이를 주어 캘린더 클릭 이벤트가 모달 내부로 전파되지 않도록 함
    setTimeout(() => {
        eventModal.classList.add('active');
    }, 10);
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
    
    const api = window.api;
    if (!api || typeof api.createSchedule !== 'function') {
        showToast('일정 API를 불러올 수 없습니다. 새로고침 후 다시 시도해주세요.', 'error');
        return;
    }
    
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
        if (selectedPersons.length === 0) {
            showToast('담당자를 한 명 이상 선택해주세요.', 'error');
        } else {
            showToast('모든 필수 항목을 입력해주세요.', 'error');
        }
        return;
    }
    
    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    // 종료 시간이 시작 시간보다 빠른지 확인 (동일 시각은 허용)
    if (endDateTime < startDateTime) {
        showToast('종료 시간은 시작 시간보다 늦거나 같아야 합니다.', 'error');
        return;
    }
    
    // 푸시 알림 설정
    const notificationStartCheckbox = document.getElementById('eventNotificationStart');
    const notificationEndCheckbox = document.getElementById('eventNotificationEnd');
    
    const notificationStart = notificationStartCheckbox ? notificationStartCheckbox.checked : false;
    const notificationEnd = notificationEndCheckbox ? notificationEndCheckbox.checked : false;
    
    // 알림 설정한 사용자 (아빠/엄마) - 설정에서 선택한 사용자
    const notificationSetBy = (notificationStart || notificationEnd) && window.fcmNotification
        ? window.fcmNotification.getCurrentUser()
        : null; // 'mom' | 'dad' | null
    
    console.log('📤 Saving notification settings:');
    console.log('  - Start notification:', notificationStart);
    console.log('  - End notification:', notificationEnd);
    
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
            
            // 관련 일정 찾기
            let relatedSchedules = [];
            
            // 반복 일정인 경우: original_id로 찾기
            if (currentEditingEvent.extendedProps && currentEditingEvent.extendedProps.original_id) {
                const originalId = currentEditingEvent.extendedProps.original_id;
                console.log('🔗 Finding schedule by original_id:', originalId);
                
                try {
                    const originalSchedule = await api.getSchedule(originalId);
                    if (originalSchedule) {
                        relatedSchedules = [originalSchedule];
                        console.log('  ✅ Found original schedule');
                    }
                } catch (error) {
                    console.log('  ⚠️ Original schedule not found, searching by info');
                }
            }
            
            // original_id로 못 찾았으면 기존 방식으로 찾기
            if (relatedSchedules.length === 0) {
                relatedSchedules = await api.findRelatedSchedules(originalTitle, originalStart, originalEnd);
            }
            
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
                    notification_start: notificationStart,
                    notification_end: notificationEnd,
                    notification_set_by: notificationSetBy,
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
                    console.log(`🔄 Updating schedule for ${person}: ${scheduleToUpdate.id}`);
                    console.log('  - 기존 알림 설정:');
                    console.log('    - notification_start:', scheduleToUpdate.notification_start);
                    console.log('    - notification_end:', scheduleToUpdate.notification_end);
                    console.log('  - 새 알림 설정:');
                    console.log('    - notification_start:', notificationStart);
                    console.log('    - notification_end:', notificationEnd);
                    
                    // 업데이트할 데이터 구성 (기본 정보만 업데이트)
                    const scheduleData = {
                        title,
                        // 반복 일정의 경우 원본 날짜 유지, 일반 일정의 경우만 날짜 업데이트
                        start_datetime: (repeatType !== 'none') ? scheduleToUpdate.start : startDateTime.toISOString(),
                        end_datetime: (repeatType !== 'none') ? scheduleToUpdate.end : endDateTime.toISOString(),
                        person: person,
                        persons: [person],
                        description: description || null,
                        notification_start: notificationStart,
                        notification_end: notificationEnd,
                        notification_set_by: notificationSetBy,
                        repeat_type: repeatType,
                        repeat_end_date: repeatEndDate,
                        repeat_weekdays: repeatWeekdays,
                        repeat_monthly_type: repeatMonthlyType,
                        is_important: isImportant
                    };
                    
                    console.log('  - ✅ 업데이트 데이터 전송:', scheduleData);
                    await api.updateSchedule(scheduleToUpdate.id, scheduleData);
                    console.log('  - ✅ 업데이트 완료!');
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
            if (selectedPersons.length === 0) {
                console.warn('⚠️ AI 일정 추가 시 담당자가 비어 있음 - setEventModalPerson 확인 필요');
            }
            console.log('📋 Form data - title:', title, 'start:', startDateTime.toISOString(), 'end:', endDateTime.toISOString());
            
            // '전체' 선택 시 하나의 일정만 생성
            if (selectedPersons.includes('all')) {
                const scheduleData = {
                    title,
                    start_datetime: startDateTime.toISOString(),
                    end_datetime: endDateTime.toISOString(),
                    person: 'all',
                    persons: ['all'],
                    description: description || null,
                    notification_start: notificationStart,
                    notification_end: notificationEnd,
                    notification_set_by: notificationSetBy,
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
                        notification_start: notificationStart,
                        notification_end: notificationEnd,
                        notification_set_by: notificationSetBy,
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
        
        // Firestore 반영 후 캘린더 갱신 (바로 refresh하면 새 문서가 아직 안 보일 수 있음)
        const doRefresh = () => {
            if (window.calendarModule && typeof window.calendarModule.refresh === 'function') {
                window.calendarModule.refresh();
            }
        };
        doRefresh();
        setTimeout(doRefresh, 400);
        setTimeout(doRefresh, 1200);
        
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
    const header = document.getElementById('eventDetailHeader');
    
    const startDate = new Date(event.start);
    const endDate = event.end ? new Date(event.end) : null;
    
    // persons 배열 사용 (없으면 person 사용)
    const persons = event.extendedProps.persons || [event.extendedProps.person];
    const personNames = persons.map(p => window.PERSON_NAMES[p]).join(', ');
    
    // 헤더에 담당자 이미지와 제목 표시
    const personAvatarsHTML = persons.map(p => 
        `<img src="images/${p}.png" alt="${window.PERSON_NAMES[p]}" class="event-detail-avatar">`
    ).join('');
    
    header.innerHTML = `
        <div class="event-detail-title-row">
            <div class="event-detail-avatars">
                ${personAvatarsHTML}
            </div>
            <h2 class="event-detail-title">${event.title}</h2>
        </div>
    `;
    
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
    if (!loadingOverlay) return;
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
    // 설정 모달 열릴 때 알림 상태 UI 갱신 (DOM 렌더 후 실행)
    requestAnimationFrame(() => {
        if (window.fcmNotification && typeof window.fcmNotification.updateUI === 'function') {
            window.fcmNotification.updateUI();
        }
    });
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
 * Beta Test Modal - Strava 오류 시에도 모달은 열림, 연동 섹션만 비활성화
 */
function openBetaTestModal() {
    try {
        if (!betaTestModal) return;
        updateStravaUI();
        if (typeof window.updateGeminiApiKeyUI === 'function') window.updateGeminiApiKeyUI();
        betaTestModal.classList.add('active');
        // OAuth 복귀 직후 등 타이밍 이슈 대비 - 잠시 후 한 번 더 UI 갱신
        setTimeout(updateStravaUI, 500);
    } catch (e) {
        console.warn('베타테스트 모달 열기 중 오류 (무시됨):', e);
    }
}

function closeBetaTestModal() {
    if (betaTestModal) betaTestModal.classList.remove('active');
}

let exerciseCalendarCurrentDate = new Date();

function setHeaderModeToggle(mode) {
    document.querySelectorAll('.header-mode-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
    });
}

function showExerciseView() {
    setHeaderModeToggle('exercise');
    const scheduleArea = document.getElementById('scheduleArea');
    const exerciseArea = document.getElementById('exerciseArea');
    const importantEvents = document.getElementById('importantEvents');
    const todaySummary = document.getElementById('todaySummary');
    const viewSelector = document.querySelector('.view-selector');
    const fab = document.getElementById('addEventBtn');
    const gcalContent = document.querySelector('.gcal-content');
    if (scheduleArea) scheduleArea.style.display = 'none';
    if (importantEvents) importantEvents.style.display = 'none';
    if (todaySummary) todaySummary.style.display = 'none';
    if (viewSelector) viewSelector.style.display = 'block';
    const fabGroup = document.getElementById('fabGroup');
    if (fabGroup) fabGroup.style.display = 'none';
    else if (fab) fab.style.display = 'none';
    if (gcalContent) gcalContent.classList.add('exercise-view');
    if (exerciseArea) {
        exerciseArea.style.display = 'block';
        const exercisePersonFilter = document.getElementById('exercisePersonFilter');
        if (exercisePersonFilter) exercisePersonFilter.style.display = 'none';
        if (window.calendarModule && window.calendarModule.gotoDate) {
            window.calendarModule.gotoDate(exerciseCalendarCurrentDate);
        }
        renderExerciseCalendar();
    }
}

function showScheduleView() {
    setHeaderModeToggle('schedule');
    const scheduleArea = document.getElementById('scheduleArea');
    const exerciseArea = document.getElementById('exerciseArea');
    const importantEvents = document.getElementById('importantEvents');
    const todaySummary = document.getElementById('todaySummary');
    const fab = document.getElementById('addEventBtn');
    const gcalContent = document.querySelector('.gcal-content');
    if (scheduleArea) scheduleArea.style.display = 'flex';
    if (exerciseArea) {
        exerciseArea.style.display = 'none';
        const exercisePersonFilter = document.getElementById('exercisePersonFilter');
        if (exercisePersonFilter) exercisePersonFilter.style.display = '';
    }
    if (importantEvents) importantEvents.style.display = '';
    if (todaySummary) todaySummary.style.display = '';
    const vs = document.querySelector('.view-selector');
    if (vs) vs.style.display = '';
    const fabGroup = document.getElementById('fabGroup');
    if (fabGroup) fabGroup.style.display = 'flex';
    else if (fab) fab.style.display = '';
    if (gcalContent) gcalContent.classList.remove('exercise-view');
    if (typeof window.maybeShowAiFabTooltip === 'function') window.maybeShowAiFabTooltip();
    // 일정관리로 돌아온 뒤 캘린더 레이아웃 재계산 (깨짐 방지)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (window.calendarModule && typeof window.calendarModule.updateSize === 'function') {
                window.calendarModule.updateSize();
            }
        });
    });
}

function getIntensityLevel(activity) {
    const dist = (activity.distance || 0) / 1000;
    const mins = (activity.moving_time || activity.elapsed_time || 0) / 60;
    const score = dist * 2 + (mins / 10);
    if (score > 50) return 'high';
    if (score < 10) return 'low';
    return 'medium';
}

const EXERCISE_PERSON_CONFIG = {
    all: { img: 'images/all.png', color: '#1a73e8' },
    dad: { img: 'images/dad.png', color: '#0f9d58' },
    mom: { img: 'images/mom.png', color: '#f4511e' },
    juhwan: { img: 'images/juhwan.png', color: '#9c27b0' },
    taehwan: { img: 'images/taehwan.png', color: '#f9a825' }
};
const EXERCISE_FAMILY_ORDER = ['dad', 'mom', 'juhwan', 'taehwan'];

function getExerciseFilterPersons() {
    const exerciseFilterEl = document.getElementById('exercisePersonFilter');
    const useMain = !exerciseFilterEl || exerciseFilterEl.style.display === 'none';
    if (useMain) {
        const mainBtns = document.querySelectorAll('.person-filter-buttons .person-filter-btn.active');
        const persons = Array.from(mainBtns).map(b => b.dataset.person).filter(Boolean);
        if (persons.length === 0) return [];
        const withoutAll = persons.filter(p => p !== 'all');
        if (withoutAll.length === 0) return EXERCISE_FAMILY_ORDER.slice();
        return withoutAll;
    }
    const exerciseBtns = document.querySelectorAll('.exercise-person-filter .person-filter-btn.active');
    const persons = Array.from(exerciseBtns).map(b => b.dataset.exercisePerson).filter(Boolean);
    return persons;
}

function renderExerciseCalendar() {
    const grid = document.getElementById('exerciseCalendarGrid');
    const personFilterEl = document.getElementById('exercisePersonFilter');
    if (!grid || !personFilterEl) return;
    const prevSelection = getExerciseFilterPersons();
    const exerciseArea = document.getElementById('exerciseArea');
    const useCalendarDate = exerciseArea && exerciseArea.style.display !== 'none' && window.calendarModule && window.calendarModule.getCurrentDate;
    const refDate = useCalendarDate ? window.calendarModule.getCurrentDate() : exerciseCalendarCurrentDate;
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const byDate = window._stravaActivitiesByDate || {};
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const personsInMonth = new Set();
    for (let i = 0; i < startPad; i++) {
        const d = new Date(year, month, -startPad + i + 1);
        const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        (byDate[ds] || []).forEach(a => { if (a.person) personsInMonth.add(a.person); });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        (byDate[ds] || []).forEach(a => { if (a.person) personsInMonth.add(a.person); });
    }
    const remainder = (startPad + daysInMonth) % 7;
    const extra = remainder ? 7 - remainder : 0;
    for (let i = 0; i < extra; i++) {
        const nd = new Date(year, month + 1, i + 1);
        const ds = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-' + String(nd.getDate()).padStart(2, '0');
        (byDate[ds] || []).forEach(a => { if (a.person) personsInMonth.add(a.person); });
    }
    // 가족 모두 표시, 기록 없으면 아이콘 비활성화
    const personList = EXERCISE_FAMILY_ORDER.slice();
    // 새로 기록이 생긴 사람(prevSelection에 없던)이 있으면 모두 표시로 전환
    const hasNewPersonsWithRecords = Array.from(personsInMonth).some(p => !prevSelection.includes(p));
    const keepActive = (p) => {
        if (!personsInMonth.has(p)) return false;
        if (prevSelection.length === 0 || hasNewPersonsWithRecords) return true;
        return prevSelection.includes(p);
    };
    const filterHtml = personList.map(p => {
        const cfg = EXERCISE_PERSON_CONFIG[p] || { img: 'images/all.png', color: '#1a73e8' };
        const hasRecord = personsInMonth.has(p);
        const active = hasRecord && keepActive(p) ? ' active' : '';
        const noRecord = hasRecord ? '' : ' no-records';
        return `<button class="person-filter-btn${active}${noRecord}" data-exercise-person="${p}" data-color="${cfg.color}" ${!hasRecord ? 'disabled' : ''}><img src="${cfg.img}" alt="${p}" class="person-avatar"></button>`;
    }).join('');
    personFilterEl.innerHTML = filterHtml;
    const filterPersons = getExerciseFilterPersons().filter(p => personsInMonth.has(p));
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    let html = '';
    // 활성 아이콘에 해당하는 기록만 표시 (비활성화 시 해당 사람 기록 숨김)
    const filterActs = (arr) => filterPersons.length === 0 ? [] : arr.filter(a => filterPersons.includes(a.person));
    const totalDistKm = (acts) => acts.reduce((s, a) => s + (a.distance || 0) / 1000, 0);
    const circleSize = (km) => Math.min(26, Math.max(14, 12 + Math.min(km, 25) * 0.45));
    const formatDist = (km) => km >= 1 ? Math.round(km) : (km >= 0.1 ? km.toFixed(1) : Math.round(km * 10) / 10);
    const renderDay = (dayNum, ds, acts, otherMonth, dayOfWeek) => {
        const persons = [...new Set(acts.map(a => a.person))];
        const distKm = totalDistKm(acts);
        let badgeStyle = '';
        if (persons.length >= 2) {
            const total = totalDistKm(acts);
            const byPerson = {};
            acts.forEach(a => {
                const p = a.person;
                byPerson[p] = (byPerson[p] || 0) + (a.distance || 0) / 1000;
            });
            const ordered = persons.map(p => ({
                color: (EXERCISE_PERSON_CONFIG[p] || {}).color || '#0f9d58',
                share: total > 0 ? (byPerson[p] || 0) / total : 1 / persons.length
            }));
            let cum = 0;
            const segments = ordered.map(({ color, share }) => {
                const start = cum;
                cum += share;
                return `${color} ${(start * 100).toFixed(1)}% ${(cum * 100).toFixed(1)}%`;
            }).join(', ');
            badgeStyle = `--size:${circleSize(distKm)}px; background: conic-gradient(${segments});`;
        } else if (persons.length === 1) {
            const c = (EXERCISE_PERSON_CONFIG[persons[0]] || {}).color || '#0f9d58';
            badgeStyle = `--size:${circleSize(distKm)}px; --color:${c}`;
        }
        const size = circleSize(distKm);
        const distLabel = formatDist(distKm);
        const countBadge = acts.length >= 2 ? `<span class="exercise-count-badge">${acts.length}</span>` : '';
        const badge = acts.length ? `<span class="exercise-badge-wrap"><span class="exercise-badge" style="${badgeStyle}">${distLabel}${countBadge}</span></span>` : '';
        const sunSat = dayOfWeek === 0 ? ' day-sun' : (dayOfWeek === 6 ? ' day-sat' : '');
        const cls = ['exercise-calendar-day', otherMonth ? 'other-month' : '', ds === todayStr ? 'today' : '', acts.length ? 'has-exercise' : '', sunSat].filter(Boolean).join(' ');
        return `<div class="${cls}" data-date="${ds}"><span class="day-num">${dayNum}</span>${badge}</div>`;
    };
    for (let i = 0; i < startPad; i++) {
        const d = new Date(year, month, -startPad + i + 1);
        const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const acts = filterActs(byDate[ds] || []);
        html += renderDay(d.getDate(), ds, acts, true, d.getDay());
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const acts = filterActs(byDate[ds] || []);
        html += renderDay(d, ds, acts, false, dateObj.getDay());
    }
    for (let i = 0; i < extra; i++) {
        const nd = new Date(year, month + 1, i + 1);
        const ds = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-' + String(nd.getDate()).padStart(2, '0');
        const acts = filterActs(byDate[ds] || []);
        html += renderDay(nd.getDate(), ds, acts, true, nd.getDay());
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.exercise-calendar-day').forEach(cell => {
        cell.addEventListener('click', () => {
            const dateStr = cell.dataset.date;
            const acts = filterActs((window._stravaActivitiesByDate || {})[dateStr] || []);
            showExerciseDetail(dateStr, acts);
        });
    });

    // 사용자별 한 달 운동 요약 렌더링 (해당 월 전체 기준, 필터 무관)
    renderExerciseMonthlySummary(year, month, byDate, arr => arr);
}

function renderExerciseMonthlySummary(year, month, byDate, filterActs) {
    const container = document.getElementById('exerciseMonthlySummary');
    if (!container) return;
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const byPerson = {};
    for (const p of EXERCISE_FAMILY_ORDER) byPerson[p] = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const acts = (filterActs || (a => a))(byDate[ds] || []);
        acts.forEach(a => {
            const p = a.person || 'all';
            if (p === 'all' || !byPerson[p]) return;
            byPerson[p].push(a);
        });
    }

    const personList = EXERCISE_FAMILY_ORDER.slice();
    let html = '<h3 class="exercise-summary-title">이번달에는 이렇게 운동했어요 <span class="material-icons exercise-summary-fire">local_fire_department</span></h3><div class="exercise-summary-cards">';
    personList.forEach(p => {
        const acts = byPerson[p] || [];
        const cfg = EXERCISE_PERSON_CONFIG[p] || { img: 'images/all.png', color: '#808080' };
        const personName = window.PERSON_NAMES ? (window.PERSON_NAMES[p] || p) : p;
        let totalDist = 0, totalTime = 0;
        acts.forEach(a => {
            totalDist += (a.distance || 0) / 1000;
            totalTime += (a.moving_time || a.elapsed_time || 0);
        });
        const timeStr = totalTime >= 3600
            ? `${Math.floor(totalTime / 3600)}시간 ${Math.floor((totalTime % 3600) / 60)}분`
            : totalTime >= 60
                ? `${Math.floor(totalTime / 60)}분`
                : totalTime === 0 ? '' : `${totalTime}초`;
        const hasRecord = acts.length > 0;
        const statsHtml = [
            `<span class="exercise-summary-stat"><span class="material-icons">directions_run</span> ${acts.length}회</span>`,
            totalDist > 0 ? `<span class="exercise-summary-stat"><span class="material-icons">straighten</span> ${totalDist.toFixed(1)}km</span>` : '',
            totalTime > 0 ? `<span class="exercise-summary-stat"><span class="material-icons">schedule</span> ${timeStr}</span>` : '',
            !hasRecord ? '<span class="exercise-summary-stat exercise-summary-no-data">기록 없음</span>' : ''
        ].filter(Boolean).join('');
        html += `
            <div class="exercise-summary-card ${hasRecord ? '' : 'exercise-summary-card-empty'}" data-person="${p}" style="--person-color: ${cfg.color}" title="${personName}">
                <img src="${cfg.img}" alt="${personName}" class="exercise-summary-avatar">
                <div class="exercise-summary-stats">${statsHtml}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    container.classList.remove('empty');
}

/**
 * Google Polyline 디코더 (Strava map.summary_polyline 용)
 */
function decodePolyline(encoded) {
    if (!encoded || typeof encoded !== 'string') return [];
    const points = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

function getSportIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('run')) return 'directions_run';
    if (t.includes('ride') || t.includes('cycling') || t.includes('bike')) return 'directions_bike';
    if (t.includes('swim')) return 'pool';
    if (t.includes('walk') || t.includes('hike')) return 'directions_walk';
    return 'directions_run';
}

function formatPace(activity) {
    const distKm = (activity.distance || 0) / 1000;
    const timeSec = activity.moving_time || activity.elapsed_time || 0;
    if (!distKm || distKm < 0.01 || !timeSec) return null;
    const paceMinPerKm = (timeSec / 60) / distKm;
    const m = Math.floor(paceMinPerKm);
    const s = Math.round((paceMinPerKm % 1) * 60);
    return m + ':' + String(s).padStart(2, '0') + ' /km';
}

function getLocationFromActivity(activity) {
    const loc = [activity.location_city, activity.location_state].filter(Boolean).join(', ') || (activity.location_country || '');
    return loc;
}

function parseStravaLocalDateTime(dtStr) {
    if (!dtStr) return null;
    const m = String(dtStr).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    return { y: parseInt(m[1], 10), mo: parseInt(m[2], 10), d: parseInt(m[3], 10), h: parseInt(m[4], 10), min: parseInt(m[5], 10) };
}

function formatExerciseMetaSync(activity) {
    const dtStr = activity.start_date_local || activity.start_date || '';
    const p = parseStravaLocalDateTime(dtStr);
    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
    let timePart = '';
    let datePart = '';
    if (p) {
        const h12 = p.h % 12 || 12;
        timePart = `${h12}:${String(p.min).padStart(2, '0')} ${p.h >= 12 ? 'PM' : 'AM'}`;
        const dow = new Date(p.y, p.mo - 1, p.d).getDay();
        datePart = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}(${DAY_NAMES[dow]})`;
    }
    const loc = getLocationFromActivity(activity);
    const parts = [];
    if (datePart || timePart) parts.push(`${datePart} ${timePart}`.trim());
    if (loc) parts.push(loc);
    return { text: parts.join(' · ') || '-', needsGeocode: !loc && activity.start_latlng && activity.start_latlng.length >= 2 };
}

async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
        const dong = addr.suburb || addr.neighbourhood || addr.quarter || addr.district || '';
        const state = addr.state || addr.province || addr.region || '';
        const loc = dong ? [city, dong].filter(Boolean).join(' ') : [city, state].filter(Boolean).join(', ');
        return loc || addr.country || '';
    } catch (_) {
        return '';
    }
}

function formatTimeShort(timeSec) {
    if (!timeSec) return null;
    const h = Math.floor(timeSec / 3600);
    const m = Math.floor((timeSec % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + '분';
    return timeSec + '초';
}

let _exerciseDetailMaps = [];
let _exerciseDetailActivities = [];

async function handleExerciseMoreClick(e) {
    const btn = e.target.closest('.exercise-more-btn');
    if (!btn) return;
    const index = parseInt(btn.dataset.activityIndex, 10);
    const activities = _exerciseDetailActivities;
    const a = activities && activities[index];
    if (!a || !window.stravaModule) return;
    const container = document.getElementById(`exerciseMore_${index}`);
    if (!container) return;
    if (container.dataset.loaded === '1') {
        const isExp = container.classList.toggle('expanded');
        btn.classList.toggle('expanded', isExp);
        btn.innerHTML = isExp ? '<span class="material-icons">expand_less</span> 접기' : '<span class="material-icons">expand_more</span> 더보기';
        if (isExp) requestAnimationFrame(() => container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
        return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> 로딩 중...';
    try {
        const athleteId = a._athleteId || (a.athlete && a.athlete.id) || (a._athlete && a._athlete.id);
        const [detail, streamsRaw] = await Promise.all([
            window.stravaModule.getActivityDetail(a.id, athleteId),
            window.stravaModule.getActivityStreams(a.id, athleteId).catch(() => null)
        ]);
        const streams = streamsRaw && !Array.isArray(streamsRaw) ? streamsRaw : null;
        container.innerHTML = renderExerciseSplitsAndPace(detail, streams, a);
        container.dataset.loaded = '1';
        container.classList.add('expanded');
        btn.classList.add('expanded');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">expand_less</span> 접기';
        requestAnimationFrame(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
        console.error('운동 상세 로드 실패:', err);
        container.innerHTML = '<p class="exercise-more-error">데이터를 불러올 수 없습니다.</p>';
        if (window.showToast) window.showToast('상세 데이터 로드 실패', 'error');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">expand_more</span> 다시 시도';
    }
}

function renderExerciseSplitsAndPace(detail, streams, activity) {
    const splits = detail.splits_metric || detail.splits_standard || [];
    const distKm = (activity.distance || 0) / 1000;
    const movingTime = activity.moving_time || activity.elapsed_time || 0;
    const elapsedTime = activity.elapsed_time || 0;
    const avgPace = formatPace(activity);
    const movingStr = formatTimeShort(movingTime);
    const elapsedStr = formatTimeShort(elapsedTime);

    let fastestPace = null;
    let fastestPaceStr = '-';
    if (splits.length) {
        splits.forEach(s => {
            const d = (s.distance || 0) / 1000;
            const t = s.moving_time || s.elapsed_time || 0;
            if (d > 0 && t > 0) {
                const p = (t / 60) / d;
                if (!fastestPace || p < fastestPace) fastestPace = p;
            }
        });
        if (fastestPace != null) {
            const m = Math.floor(fastestPace);
            const s = Math.round((fastestPace % 1) * 60);
            fastestPaceStr = m + ':' + String(s).padStart(2, '0') + ' /km';
        }
    }

    let splitsHtml = '';
    if (splits.length) {
        const paceValues = splits.map(s => {
            const d = (s.distance || 0) / 1000;
            const t = s.moving_time || s.elapsed_time || 0;
            return (d > 0 && t > 0) ? (t / 60) / d : null;
        }).filter(v => v != null);
        const minPace = paceValues.length ? Math.min(...paceValues) : 4;
        const maxPace = paceValues.length ? Math.max(...paceValues) : 8;
        const paceRange = maxPace - minPace || 1;

        const speeds = paceValues.map(p => 1 / p);
        const minSpeed = Math.min(...speeds);
        const maxSpeed = Math.max(...speeds);
        const speedRange = maxSpeed - minSpeed || 0.001;

               splitsHtml = '<div class="exercise-splits-section"><h4>Splits</h4><div class="exercise-splits-table"><div class="exercise-splits-header"><span>Km</span><span>Pace(/km)</span><span class="splits-pace-bar-col"></span><span class="splits-elev-cell">Elev(m)</span></div>';
        let cumDist = 0;
        splits.forEach((s, i) => {
            const d = (s.distance || 0) / 1000;
            cumDist += d;
            const t = s.moving_time || s.elapsed_time || 0;
            let paceStr = '-';
            let paceMin = null;
            if (d > 0 && t > 0) {
                paceMin = (t / 60) / d;
                const pm = Math.floor(paceMin);
                const ps = Math.round((paceMin % 1) * 60);
                paceStr = pm + ':' + String(ps).padStart(2, '0');
            }
            const speed = paceMin != null ? 1 / paceMin : 0;
            const barWidth = paceMin != null ? Math.round(((speed - minSpeed) / speedRange) * 100) : 0;
            const elev = s.elevation_difference != null ? String(Math.round(s.elevation_difference)) : '-';
            const kmLabel = d >= 0.95 ? Math.round(cumDist) : cumDist.toFixed(1);
            splitsHtml += `<div class="exercise-splits-row"><span>${kmLabel}</span><span>${paceStr}</span><span class="splits-pace-bar-cell"><span class="splits-pace-bar" style="width:${barWidth}%"></span></span><span class="splits-elev-cell">${elev}</span></div>`;
        });
        splitsHtml += '</div></div>';
    }

    const avgElapsedPace = distKm > 0 && elapsedTime > 0 ? (function() {
        const p = (elapsedTime / 60) / distKm;
        const m = Math.floor(p);
        const s = Math.round((p % 1) * 60);
        return m + ':' + String(s).padStart(2, '0') + ' /km';
    })() : '-';

    let paceGraphHtml = '';
    const distStream = streams && (streams.distance || (Array.isArray(streams) && streams.find(s => s.type === 'distance')));
    const altStream = streams && (streams.altitude || (Array.isArray(streams) && streams.find(s => s.type === 'altitude')));
    const velStream = streams && (streams.velocity_smooth || (Array.isArray(streams) && streams.find(s => s.type === 'velocity_smooth')));
    const dist = distStream && (distStream.data || distStream);
    const altData = altStream && (altStream.data || altStream);
    const vel = velStream && (velStream.data || velStream);
    if (streams && dist && dist.length && vel && vel.length) {
        const maxDist = Math.max(0.1, Math.max(...dist) / 1000);
        const paceValues = dist.map((_, i) => (vel[i] && vel[i] > 0) ? 1000 / (60 * vel[i]) : 0).filter(v => v > 0);
        const minPace = paceValues.length ? Math.max(1.5, Math.min(...paceValues) - 0.5) : 2;
        const maxPace = paceValues.length ? Math.min(12, Math.max(...paceValues) + 0.5) : 10;
        const altArr = altData && Array.isArray(altData) ? altData : [];
        const altMin = altArr.length ? Math.min(...altArr) : 0;
        const altMax = altArr.length ? Math.max(...altArr) : 0;
        const altRange = altMax - altMin || 1;
        const padL = 44, padR = 54, padT = 10, padB = 24;
        const w = 400, h = 240;
        const chartW = w - padL - padR, chartH = h - padT - padB;
        const avgPaceMin = distKm > 0 && movingTime > 0 ? (movingTime / 60) / distKm : null;
        const step = Math.max(1, Math.floor(dist.length / 80));
        let pacePath = '';
        let altPath = '';
        for (let i = 0; i < dist.length; i += step) {
            const d = dist[i] / 1000;
            const v = vel[i] || 0.001;
            const paceMin = 1000 / (60 * v);
            // Pace: lower value = better → draw at top (small y offset from padT)
            const yPace = padT + ((paceMin - minPace) / (maxPace - minPace)) * chartH;
            const x = padL + (d / maxDist) * chartW;
            pacePath += (pacePath ? ' L' : 'M') + x.toFixed(1) + ',' + Math.max(padT, Math.min(padT + chartH, yPace)).toFixed(1);
            const ah = altArr[i] != null ? padT + chartH - ((altArr[i] - altMin) / altRange) * chartH * 0.4 : padT + chartH;
            altPath += (altPath ? ' L' : 'M') + x.toFixed(1) + ',' + Math.max(padT, Math.min(padT + chartH, ah)).toFixed(1);
        }
        const fmtPace = (m) => Math.floor(m) + ':' + String(Math.round((m % 1) * 60)).padStart(2, '0');
        const xLabels = [];
        const xStep = maxDist > 20 ? 2 : 1;
        for (let k = 0; k <= Math.ceil(maxDist); k += xStep) xLabels.push(k);
        const altBase = Math.floor(altMin / 50) * 50;
        const altTop = Math.ceil(altMax / 50) * 50;
        const leftLabels = [];
        for (let v = altBase; v <= altTop; v += 50) leftLabels.push(v);
        if (leftLabels.length > 7) {
            const step = Math.ceil(leftLabels.length / 6);
            leftLabels.length = 0;
            for (let v = altBase; v <= altTop; v += 50 * step) leftLabels.push(v);
            if (leftLabels[leftLabels.length - 1] !== altTop) leftLabels.push(altTop);
        }
        const rightPaces = [minPace, (minPace + maxPace) / 2, maxPace].map(fmtPace);
        const paceRange = maxPace - minPace || 1;
        const yAvgPace = avgPaceMin != null && avgPaceMin >= minPace && avgPaceMin <= maxPace
            ? padT + ((avgPaceMin - minPace) / paceRange) * chartH : null;
        const avgPaceLine = yAvgPace != null ? `<line x1="${padL}" y1="${yAvgPace}" x2="${padL + chartW}" y2="${yAvgPace}" class="pace-avg-line" stroke="#5dade2" stroke-width="1" stroke-dasharray="4,3"/>` : '';
        const gridH = [minPace, (minPace + maxPace) / 2, maxPace].map((p) => {
            const y = padT + ((p - minPace) / paceRange) * chartH;
            return `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" class="pace-grid-line"/>`;
        }).join('');
        const gridV = xLabels.map((v) => {
            const x = padL + (v / maxDist) * chartW;
            return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + chartH}" class="pace-grid-line"/>`;
        }).join('');
        paceGraphHtml = `
                <div class="exercise-pace-section">
                    <h4>Pace / Elevation</h4>
                    <div class="exercise-pace-graph" style="height:${h}px">
                        <svg class="pace-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
                            <g class="pace-grid">${gridV}${gridH}</g>
                            <path class="pace-graph-alt" d="${altPath} L${padL + chartW},${padT + chartH} L${padL},${padT + chartH} Z" fill="rgba(96,96,96,0.28)" stroke="none"/>
                            <path class="pace-graph-pace" d="${pacePath}" fill="none" stroke="#42a5f5" stroke-width="1"/>
                            ${avgPaceLine}
                            <text x="${padL - 8}" y="${padT + chartH / 2}" class="pace-axis-label pace-axis-left" text-anchor="end" dominant-baseline="middle">m</text>
                            <text x="${padL + chartW + 6}" y="${padT + 14}" class="pace-axis-label pace-axis-right" text-anchor="start">/km</text>
                            <text x="${padL + chartW / 2}" y="${h - 2}" class="pace-axis-label pace-axis-bottom" text-anchor="middle">km</text>
                            ${xLabels.map((v) => `<text x="${padL + (v / maxDist) * chartW}" y="${h - 12}" class="pace-axis-tick pace-axis-bottom" text-anchor="middle" font-size="8">${v}</text>`).join('')}
                            ${(function(){
        let lastY = -999;
        return leftLabels.map((v) => {
            const y = Math.max(padT + 6, Math.min(padT + chartH - 6, padT + chartH - ((v - altMin) / (altRange || 1)) * chartH));
            if (Math.abs(y - lastY) < 12 && lastY > -999) return '';
            lastY = y;
            return `<text x="${padL - 6}" y="${y}" class="pace-axis-tick pace-axis-left" text-anchor="end" dominant-baseline="middle" font-size="8">${v}</text>`;
        }).join('');
    })()}
                            ${rightPaces.map((t, i) => `<text x="${padL + chartW + 6}" y="${padT + (i / (rightPaces.length - 1 || 1)) * chartH}" class="pace-axis-tick pace-axis-right" text-anchor="start" font-size="8">${t}</text>`).join('')}
                        </svg>
                    </div>
                    <div class="exercise-pace-metrics">
                        <div class="pace-metric"><span>Avg Pace</span><span>${avgPace || '-'}</span></div>
                        <div class="pace-metric"><span>Moving Time</span><span>${movingStr || '-'}</span></div>
                        <div class="pace-metric"><span>Avg Elapsed Pace</span><span>${avgElapsedPace}</span></div>
                        <div class="pace-metric"><span>Elapsed Time</span><span>${elapsedStr || '-'}</span></div>
                        <div class="pace-metric"><span>Fastest Split</span><span>${fastestPaceStr}</span></div>
                    </div>
                </div>
            `;
    }
    if (!paceGraphHtml) {
        paceGraphHtml = `
            <div class="exercise-pace-section">
                <h4>Pace / Elevation</h4>
                <div class="exercise-pace-metrics">
                    <div class="pace-metric"><span>Avg Pace</span><span>${avgPace || '-'}</span></div>
                    <div class="pace-metric"><span>Moving Time</span><span>${movingStr || '-'}</span></div>
                    <div class="pace-metric"><span>Avg Elapsed Pace</span><span>${avgElapsedPace}</span></div>
                    <div class="pace-metric"><span>Elapsed Time</span><span>${elapsedStr || '-'}</span></div>
                    <div class="pace-metric"><span>Fastest Split</span><span>${fastestPaceStr}</span></div>
                </div>
            </div>
        `;
    }

    return '<div class="exercise-more-inner">' + splitsHtml + paceGraphHtml + '</div>';
}

function showExerciseDetail(dateStr, activities) {
    const modal = document.getElementById('exerciseDetailModal');
    const headerEl = document.getElementById('exerciseDetailHeader');
    const bodyEl = document.getElementById('exerciseDetailBody');
    if (!modal || !headerEl || !bodyEl) return;

    _exerciseDetailMaps.forEach(m => { try { m.remove(); } catch (_) {} });
    _exerciseDetailMaps = [];
    _exerciseDetailActivities = activities || [];

    const [y, m, d] = dateStr.split('-');
    const dateText = `${y}년 ${m}월 ${d}일`;

    if (!activities || activities.length === 0) {
        headerEl.innerHTML = '';
        bodyEl.innerHTML = '<p class="no-schedule">해당 날짜에 운동 기록이 없습니다</p>';
        modal.classList.add('active');
        return;
    }

    const first = activities[0];
    const firstCfg = EXERCISE_PERSON_CONFIG[first.person || 'all'] || EXERCISE_PERSON_CONFIG.all;
    const firstPersonName = window.PERSON_NAMES ? (window.PERSON_NAMES[first.person || 'all'] || first.person || 'all') : (first.person || 'all');
    const firstMeta = formatExerciseMetaSync(first);
    const firstDateTime = firstMeta.text.includes(' · ') ? firstMeta.text.split(' · ')[0] : firstMeta.text;
    const firstLoc = getLocationFromActivity(first) || '-';
    const firstLocId = (!getLocationFromActivity(first) && first.start_latlng && first.start_latlng.length >= 2) ? 'exercise-location-0' : '';
    headerEl.innerHTML = '<h2 class="exercise-detail-modal-title">운동상세</h2>';

    const headerContentHtml = `
        <div class="exercise-detail-header-top">
            <img src="${firstCfg.img}" alt="${firstPersonName}" class="exercise-detail-avatar-top">
            <div class="exercise-detail-header-info">
                <div class="exercise-detail-datetime">${firstDateTime}</div>
                <div class="exercise-detail-location" id="${firstLocId}">${firstLoc}</div>
            </div>
        </div>
    `;

    let bodyHTML = headerContentHtml;
    activities.forEach((a, index) => {
        const person = a.person || 'all';
        const cfg = EXERCISE_PERSON_CONFIG[person] || EXERCISE_PERSON_CONFIG.all;
        const personName = window.PERSON_NAMES ? (window.PERSON_NAMES[person] || person) : person;
        const exerciseName = a.name || (a.type || a.sport_type || '운동');
        const sportType = a.type || a.sport_type || 'Workout';
        const sportIcon = getSportIcon(sportType);
        const distKm = a.distance ? (a.distance / 1000).toFixed(2) : null;
        const pace = formatPace(a);
        const timeSec = a.moving_time || a.elapsed_time;
        const timeStr = formatTimeShort(timeSec);
        const hasMap = a.map && (a.map.summary_polyline || a.map.polyline);

        const metaResult = formatExerciseMetaSync(a);
        const metaText = metaResult.text;
        const needsGeocode = metaResult.needsGeocode;
        const locText = getLocationFromActivity(a) || '-';
        const locationId = (index === 0 && firstLocId) ? '' : (needsGeocode ? `exercise-location-${index}` : '');
        const dateTimePart = metaText.includes(' · ') ? metaText.split(' · ')[0] : metaText;
        const sep = index > 0 ? ' exercise-detail-sep' : '';
        const headerTopHtml = index > 0 ? `
                <div class="exercise-detail-header-top">
                    <img src="${cfg.img}" alt="${personName}" class="exercise-detail-avatar-top">
                    <div class="exercise-detail-header-info">
                        <div class="exercise-detail-datetime">${dateTimePart}</div>
                        <div class="exercise-detail-location" id="${locationId}">${locText}</div>
                    </div>
                </div>
        ` : '';
        bodyHTML += `
            <div class="exercise-detail-card${sep}" data-activity-index="${index}">
                ${headerTopHtml}
                <div class="exercise-detail-type">
                    <span class="material-icons exercise-detail-sport-icon">${sportIcon}</span>
                    <span>${sportType}</span>
                </div>
                <div class="exercise-detail-metrics">
                    ${distKm ? `<div class="exercise-detail-metric"><span class="metric-label">거리</span><span class="metric-value">${distKm} km</span></div>` : ''}
                    ${pace ? `<div class="exercise-detail-metric"><span class="metric-label">페이스</span><span class="metric-value">${pace}</span></div>` : ''}
                    ${timeStr ? `<div class="exercise-detail-metric"><span class="metric-label">시간</span><span class="metric-value">${timeStr}</span></div>` : ''}
                </div>
                ${hasMap ? `<div class="exercise-detail-map" id="exerciseMap_${index}"></div>` : ''}
                <div class="exercise-detail-extra">
                    ${a.calories ? `<span class="exercise-extra-item"><span class="material-icons">local_fire_department</span> ${a.calories} kcal</span>` : ''}
                    ${a.average_speed && !pace ? `<span class="exercise-extra-item"><span class="material-icons">speed</span> ${(a.average_speed * 3.6).toFixed(1)} km/h</span>` : ''}
                </div>
                <button type="button" class="exercise-more-btn" data-activity-index="${index}">
                    <span class="material-icons">expand_more</span> 더보기
                </button>
                <div class="exercise-more-content" id="exerciseMore_${index}" data-loaded="0"></div>
            </div>
        `;
    });

    bodyEl.innerHTML = bodyHTML + '<p class="exercise-detail-strava-footer">From <a href="https://www.strava.com" target="_blank" rel="noopener">Strava App</a></p>';
    modal.classList.add('active');

    activities.forEach(async (a, index) => {
        const locationEl = document.getElementById(`exercise-location-${index}`);
        if (!locationEl || !a.start_latlng || a.start_latlng.length < 2) return;
        const loc = getLocationFromActivity(a);
        if (loc) return;
        await new Promise(r => setTimeout(r, index * 1100));
        const [lat, lng] = a.start_latlng;
        const locationName = await reverseGeocode(lat, lng);
        if (!locationName || !locationEl.parentNode) return;
        locationEl.textContent = locationName;
    });

    requestAnimationFrame(() => {
        activities.forEach((a, index) => {
            const enc = a.map && (a.map.summary_polyline || a.map.polyline);
            const mapEl = document.getElementById(`exerciseMap_${index}`);
            if (!mapEl || !enc || typeof L === 'undefined') return;
            const coords = decodePolyline(enc);
            if (coords.length < 2) return;
            const map = L.map(mapEl, { attributionControl: false }).setView(coords[0], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.polyline(coords, { color: '#f4511e', weight: 2, opacity: 0.9 }).addTo(map);
            let start = coords[0];
            let end = coords[coords.length - 1];
            const dist = Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1]);
            if (dist < 0.0002) {
                const lat = (start[0] + end[0]) / 2;
                const lon = (start[1] + end[1]) / 2;
                start = [lat, lon - 0.00012];
                end = [lat, lon + 0.00012];
            }
            const startIcon = L.divIcon({
                className: 'exercise-map-marker',
                html: '<span class="exercise-marker-icon exercise-marker-start" title="출발"><span class="material-icons">play_arrow</span></span>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            const endIcon = L.divIcon({
                className: 'exercise-map-marker',
                html: '<span class="exercise-marker-icon exercise-marker-end" title="도착"><span class="material-icons">flag</span></span>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker(start, { icon: startIcon }).addTo(map);
            L.marker(end, { icon: endIcon }).addTo(map);
            map.fitBounds(coords, { padding: [20, 20] });
            _exerciseDetailMaps.push(map);
        });
    });
}

const STRAVA_PERSON_MAPPING_KEY = 'strava_person_mapping';

function getStravaPersonMapping() {
    try {
        const raw = localStorage.getItem(STRAVA_PERSON_MAPPING_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function setStravaPersonMapping(athleteId, person) {
    const m = getStravaPersonMapping();
    if (person) m[String(athleteId)] = person;
    else delete m[String(athleteId)];
    localStorage.setItem(STRAVA_PERSON_MAPPING_KEY, JSON.stringify(m));
}

function reapplyStravaPersonMapping() {
    const mapping = getStravaPersonMapping();
    const byDate = window._stravaActivitiesByDate || {};
    var changed = false;
    Object.keys(byDate).forEach(d => {
        (byDate[d] || []).forEach(a => {
            var aid = a._athleteId;
            if (aid && mapping[aid] && EXERCISE_FAMILY_ORDER.includes(mapping[aid])) {
                if (a.person !== mapping[aid]) { a.person = mapping[aid]; changed = true; }
            }
        });
    });
    return changed;
}

/**
 * Strava 디버그 정보 (연동 실패 원인 파악용)
 * 모바일 WebView vs 브라우저 localStorage 분리 시 토큰이 안 보일 수 있음
 */
function getStravaDebugInfo() {
    const lastFetchErr = window._stravaLastFetchError;
    if (lastFetchErr) {
        return { isConnected: true, msg: '연동됨 - 하지만 API 호출 실패: ' + lastFetchErr + ' (네트워크 확인 또는 Strava 앱 설정 확인)' };
    }
    const isConnected = !!(window.stravaModule && window.stravaModule.isConnected && window.stravaModule.isConnected());
    if (isConnected) {
        const accounts = (window.stravaModule.getStoredAccounts && window.stravaModule.getStoredAccounts()) || [];
        const expiredCount = accounts.filter(a => a.expired).length;
        const validCount = accounts.length - expiredCount;
        if (expiredCount > 0 && validCount === 0) {
            return { isConnected: false, msg: '연동 만료됨 - 연동 해제 후 다시 연결해주세요.' };
        }
        const names = accounts.map(acc => {
            const a = acc.athlete || {};
            const n = ((a.firstname || '') + ' ' + (a.lastname || '')).trim() || 'Strava';
            return acc.expired ? n + ' (만료)' : n;
        });
        const suffix = expiredCount > 0 ? ' (' + expiredCount + '개 연동 만료)' : '';
        return { isConnected: validCount > 0, msg: (validCount > 0 ? '✓ 연결됨: ' : '연동 만료됨: ') + (names.length ? names.join(', ') : 'Strava') + suffix };
    }
    const lastErr = window._stravaLastError;
    if (lastErr) {
        return { isConnected: false, msg: '연결 실패: ' + lastErr + ' (다시 Strava 연결을 눌러 재시도)' };
    }
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
    if (isStandalone) {
        return { isConnected: false, msg: '앱에서 열림 - Chrome/Safari 브라우저에서 mushs01.github.io/schedule/ 를 직접 열고 다시 연동해보세요.' };
    }
    return { isConnected: false, msg: '연결 안됨. "Strava 연결" 버튼을 눌러 연동해주세요.' };
}

function updateStravaUI() {
    try {
        const connectionStatusEl = document.getElementById('stravaConnectionStatus');
        const dataStatusEl = document.getElementById('stravaDataStatus');
        const notConnected = document.getElementById('stravaNotConnected');
        const connected = document.getElementById('stravaConnected');
        const accountListEl = document.getElementById('stravaAccountList');
        
        // 연동 상태 표시 업데이트
        if (connectionStatusEl) {
            const iconEl = connectionStatusEl.querySelector('.strava-status-icon');
            const textEl = connectionStatusEl.querySelector('.strava-status-text');
            connectionStatusEl.className = 'strava-status-item';
            if (!window.stravaModule || typeof window.stravaModule.isConnected !== 'function') {
                connectionStatusEl.classList.add('status-pending');
                if (iconEl) iconEl.textContent = 'warning';
                if (textEl) textEl.textContent = 'Strava 모듈을 불러올 수 없습니다';
            } else if (window.stravaModule.isConnected()) {
                const accounts = (window.stravaModule.getStoredAccounts && window.stravaModule.getStoredAccounts()) || [];
                const validCount = accounts.filter(a => !a.expired).length;
                const expiredCount = accounts.filter(a => a.expired).length;
                const allExpired = validCount === 0 && expiredCount > 0;
                if (allExpired) {
                    connectionStatusEl.classList.add('status-error');
                    if (iconEl) iconEl.textContent = 'error';
                    if (textEl) textEl.textContent = '연동 만료됨 - 연동 해제 후 다시 연결해주세요';
                } else {
                    connectionStatusEl.classList.add('status-success');
                    if (iconEl) iconEl.textContent = 'check_circle';
                    const names = accounts.map(acc => {
                        const a = acc.athlete || {};
                        const n = ((a.firstname || '') + ' ' + (a.lastname || '')).trim() || '사용자';
                        return acc.expired ? n + ' (만료)' : n;
                    });
                    const suffix = expiredCount > 0 ? ' - ' + expiredCount + '개 연동 만료' : '';
                    if (textEl) textEl.textContent = '✓ Strava 연결됨 (' + (names.length ? names.join(', ') : '사용자') + ')' + suffix;
                }
            } else {
                connectionStatusEl.classList.add('status-pending');
                if (iconEl) iconEl.textContent = 'link_off';
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
                const lastErr = window._stravaLastError;
                if (textEl) {
                    if (lastErr) {
                        textEl.textContent = 'Strava 연결 실패: ' + lastErr;
                    } else {
                        textEl.textContent = isStandalone
                            ? 'Strava 연결 안됨 - 브라우저에서 mushs01.github.io/schedule/ 를 열고 연동해주세요'
                            : 'Strava 연결 안됨 - "Strava 연결" 버튼을 눌러주세요';
                    }
                }
            }
        }
        
        // 데이터 상태 - 마지막 로드 결과가 있으면 표시, 없으면 기본값
        if (dataStatusEl) {
            const last = window._stravaLastDataStatus || { status: 'pending', message: '데이터 로드 전 - "운동 기록 가져오기" 버튼을 눌러주세요' };
            updateStravaDataStatus(last.status, last.message);
        }
        
        if (!notConnected || !connected) return;
        
        // standalone(앱) 모드일 때 "브라우저에서 열기" 버튼 표시
        const openInBrowserBtn = document.getElementById('stravaOpenInBrowserBtn');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
        if (openInBrowserBtn) openInBrowserBtn.style.display = isStandalone ? 'inline-flex' : 'none';
        
        if (window.stravaModule && typeof window.stravaModule.isConnected === 'function' && window.stravaModule.isConnected()) {
            notConnected.style.display = 'none';
            connected.style.display = 'block';
            const accounts = (window.stravaModule.getStoredAccounts && window.stravaModule.getStoredAccounts()) || [];
            const mapping = getStravaPersonMapping();
            if (accountListEl) {
                const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                accountListEl.innerHTML = accounts.map((acc, idx) => {
                    const a = acc.athlete || {};
                    const name = ((a.firstname || '') + ' ' + (a.lastname || '')).trim() || ('계정 ' + (idx + 1));
                    const id = acc.athleteId != null ? String(acc.athleteId) : '';
                    const isExpired = !!acc.expired;
                    var currentPerson = mapping[id];
                    if (!currentPerson || !EXERCISE_FAMILY_ORDER.includes(currentPerson)) {
                        currentPerson = EXERCISE_FAMILY_ORDER[idx] || EXERCISE_FAMILY_ORDER[0];
                    }
                    var opts = EXERCISE_FAMILY_ORDER.slice(0, 2).map(p => {
                        var label = (window.PERSON_NAMES && window.PERSON_NAMES[p]) || p;
                        return '<option value="' + esc(p) + '"' + (currentPerson === p ? ' selected' : '') + '>' + esc(label) + '</option>';
                    }).join('');
                    var badge = isExpired ? ' <span style="color: var(--error-color, #c62828); font-size: 11px;">연동 만료</span>' : '';
                    var itemStyle = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;' + (isExpired ? ' opacity: 0.9;' : '');
                    return '<li class="strava-account-item" style="' + itemStyle + '">' +
                        '<span style="min-width: 80px;">' + esc(name) + '</span>' + badge +
                        '<select class="strava-person-select" data-athlete-id="' + esc(id) + '" style="padding: 4px 8px; font-size: 12px; min-width: 70px;">' + opts + '</select>' +
                        '<button type="button" class="btn-secondary strava-disconnect-one" data-athlete-id="' + esc(id) + '" style="padding: 4px 8px; font-size: 12px;" title="' + (isExpired ? '연동 해제 후 다시 연결' : '이 계정만 연동 해제') + '"><span class="material-icons" style="font-size: 16px;">link_off</span> 연동 해제</button>' +
                        '</li>';
                }).join('') || '<li style="color: var(--text-secondary);">계정 목록 없음</li>';
            }
            var hintEl = document.getElementById('stravaAddAccountHint');
            var browserHintEl = document.getElementById('stravaOpenInBrowserHint');
            if (hintEl) hintEl.style.display = accounts.length === 1 ? 'block' : 'none';
            if (browserHintEl) {
                browserHintEl.style.display = (accounts.length === 1 && isStandalone) ? 'block' : 'none';
            }
        } else {
            notConnected.style.display = 'block';
            connected.style.display = 'none';
        }
    } catch (e) {
        console.warn('Strava UI 업데이트 중 오류 (무시됨):', e);
    }
}

/**
 * Strava 데이터 로드 상태 표시 업데이트
 */
function updateStravaDataStatus(status, message) {
    const dataStatusEl = document.getElementById('stravaDataStatus');
    if (!dataStatusEl) return;
    const iconEl = dataStatusEl.querySelector('.strava-status-icon');
    const textEl = dataStatusEl.querySelector('.strava-status-text');
    dataStatusEl.className = 'strava-status-item status-' + (status || 'pending');
    if (iconEl) iconEl.textContent = status === 'success' ? 'check_circle' : status === 'error' ? 'error' : status === 'loading' ? 'hourglass_empty' : 'info';
    if (textEl) textEl.textContent = message || '데이터 로드 전';
}

async function handleStravaFetch(silent) {
    const placeholder = document.getElementById('stravaDataPlaceholder');
    const display = document.getElementById('stravaDataDisplay');
    const noOverlay = !!silent;
    
    try {
        if (!window.stravaModule || typeof window.stravaModule.fetchActivities !== 'function') {
            const errorMsg = '✗ Strava 모듈을 불러올 수 없습니다';
            window._stravaLastDataStatus = { status: 'error', message: errorMsg };
            updateStravaDataStatus('error', errorMsg);
            if (display) {
                display.style.display = 'block';
                display.textContent = 'Strava 연동 모듈을 불러올 수 없습니다. (베타 기능)';
            }
            if (placeholder) placeholder.style.display = 'none';
            return;
        }
        
        updateStravaDataStatus('loading', '로딩 중...');
        if (!noOverlay) showLoading(true);
        if (placeholder) placeholder.style.display = 'none';
        if (display) {
            display.style.display = 'block';
            display.textContent = '로딩 중...';
        }
        
        const activities = await window.stravaModule.fetchActivities(200, 1);
        const accounts = (window.stravaModule.getStoredAccounts && window.stravaModule.getStoredAccounts()) || [];
        const allExpired = accounts.length > 0 && accounts.every(a => a.expired);
        const lastFetchErr = window._stravaLastFetchError;
        if (activities.length === 0 && allExpired) {
            throw new Error('연동 만료됨 - 연동 해제 후 다시 연결해주세요.');
        }
        if (activities.length === 0 && accounts.length > 0 && lastFetchErr) {
            throw new Error('API 호출 실패: ' + lastFetchErr);
        }
        const mapping = getStravaPersonMapping();
        const athleteIdToPerson = {};
        accounts.forEach((acc, i) => {
            var id = String(acc.athleteId);
            if (mapping[id] && EXERCISE_FAMILY_ORDER.includes(mapping[id])) {
                athleteIdToPerson[id] = mapping[id];
            } else {
                athleteIdToPerson[id] = EXERCISE_FAMILY_ORDER[i] || EXERCISE_FAMILY_ORDER[0];
            }
        });
        const defaultPerson = EXERCISE_FAMILY_ORDER[0] || 'dad';

        const formatted = (activities || []).map(a => {
            const athlete = a._athlete;
            const athleteId = athlete ? String(athlete.id) : '';
            const person = athlete && athleteIdToPerson[athleteId] ? athleteIdToPerson[athleteId] : defaultPerson;
            return {
                _athleteId: athleteId,
                id: a.id,
                name: a.name,
                type: a.type,
                sport_type: a.sport_type,
                start_date: a.start_date,
                start_date_local: a.start_date_local,
                elapsed_time: a.elapsed_time,
                moving_time: a.moving_time,
                distance: a.distance,
                total_elevation_gain: a.total_elevation_gain,
                average_speed: a.average_speed,
                max_speed: a.max_speed,
                average_cadence: a.average_cadence,
                average_watts: a.average_watts,
                max_watts: a.max_watts,
                kilojoules: a.kilojoules,
                calories: a.calories,
                trainer: a.trainer,
                commute: a.commute,
                manual: a.manual,
                private: a.private,
                achievement_count: a.achievement_count,
                kudos_count: a.kudos_count,
                comment_count: a.comment_count,
                workout_type: a.workout_type,
                description: a.description,
                device_name: a.device_name,
                map: a.map,
                location_city: a.location_city,
                location_state: a.location_state,
                location_country: a.location_country,
                start_latlng: a.start_latlng,
                person
            };
        });

        window._stravaActivitiesByDate = {};
        (formatted || []).forEach(a => {
            const d = (a.start_date_local || a.start_date || '').split('T')[0];
            if (d) {
                if (!window._stravaActivitiesByDate[d]) window._stravaActivitiesByDate[d] = [];
                window._stravaActivitiesByDate[d].push(a);
            }
        });
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const successMsg = `✓ ${formatted.length}개 운동 기록을 정상적으로 불러왔습니다 (${timeStr})`;
        window._stravaLastDataStatus = { status: 'success', message: successMsg };
        window._stravaLastFormattedData = formatted;
        updateStravaDataStatus('success', successMsg);
        
        if (display) {
            display.textContent = JSON.stringify(formatted, null, 2);
        }
        if (window.renderExerciseCalendar) window.renderExerciseCalendar();
        if (!noOverlay && window.showToast) window.showToast(`${formatted.length}개 운동 기록을 가져왔습니다.`, 'success');
        else if (noOverlay && window.showToast) window.showToast(`Strava ${formatted.length}개 운동 기록 자동 로드 완료`, 'info');
    } catch (error) {
        console.warn('Strava fetch error (베타 기능):', error);
        const errorMsg = '✗ 데이터 불러오기 실패: ' + (error.message || '알 수 없는 오류');
        window._stravaLastDataStatus = { status: 'error', message: errorMsg };
        updateStravaDataStatus('error', errorMsg);
        if (display) {
            display.style.display = 'block';
            display.textContent = '오류: ' + (error.message || '알 수 없는 오류');
        }
        if (!noOverlay && window.showToast) window.showToast(error.message || '데이터를 가져오는데 실패했습니다.', 'error');
        else if (noOverlay && window.showToast) window.showToast('Strava 운동 기록 로드 실패 (앱은 정상 사용 가능)', 'info');
    } finally {
        if (!noOverlay) showLoading(false);
    }
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
                            notification_start: schedule.notification_start === true,
                            notification_end: schedule.notification_end === true,
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
        
        // 중요일정 표시 - 한 줄로 간략하게
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
                    <span class="material-icons">star</span>
                    <span class="important-event-dday ${ddayClass}">${ddayText}</span>
                    <span class="important-event-date">${dateText}</span>
                    <span class="important-event-title">${schedule.title}</span>
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

/** 날짜 짧은 표시: "2월 12일 (목)" */
function formatDateShort(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[date.getDay()];
    return `${m}월 ${d}일 (${day})`;
}

/** 24h "HH:mm" -> 캡슐 표시 "오전/오후 H:mm" (10분 단위 반올림 반영) */
function formatTimeCapsule(timeStr24) {
    if (!timeStr24 || !timeStr24.includes(':')) return '오후 12:00';
    const [h, m] = timeStr24.split(':').map(Number);
    const hour = h || 0;
    const minute = Math.round((m || 0) / 10) * 10;
    const period = hour < 12 ? '오전' : '오후';
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    const minStr = String(minute).padStart(2, '0');
    return `${period} ${hour12}:${minStr}`;
}

/** 분을 10분 단위로 반올림 */
function roundMinutesTo10(min) {
    return Math.round((min || 0) / 10) * 10;
}

/** 시작/종료 날짜·시간 표시 텍스트 갱신 */
function updateDateTimeDisplays() {
    const startDateInput = document.getElementById('eventStartDate');
    const endDateInput = document.getElementById('eventEndDate');
    const startTimeInput = document.getElementById('eventStartTime');
    const endTimeInput = document.getElementById('eventEndTime');
    const startDateText = document.getElementById('startDateText');
    const endDateText = document.getElementById('endDateText');
    const startTimeCapsule = document.getElementById('startTimeCapsule');
    const endTimeCapsule = document.getElementById('endTimeCapsule');
    if (!startDateInput || !endDateInput || !startTimeInput || !endTimeInput) return;
    if (startDateInput.value) {
        const d = new Date(startDateInput.value);
        if (startDateText) startDateText.textContent = formatDateShort(d);
        if (startTimeCapsule) startTimeCapsule.textContent = formatTimeCapsule(startTimeInput.value);
    }
    if (endDateInput.value) {
        const d = new Date(endDateInput.value);
        if (endDateText) endDateText.textContent = formatDateShort(d);
        if (endTimeCapsule) endTimeCapsule.textContent = formatTimeCapsule(endTimeInput.value);
    }
}

/** 휠에서 선택한 값으로 24h "HH:mm" 생성 (분 10분 단위) */
function getTimeFromWheel(ampm, hour12, minute10) {
    let h = parseInt(hour12, 10) || 12;
    if (ampm === '오전') {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h += 12;
    }
    const m = Math.min(50, Math.round((minute10 || 0) / 10) * 10);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 휠 열 때 현재 시간으로 휠 위치 설정 */
function setWheelToTime(timeStr24) {
    const [h, m] = (timeStr24 || '12:00').split(':').map(Number);
    const hour = h || 0;
    const minute = Math.min(50, roundMinutesTo10(m || 0));
    const ampm = hour < 12 ? '오전' : '오후';
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    const listAmpm = document.getElementById('wheelAmpm');
    const listHour = document.getElementById('wheelHour');
    const listMinute = document.getElementById('wheelMinute');
    if (!listAmpm || !listHour || !listMinute) return;
    const ampmIndex = ampm === '오전' ? 0 : 1;
    const hourIndex = hour12 - 1;
    const minuteIndex = minute / 10;
    const itemH = 36;
    listAmpm.scrollTop = ampmIndex * itemH;
    listHour.scrollTop = hourIndex * itemH;
    listMinute.scrollTop = minuteIndex * itemH;
}

/** 휠에서 현재 선택값 읽기 (스크롤 위치 기반) */
function getWheelSelection() {
    const itemH = 36;
    const padding = 72;
    const center = (el) => {
        if (!el) return -1;
        const viewportCenter = el.scrollTop + el.clientHeight / 2;
        const index = Math.round((viewportCenter - padding - itemH / 2) / itemH);
        return Math.max(0, index);
    };
    const listAmpm = document.getElementById('wheelAmpm');
    const listHour = document.getElementById('wheelHour');
    const listMinute = document.getElementById('wheelMinute');
    const ampmItems = ['오전', '오후'];
    const hourItems = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    const minuteItems = ['00', '10', '20', '30', '40', '50'];
    const ampmIdx = center(listAmpm);
    const hourIdx = center(listHour);
    const minuteIdx = center(listMinute);
    return {
        ampm: ampmItems[Math.min(ampmIdx, 1)] || '오후',
        hour12: hourItems[Math.min(hourIdx, 11)] || '12',
        minute10: minuteItems[Math.min(minuteIdx, 5)] || '00'
    };
}

let currentTimeWheelSide = 'start';

const WHEEL_ITEM_H = 36;
const WHEEL_PADDING = 72;

function getWheelCenterIndex(el) {
    if (!el || !el.children.length) return 0;
    const viewportCenter = el.scrollTop + el.clientHeight / 2;
    const index = Math.round((viewportCenter - WHEEL_PADDING - WHEEL_ITEM_H / 2) / WHEEL_ITEM_H);
    return Math.max(0, Math.min(index, el.children.length - 1));
}

function updateWheelSelectionUI(listEl) {
    if (!listEl) return;
    const idx = getWheelCenterIndex(listEl);
    Array.from(listEl.children).forEach((child, i) => {
        child.classList.toggle('selected', i === idx);
    });
}

function updateAllWheelSelectionUI() {
    updateWheelSelectionUI(document.getElementById('wheelAmpm'));
    updateWheelSelectionUI(document.getElementById('wheelHour'));
    updateWheelSelectionUI(document.getElementById('wheelMinute'));
}

function initDateTimeWheel() {
    const overlay = document.getElementById('timeWheelOverlay');
    const startCapsule = document.getElementById('startTimeCapsule');
    const endCapsule = document.getElementById('endTimeCapsule');
    const closeBtn = document.getElementById('timeWheelClose');
    const confirmBtn = document.getElementById('timeWheelConfirm');
    const titleEl = document.getElementById('timeWheelTitle');

    const ampmList = document.getElementById('wheelAmpm');
    const hourList = document.getElementById('wheelHour');
    const minuteList = document.getElementById('wheelMinute');
    if (!ampmList || !hourList || !minuteList) return;

    ampmList.innerHTML = ['오전', '오후'].map((v, i) =>
        `<div class="time-wheel-item" data-value="${v}">${v}</div>`
    ).join('');
    hourList.innerHTML = Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        return `<div class="time-wheel-item" data-value="${n}">${n}</div>`;
    }).join('');
    minuteList.innerHTML = ['00', '10', '20', '30', '40', '50'].map((v) =>
        `<div class="time-wheel-item" data-value="${v}">${v}</div>`
    ).join('');

    [ampmList, hourList, minuteList].forEach((list) => {
        list.addEventListener('scroll', updateAllWheelSelectionUI);
        list.addEventListener('touchmove', updateAllWheelSelectionUI);
    });

    function openWheel(side) {
        currentTimeWheelSide = side;
        const timeInput = document.getElementById(side === 'start' ? 'eventStartTime' : 'eventEndTime');
        if (titleEl) titleEl.textContent = side === 'start' ? '시작 시간' : '종료 시간';
        if (overlay) overlay.classList.add('active');
        const timeStr = timeInput ? timeInput.value : '12:00';
        requestAnimationFrame(() => {
            setWheelToTime(timeStr);
            updateAllWheelSelectionUI();
        });
    }

    function closeWheel() {
        if (overlay) overlay.classList.remove('active');
    }

    function onConfirm() {
        const sel = getWheelSelection();
        const timeStr = getTimeFromWheel(sel.ampm, sel.hour12, parseInt(sel.minute10, 10));
        const timeInput = document.getElementById(currentTimeWheelSide === 'start' ? 'eventStartTime' : 'eventEndTime');
        const capsule = currentTimeWheelSide === 'start' ? startCapsule : endCapsule;
        if (timeInput) timeInput.value = timeStr;
        if (capsule) capsule.textContent = formatTimeCapsule(timeStr);
        if (currentTimeWheelSide === 'start') {
            const endTimeInput = document.getElementById('eventEndTime');
            if (endTimeInput) {
                endTimeInput.value = timeStr;
                if (endCapsule) endCapsule.textContent = formatTimeCapsule(timeStr);
            }
        }
        closeWheel();
    }

    if (startCapsule) startCapsule.addEventListener('click', () => openWheel('start'));
    if (endCapsule) endCapsule.addEventListener('click', () => openWheel('end'));
    if (closeBtn) closeBtn.addEventListener('click', closeWheel);
    if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWheel(); });

    document.getElementById('eventStartDate')?.addEventListener('change', updateDateTimeDisplays);
    document.getElementById('eventEndDate')?.addEventListener('change', updateDateTimeDisplays);
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
window.updateNotificationUI = updateNotificationUI;
window.closeEventModal = closeEventModal;
window.showLoading = showLoading;
window.showToast = showToast;
window.app = {
    updateNotificationUI: updateNotificationUI
};

// Initialize today summary toggle after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTodaySummaryToggle();
});

