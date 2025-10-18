# 설치 및 실행 가이드

## 📋 사전 요구사항

- Python 3.8 이상
- pip (Python 패키지 관리자)
- OpenAI API 키 (AI 요약 기능 사용시)

## 🚀 빠른 시작

### Windows

1. **프로젝트 다운로드**
   ```bash
   git clone <repository-url>
   cd schedule_webapp
   ```

2. **환경 변수 설정**
   - `env.example` 파일을 복사하여 `.env` 파일 생성
   - OpenAI API 키 입력
   ```
   OPENAI_API_KEY=sk-your-api-key-here
   SECRET_KEY=your-secret-key
   ```

3. **실행**
   ```bash
   start.bat
   ```

4. **브라우저에서 접속**
   - http://localhost:8000

### Linux / Mac

1. **프로젝트 다운로드**
   ```bash
   git clone <repository-url>
   cd schedule_webapp
   ```

2. **환경 변수 설정**
   ```bash
   cp env.example .env
   # .env 파일을 편집하여 API 키 입력
   ```

3. **실행 권한 부여**
   ```bash
   chmod +x start.sh
   ```

4. **실행**
   ```bash
   ./start.sh
   ```

5. **브라우저에서 접속**
   - http://localhost:8000

## 🐳 Docker로 실행

```bash
# .env 파일 생성 후
docker-compose up -d
```

## 📦 수동 설치

### 1. 가상환경 생성 및 활성화

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. 패키지 설치

```bash
pip install -r backend/requirements.txt
```

### 3. 환경 변수 설정

`.env` 파일 생성:
```
OPENAI_API_KEY=sk-your-api-key-here
SECRET_KEY=your-random-secret-key
DATABASE_URL=sqlite:///./family_schedule.db
DEBUG=True
CORS_ORIGINS=http://localhost:8000
```

### 4. 서버 실행

```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## 🔑 OpenAI API 키 발급

1. https://platform.openai.com 방문
2. 로그인 또는 회원가입
3. API Keys 섹션에서 새 키 생성
4. 생성된 키를 `.env` 파일에 입력

## 🌐 배포

### Vercel

1. Vercel CLI 설치
   ```bash
   npm install -g vercel
   ```

2. 배포
   ```bash
   vercel
   ```

### Heroku

1. Heroku CLI 설치
2. 로그인
   ```bash
   heroku login
   ```

3. 앱 생성 및 배포
   ```bash
   heroku create family-schedule-app
   git push heroku main
   ```

4. 환경 변수 설정
   ```bash
   heroku config:set OPENAI_API_KEY=your-key
   ```

### Docker

```bash
docker build -t family-schedule-app .
docker run -p 8000:8000 --env-file .env family-schedule-app
```

## 🔧 문제 해결

### 포트 8000이 이미 사용 중인 경우

다른 포트로 실행:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8080
```

### 패키지 설치 오류

pip 업그레이드:
```bash
python -m pip install --upgrade pip
```

### SQLite 권한 오류

데이터베이스 파일 권한 확인:
```bash
chmod 666 family_schedule.db
```

## 📞 지원

문제가 발생하면 GitHub Issues에 등록해주세요.

## 📄 라이선스

MIT License

