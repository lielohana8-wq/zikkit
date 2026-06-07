# תיקון הרשאות מוקדן + הסבר 4 הבאגים

## 📦 בחבילה

```
src/features/auth/AuthProvider.tsx   — תיקון באג ההרשאות (באג 4)
```

---

## 🔴 באג 4 - מוקדן נכנס כמנהל (תוקן!)

### מה היה הבאג
2 בעיות ב-AuthProvider:

1. **Google Sign-In** - כשמוקדן התחבר עם Google, המערכת בדקה אם יש לו `businesses/{uid}`. כשלא היה - **יצרה לו עסק חדש כ-owner!** במקום לזהות אותו כמוקדן.

2. **Fallback** - כשמשתמש לא נמצא, ה-fallback תמיד נתן `role: 'owner'`. אז כל מוקדן שה-lookup שלו נכשל הפך אוטומטית למנהל.

### מה תוקן
1. ✅ לפני יצירת עסק חדש ב-Google Sign-In, בודקים אם המייל שייך לטכנאי/מוקדן בעסק קיים. אם כן - **לא יוצרים עסק**, נותנים לו להיכנס בתפקיד האמיתי.
2. ✅ Fallback עכשיו נותן role `'pending'` במקום `'owner'`. משתמש לא מזוהה **לא** מקבל הרשאות מנהל.

### ⚠️ חשוב - המוקדן שכבר נוצר בטעות
המוקדן שיצרת כבר קיבל `businesses/{uid}` משלו (מהבאג). צריך לנקות אותו:

1. תפתח Firestore: **https://console.firebase.google.com/project/zikkit-e87ff/firestore/data**
2. חפש ב-`businesses` את ה-doc שנוצר בטעות (עם המייל של המוקדן)
3. מחק אותו
4. וודא שהמוקדן קיים תחת ה-business הנכון שלך ב-`db.users` עם `role: 'technician'` או `'dispatcher'`

---

## 🚀 התקנה

```cmd
cd C:\zikkit
tar -xzf ZIKKIT-AUTH-FIX.tar.gz
rmdir /S /Q .next
npm run build
```

אם build הצליח:
```cmd
git add .
git commit -m "fix: dispatcher role - never default unknown users to owner"
git push
vercel --prod
```

---

## 📋 שאר הבאגים - מה צריך

### 🔴 באג 1 - AI 500 error
**זה ENV VAR, לא קוד.** ה-`ANTHROPIC_API_KEY` ב-Vercel מסומן "Needs Attention" = לא תקין.

**תיקון:**
1. https://console.anthropic.com/settings/keys → צור key חדש
2. Vercel → Edit `ANTHROPIC_API_KEY` → הדבק → Save
3. Redeploy

### 🟡 באג 2 - אוטומציה פותח התקנה מחדש
צריך תיקון ב-`dana-setup/page.tsx` - בתחילת הטעינה לבדוק:
```
אם business.dana.provisioned === true → redirect לדשבורד
```
**אני אבנה את זה בנפרד** (צריך לראות איך נשמר provisioned).

### 🟡 באג 3 - קולות לא נשמעים
ב-V3 הסרתי כפתורי השמעה כי לא היו קבצי audio. צריך:
- לחבר ל-ElevenLabs preview API, או
- להעלות 5 קבצי MP3 קצרים של הקולות ל-`public/voices/`

**אני אבנה את זה בנפרד** (עם ElevenLabs preview).

---

## ❓ אחרי ה-Auth Fix

תגיד לי "Auth תוקן" ואני אבנה:
1. תיקון באג 2 (בדיקת provisioned)
2. תיקון באג 3 (השמעת קולות)
3. מסך נחיתה ל-'pending' users
