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
        height: 'auto',
        nowIndicator: true,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        
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
        const schedules = await api.getSchedules({
            startDate: fetchInfo.startStr,
            endDate: fetchInfo.endStr,
            person: currentFilter
        });
        
        const events = schedules.map(schedule => ({
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
    const startDate = new Date(selectInfo.start);
    openEventModal(startDate);
    calendar.unselect();
}

/**
 * Handle event click (for viewing/editing event)
 */
function handleEventClick(clickInfo) {
    const event = clickInfo.event;
    showEventDetail(event);
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
    getCurrentDate
};

console.log('✅ calendarModule exported:', window.calendarModule);

