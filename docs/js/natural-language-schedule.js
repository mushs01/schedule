/**
 * 자연어 일정관리 (베타)
 * Google Gemini API를 사용해 자연어에서 일정 필드 추출
 */
(function() {
    const PERSON_MAP = {
        '아빠': 'dad', 'dad': 'dad', '엄마': 'mom', 'mom': 'mom',
        '주환': 'juhwan', 'juhwan': 'juhwan', '태환': 'taehwan', 'taehwan': 'taehwan',
        '전체': 'all', 'all': 'all', '가족': 'all'
    };

    const PROMPT = `당신은 한국어 일정 문장을 분석하는 도구입니다. 사용자 입력에서 필수 요소(일정 제목, 담당자, 날짜, 시간)를 추출합니다.

[응답 형식 - 둘 중 하나만 사용]

1) 모든 필드를 추출할 수 있을 때:
{"person":"담당자코드","title":"일정 제목","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm"}

2) 누락·애매해서 사용자에게 다시 요청해야 할 때:
{"needClarification":true,"field":"필드명","message":"사용자에게 보여줄 한글 메시지"}

[필수 요소와 검증 규칙]
- 일정 제목(title): 구체적인 제목이 있어야 함. "일정", "넣어줘" 등만 있으면 추출 불가.
- 담당자(person): 반드시 다음 중 하나여야 함. dad(아빠), mom(엄마), juhwan(주환), taehwan(태환), all(가족/전체). 그 외 이름·애매한 표현은 불가.
- 날짜(date): YYYY-MM-DD. 오늘/내일/다음주 월요일 등 자연어 해석 가능.
- 시간(startTime): HH:mm 24시간 형식. 오후 2시, 14시 등 해석 가능.

[needClarification 사용 기준]
- 제목이 없거나 "일정 넣어줘" 등 구체적 내용 없음 → field:"title", message:"일정 제목을 다시 알려주세요."
- 담당자가 없거나 가족/아빠/엄마/주환/태환 외의 인물/애매함 → field:"person", message:"일정 담당자를 다시 알려주세요. (가족, 아빠, 엄마, 주환, 태환 중 하나)"
- 날짜나 시간이 없거나 애매함 → field:"date", message:"일정 날짜와 시간을 다시 알려주세요."

[중요] 확실히 추출 가능할 때만 1번 형식으로 응답. 의심스러우면 2번(needClarification)으로 응답. 추측하지 마세요. JSON만 출력하세요.`;

    function getApiKey() {
        const cfg = window.GEMINI_CONFIG || {};
        return (cfg.apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null) || '').trim();
    }

    async function extractFromGemini(text) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('Gemini API 키를 입력하고 저장해주세요. 아래 링크에서 무료 발급 후 입력란에 붙여넣기 하세요.');
        }

        const cfg = window.GEMINI_CONFIG || {};
        const model = cfg.model || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    { text: `사용자 입력: ${text}` }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 256,
                responseMimeType: 'application/json'
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini API 오류 (${res.status}): ${err.slice(0, 200)}`);
        }

        const data = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!part) throw new Error('Gemini 응답에 내용이 없습니다.');

        let raw = part.trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) raw = jsonMatch[0];
        const parsed = JSON.parse(raw);
        if (parsed.needClarification && parsed.message) {
            throw new Error(parsed.message);
        }
        const person = (parsed.person || 'all').toLowerCase();
        const normalizedPerson = PERSON_MAP[person] || PERSON_MAP[person.charAt(0).toUpperCase() + person.slice(1)] || 'all';
        return {
            person: normalizedPerson,
            title: parsed.title || '일정',
            date: parsed.date || formatDateISO(new Date()),
            startTime: parsed.startTime || '09:00',
            endTime: parsed.endTime || addOneHour(parsed.startTime || '09:00')
        };
    }

    function formatDateISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function addOneHour(timeStr) {
        const [h, m] = (timeStr || '09:00').split(':').map(Number);
        const next = (h || 0) * 60 + (m || 0) + 60;
        const nh = Math.floor(next / 60) % 24;
        const nm = next % 60;
        return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
    }

    window.naturalLanguageSchedule = {
        extract: extractFromGemini,
        isConfigured: function() { return !!getApiKey(); }
    };
})();
