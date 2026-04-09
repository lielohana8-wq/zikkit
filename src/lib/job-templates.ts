// Job Templates — pre-defined templates for quick job creation
export interface JobTemplate {
  id: number;
  name: string;
  desc: string;
  duration: number; // minutes
  price: number;
  materials: string[];
  checklist: string[];
  category: string;
}

export const DEFAULT_TEMPLATES: JobTemplate[] = [
  { id: 1, name: 'תיקון נזילה', desc: 'איתור ותיקון נזילת מים', duration: 90, price: 350, materials: ['אטם', 'צינור גמיש', 'טייפ טפלון'], checklist: ['בדיקת לחץ מים', 'איתור מקור הנזילה', 'תיקון/החלפה', 'בדיקת אטימות', 'ניקוי האזור'], category: 'אינסטלציה' },
  { id: 2, name: 'התקנת מזגן', desc: 'התקנת מזגן עילי חדש', duration: 180, price: 800, materials: ['צנרת נחושת', 'ניקוז', 'חומר איטום', 'ברגים'], checklist: ['בדיקת מיקום התקנה', 'קידוח קיר', 'התקנת יחידה פנימית', 'התקנת יחידה חיצונית', 'חיבור צנרת', 'בדיקת תקינות', 'הדרכת לקוח'], category: 'מיזוג' },
  { id: 3, name: 'תקלת חשמל', desc: 'אבחון ותיקון תקלת חשמל', duration: 60, price: 280, materials: ['כבל חשמלי', 'מפסק', 'שקע'], checklist: ['ניתוק חשמל', 'בדיקת לוח חשמל', 'איתור תקלה', 'תיקון/החלפה', 'בדיקת תקינות', 'חיבור חזרה'], category: 'חשמל' },
  { id: 4, name: 'פתיחת סתימה', desc: 'פתיחת סתימה בצנרת', duration: 60, price: 250, materials: ['ספירלה', 'חומר ניקוי'], checklist: ['אבחון מיקום הסתימה', 'פתיחה מכנית/כימית', 'שטיפה', 'בדיקת זרימה'], category: 'אינסטלציה' },
  { id: 5, name: 'תחזוקת מזגן', desc: 'ניקוי ותחזוקה שנתית למזגן', duration: 45, price: 180, materials: ['פילטר', 'ספריי ניקוי', 'מסנן'], checklist: ['ניקוי פילטרים', 'ניקוי יחידה פנימית', 'בדיקת גז', 'בדיקת ניקוז', 'בדיקת שלט'], category: 'מיזוג' },
  { id: 6, name: 'החלפת מנעול', desc: 'החלפת מנעול דלת', duration: 45, price: 300, materials: ['מנעול', 'צילינדר', 'ברגים'], checklist: ['פירוק מנעול ישן', 'התקנת מנעול חדש', 'בדיקת נעילה/פתיחה', 'מסירת מפתחות'], category: 'מנעולנות' },
  { id: 7, name: 'בדיקה כללית', desc: 'בדיקה ואבחון כללי', duration: 30, price: 150, materials: [], checklist: ['בדיקה ויזואלית', 'אבחון בעיה', 'הצעת פתרון', 'הצעת מחיר'], category: 'כללי' },
];
