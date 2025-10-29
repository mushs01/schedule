/**
 * API Communication Module (Firebase Firestore Compat)
 * Firebase Firestore를 사용하여 직접 데이터베이스에 접근
 */

// Firestore는 window.db로 이미 초기화됨 (firebase-config.js에서)
// 컬렉션 이름
const SCHEDULES_COLLECTION = 'schedules';

// Person color mapping (글로벌 변수 사용)
const PERSON_COLORS = window.PERSON_COLORS || {
    'all': '#808080',      // Gray
    'dad': '#3788d8',      // Blue (아빠)
    'mom': '#9b59b6',      // Purple (엄마)
    'juhwan': '#27ae60',   // Green (주환)
    'taehwan': '#f39c12'   // Yellow (태환)
};

// API Helper Functions
const api = {
    /**
     * Get all schedules with optional filters
     */
    async getSchedules(filters = {}) {
        try {
            const db = window.db;
            let query = db.collection(SCHEDULES_COLLECTION);

            // Simplified query - just get all documents for now
            // TODO: Re-add filters after confirming basic functionality works
            
            const querySnapshot = await query.get();
            const schedules = [];
            
            console.log(`Found ${querySnapshot.size} documents in Firestore`);

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Validate required fields
                if (!data.start_datetime || !data.title) {
                    console.warn('Skipping invalid schedule:', doc.id, data);
                    return;
                }
                
                try {
                    // Debug: 카카오 알림 필드 확인
                    if (data.title?.includes('테스트')) {
                        console.log(`📝 Loading schedule "${data.title}":`, {
                            kakao_notification_start: data.kakao_notification_start,
                            kakao_notification_end: data.kakao_notification_end
                        });
                    }
                    
                    // repeat_end_date 처리 (Timestamp 또는 문자열 지원)
                    let repeatEndDate = null;
                    if (data.repeat_end_date) {
                        if (typeof data.repeat_end_date === 'string') {
                            // 이미 ISO 문자열인 경우
                            repeatEndDate = data.repeat_end_date;
                        } else if (data.repeat_end_date.toDate) {
                            // Firestore Timestamp인 경우
                            repeatEndDate = data.repeat_end_date.toDate().toISOString();
                        }
                    }
                    
                    const schedule = {
                        id: doc.id,
                        title: data.title,
                        description: data.description,
                        start: data.start_datetime.toDate().toISOString(),
                        end: data.end_datetime ? data.end_datetime.toDate().toISOString() : null,
                        person: data.person,
                        persons: data.persons,
                        color: data.color,
                        isPast: data.is_past || false,
                        kakao_notification_start: data.kakao_notification_start === true,
                        kakao_notification_end: data.kakao_notification_end === true,
                        repeat_type: data.repeat_type || 'none',
                        repeat_end_date: repeatEndDate,
                        repeat_weekdays: data.repeat_weekdays || [],
                        repeat_monthly_type: data.repeat_monthly_type || 'dayOfMonth',
                        exclude_dates: data.exclude_dates || [],
                        createdAt: data.created_at ? data.created_at.toDate().toISOString() : null,
                        updatedAt: data.updated_at ? data.updated_at.toDate().toISOString() : null
                    };
                    
                    // 반복 일정 로그
                    if (schedule.repeat_type !== 'none') {
                        console.log(`🔄 반복 일정 로드: ${schedule.title} (ID: ${doc.id})`);
                        console.log('  - repeat_type:', schedule.repeat_type);
                        console.log('  - repeat_end_date:', schedule.repeat_end_date);
                        console.log('  - repeat_weekdays:', schedule.repeat_weekdays);
                        console.log('  - repeat_monthly_type:', schedule.repeat_monthly_type);
                        console.log('  - start:', schedule.start);
                        console.log('  - Raw data.repeat_weekdays:', data.repeat_weekdays);
                    }
                    
                    schedules.push(schedule);
                } catch (dateError) {
                    console.error('Error parsing schedule date:', doc.id, dateError);
                }
            });

            // Apply filters in JavaScript
            let filteredSchedules = schedules;
            
            // Filter by date range
            if (filters.startDate || filters.endDate) {
                filteredSchedules = schedules.filter(schedule => {
                    const scheduleDate = new Date(schedule.start);
                    if (filters.startDate && scheduleDate < new Date(filters.startDate)) {
                        return false;
                    }
                    if (filters.endDate && scheduleDate > new Date(filters.endDate + 'T23:59:59')) {
                        return false;
                    }
                    return true;
                });
            }
            
            // Filter by person
            if (filters.person && filters.person !== 'all') {
                filteredSchedules = filteredSchedules.filter(schedule => 
                    schedule.person === filters.person || schedule.person === 'all'
                );
            }
            
            // Sort by start datetime in JavaScript
            filteredSchedules.sort((a, b) => new Date(a.start) - new Date(b.start));

            return filteredSchedules;
        } catch (error) {
            console.error('Error getting schedules:', error);
            throw error;
        }
    },

    /**
     * Get a single schedule by ID
     */
    async getSchedule(id) {
        try {
            const db = window.db;
            const docRef = db.collection(SCHEDULES_COLLECTION).doc(id);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    title: data.title,
                    description: data.description,
                    start: data.start_datetime.toDate().toISOString(),
                    end: data.end_datetime ? data.end_datetime.toDate().toISOString() : null,
                    person: data.person,
                    color: data.color,
                    isPast: data.is_past || false,
                    kakao_notification_start: data.kakao_notification_start || false,
                    kakao_notification_end: data.kakao_notification_end || false
                };
            } else {
                throw new Error('Schedule not found');
            }
        } catch (error) {
            console.error('Error getting schedule:', error);
            throw error;
        }
    },

    /**
     * Create a new schedule
     */
    async createSchedule(scheduleData) {
        try {
            const db = window.db;
            const now = new Date();
            const startDateTime = new Date(scheduleData.start_datetime);
            const color = PERSON_COLORS[scheduleData.person] || '#808080';
            const isPast = startDateTime < now;

            const docData = {
                title: scheduleData.title,
                description: scheduleData.description || null,
                start_datetime: firebase.firestore.Timestamp.fromDate(startDateTime),
                end_datetime: scheduleData.end_datetime ? firebase.firestore.Timestamp.fromDate(new Date(scheduleData.end_datetime)) : null,
                person: scheduleData.person,
                persons: scheduleData.persons || [scheduleData.person],
                color: color,
                is_past: isPast,
                kakao_notification_start: scheduleData.kakao_notification_start === true,
                kakao_notification_end: scheduleData.kakao_notification_end === true,
                repeat_type: scheduleData.repeat_type || 'none',
                repeat_end_date: scheduleData.repeat_end_date ? firebase.firestore.Timestamp.fromDate(new Date(scheduleData.repeat_end_date)) : null,
                repeat_weekdays: scheduleData.repeat_weekdays || [],
                repeat_monthly_type: scheduleData.repeat_monthly_type || 'dayOfMonth',
                exclude_dates: [],
                created_at: firebase.firestore.Timestamp.fromDate(now),
                updated_at: firebase.firestore.Timestamp.fromDate(now)
            };
            
            console.log('📤 Creating schedule with data:');
            console.log('  - title:', docData.title);
            console.log('  - repeat_type:', docData.repeat_type);
            console.log('  - repeat_end_date:', docData.repeat_end_date);
            console.log('  - repeat_weekdays:', docData.repeat_weekdays);
            console.log('  - repeat_monthly_type:', docData.repeat_monthly_type);

            const docRef = await db.collection(SCHEDULES_COLLECTION).add(docData);

            return {
                id: docRef.id,
                ...scheduleData,
                color: color,
                isPast: isPast
            };
        } catch (error) {
            console.error('Error creating schedule:', error);
            throw error;
        }
    },

    /**
     * Update an existing schedule
     */
    async updateSchedule(id, scheduleData) {
        try {
            const db = window.db;
            const docRef = db.collection(SCHEDULES_COLLECTION).doc(id);
            const updateData = {
                updated_at: firebase.firestore.Timestamp.fromDate(new Date())
            };

            if (scheduleData.title) updateData.title = scheduleData.title;
            if (scheduleData.description !== undefined) updateData.description = scheduleData.description;
            if (scheduleData.start_datetime) {
                const startDateTime = new Date(scheduleData.start_datetime);
                updateData.start_datetime = firebase.firestore.Timestamp.fromDate(startDateTime);
                updateData.is_past = startDateTime < new Date();
            }
            if (scheduleData.end_datetime !== undefined) {
                updateData.end_datetime = scheduleData.end_datetime ? firebase.firestore.Timestamp.fromDate(new Date(scheduleData.end_datetime)) : null;
            }
            if (scheduleData.person) {
                updateData.person = scheduleData.person;
                updateData.color = PERSON_COLORS[scheduleData.person] || '#808080';
            }
            if (scheduleData.persons) {
                updateData.persons = scheduleData.persons;
            }
            if (scheduleData.kakao_notification_start !== undefined) {
                updateData.kakao_notification_start = scheduleData.kakao_notification_start === true;
            }
            if (scheduleData.kakao_notification_end !== undefined) {
                updateData.kakao_notification_end = scheduleData.kakao_notification_end === true;
            }
            if (scheduleData.repeat_type !== undefined) {
                updateData.repeat_type = scheduleData.repeat_type;
            }
            if (scheduleData.repeat_end_date !== undefined) {
                updateData.repeat_end_date = scheduleData.repeat_end_date ? firebase.firestore.Timestamp.fromDate(new Date(scheduleData.repeat_end_date)) : null;
            }
            if (scheduleData.repeat_weekdays !== undefined) {
                updateData.repeat_weekdays = scheduleData.repeat_weekdays;
            }
            if (scheduleData.repeat_monthly_type !== undefined) {
                updateData.repeat_monthly_type = scheduleData.repeat_monthly_type;
            }
            
            console.log('📤 Updating schedule with data:');
            console.log('  - repeat_type:', updateData.repeat_type);
            console.log('  - repeat_end_date:', updateData.repeat_end_date);
            console.log('  - repeat_weekdays:', updateData.repeat_weekdays);
            console.log('  - repeat_monthly_type:', updateData.repeat_monthly_type);

            await docRef.update(updateData);

            return await this.getSchedule(id);
        } catch (error) {
            console.error('Error updating schedule:', error);
            throw error;
        }
    },

    /**
     * Delete a schedule
     */
    async deleteSchedule(id) {
        try {
            const db = window.db;
            const docRef = db.collection(SCHEDULES_COLLECTION).doc(id);
            await docRef.delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw error;
        }
    },

    /**
     * Add exclude date to recurring schedule
     */
    async addExcludeDate(id, excludeDate) {
        try {
            const db = window.db;
            const docRef = db.collection(SCHEDULES_COLLECTION).doc(id);
            
            // 현재 제외 날짜 목록 가져오기
            const doc = await docRef.get();
            if (!doc.exists) {
                throw new Error('Schedule not found');
            }
            
            const currentExcludeDates = doc.data().exclude_dates || [];
            
            // 제외 날짜 추가 (중복 방지)
            if (!currentExcludeDates.includes(excludeDate)) {
                currentExcludeDates.push(excludeDate);
            }
            
            // 업데이트
            await docRef.update({
                exclude_dates: currentExcludeDates,
                updated_at: firebase.firestore.Timestamp.fromDate(new Date())
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error adding exclude date:', error);
            throw error;
        }
    },

    /**
     * Get schedules by person
     */
    async getSchedulesByPerson(person) {
        return await this.getSchedules({ person });
    },

    /**
     * Get AI summary for a specific date
     */
    async getAISummary(date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            // Get schedules for the date
            const schedules = await this.getSchedules({
                startDate: targetDate,
                endDate: targetDate
            });

            if (schedules.length === 0) {
                return {
                    summary: "오늘은 등록된 일정이 없습니다. 편안한 하루 보내세요! 😊",
                    date: targetDate,
                    total_events: 0
                };
            }

            // Generate simple summary
            const personNames = {
                'dad': '아빠',
                'mom': '엄마',
                'juhwan': '주환',
                'taehwan': '태환',
                'all': '가족 전체'
            };

            let summary = `오늘은 총 ${schedules.length}개의 일정이 있습니다.\n\n`;
            
            schedules.forEach((schedule, index) => {
                const time = new Date(schedule.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const person = personNames[schedule.person] || schedule.person;
                summary += `${index + 1}. ${time} - ${person}: ${schedule.title}\n`;
            });

            summary += `\n오늘도 화이팅! 💪`;

            return {
                summary: summary,
                date: targetDate,
                total_events: schedules.length
            };
        } catch (error) {
            console.error('Error getting AI summary:', error);
            return {
                summary: "일정 요약을 불러올 수 없습니다.",
                date: date,
                total_events: 0
            };
        }
    },

    /**
     * Health check (Firebase 연결 확인)
     */
    async healthCheck() {
        try {
            const db = window.db;
            // Try to read from Firestore
            await db.collection(SCHEDULES_COLLECTION).limit(1).get();
            
            return {
                status: 'healthy',
                database: 'Firebase Firestore',
                connected: true
            };
        } catch (error) {
            console.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                database: 'Firebase Firestore',
                connected: false,
                error: error.message
            };
        }
    }
};

// Export for use in other modules
window.api = api;
