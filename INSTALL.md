# Zikkit Dana Wizard v2 - מדריך התקנה

## 📦 מה יש בחבילה

```
src/app/dana-setup/page.tsx                    — Wizard בן 8 שלבים (UI מלא)
src/app/api/dana/provision/route.ts            — API שמקצה Twilio + ElevenLabs
```

## 🎯 איך זה עובד

### זרימת הלקוח (8 שלבים):
1. **פרטי העסק** — שם + איש קשר
2. **שירותים** — מה מציעים + מחירים
3. **סגנון תיאום** — איך הסוכן יטפל
4. **קול** — בחירה מתוך 5 קולות
5. **אישיות** — פתיחה + שאלות לאיסוף
6. **סיכום** — בדיקה לפני
7. **יצירה** — Loading screen בזמן הקצאה
8. **תוצאה** — מקבל מספר טלפון ייעודי

### זרימה בשרת:
1. שומר config ב-Firestore תחת `businesses/{bizId}/dana`
2. **קונה מספר ישראלי מ-Twilio** דרך API
3. **יוצר agent ב-ElevenLabs** עם prompt מותאם
4. מחבר את המספר ל-agent דרך `phone_lookup`

## 🚀 התקנה — 5 דקות

### 1. גיבוי

```cmd
cd C:\zikkit
mkdir backup-before-dana
```

### 2. חילוץ

```cmd
cd C:\zikkit
tar -xzf ZIKKIT-DANA-WIZARD.tar.gz
```

### 3. בדיקת build מקומית ⚠️ חובה

```cmd
rmdir /S /Q .next
npm run build
```

✅ `Compiled successfully` → המשך
❌ Error → תעתיק לי

### 4. הגדר env vars ב-Vercel (אם חסר)

תפתח: **https://vercel.com/lielohana8-wqs-projects/zikkit-jvc7/settings/environment-variables**

תוודא שיש לך את כל אלה (אמורים להיות כבר):

```
TWILIO_ACCOUNT_SID = ACxxx...
TWILIO_AUTH_TOKEN = xxx...
ELEVENLABS_API_KEY = sk_xxx...
NEXT_PUBLIC_BASE_URL = https://zikkit-jvc7.vercel.app
```

### 5. דחוף

```cmd
git add .
git commit -m "feat: Dana Wizard v2 - 8 step setup + auto phone provisioning"
git push
vercel --prod
```

## 🎨 גישה אל הדף

אחרי deploy:
**https://zikkit-jvc7.vercel.app/dana-setup**

## ⚠️ הערות חשובות

### על Twilio
- כל מספר ישראלי **עולה ~$3-5/חודש** ל-Twilio
- צריך balance בחשבון Twilio שלך
- אם אין מספרים זמינים, המערכת תיפול ל-fallback למספר המשותף

### על ElevenLabs
- כל agent **חינמי** ליצירה
- כל דקת שיחה עולה ~$0.08 (Turbo v2.5)
- VOICE_MAP בקובץ provision/route.ts צריך עדכון עם voice IDs אמיתיים מ-ElevenLabs

### על Business Model
- אתה משלם על Twilio + ElevenLabs מהחשבון שלך
- אתה גובה מהלקוח את התוכנית (Pro = ₪479/חודש)
- ₪479 - ($3 × 30 = $15 ל-Twilio) - ($0.08 × 200 דקות = $16 ל-ElevenLabs) = ~₪370/חודש רווח
- מצוין למצב לקוחות מתחילים. עם volume גדול - אפשר לעבור ל-Twilio Enterprise

## 🔄 לעתיד

- שלח dashboard widget שמראה מספר דנה למשתמש
- הוסף שינוי קול ושינוי greeting אחרי הקצאה
- הוסף "התקשר עכשיו לדנה" בדאשבורד לבדיקה
- אנליטיקה - כמה שיחות, כמה לידים נכנסו
