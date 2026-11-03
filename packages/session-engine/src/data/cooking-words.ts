/**
 * Small list of common cooking words used to rank speech-recognizer alternatives.
 * Each entry is a surface form per language; keep this short and high-signal.
 */
export const COOKING_WORDS: Record<'ko' | 'en', readonly string[]> = {
  ko: ['리조또', '파스타', '버섯', '스테이크', '달걀', '계란', '감자', '양파', '소스', '밥', '국수', '라면', '찌개', '볶음', '튀김', '오븐'],
  en: ['risotto', 'pasta', 'mushrooms', 'mushroom', 'steak', 'eggs', 'potatoes', 'onions', 'sauce', 'rice', 'noodles', 'soup', 'oven', 'broccoli'],
};
