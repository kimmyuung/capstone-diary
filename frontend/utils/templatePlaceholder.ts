// utils/templatePlaceholder.ts
/**
 * 일기 템플릿 플레이스홀더 치환 유틸리티
 * 
 * 지원되는 플레이스홀더:
 * - {{날짜}} : 오늘 날짜 (2024년 12월 22일)
 * - {{요일}} : 오늘 요일 (일요일)
 * - {{시간}} : 현재 시간 (오후 5:30)
 * - {{연도}} : 현재 연도 (2024)
 * - {{월}} : 현재 월 (12)
 * - {{일}} : 현재 일 (22)
 */

const DAYS_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

interface PlaceholderOptions {
    date?: Date;
    customValues?: Record<string, string>;
}

/**
 * 템플릿 내용의 플레이스홀더를 실제 값으로 치환합니다.
 * 
 * @param content 템플릿 내용
 * @param options 옵션 (날짜, 커스텀 값 등)
 * @returns 치환된 내용
 * 
 * @example
 * const result = replacePlaceholders("오늘은 {{날짜}} {{요일}}입니다.");
 * // "오늘은 2024년 12월 22일 일요일입니다."
 */
export function replacePlaceholders(content: string, options: PlaceholderOptions = {}): string {
    const now = options.date || new Date();

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dayOfWeek = DAYS_KO[now.getDay()];
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 시간 포맷 (오전/오후)
    const period = hours >= 12 ? '오후' : '오전';
    const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const timeStr = `${period} ${hour12}:${minutes.toString().padStart(2, '0')}`;

    // 날짜 포맷
    const dateStr = `${year}년 ${month}월 ${day}일`;

    // 기본 플레이스홀더 맵
    const placeholders: Record<string, string> = {
        '{{날짜}}': dateStr,
        '{{요일}}': dayOfWeek,
        '{{시간}}': timeStr,
        '{{연도}}': year.toString(),
        '{{월}}': month.toString(),
        '{{일}}': day.toString(),
        '{{today}}': dateStr,
        '{{weekday}}': dayOfWeek,
        '{{time}}': timeStr,
        '{{year}}': year.toString(),
        '{{month}}': month.toString(),
        '{{day}}': day.toString(),
        // 커스텀 값 추가
        ...Object.fromEntries(
            Object.entries(options.customValues || {}).map(([k, v]) => [`{{${k}}}`, v])
        ),
    };

    // 모든 플레이스홀더 치환
    let result = content;
    for (const [placeholder, value] of Object.entries(placeholders)) {
        result = result.replaceAll(placeholder, value);
    }

    return result;
}

/**
 * 템플릿 내용에서 플레이스홀더를 찾아 반환합니다.
 * 
 * @param content 템플릿 내용
 * @returns 발견된 플레이스홀더 배열
 */
export function findPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
        if (!matches.includes(match[0])) {
            matches.push(match[0]);
        }
    }

    return matches;
}

/**
 * 지원되는 플레이스홀더 목록을 반환합니다.
 */
export function getSupportedPlaceholders(): { placeholder: string; description: string; example: string }[] {
    const now = new Date();
    return [
        { placeholder: '{{날짜}}', description: '오늘 날짜', example: replacePlaceholders('{{날짜}}', { date: now }) },
        { placeholder: '{{요일}}', description: '오늘 요일', example: replacePlaceholders('{{요일}}', { date: now }) },
        { placeholder: '{{시간}}', description: '현재 시간', example: replacePlaceholders('{{시간}}', { date: now }) },
        { placeholder: '{{연도}}', description: '현재 연도', example: replacePlaceholders('{{연도}}', { date: now }) },
        { placeholder: '{{월}}', description: '현재 월', example: replacePlaceholders('{{월}}', { date: now }) },
        { placeholder: '{{일}}', description: '현재 일', example: replacePlaceholders('{{일}}', { date: now }) },
    ];
}

/**
 * 템플릿 내용에 플레이스홀더가 있는지 확인합니다.
 */
export function hasPlaceholders(content: string): boolean {
    return /\{\{([^}]+)\}\}/.test(content);
}

export default {
    replacePlaceholders,
    findPlaceholders,
    getSupportedPlaceholders,
    hasPlaceholders,
};
