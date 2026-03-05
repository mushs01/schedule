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
 * Hex 색상을 RGBA로 변환하는 헬퍼 함수
 */
function hexToRgba(hex, alpha = 1) {
    // #을 제거
    hex = hex.replace('#', '');
    
    // RGB 값 추출
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
        // 주 일정 헤더 커스터마이징 - 요일(위) + 날짜(아래)
        dayHeaderContent: function(arg) {
            if (arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay') {
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dayOfWeek = days[arg.date.getDay()];
                const dayOfMonth = arg.date.getDate();
                
                return {
                    html: `<div style="display: flex; flex-direction: column; align-items: center; line-height: 1; gap: 1px;">
                        <div style="font-size: 10px; font-weight: 400;">${dayOfWeek}</div>
                        <div style="font-size: 14px; font-weight: 500;">${dayOfMonth}</div>
                    </div>`
                };
            }
            return { html: arg.text };
        },
        // 월 일정 날짜 표시 - 숫자만 표시 ("8일" → "8")
        dayCellContent: function(arg) {
            if (arg.view.type === 'dayGridMonth') {
                return { html: arg.dayNumberText.replace('일', '') };
            }
            return { html: arg.dayNumberText };
        },
        slotMinTime: '06:00:00',
        slotMaxTime: '24:00:00',
        slotDuration: '01:00:00', // 1시간 단위로 표시
        slotLabelInterval: '01:00:00', // 1시간마다 라벨 표시
        slotLabelFormat: function(date) {
            const hour = date.date.hour;
            if (hour === 6) return '';
            const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
            return `${hour12}시`;
        },
        // 시간은 위줄, 오전/오후는 아래줄에 표시 (레이블 폭 절약 → 일정표 영역 확대)
        slotLabelContent: function(arg) {
            const hour = arg.date.getHours();
            if (hour === 6) return { html: '' };
            const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
            const line2 = hour === 7 ? '오전' : (hour === 12 ? '오후' : '');
            const html = line2
                ? `<div class="fc-slot-label-line1">${hour12}시</div><div class="fc-slot-label-line2">${line2}</div>`
                : `<div class="fc-slot-label-line1">${hour12}시</div>`;
            return { html };
        },
        snapDuration: '00:30:00', // 드래그 시 30분 단위로 스냅
        contentHeight: 'auto', // 콘텐츠 높이는 auto
        expandRows: false, // 행 확장 방지하여 스크롤 활성화
        nowIndicator: true,
        editable: false, // 드래그로 일정 이동 비활성화
        selectable: false, // 드래그로 일정 추가 비활성화 (플로팅 버튼으로만 추가)
        selectMirror: false,
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
            
            // 월 보기에서 담당자별 배경색 설정
            if (info.view.type === 'dayGridMonth') {
                info.el.style.cursor = 'pointer'; // 클릭 가능 표시
                
                // 담당자별 배경색 설정 (과거 일정은 회색톤)
                const person = info.event.extendedProps.person || 'all';
                const isPast = info.event.extendedProps.isPast;
                
                // 과거 일정이면 회색톤 색상, 아니면 원래 색상
                const baseColor = isPast 
                    ? (window.PERSON_COLORS_PAST[person] || window.PERSON_COLORS_PAST['all'])
                    : (window.PERSON_COLORS[person] || window.PERSON_COLORS['all']);
                
                // 직접 스타일 적용
                info.el.style.backgroundColor = baseColor;
                info.el.style.borderLeftColor = baseColor;
                info.el.style.borderLeftWidth = '3px';
                info.el.style.borderLeftStyle = 'solid';
                
                // 텍스트 색상을 흰색으로
                const titleEl = info.el.querySelector('.fc-event-title');
                if (titleEl) {
                    titleEl.style.color = '#ffffff';
                }
            }
            
            // Add tooltip
            info.el.title = `${PERSON_NAMES[info.event.extendedProps.person]}: ${info.event.title}`;
        },
        
        // 날짜 변경 시 헤더 업데이트 및 공휴일 표시
        datesSet: function(dateInfo) {
            updateHeaderDate();
            // 약간의 지연 후 공휴일 표시 (DOM이 렌더링된 후)
            setTimeout(() => {
                markHolidays();
            }, 100);
            
            // 주간/일간 뷰일 때만 현재 시간 중심으로 스크롤
            if (calendar.view.type === 'timeGridWeek' || calendar.view.type === 'timeGridDay') {
                setTimeout(() => {
                    scrollToCurrentTime();
                }, 300);
            }
            
            // 왼쪽 시간 레이블에 현재시간 붉은색 표시
            if (calendar.view.type === 'timeGridWeek' || calendar.view.type === 'timeGridDay') {
                setTimeout(updateCurrentTimeLabel, 350);
            }
            
            // 모든 뷰에 스와이프 제스처 추가 (주간/일간/월간)
            setTimeout(() => {
                addSwipeGestureToDateHeader();
            }, 100);
        }
    });
    
    calendar.render();
    updateHeaderDate(); // 초기 날짜 표시
    
    // 초기 공휴일 표시
    setTimeout(() => markHolidays(), 200);
    
    // 초기 렌더링 시 현재 시간 중심으로 스크롤 + 현재시간 레이블
    setTimeout(() => {
        console.log('🎯 초기 렌더링 스크롤 시도, 현재 뷰:', calendar.view.type);
        if (calendar.view.type === 'timeGridWeek' || calendar.view.type === 'timeGridDay') {
            scrollToCurrentTime();
            updateCurrentTimeLabel();
        } else {
            console.log('⚠️ 현재 뷰가 timeGrid가 아닙니다:', calendar.view.type);
        }
    }, 500);
    
    // 현재시간 레이블 1분마다 갱신
    setInterval(updateCurrentTimeLabel, 60000);
    
    // 초기 스와이프 제스처 활성화
    setTimeout(() => {
        addSwipeGestureToDateHeader();
    }, 600);
    
    // 모바일 첫 로드 시 레이아웃 지연으로 크기 0 되는 경우 대비 (1회만)
    setTimeout(() => {
        try {
            if (calendar) calendar.updateSize();
        } catch (e) { /* ignore */ }
    }, 600);
}

/**
 * 왼쪽 시간 레이블에 현재시간 붉은색으로 표시 (예: 8:30)
 */
function updateCurrentTimeLabel() {
    if (!calendar || (calendar.view.type !== 'timeGridWeek' && calendar.view.type !== 'timeGridDay')) return;
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 6 || hour >= 24) return; // 표시 범위 밖
    
    const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;
    const slotTime = `${String(hour).padStart(2, '0')}:00:00`;
    
    document.querySelectorAll('.fc-now-time-label').forEach(el => el.remove());
    
    const slotEl = document.querySelector(`.fc-timegrid-slot[data-time="${slotTime}"]`);
    if (!slotEl) return;
    
    const cushion = slotEl.querySelector('.fc-timegrid-slot-label-cushion');
    if (!cushion) return;
    
    const span = document.createElement('span');
    span.className = 'fc-now-time-label';
    span.textContent = timeStr;
    cushion.appendChild(span);
}

/**
 * 현재 시간을 중심으로 스크롤
 */
function scrollToCurrentTime() {
    // 모든 스크롤 컨테이너를 찾아서 가장 큰 것을 선택
    const allScrollers = document.querySelectorAll('.fc-scroller');
    
    if (allScrollers.length === 0) {
        console.warn('❌ 스크롤 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // scrollHeight가 가장 큰 요소 선택 (실제 시간표 스크롤러)
    let scrollerEl = null;
    let maxScrollHeight = 0;
    
    allScrollers.forEach((el, idx) => {
        console.log(`🔍 스크롤러 [${idx}]: scrollHeight=${el.scrollHeight}, clientHeight=${el.clientHeight}`);
        if (el.scrollHeight > maxScrollHeight) {
            maxScrollHeight = el.scrollHeight;
            scrollerEl = el;
        }
    });
    
    if (!scrollerEl || maxScrollHeight < 100) {
        console.warn('❌ 적절한 스크롤 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    console.log('✅ 선택된 스크롤 컨테이너:', scrollerEl.className, `(scrollHeight: ${scrollerEl.scrollHeight}px)`);
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 현재 시간을 시간 단위로 계산 (예: 16:30 = 16.5시간)
    const currentTime = currentHour + currentMinute / 60;
    
    // 전체 시간 범위 (06:00 ~ 24:00 = 18시간)
    const minTime = 6;
    const maxTime = 24;
    const totalHours = maxTime - minTime;
    
    // 현재 시간이 표시 범위 내에 있는지 확인
    if (currentTime < minTime) {
        console.log(`📍 현재 시간(${currentHour}:${currentMinute.toString().padStart(2, '0')})이 표시 범위 이전입니다. 맨 위로 스크롤합니다.`);
        scrollerEl.scrollTop = 0;
        return;
    }
    
    if (currentTime > maxTime) {
        console.log(`📍 현재 시간(${currentHour}:${currentMinute.toString().padStart(2, '0')})이 표시 범위 이후입니다. 맨 아래로 스크롤합니다.`);
        scrollerEl.scrollTop = scrollerEl.scrollHeight;
        return;
    }
    
    // 스크롤 가능한 전체 높이
    const scrollHeight = scrollerEl.scrollHeight;
    const visibleHeight = scrollerEl.clientHeight;
    
    // 현재 시간의 위치 계산 (06:00부터의 비율)
    const timeRatio = (currentTime - minTime) / totalHours;
    const targetScrollTop = scrollHeight * timeRatio;
    
    // 현재 시간이 화면 중앙에 오도록 조정
    const centeredScrollTop = targetScrollTop - (visibleHeight / 2);
    
    // 스크롤 (최소 0, 최대 scrollHeight - visibleHeight)
    const finalScrollTop = Math.max(0, Math.min(centeredScrollTop, scrollHeight - visibleHeight));
    scrollerEl.scrollTop = finalScrollTop;
    
    console.log(`📍 현재 시간 중심 스크롤 적용:`);
    console.log(`   - 현재 시간: ${currentHour}:${currentMinute.toString().padStart(2, '0')} (${currentTime.toFixed(2)}시간)`);
    console.log(`   - 시간 비율: ${(timeRatio * 100).toFixed(1)}%`);
    console.log(`   - 전체 높이: ${scrollHeight}px, 보이는 높이: ${visibleHeight}px`);
    console.log(`   - 스크롤 위치: ${finalScrollTop}px`);
}

/**
 * Expand recurring events
 */
function expandRecurringEvent(schedule, startDate, endDate) {
    const events = [];
    const repeatType = schedule.repeat_type || 'none';
    const excludeDates = schedule.exclude_dates || [];
    
    console.log(`🔄 expandRecurringEvent: ${schedule.title}, repeatType: ${repeatType}`);
    
    if (repeatType === 'none') {
        // 반복 없음 - 원본 일정 하나만 반환
        console.log(`  ✅ 반복 없음 - 원본 반환`);
        return [schedule];
    }
    
    const scheduleStart = new Date(schedule.start);
    const scheduleEnd = new Date(schedule.end);
    const duration = scheduleEnd - scheduleStart;
    
    // 반복 종료일 (설정되지 않았으면 시작일로부터 1년 후)
    const repeatEndDate = schedule.repeat_end_date 
        ? new Date(schedule.repeat_end_date)
        : new Date(scheduleStart.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    console.log('🔄 반복 일정 확장:');
    console.log('  - 제목:', schedule.title);
    console.log('  - 시작일:', scheduleStart.toISOString());
    console.log('  - 반복 종료일:', repeatEndDate.toISOString());
    console.log('  - 종료일 설정됨:', !!schedule.repeat_end_date);
    console.log(`  - 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
    console.log('  - repeat_weekdays:', schedule.repeat_weekdays);
    
    let currentDate = new Date(scheduleStart);
    
    // 반복 일정 생성 (최대 500개로 제한)
    let count = 0;
    const maxCount = 500;
    
    if (repeatType === 'daily') {
        // 매일 반복
        while (currentDate <= repeatEndDate && currentDate <= endDate && count < maxCount) {
            if (currentDate >= startDate) {
                const eventStart = new Date(currentDate);
                const eventEnd = new Date(currentDate.getTime() + duration);
                const dateStr = eventStart.toISOString().split('T')[0];
                
                // 제외 날짜 확인
                if (!excludeDates.includes(dateStr)) {
                    events.push({
                        ...schedule,
                        start: eventStart.toISOString(),
                        end: eventEnd.toISOString(),
                        id: `${schedule.id}_${currentDate.toISOString()}`,
                        original_id: schedule.id
                    });
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
            count++;
        }
    } else if (repeatType === 'weekly') {
        // 매주 반복 - 선택된 요일들에만 생성
        let repeatWeekdays = schedule.repeat_weekdays || [];
        
        // repeat_weekdays가 비어있으면 시작 요일을 기본값으로 사용
        if (!Array.isArray(repeatWeekdays) || repeatWeekdays.length === 0) {
            repeatWeekdays = [scheduleStart.getDay()];
            console.log(`  ⚠️ repeat_weekdays가 비어있어서 시작 요일(${scheduleStart.getDay()})로 설정`);
        }
        
        console.log(`  📅 매주 반복 설정:`);
        console.log(`    - 원본 시작일: ${scheduleStart.toISOString()}`);
        console.log(`    - 반복 종료일: ${repeatEndDate.toISOString()}`);
        console.log(`    - 조회 시작: ${startDate.toISOString()}`);
        console.log(`    - 조회 종료: ${endDate.toISOString()}`);
        console.log(`    - 반복 요일: ${repeatWeekdays}`);
        console.log(`    - 시작 요일: ${scheduleStart.getDay()}`);
        
        // 시작일을 조회 범위 시작일 이전으로 설정 (과거 일정도 현재 기간에 반복 표시)
        // 단, 반복 종료일이 조회 시작일보다 이전이면 스킵
        if (repeatEndDate < startDate) {
            console.log(`    ⚠️ 반복 종료일이 조회 시작일보다 이전 - 스킵`);
            return events;
        }
        
        // 원본 일정의 시작일부터 시작하되, 조회 범위 밖의 일정은 나중에 필터링
        // 이렇게 해야 원본 일정도 포함됨
        currentDate = new Date(scheduleStart);
        console.log(`    📅 실제 시작일: ${currentDate.toISOString()}`);
        console.log(`    📅 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
        console.log(`    📅 반복 종료일: ${repeatEndDate.toISOString()}`);
        
        while (currentDate <= repeatEndDate && currentDate <= endDate && count < maxCount) {
            // 한국 시간 기준으로 요일 계산 (UTC+9)
            const koreanTime = new Date(currentDate.getTime() + 9 * 60 * 60 * 1000);
            const dayOfWeek = koreanTime.getUTCDay();
            
            // 선택된 요일인지 확인
            if (repeatWeekdays.includes(dayOfWeek) && currentDate >= startDate) {
                const eventStart = new Date(currentDate);
                const eventEnd = new Date(currentDate.getTime() + duration);
                const dateStr = eventStart.toISOString().split('T')[0];
                
                // 제외 날짜 확인
                if (excludeDates.includes(dateStr)) {
                    console.log(`    ⏭️ 제외 날짜: ${dateStr}`);
                } else {
                    console.log(`    ✅ 일정 추가: ${eventStart.toISOString()} (한국시간 요일: ${dayOfWeek})`);
                    
                    events.push({
                        ...schedule,
                        start: eventStart.toISOString(),
                        end: eventEnd.toISOString(),
                        id: `${schedule.id}_${currentDate.toISOString()}`,
                        original_id: schedule.id
                    });
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
            count++;
        }
        
        console.log(`  📊 매주 반복 결과: ${events.length}개 일정 생성`);
    } else if (repeatType === 'monthly') {
        // 매월 반복 (한국 시간 기준)
        const monthlyType = schedule.repeat_monthly_type || 'dayOfMonth';
        // 한국 시간 기준으로 날짜 정보 추출
        const koreanStartTime = new Date(scheduleStart.getTime() + 9 * 60 * 60 * 1000);
        const originalDayOfMonth = koreanStartTime.getUTCDate();
        const originalDayOfWeek = koreanStartTime.getUTCDay();
        const originalWeekOfMonth = Math.ceil(originalDayOfMonth / 7);
        
        currentDate = new Date(scheduleStart);
        
        while (currentDate <= repeatEndDate && currentDate <= endDate && count < maxCount) {
            if (currentDate >= startDate) {
                const eventStart = new Date(currentDate);
                const eventEnd = new Date(currentDate.getTime() + duration);
                const dateStr = eventStart.toISOString().split('T')[0];
                
                // 제외 날짜 확인
                if (!excludeDates.includes(dateStr)) {
                    events.push({
                        ...schedule,
                        start: eventStart.toISOString(),
                        end: eventEnd.toISOString(),
                        id: `${schedule.id}_${currentDate.toISOString()}`,
                        original_id: schedule.id
                    });
                }
            }
            
            // 다음 달로 이동
            if (monthlyType === 'dayOfMonth') {
                // 매월 같은 날 (예: 매월 15일)
                currentDate.setMonth(currentDate.getMonth() + 1);
                // 날짜가 없는 경우 (예: 2월 30일) 마지막 날로 설정
                if (currentDate.getDate() !== originalDayOfMonth) {
                    currentDate.setDate(0); // 이전 달 마지막 날
                }
            } else {
                // 매월 같은 주/요일 (예: 둘째주 금요일)
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1); // 다음 달 1일
                
                // 해당 주의 해당 요일 찾기
                let weekCount = 0;
                while (currentDate.getMonth() === new Date(scheduleStart.getFullYear(), scheduleStart.getMonth() + count + 1, 1).getMonth()) {
                    if (currentDate.getDay() === originalDayOfWeek) {
                        weekCount++;
                        if (weekCount === originalWeekOfMonth) {
                            break;
                        }
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            
            count++;
        }
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
        
        if (currentFilter === 'none') {
            // 아무것도 선택 안 함
            filteredSchedules = [];
            console.log('❌ No filter - showing nothing');
        } else if (currentFilter === 'showAll' || !currentFilter) {
            // 모든 담당자 선택 또는 필터 없음 - 전체 일정 표시
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
        
        console.log('📝 Expanded schedules details:');
        expandedSchedules.forEach(s => {
            console.log(`  - ${s.title} (${s.person}) - ${s.start} ~ ${s.end}`);
        });
        
        const events = expandedSchedules.map(schedule => {
            // 지난 일정인지 확인
            const now = new Date();
            const scheduleEnd = schedule.end ? new Date(schedule.end) : new Date(schedule.start);
            const isPast = scheduleEnd < now;
            
            // 담당자 확인 (persons 배열이 있으면 첫 번째 사용, 없으면 person 사용)
            const person = schedule.persons && schedule.persons.length > 0 
                ? schedule.persons[0] 
                : (schedule.person || 'all');
            
            // 담당자에 따른 색상 선택 (지난 일정이면 어두운 색상)
            const color = isPast 
                ? window.PERSON_COLORS_PAST[person] || window.PERSON_COLORS_PAST['all']
                : window.PERSON_COLORS[person] || window.PERSON_COLORS['all'];
            
            console.log(`📅 Event: ${schedule.title}, Person: ${person}, Color: ${color}, ID: ${schedule.id}`);
            
            const event = {
                id: schedule.id,
                title: schedule.title,
                start: schedule.start,
                end: schedule.end,
                backgroundColor: color,
                borderColor: color,
                textColor: '#ffffff',
                extendedProps: {
                    id: schedule.id,  // ID를 extendedProps에도 포함
                    original_id: schedule.original_id || schedule.id,  // 반복 일정의 원본 ID
                    description: schedule.description,
                    person: person,
                    persons: schedule.persons,
                    isPast: isPast,
                    notification_start: schedule.notification_start === true,
                    notification_end: schedule.notification_end === true,
                    kakao_notification_start: schedule.kakao_notification_start || false,
                    kakao_notification_end: schedule.kakao_notification_end || false,
                    repeat_type: schedule.repeat_type || 'none',
                    repeat_end_date: schedule.repeat_end_date || null,
                    repeat_weekdays: schedule.repeat_weekdays || [],
                    repeat_monthly_type: schedule.repeat_monthly_type || 'dayOfMonth'
                }
            };
            
            console.log(`  ✅ Mapped event:`, event);
            return event;
        });
        
        console.log('🎯 Final events to render:', events.length);
        console.log('Events:', events);
        
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
    // 로컬 날짜로 변환하여 비교 (시간대 문제 해결)
    const year = clickedDate.getFullYear();
    const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const day = String(clickedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('📅 Selected date:', dateStr);
    
    // 해당 날짜의 모든 일정 가져오기
    const allEvents = calendar.getEvents();
    const dayEvents = allEvents.filter(event => {
        // 이벤트 날짜도 로컬 시간으로 변환
        const eventStart = new Date(event.start);
        const eventYear = eventStart.getFullYear();
        const eventMonth = String(eventStart.getMonth() + 1).padStart(2, '0');
        const eventDay = String(eventStart.getDate()).padStart(2, '0');
        const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
        
        console.log('  - Event:', event.title, 'Date:', eventDateStr);
        return eventDateStr === dateStr;
    });
    
    console.log(`✅ Found ${dayEvents.length} events for ${dateStr}`);
    
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
    
    // 삭제/수정 버튼 숨기기 (월 일정 하루 요약에서는 읽기 전용)
    const deleteBtn = modal.querySelector('#deleteEventBtn');
    const editBtn = modal.querySelector('#editEventBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    
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
    
    // 주간/일간 뷰로 변경 시 현재 시간 중심으로 스크롤
    if (viewName === 'timeGridWeek' || viewName === 'timeGridDay') {
        setTimeout(() => {
            console.log('🔄 뷰 변경 후 스크롤 실행:', viewName);
            scrollToCurrentTime();
        }, 300);
    }
}

/**
 * Refresh calendar events
 */
function refreshCalendar() {
    calendar.refetchEvents();
}

function updateCalendarSize() {
    if (calendar) calendar.updateSize();
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
    
    const exerciseArea = document.getElementById('exerciseArea');
    const isExerciseView = exerciseArea && exerciseArea.style.display !== 'none';
    
    let displayText = '';
    if (isExerciseView) {
        displayText = `${year}년 ${month}월`;
    } else if (currentView === 'dayGridMonth' || currentView === 'timeGridWeek' || currentView === 'listWeek') {
        displayText = `${year}년 ${month}월`;
    } else if (currentView === 'timeGridDay') {
        displayText = `${year}년 ${month}월 ${date}일`;
    } else {
        displayText = `${year}년 ${month}월`;
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
 * Navigate to previous period with animation
 */
function navigatePrev() {
    if (!calendar) {
        console.error('Calendar not initialized');
        return;
    }
    
    // 애니메이션 추가
    const viewHarness = document.querySelector('.fc-view-harness');
    if (viewHarness) {
        viewHarness.classList.add('transitioning-out');
        
        setTimeout(() => {
            calendar.prev();
            updateHeaderDate();
            
            viewHarness.classList.remove('transitioning-out');
            viewHarness.classList.add('transitioning-in');
            
            setTimeout(() => {
                viewHarness.classList.remove('transitioning-in');
            }, 300);
        }, 150);
    } else {
        calendar.prev();
        updateHeaderDate();
    }
}

/**
 * Navigate to next period with animation
 */
function navigateNext() {
    if (!calendar) {
        console.error('Calendar not initialized');
        return;
    }
    
    // 애니메이션 추가
    const viewHarness = document.querySelector('.fc-view-harness');
    if (viewHarness) {
        viewHarness.classList.add('transitioning-out');
        
        setTimeout(() => {
            calendar.next();
            updateHeaderDate();
            
            viewHarness.classList.remove('transitioning-out');
            viewHarness.classList.add('transitioning-in');
            
            setTimeout(() => {
                viewHarness.classList.remove('transitioning-in');
            }, 300);
        }, 150);
    } else {
        calendar.next();
        updateHeaderDate();
    }
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
 * 고정 공휴일 + 해당 연도 음력 공휴일(설날·추석·부처님오신날 등)
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
    
    // 음력 공휴일 (연도별 양력 날짜)
    const lunarByYear = {
        2024: { 설: ['2024-02-09', '2024-02-10', '2024-02-11'], 부처: ['2024-05-15'], 추석: ['2024-09-16', '2024-09-17', '2024-09-18'] },
        2025: { 설: ['2025-01-28', '2025-01-29', '2025-01-30'], 부처: ['2025-05-05'], 추석: ['2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08'] },
        2026: { 설: ['2026-02-16', '2026-02-17', '2026-02-18'], 부처: ['2026-05-24'], 추석: ['2026-09-24', '2026-09-25', '2026-09-26'] },
        2027: { 설: ['2027-02-06', '2027-02-07', '2027-02-08'], 부처: ['2027-05-13'], 추석: ['2027-10-04', '2027-10-05', '2027-10-06'] }
    };
    const y = lunarByYear[year];
    if (y) {
        (y['설'] || []).forEach((d, i) => { basicHolidays[d] = ['설날 연휴', '설날', '설날 연휴'][i] || '설날'; });
        (y['부처'] || []).forEach(d => { basicHolidays[d] = '부처님오신날'; });
        (y['추석'] || []).forEach((d, i) => {
            basicHolidays[d] = (i === 1) ? '추석' : (i === 3 ? '대체공휴일' : '추석 연휴');
        });
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
        document.querySelectorAll('.fc-day.holiday').forEach(el => {
            el.classList.remove('holiday');
            el.removeAttribute('title');
        });
        
        document.querySelectorAll('.fc-daygrid-day, .fc-day').forEach(cell => {
            const dateAttr = cell.getAttribute('data-date');
            if (!dateAttr) return;
            const dateStr = dateAttr.split('T')[0];
            const name = yearHolidays[dateStr];
            if (name) {
                cell.classList.add('holiday');
                cell.setAttribute('title', name);
            }
        });
    });
}

/**
 * Add swipe gesture to calendar for navigation (week/month)
 */
function addSwipeGestureToDateHeader() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl || calendarEl.dataset.swipeEnabled === 'true') {
        return; // 이미 스와이프가 설정되어 있으면 중복 방지
    }
    
    let touchStartX = 0;
    let touchStartY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isHorizontalSwipe = false;
    let calendarContent = null;
    const minSwipeDistance = 80; // 최소 스와이프 거리 (px) - 더 확실하게 스와이프해야 넘어감
    const swipeThreshold = 0.3; // 화면 너비의 30% 이상 드래그하면 전환
    
    const handleTouchStart = (e) => {
        // 이벤트 요소가 일정인 경우 스와이프 무시
        if (e.target.closest('.fc-event')) {
            isSwiping = false;
            isHorizontalSwipe = false;
            return;
        }
        
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
        currentX = touchStartX;
        isSwiping = true;
        isHorizontalSwipe = false;
        
        // 캘린더 컨텐츠 요소 찾기
        calendarContent = calendarEl.querySelector('.fc-view-harness');
        if (calendarContent) {
            // 트랜지션 제거 (드래그 중에는 즉시 반응)
            calendarContent.style.transition = 'none';
        }
    };
    
    const handleTouchMove = (e) => {
        if (!isSwiping || !calendarContent) return;
        
        currentX = e.changedTouches[0].clientX;
        const currentY = e.changedTouches[0].clientY;
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // 수평 스와이프 방향 확정 (처음 한번만)
        if (!isHorizontalSwipe && (absDeltaX > 5 || absDeltaY > 5)) {
            isHorizontalSwipe = absDeltaX > absDeltaY;
        }
        
        // 수평 스와이프일 경우
        if (isHorizontalSwipe) {
            // 수직 스크롤 방지
            if (absDeltaX > 10) {
                e.preventDefault();
            }
            
            // 드래그 거리에 따라 실시간으로 이동 (감쇠 효과 적용)
            const dampingFactor = 0.6; // 감쇠 계수 (저항감)
            const translateX = deltaX * dampingFactor;
            
            // 투명도 계산 (더 멀리 드래그할수록 더 투명해짐)
            const opacity = Math.max(0.5, 1 - (absDeltaX / window.innerWidth) * 0.5);
            
            // 실시간 변환 적용
            calendarContent.style.transform = `translateX(${translateX}px)`;
            calendarContent.style.opacity = opacity;
        }
    };
    
    const handleTouchEnd = (e) => {
        if (!isSwiping || !calendarContent) return;
        
        // 이벤트 요소가 일정인 경우 스와이프 무시
        if (e.target.closest('.fc-event')) {
            resetSwipe();
            return;
        }
        
        const deltaX = currentX - touchStartX;
        const absDeltaX = Math.abs(deltaX);
        const screenWidth = window.innerWidth;
        
        // 트랜지션 다시 활성화 (애니메이션으로 복귀/전환)
        calendarContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        
        // 충분히 스와이프했는지 확인 (거리 또는 화면 비율)
        const shouldNavigate = absDeltaX > minSwipeDistance || 
                              (absDeltaX / screenWidth) > swipeThreshold;
        
        if (isHorizontalSwipe && shouldNavigate) {
            // 충분히 드래그했으면 페이지 전환
            const direction = deltaX > 0 ? 'prev' : 'next';
            
            // 전환 애니메이션
            if (direction === 'prev') {
                calendarContent.style.transform = 'translateX(100%)';
            } else {
                calendarContent.style.transform = 'translateX(-100%)';
            }
            calendarContent.style.opacity = '0';
            
            // 페이지 전환
            setTimeout(() => {
                if (direction === 'prev') {
                    console.log(`👈 이전으로 이동`);
                    navigatePrev();
                } else {
                    console.log(`👉 다음으로 이동`);
                    navigateNext();
                }
                
                // 새 페이지가 반대편에서 들어오는 효과
                setTimeout(() => {
                    if (calendarContent) {
                        calendarContent.style.transition = 'none';
                        calendarContent.style.transform = direction === 'prev' ? 
                            'translateX(-100%)' : 'translateX(100%)';
                        calendarContent.style.opacity = '0';
                        
                        setTimeout(() => {
                            calendarContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                            calendarContent.style.transform = 'translateX(0)';
                            calendarContent.style.opacity = '1';
                        }, 50);
                    }
                }, 50);
            }, 300);
        } else {
            // 충분히 드래그하지 않았으면 원위치
            resetSwipe();
        }
        
        isSwiping = false;
        isHorizontalSwipe = false;
    };
    
    const resetSwipe = () => {
        if (calendarContent) {
            calendarContent.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            calendarContent.style.transform = 'translateX(0)';
            calendarContent.style.opacity = '1';
        }
        isSwiping = false;
        isHorizontalSwipe = false;
    };
    
    calendarEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarEl.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive: false로 preventDefault 가능
    calendarEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    calendarEl.dataset.swipeEnabled = 'true'; // 중복 방지 플래그
    
    console.log('✅ 캘린더 스와이프 제스처 활성화 (모든 뷰 - 월/주/일)');
}

function gotoDate(date) {
    if (!calendar) return;
    calendar.gotoDate(date);
    updateHeaderDate();
}

function navigatePrevMonth() {
    if (!calendar) return;
    const d = calendar.getDate();
    d.setMonth(d.getMonth() - 1);
    calendar.gotoDate(d);
    updateHeaderDate();
}

function navigateNextMonth() {
    if (!calendar) return;
    const d = calendar.getDate();
    d.setMonth(d.getMonth() + 1);
    calendar.gotoDate(d);
    updateHeaderDate();
}

window.calendarModule = {
    init: initCalendar,
    changeView,
    refresh: refreshCalendar,
    updateSize: updateCalendarSize,
    filter: filterByPerson,
    filterByPersons,
    getCurrentDate,
    navigateToday,
    navigatePrev,
    navigateNext,
    gotoDate,
    updateHeaderDate,
    navigatePrevMonth,
    navigateNextMonth
};

console.log('✅ calendarModule exported:', window.calendarModule);

