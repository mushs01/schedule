/**
 * Calendar Module
 * Manages FullCalendar initialization and event handling
 */

let calendar;
let currentFilter = 'showAll'; // 초기 로딩 시 모든 담당자 선택 → 모든 일정 표시
let holidays = {}; // 공휴일 데이터 저장

// Person colors mapping (글로벌 변수로 변경)
window.PERSON_COLORS = window.PERSON_COLORS || {
    'all': '#1a73e8',   // 전체 → 파랑
    'dad': '#0f9d58',   // 아빠 → 초록
    'mom': '#f4511e',   // 엄마 → 주황
    'juhwan': '#9c27b0', // 주환 → 보라
    'taehwan': '#f9a825' // 태환 → 노랑
};

// 지난 일정 색상 (채도를 거의 없애고 회색에 가깝게)
window.PERSON_COLORS_PAST = {
    'all': '#8095a8',   // 회색빛 파란색
    'mom': '#a88a7f',   // 회색빛 주황색
    'dad': '#7a8a7a',   // 회색빛 초록색
    'juhwan': '#8a7a8f', // 회색빛 보라색
    'taehwan': '#9a9170' // 회색빛 노랑
};

// Person names mapping (글로벌 변수로 변경)
window.PERSON_NAMES = window.PERSON_NAMES || {
    'all': '전체',
    'dad': '아빠',
    'mom': '엄마',
    'juhwan': '주환',
    'taehwan': '태환'
};

/**
 * Initialize FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) {
        console.error('Calendar element not found!');
        return;
    }
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'ko',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        buttonText: {
            today: '오늘',
            week: '주간',
            month: '월간',
            day: '일간'
        },
        slotMinTime: '06:00:00',
        slotMaxTime: '24:00:00',
        slotDuration: '01:00:00', // 1시간 단위로 표시
        slotLabelInterval: '01:00:00', // 1시간마다 라벨 표시
        snapDuration: '00:30:00', // 드래그 시 30분 단위로 스냅
        height: 'auto',
        nowIndicator: true,
        editable: false, // 드래그로 일정 이동 비활성화
        selectable: true, // 빈 시간대 선택은 유지 (일정 추가용)
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        longPressDelay: 0, // 모바일에서 즉시 선택 가능
        selectLongPressDelay: 0, // 길게 누르지 않아도 선택 가능
        allDaySlot: false, // all-day 줄 숨기기
        
        // Event handlers
        select: handleDateSelect,
        eventClick: handleEventClick,
        dateClick: handleDateClick,
        
        // 월 보기에서 개별 일정 클릭 방지
        eventAllow: function(dropLocation, draggedEvent) {
            return calendar.view.type !== 'dayGridMonth';
        },
        // eventDrop: handleEventDrop, // 드래그 앤 드롭 비활성화
        // eventResize: handleEventResize, // 리사이즈 비활성화
        
        // Load events
        events: loadEvents,
        
        // Event rendering
        eventDidMount: function(info) {
            // Add past event class
            if (info.event.extendedProps.isPast) {
                info.el.classList.add('past-event');
            }
            
            // 월 보기에서 개별 일정 클릭 방지
            if (info.view.type === 'dayGridMonth') {
                info.el.style.cursor = 'default';
                info.el.style.pointerEvents = 'none';
            }
            
            // Add tooltip
            info.el.title = `${PERSON_NAMES[info.event.extendedProps.person]}: ${info.event.title}`;
        },
        
        // 날짜 변경 시 헤더 업데이트 및 공휴일 표시
        datesSet: function(dateInfo) {
            updateHeaderDate();
            // 약간의 지연 후 공휴일 표시 (DOM이 렌더링된 후)
            setTimeout(() => markHolidays(), 100);
        }
    });
    
    calendar.render();
    updateHeaderDate(); // 초기 날짜 표시
    
    // 초기 공휴일 표시
    setTimeout(() => markHolidays(), 200);
}

/**
 * Expand recurring events
 */
function expandRecurringEvent(schedule, startDate, endDate) {
    const events = [];
    const repeatType = schedule.repeat_type;
    
    if (!repeatType || repeatType === 'none') {
        // 반복 없음 - 원본 일정 하나만 반환
        return [schedule];
    }
    
    const scheduleStart = new Date(schedule.start);
    const scheduleEnd = new Date(schedule.end);
    const duration = scheduleEnd - scheduleStart;
    
    // 반복 종료일 (설정되지 않았으면 조회 범위의 끝)
    const repeatEndDate = schedule.repeat_end_date 
        ? new Date(schedule.repeat_end_date)
        : endDate;
    
    let currentDate = new Date(scheduleStart);
    
    // 반복 일정 생성 (최대 100개로 제한)
    let count = 0;
    const maxCount = 100;
    
    while (currentDate <= repeatEndDate && currentDate <= endDate && count < maxCount) {
        // 조회 범위 내에 있는 경우에만 추가
        if (currentDate >= startDate) {
            const eventStart = new Date(currentDate);
            const eventEnd = new Date(currentDate.getTime() + duration);
            
            events.push({
                ...schedule,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                id: `${schedule.id}_${currentDate.toISOString()}`, // 고유 ID
                original_id: schedule.id // 원본 ID 보존
            });
        }
        
        // 다음 반복 날짜 계산
        switch (repeatType) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            default:
                break;
        }
        
        count++;
    }
    
    return events;
}

/**
 * Load events from API
 */
async function loadEvents(fetchInfo, successCallback, failureCallback) {
    try {
        // 항상 전체 일정을 가져온 후 클라이언트에서 필터링
        const schedules = await api.getSchedules({
            startDate: fetchInfo.startStr,
            endDate: fetchInfo.endStr,
            person: 'all'
        });
        
        console.log('📊 Total schedules loaded:', schedules.length);
        console.log('🔍 Current filter:', currentFilter);
        
        // 클라이언트 측 필터링
        let filteredSchedules = schedules;
        
        if (currentFilter === 'none' || !currentFilter) {
            // 아무것도 선택 안 함
            filteredSchedules = [];
            console.log('❌ No filter - showing nothing');
        } else if (currentFilter === 'showAll') {
            // 모든 담당자 선택 - 전체 일정 표시
            filteredSchedules = schedules;
            console.log('✅ Show all schedules - no filtering');
        } else if (Array.isArray(currentFilter)) {
            // 여러 담당자 선택
            if (currentFilter.length === 0) {
                filteredSchedules = [];
            } else {
                // 선택된 담당자들의 일정만 표시
                filteredSchedules = schedules.filter(schedule => 
                    currentFilter.includes(schedule.person)
                );
                console.log(`✅ Multiple filters: ${currentFilter.join(', ')}`);
            }
        } else {
            // 단일 담당자 선택 (all, dad, mom, juhwan, taehwan)
            filteredSchedules = schedules.filter(schedule => 
                schedule.person === currentFilter
            );
            console.log(`✅ Single filter: ${currentFilter}`);
        }
        
        console.log('✨ Filtered schedules:', filteredSchedules.length);
        filteredSchedules.forEach(s => console.log(`  - ${s.title} (${s.person})`));
        
        // 반복 일정 확장
        const expandedSchedules = [];
        filteredSchedules.forEach(schedule => {
            const expanded = expandRecurringEvent(
                schedule,
                new Date(fetchInfo.startStr),
                new Date(fetchInfo.endStr)
            );
            expandedSchedules.push(...expanded);
        });
        
        console.log('🔁 Expanded schedules (with recurring):', expandedSchedules.length);
        
        const events = expandedSchedules.map(schedule => {
            // 지난 일정인지 확인
            const now = new Date();
            const scheduleEnd = schedule.end ? new Date(schedule.end) : new Date(schedule.start);
            const isPast = scheduleEnd < now;
            
            // 담당자에 따른 색상 선택 (지난 일정이면 어두운 색상)
            const color = isPast 
                ? window.PERSON_COLORS_PAST[schedule.person] || window.PERSON_COLORS_PAST['all']
                : window.PERSON_COLORS[schedule.person] || window.PERSON_COLORS['all'];
            
            return {
                id: schedule.id,
                title: schedule.title,
                start: schedule.start,
                end: schedule.end,
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                    id: schedule.id,  // ID를 extendedProps에도 포함
                    description: schedule.description,
                    person: schedule.person,
                    isPast: isPast,
                    kakao_notification_start: schedule.kakao_notification_start || false,
                    kakao_notification_end: schedule.kakao_notification_end || false
                }
            };
        });
        
        successCallback(events);
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('일정을 불러오는데 실패했습니다.', 'error');
        failureCallback(error);
    }
}

/**
 * Handle date selection (for creating new event)
 */
function handleDateSelect(selectInfo) {
    console.log('Date selected:', selectInfo);
    console.log('Start:', selectInfo.start, 'End:', selectInfo.end);
    
    // 월 보기에서는 날짜 선택 시 일정 추가 모달 열지 않음
    if (calendar.view.type === 'dayGridMonth') {
        console.log('❌ Month view: date select disabled');
        calendar.unselect();
        return;
    }
    
    // selectInfo 전체를 전달 (start와 end 포함)
    if (window.openEventModal) {
        window.openEventModal(selectInfo);
    } else {
        console.error('openEventModal not found!');
    }
    
    calendar.unselect();
}

/**
 * Handle event click (for viewing/editing event)
 */
function handleEventClick(clickInfo) {
    const event = clickInfo.event;
    console.log('🖱️ Event clicked:', event);
    
    // 월 보기에서는 개별 일정 클릭 무시
    if (calendar.view.type === 'dayGridMonth') {
        console.log('❌ Month view: individual event click disabled');
        return;
    }
    
    console.log('📋 Event ID:', event.id);
    console.log('📋 Event extendedProps:', event.extendedProps);
    console.log('📋 Event title:', event.title);
    
    // Use window.showEventDetail to ensure it's available
    if (window.showEventDetail) {
        console.log('✅ Calling showEventDetail...');
        window.showEventDetail(event);
    } else {
        console.error('❌ showEventDetail not found!');
    }
}

/**
 * Handle date click (월 일정표에서 날짜 클릭 시)
 */
async function handleDateClick(dateClickInfo) {
    console.log('📅 Date clicked:', dateClickInfo);
    
    // 월 보기가 아니면 기본 동작
    if (calendar.view.type !== 'dayGridMonth') {
        return;
    }
    
    const clickedDate = dateClickInfo.date;
    const dateStr = clickedDate.toISOString().split('T')[0];
    
    // 해당 날짜의 모든 일정 가져오기
    const allEvents = calendar.getEvents();
    const dayEvents = allEvents.filter(event => {
        const eventDate = event.start.toISOString().split('T')[0];
        return eventDate === dateStr;
    });
    
    // 월 보기에서는 항상 하루 일정 요약 모달 표시 (일정이 없어도)
    showDaySchedule(clickedDate, dayEvents);
}

/**
 * Show day schedule modal
 */
function showDaySchedule(date, events) {
    const modal = document.getElementById('eventDetailModal');
    if (!modal) return;
    
    const detail = document.getElementById('eventDetail');
    if (!detail) return;
    
    // 날짜 포맷
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
    
    // 시간순으로 정렬
    events.sort((a, b) => a.start - b.start);
    
    // 일정 목록 생성
    let eventsHTML = '';
    if (events.length === 0) {
        eventsHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <i class="material-icons" style="font-size: 48px; opacity: 0.3; margin-bottom: 12px;">event_busy</i>
                <div style="font-size: 14px;">일정이 없습니다</div>
            </div>
        `;
    } else {
        events.forEach(event => {
            const startTime = event.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const endTime = event.end ? event.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
            const personName = window.PERSON_NAMES[event.extendedProps.person] || '전체';
            const color = event.backgroundColor;
            
            eventsHTML += `
                <div class="day-schedule-item" style="border-left: 4px solid ${color}; padding-left: 12px; margin-bottom: 12px; cursor: default;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-weight: 600; font-size: 14px;">${startTime}${endTime ? ' - ' + endTime : ''}</span>
                        <span class="event-person-badge" style="background: ${color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${personName}</span>
                    </div>
                    <div style="font-size: 15px; font-weight: 500; color: var(--text-primary);">${event.title}</div>
                    ${event.extendedProps.description ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${event.extendedProps.description}</div>` : ''}
                </div>
            `;
        });
    }
    
    detail.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="font-size: 18px; font-weight: 600; color: var(--text-primary);">${dateStr}</h3>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">총 ${events.length}개 일정</div>
        </div>
        <div style="max-height: 400px; overflow-y: auto; margin-bottom: 16px;">
            ${eventsHTML}
        </div>
        <div style="display: flex; justify-content: center; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <button id="addEventFromDayBtn" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px;">
                <i class="material-icons" style="font-size: 18px;">add</i>
                <span>일정 추가</span>
            </button>
        </div>
    `;
    
    // 일정 추가 버튼 이벤트
    const addBtn = detail.querySelector('#addEventFromDayBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            // 선택한 날짜로 일정 추가 모달 열기
            if (window.openEventModal) {
                window.openEventModal({
                    date: date,
                    dateStr: date.toISOString().split('T')[0],
                    allDay: false
                });
            }
        });
    }
    
    // 모달 열기
    modal.classList.add('active');
}

/**
 * Handle event drag and drop
 */
async function handleEventDrop(dropInfo) {
    const event = dropInfo.event;
    
    try {
        showLoading(true);
        
        await api.updateSchedule(event.id, {
            start_datetime: event.start.toISOString(),
            end_datetime: event.end ? event.end.toISOString() : null
        });
        
        showToast('일정이 이동되었습니다.', 'success');
    } catch (error) {
        console.error('Error updating event:', error);
        showToast('일정 이동에 실패했습니다.', 'error');
        dropInfo.revert();
    } finally {
        showLoading(false);
    }
}

/**
 * Handle event resize
 */
async function handleEventResize(resizeInfo) {
    const event = resizeInfo.event;
    
    try {
        showLoading(true);
        
        await api.updateSchedule(event.id, {
            start_datetime: event.start.toISOString(),
            end_datetime: event.end ? event.end.toISOString() : null
        });
        
        showToast('일정 시간이 변경되었습니다.', 'success');
    } catch (error) {
        console.error('Error resizing event:', error);
        showToast('일정 시간 변경에 실패했습니다.', 'error');
        resizeInfo.revert();
    } finally {
        showLoading(false);
    }
}

/**
 * Change calendar view
 */
function changeView(viewName) {
    calendar.changeView(viewName);
    updateHeaderDate(); // view 변경 시 헤더 날짜 업데이트
}

/**
 * Refresh calendar events
 */
function refreshCalendar() {
    calendar.refetchEvents();
}

/**
 * Filter calendar by person
 */
function filterByPerson(person) {
    currentFilter = person;
    refreshCalendar();
}

/**
 * Filter calendar by multiple persons
 */
function filterByPersons(persons) {
    console.log('🎯 filterByPersons called with:', persons);
    
    // 모든 담당자가 선택된 경우 체크 (all, dad, mom, juhwan, taehwan = 5개)
    const allPersons = ['all', 'dad', 'mom', 'juhwan', 'taehwan'];
    const allSelected = allPersons.every(p => persons.includes(p));
    
    if (persons.length === 0) {
        // 아무것도 선택 안 함
        currentFilter = 'none';
        console.log('❌ No person selected - filter set to: none');
    } else if (allSelected) {
        // 모든 담당자 선택 - 전체 일정 표시
        currentFilter = 'showAll';
        console.log('✅ All persons selected - showing all schedules');
    } else if (persons.length === 1) {
        // 단일 담당자 선택 (all, dad, mom, juhwan, taehwan)
        currentFilter = persons[0];
        console.log('✅ Single person selected - filter set to:', persons[0]);
    } else {
        // 여러 담당자 선택 - 배열로 저장
        currentFilter = persons;
        console.log('✅ Multiple persons selected - filter set to:', persons);
    }
    
    refreshCalendar();
}

/**
 * Get current calendar date
 */
function getCurrentDate() {
    return calendar.getDate();
}

// Export functions
/**
 * Update header date display
 */
function updateHeaderDate() {
    if (!calendar) return;
    
    const currentDate = calendar.getDate();
    const currentView = calendar.view.type;
    const currentMonthEl = document.getElementById('currentMonth');
    
    if (!currentMonthEl) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const date = currentDate.getDate();
    
    let displayText = '';
    
    if (currentView === 'dayGridMonth') {
        // 월 보기: "2025년 10월"
        displayText = `${year}년 ${month}월`;
    } else if (currentView === 'timeGridWeek' || currentView === 'listWeek') {
        // 주 보기: "2025년 10월"
        displayText = `${year}년 ${month}월`;
    } else if (currentView === 'timeGridDay') {
        // 일 보기: "2025년 10월 18일"
        displayText = `${year}년 ${month}월 ${date}일`;
    }
    
    currentMonthEl.textContent = displayText;
}

/**
 * Navigate to today
 */
function navigateToday() {
    if (!calendar) {
        console.error('Calendar not initialized');
        return;
    }
    calendar.today();
    updateHeaderDate();
}

/**
 * Navigate to previous period
 */
function navigatePrev() {
    if (!calendar) {
        console.error('Calendar not initialized');
        return;
    }
    calendar.prev();
    updateHeaderDate();
}

/**
 * Navigate to next period
 */
function navigateNext() {
    if (!calendar) {
        console.error('Calendar not initialized');
        return;
    }
    calendar.next();
    updateHeaderDate();
}

/**
 * Fetch Korean holidays from API
 */
async function fetchHolidays(year) {
    if (holidays[year]) {
        return holidays[year];
    }
    
    try {
        // 한국천문연구원 특일 정보 API 사용
        const serviceKey = 'YOUR_API_KEY'; // 실제 서비스 키 필요
        const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&ServiceKey=${serviceKey}&_type=json`;
        
        // API 키가 없으면 기본 공휴일만 사용
        holidays[year] = getBasicHolidays(year);
        
        console.log(`📅 ${year}년 공휴일:`, holidays[year]);
        return holidays[year];
    } catch (error) {
        console.error('공휴일 정보 가져오기 실패:', error);
        holidays[year] = getBasicHolidays(year);
        return holidays[year];
    }
}

/**
 * Get basic Korean holidays (without API)
 */
function getBasicHolidays(year) {
    const basicHolidays = {};
    
    // 고정 공휴일
    basicHolidays[`${year}-01-01`] = '신정';
    basicHolidays[`${year}-03-01`] = '삼일절';
    basicHolidays[`${year}-05-05`] = '어린이날';
    basicHolidays[`${year}-06-06`] = '현충일';
    basicHolidays[`${year}-08-15`] = '광복절';
    basicHolidays[`${year}-10-03`] = '개천절';
    basicHolidays[`${year}-10-09`] = '한글날';
    basicHolidays[`${year}-12-25`] = '크리스마스';
    
    // 2025년 음력 공휴일 (대체공휴일 포함)
    if (year === 2025) {
        basicHolidays['2025-01-28'] = '설날 연휴';
        basicHolidays['2025-01-29'] = '설날';
        basicHolidays['2025-01-30'] = '설날 연휴';
        basicHolidays['2025-05-05'] = '부처님오신날';
        basicHolidays['2025-10-05'] = '추석 연휴';
        basicHolidays['2025-10-06'] = '추석';
        basicHolidays['2025-10-07'] = '추석 연휴';
        basicHolidays['2025-10-08'] = '대체공휴일';
    }
    
    return basicHolidays;
}

/**
 * Add holiday class to calendar dates
 */
function markHolidays() {
    if (!calendar) return;
    
    const currentDate = calendar.getDate();
    const year = currentDate.getFullYear();
    
    fetchHolidays(year).then(yearHolidays => {
        // 모든 날짜 셀에서 holiday 클래스 제거
        document.querySelectorAll('.fc-day.holiday').forEach(el => {
            el.classList.remove('holiday');
        });
        
        // 공휴일 표시
        Object.keys(yearHolidays).forEach(dateStr => {
            const dayEl = document.querySelector(`[data-date="${dateStr}"]`);
            if (dayEl) {
                dayEl.classList.add('holiday');
                dayEl.setAttribute('title', yearHolidays[dateStr]);
            }
        });
    });
}

window.calendarModule = {
    init: initCalendar,
    changeView,
    refresh: refreshCalendar,
    filter: filterByPerson,
    filterByPersons,
    getCurrentDate,
    navigateToday,
    navigatePrev,
    navigateNext
};

console.log('✅ calendarModule exported:', window.calendarModule);

