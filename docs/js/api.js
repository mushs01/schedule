/**
 * API Communication Module (Firebase Firestore)
 * Firebase Firestore를 사용하여 직접 데이터베이스에 접근
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
            let q = collection(db, SCHEDULES_COLLECTION);
            const constraints = [];

            // Filter by date range
            if (filters.startDate) {
                const startDateTime = Timestamp.fromDate(new Date(filters.startDate));
                constraints.push(where('start_datetime', '>=', startDateTime));
            }
            
            if (filters.endDate) {
                const endDateTime = Timestamp.fromDate(new Date(filters.endDate + 'T23:59:59'));
                constraints.push(where('start_datetime', '<=', endDateTime));
            }

            // Filter by person
            if (filters.person && filters.person !== 'all') {
                constraints.push(where('person', 'in', [filters.person, 'all']));
            }

            // Order by start datetime
            constraints.push(orderBy('start_datetime', 'asc'));

            // Apply filters
            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const querySnapshot = await getDocs(q);
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
            const docRef = doc(db, SCHEDULES_COLLECTION, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
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
            const now = new Date();
            const startDateTime = new Date(scheduleData.start_datetime);
            const color = PERSON_COLORS[scheduleData.person] || '#808080';
            const isPast = startDateTime < now;

            const docData = {
                title: scheduleData.title,
                description: scheduleData.description || null,
                start_datetime: Timestamp.fromDate(startDateTime),
                end_datetime: scheduleData.end_datetime ? Timestamp.fromDate(new Date(scheduleData.end_datetime)) : null,
                person: scheduleData.person,
                color: color,
                is_past: isPast,
                created_at: Timestamp.fromDate(now),
                updated_at: Timestamp.fromDate(now)
            };

            const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), docData);

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
            const docRef = doc(db, SCHEDULES_COLLECTION, id);
            const updateData = {
                updated_at: Timestamp.fromDate(new Date())
            };

            if (scheduleData.title) updateData.title = scheduleData.title;
            if (scheduleData.description !== undefined) updateData.description = scheduleData.description;
            if (scheduleData.start_datetime) {
                const startDateTime = new Date(scheduleData.start_datetime);
                updateData.start_datetime = Timestamp.fromDate(startDateTime);
                updateData.is_past = startDateTime < new Date();
            }
            if (scheduleData.end_datetime !== undefined) {
                updateData.end_datetime = scheduleData.end_datetime ? Timestamp.fromDate(new Date(scheduleData.end_datetime)) : null;
            }
            if (scheduleData.person) {
                updateData.person = scheduleData.person;
                updateData.color = PERSON_COLORS[scheduleData.person] || '#808080';
            }

            await updateDoc(docRef, updateData);

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
            const docRef = doc(db, SCHEDULES_COLLECTION, id);
            await deleteDoc(docRef);
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
     * OpenAI API는 보안상 프론트엔드에서 직접 호출하지 않습니다.
     * 대신 간단한 로컬 요약을 제공합니다.
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
            // Try to read from Firestore
            const q = query(collection(db, SCHEDULES_COLLECTION));
            await getDocs(q);
            
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
