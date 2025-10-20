/**
 * Calendar Module
 * Manages FullCalendar initialization and event handling
 */

let calendar;
let currentFilter = 'showAll'; // 초기 로딩 시 모든 담당자 선택 → 모든 일정 표시

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
            
            // Add tooltip
            info.el.title = `${PERSON_NAMES[info.event.extendedProps.person]}: ${info.event.title}`;
        },
        
        // 날짜 변경 시 헤더 업데이트
        datesSet: function(dateInfo) {
            updateHeaderDate();
        }
    });
    
    calendar.render();
    updateHeaderDate(); // 초기 날짜 표시
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

