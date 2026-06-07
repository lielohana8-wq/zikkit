# Zikkit Dana Smart + Customer Portal

## 📦 מה בחבילה

```
src/app/api/dana/webhook/route.ts                  — Webhook מ-ElevenLabs (יוצר ליד אחרי שיחה)
src/app/api/dana/tools/check-availability/route.ts — Tool: בודק זמינות יומן
src/app/api/dana/tools/book-appointment/route.ts   — Tool: קובע מועד ביומן
src/app/api/portal/[token]/route.ts                — API לפורטל לקוח
src/app/portal/[token]/page.tsx                    — דף פורטל ללקוח
```

## 🎯 מה זה עושה

### זרימת שיחה מלאה:
1. **לקוח מתקשר** למספר דנה
2. **דנה שואלת** את השאלות שהגדרת
3. **דנה בודקת יומן** דרך `check-availability` tool
4. **דנה מציעה מועדים** ללקוח
5. **דנה קובעת מועד** דרך `book-appointment` tool
6. **השיחה מסתיימת** → ElevenLabs שולח webhook
7. **המערכת יוצרת ליד** ב-Firestore
8. **משייכת לטכנאי** אוטומטית (round-robin)
9. **שולחת SMS:**
   - ללקוח עם לינק לפורטל
   - לבעל העסק עם סיכום
   - לטכנאי המשובץ עם פרטים
10. **הלקוח רואה פורטל** עם הסטטוס שלו (מתעדכן כל 30 שניות)

## 🚀 התקנה — 4 שלבים

### 1. חילוץ

```cmd
cd C:\zikkit
tar -xzf ZIKKIT-DANA-SMART.tar.gz
```

### 2. ⚠️ חובה - הוסף Service Account Key ב-Vercel

זה הקריטי - בלי זה כלום לא יעבוד.

#### א. השג את ה-Service Account JSON

יש לך כבר את הקובץ `new-db-key.json` בתיקיית Downloads (משלב המיגרציה).

תפתח אותו (Notepad). תראה משהו כזה:
```json
{
  "type": "service_account",
  "project_id": "zikkit-e87ff",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@zikkit-e87ff.iam.gserviceaccount.com",
  ...
}
```

#### ב. העתק את כל התוכן

Ctrl+A → Ctrl+C על כל הקובץ.

#### ג. הוסף ל-Vercel

תפתח: **https://vercel.com/lielohana8-wqs-projects/zikkit-jvc7/settings/environment-variables**

לחץ **Add New** → תכניס:

- **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Value:** הדבק את **כל ה-JSON** (הכל בשורה אחת)
- **Environments:** סמן ✅ Production, Preview, Development

לחץ **Save**.

### 3. בדיקת build

```cmd
rmdir /S /Q .next
npm run build
```

### 4. דחוף

```cmd
git add .
git commit -m "feat: Dana Smart - leads, scheduling, customer portal"
git push
vercel --prod
```

## 🛠️ הגדרת ElevenLabs Tools

לאחר deploy, צריך להגדיר את ה-Tools ב-ElevenLabs כדי שדנה תוכל להשתמש בהם.

תפתח: **https://elevenlabs.io/app/conversational-ai/agents**

תבחר את ה-agent של ליאו שירותי ניקיון (נוצר אוטומטית מהוויזרד).

### Tool 1: check_availability

- **Type:** Webhook
- **URL:** `https://zikkit-jvc7.vercel.app/api/dana/tools/check-availability`
- **Method:** POST
- **Description:** Check available appointment slots in the business calendar
- **Parameters:**
  - `bizId` (string, required) - The business ID
  - `requestedDate` (string, optional) - Preferred date

### Tool 2: book_appointment

- **Type:** Webhook
- **URL:** `https://zikkit-jvc7.vercel.app/api/dana/tools/book-appointment`
- **Method:** POST
- **Description:** Book an appointment after customer confirms time
- **Parameters:**
  - `bizId` (string, required)
  - `customerName` (string, required)
  - `customerPhone` (string)
  - `service` (string)
  - `scheduledDate` (string, required) - YYYY-MM-DD
  - `scheduledTime` (string, required) - HH:MM
  - `notes` (string)

### Post-call Webhook

ב-agent settings → Post-call webhook:
- **URL:** `https://zikkit-jvc7.vercel.app/api/dana/webhook`

## 🧪 בדיקה

### 1. התקשר למספר דנה
המספר שקיבלת בסיום ה-Wizard.

### 2. תגיד "אני רוצה לקבוע מועד"
דנה תשאל פרטים, תבדוק זמינות, תציע מועדים.

### 3. אשר מועד
דנה תקבע אותו ב-Firestore.

### 4. נתק
תוך כ-15 שניות תקבל:
- SMS ללקוח עם לינק לפורטל
- SMS לבעל העסק (אם הוגדר טלפון)
- ליד חדש בדאשבורד

### 5. פתח את הפורטל
לקוח לוחץ על הלינק → רואה את כל הפרטים.

## 🔮 לעתיד - שיפורים

- **שעות עבודה custom** - להוסיף בהגדרות העסק
- **שיוך טכנאי חכם** - לפי אזור, מומחיות, זמינות
- **WhatsApp** במקום SMS
- **ביטול תור דרך הפורטל** ע"י הלקוח
- **דירוג השירות** אחרי סיום
