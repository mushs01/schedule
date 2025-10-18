/**
 * API Communication Module (Firebase Firestore Compat)
 * Firebase Firestore를 사용하여 직접 데이터베이스에 접근
 */

// Firestore는 window.db로 이미 초기화됨 (firebase-config.js에서)
// 컬렉션 이름
const SCHEDULES_COLLECTION = 'schedules';

// Person color mapping
const PERSON_COLORS = {
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

            // Filter by date range
            if (filters.startDate) {
                const startDateTime = firebase.firestore.Timestamp.fromDate(new Date(filters.startDate));
                query = query.where('start_datetime', '>=', startDateTime);
            }
            
            if (filters.endDate) {
                const endDateTime = firebase.firestore.Timestamp.fromDate(new Date(filters.endDate + 'T23:59:59'));
                query = query.where('start_datetime', '<=', endDateTime);
            }

            // Filter by person
            if (filters.person && filters.person !== 'all') {
                query = query.where('person', 'in', [filters.person, 'all']);
            }

            // Order by start datetime
            query = query.orderBy('start_datetime', 'asc');

            const querySnapshot = await query.get();
            const schedules = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                schedules.push({
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    start: data.start_datetime.toDate().toISOString(),
                    end: data.end_datetime ? data.end_datetime.toDate().toISOString() : null,
                    person: data.person,
                    color: data.color,
                    isPast: data.is_past || false,
                    createdAt: data.created_at ? data.created_at.toDate().toISOString() : null,
                    updatedAt: data.updated_at ? data.updated_at.toDate().toISOString() : null
                });
            });

            return schedules;
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
                    isPast: data.is_past || false
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
                color: color,
                is_past: isPast,
                created_at: firebase.firestore.Timestamp.fromDate(now),
                updated_at: firebase.firestore.Timestamp.fromDate(now)
            };

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
