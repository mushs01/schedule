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

    const PROMPT = `당신은 한국어 일정 문장을 분석하는 도구입니다.
사용자 입력에서 다음 필드를 추출해 JSON으로만 응답하세요. 다른 설명은 절대 넣지 마세요.

JSON 형식 (반드시 이 키만 사용):
{"person":"담당자코드","title":"일정 제목","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm"}

담당자코드: dad(아빠), mom(엄마), juhwan(주환), taehwan(태환), all(전체/미명시)
날짜 없으면 오늘 날짜 사용. 시간 없으면 startTime "09:00", endTime "10:00" 사용.
endTime은 startTime에서 1시간 후 기본값.
오늘, 내일, 모레, 다음주 월요일 등 자연어 해석.`;

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
