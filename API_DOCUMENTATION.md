# API 문서

## 기본 정보

- **Base URL**: `http://localhost:8000/api`
- **Content-Type**: `application/json`
- **자동 생성 문서**: `http://localhost:8000/docs` (Swagger UI)

## 엔드포인트

### 1. 헬스 체크

#### GET /api/health

서버 상태 확인

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T12:00:00.000Z"
}
```

---

### 2. 일정 조회

#### GET /api/schedules

모든 일정 조회 (필터링 가능)

**Query Parameters:**
- `start_date` (optional): 시작 날짜 (ISO 8601 형식)
- `end_date` (optional): 종료 날짜 (ISO 8601 형식)
- `person` (optional): 담당자 (`all`, `dad`, `mom`, `juhwan`, `taehwan`)

**Response:**
```json
[
  {
    "id": 1,
    "title": "주환 수영 수업",
    "description": "올림픽수영장",
    "start": "2025-10-18T14:00:00",
    "end": "2025-10-18T16:00:00",
    "person": "juhwan",
    "color": "#27ae60",
    "isPast": false,
    "createdAt": "2025-10-18T10:00:00",
    "updatedAt": "2025-10-18T10:00:00"
  }
]
```

---

#### GET /api/schedules/{schedule_id}

특정 일정 조회

**Path Parameters:**
- `schedule_id`: 일정 ID

**Response:**
```json
{
  "id": 1,
  "title": "주환 수영 수업",
  "description": "올림픽수영장",
  "start": "2025-10-18T14:00:00",
  "end": "2025-10-18T16:00:00",
  "person": "juhwan",
  "color": "#27ae60",
  "isPast": false,
  "createdAt": "2025-10-18T10:00:00",
  "updatedAt": "2025-10-18T10:00:00"
}
```

---

#### GET /api/schedules/person/{person}

특정 담당자의 모든 일정 조회

**Path Parameters:**
- `person`: 담당자 (`all`, `dad`, `mom`, `juhwan`, `taehwan`)

**Response:**
```json
[
  {
    "id": 1,
    "title": "주환 수영 수업",
    "description": "올림픽수영장",
    "start": "2025-10-18T14:00:00",
    "end": "2025-10-18T16:00:00",
    "person": "juhwan",
    "color": "#27ae60",
    "isPast": false,
    "createdAt": "2025-10-18T10:00:00",
    "updatedAt": "2025-10-18T10:00:00"
  }
]
```

---

### 3. 일정 생성

#### POST /api/schedules

새 일정 생성

**Request Body:**
```json
{
  "title": "주환 수영 수업",
  "description": "올림픽수영장",
  "start_datetime": "2025-10-18T14:00:00",
  "end_datetime": "2025-10-18T16:00:00",
  "person": "juhwan"
}
```

**필수 필드:**
- `title`: 일정 제목 (1-200자)
- `start_datetime`: 시작 일시 (ISO 8601 형식)
- `person`: 담당자 (`all`, `dad`, `mom`, `juhwan`, `taehwan`)

**선택 필드:**
- `description`: 상세 설명
- `end_datetime`: 종료 일시

**Response:** (201 Created)
```json
{
  "id": 1,
  "title": "주환 수영 수업",
  "description": "올림픽수영장",
  "start": "2025-10-18T14:00:00",
  "end": "2025-10-18T16:00:00",
  "person": "juhwan",
  "color": "#27ae60",
  "isPast": false,
  "createdAt": "2025-10-18T10:00:00",
  "updatedAt": "2025-10-18T10:00:00"
}
```

---

### 4. 일정 수정

#### PUT /api/schedules/{schedule_id}

일정 수정

**Path Parameters:**
- `schedule_id`: 일정 ID

**Request Body:** (모든 필드 선택)
```json
{
  "title": "주환 수영 수업 (변경)",
  "description": "올림픽수영장 실내풀",
  "start_datetime": "2025-10-18T15:00:00",
  "end_datetime": "2025-10-18T17:00:00",
  "person": "juhwan"
}
```

**Response:**
```json
{
  "id": 1,
  "title": "주환 수영 수업 (변경)",
  "description": "올림픽수영장 실내풀",
  "start": "2025-10-18T15:00:00",
  "end": "2025-10-18T17:00:00",
  "person": "juhwan",
  "color": "#27ae60",
  "isPast": false,
  "createdAt": "2025-10-18T10:00:00",
  "updatedAt": "2025-10-18T11:00:00"
}
```

---

### 5. 일정 삭제

#### DELETE /api/schedules/{schedule_id}

일정 삭제

**Path Parameters:**
- `schedule_id`: 일정 ID

**Response:** (204 No Content)

---

### 6. AI 일정 요약

#### POST /api/ai/summary

특정 날짜의 일정을 AI로 요약

**Request Body:**
```json
{
  "date": "2025-10-18"
}
```

**선택 필드:**
- `date`: 요약할 날짜 (YYYY-MM-DD, 생략시 오늘)

**Response:**
```json
{
  "summary": "오늘은 주환이의 수영 수업(14:00-16:00)과 태환이의 피아노 레슨(17:00-18:00)이 예정되어 있습니다. 일정이 겹치지 않아 여유롭게 진행할 수 있겠네요!",
  "date": "2025-10-18",
  "total_events": 2
}
```

---

## 에러 응답

### 400 Bad Request
```json
{
  "detail": "Invalid person"
}
```

### 404 Not Found
```json
{
  "detail": "Schedule not found"
}
```

### 503 Service Unavailable
```json
{
  "detail": "OpenAI API key not configured"
}
```

---

## 데이터 모델

### Schedule

| 필드 | 타입 | 설명 |
|------|------|------|
| id | integer | 일정 ID (자동 생성) |
| title | string | 일정 제목 (1-200자) |
| description | string | 상세 설명 (선택) |
| start | datetime | 시작 일시 (ISO 8601) |
| end | datetime | 종료 일시 (선택, ISO 8601) |
| person | string | 담당자 (all/dad/mom/juhwan/taehwan) |
| color | string | 색상 코드 (자동 할당) |
| isPast | boolean | 지난 일정 여부 (자동 계산) |
| createdAt | datetime | 생성 일시 |
| updatedAt | datetime | 수정 일시 |

### Person Values

| 값 | 이름 | 색상 |
|----|------|------|
| all | 전체 | #808080 (회색) |
| dad | 아빠 | #3788d8 (파란색) |
| mom | 엄마 | #9b59b6 (보라색) |
| juhwan | 주환 | #27ae60 (초록색) |
| taehwan | 태환 | #f39c12 (노란색) |

---

## 예제

### Python (requests)

```python
import requests

# 일정 조회
response = requests.get('http://localhost:8000/api/schedules')
schedules = response.json()

# 일정 생성
new_schedule = {
    "title": "주환 수영 수업",
    "start_datetime": "2025-10-18T14:00:00",
    "person": "juhwan"
}
response = requests.post('http://localhost:8000/api/schedules', json=new_schedule)
```

### JavaScript (fetch)

```javascript
// 일정 조회
const schedules = await fetch('http://localhost:8000/api/schedules')
  .then(res => res.json());

// 일정 생성
const newSchedule = {
  title: "주환 수영 수업",
  start_datetime: "2025-10-18T14:00:00",
  person: "juhwan"
};
const created = await fetch('http://localhost:8000/api/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newSchedule)
}).then(res => res.json());
```

### curl

```bash
# 일정 조회
curl http://localhost:8000/api/schedules

# 일정 생성
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"title":"주환 수영 수업","start_datetime":"2025-10-18T14:00:00","person":"juhwan"}'
```

---

## 인터랙티브 API 문서

서버 실행 후 다음 URL에서 인터랙티브하게 API를 테스트할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

