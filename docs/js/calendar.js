/**
 * Calendar Module
 * Manages FullCalendar initialization and event handling
 */

let calendar;
let currentFilter = 'all';

// Person colors mapping (글로벌 변수로 변경)
window.PERSON_COLORS = window.PERSON_COLORS || {
    'all': '#808080',
    'dad': '#3788d8',
    'mom': '#9b59b6',
    'juhwan': '#27ae60',
    'taehwan': '#f39c12'
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
        height: 'auto',
        nowIndicator: true,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        longPressDelay: 0, // 모바일에서 즉시 선택 가능
        selectLongPressDelay: 0, // 길게 누르지 않아도 선택 가능
        
        // Event handlers
        select: handleDateSelect,
        eventClick: handleEventClick,
        eventDrop: handleEventDrop,
        eventResize: handleEventResize,
        
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
        }
    });
    
    calendar.render();
}

/**
 * Load events from API
 */
async function loadEvents(fetchInfo, successCallback, failureCallback) {
    try {
        // currentFilter가 배열인 경우 처리
        let filterPerson = 'all';
        if (Array.isArray(currentFilter)) {
            // 여러 담당자가 선택된 경우
            filterPerson = 'all'; // 일단 전체를 가져온 후 클라이언트에서 필터링
        } else {
            filterPerson = currentFilter;
        }
        
        const schedules = await api.getSchedules({
            startDate: fetchInfo.startStr,
            endDate: fetchInfo.endStr,
            person: filterPerson
        });
        
        // 클라이언트 측 필터링 (배열인 경우)
        let filteredSchedules = schedules;
        if (Array.isArray(currentFilter)) {
            filteredSchedules = schedules.filter(schedule => 
                currentFilter.includes(schedule.person)
            );
        } else if (currentFilter === 'none') {
            filteredSchedules = [];
        }
        
        const events = filteredSchedules.map(schedule => ({
            id: schedule.id,
            title: schedule.title,
            start: schedule.start,
            end: schedule.end,
            backgroundColor: schedule.color,
            borderColor: schedule.color,
            extendedProps: {
                description: schedule.description,
                person: schedule.person,
                isPast: schedule.isPast
            }
        }));
        
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
    console.log('Event clicked:', event);
    
    // Use window.showEventDetail to ensure it's available
    if (window.showEventDetail) {
        window.showEventDetail(event);
    } else {
        console.error('showEventDetail not found!');
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
    console.log('filterByPersons called with:', persons);
    
    // persons 배열에 'all'이 포함되어 있으면 전체 표시
    if (persons.includes('all')) {
        currentFilter = 'all';
        console.log('Filter set to: all');
    } else if (persons.length === 0) {
        currentFilter = 'none'; // 아무것도 표시 안 함
        console.log('Filter set to: none');
    } else if (persons.length === 1) {
        currentFilter = persons[0];
        console.log('Filter set to:', persons[0]);
    } else {
        currentFilter = persons; // 배열로 저장
        console.log('Filter set to array:', persons);
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
window.calendarModule = {
    init: initCalendar,
    changeView,
    refresh: refreshCalendar,
    filter: filterByPerson,
    filterByPersons,
    getCurrentDate
};

console.log('✅ calendarModule exported:', window.calendarModule);

