# ZIKKIT — CA Solo Edition + תיקון שכבת הנתונים (V1)

## מה בחבילה

**תיקון ה"נתקע" (חל על כל האזורים, גם IL):**
```
src/hooks/useFirestore.tsx          — DataProvider חדש: מסמך לכל רשומה, onSnapshot, כתיבות diff בלבד
src/lib/data/collections.ts         — מודל הנתונים v2 + מזהים
src/lib/data/diff.ts                — חישוב מה השתנה (רק זה נכתב)
src/lib/data/offload.ts             — base64 (תמונות/חתימות/לוגו) → Firebase Storage
src/lib/data/inbox.ts               — העברה טרנזקציונית של המסמך הישן לתת-אוספים (Inbox pattern)
src/features/auth/AuthProvider.tsx  — בלי מראה localStorage, בלי סריקת כל העסקים, membership לטכנאים
src/app/(app)/layout.tsx            — Provider אחד (היו שניים), מסך טעינה עד שהנתונים באמת הגיעו
src/components/ui/GpsTracker.tsx    — כותב מסמך presence קטן במקום את כל ה-DB כל 60 שניות
src/lib/firebase.ts                 — קונפיג מ-ENV בלבד (בלי fallback לפרויקט אחר)
src/middleware.ts                   — נעילת דומיין לפי ENV (+ *.zikkit.ca / *.zikkit.com)
firestore.rules / storage.rules / firebase.json / firestore.indexes.json
vercel.json                         — הוסרו crons/functions לקבצים שלא קיימים (שבר deploy)
.gitignore / .env.example
```

**מהדורת CA (אנגלית, "Solo"):**
```
src/lib/region.ts                   — REGION מ-NEXT_PUBLIC_ZIKKIT_REGION: שפה, מטבע, מס, טלפון, timezone
src/types/solo.ts                   — Customer / Receipt / Closing
src/features/solo/useSolo.ts        — לוגיקה: סכומים, מספור אטומי, פרסום לינק ללקוח
src/features/solo/components/       — SoloUI (בחירת לקוח, שורות, שליחה), PublicDoc (דף לקוח + PDF)
src/features/solo/pages/            — Dashboard, Customers, Quotes, Receipts, Closings, Settings, Register
src/app/(app)/receipts, closings    — ראוטים חדשים
src/app/q/[token], src/app/r/[token]— דפי לקוח ציבוריים (Quote / Receipt)
src/app/api/docs/{send,accept,viewed} — שליחה (SMS/Email), אישור+חתימה, מעקב צפייה (firebase-admin)
src/lib/server/admin.ts             — firebase-admin singleton
```
דפי customers / quotes / dashboard / settings / register מתפצלים לפי `IS_SOLO_EDITION` — ב-IL הכל נשאר כמו שהיה.

---

## למה המערכת נתקעה (שורש הבעיה)

1. **כל ה-DB של העסק ישב במסמך Firestore אחד** (`businesses/{id}.db`) כמערכים, ונכתב **במלואו** בכל שמירה. תמונות של עבודות, חתימות ולוגו נשמרו בתוכו כ-base64. ברגע שהמסמך התקרב ל-**1MB** (מגבלת Firestore) — כל שמירה נכשלה בשקט, ה-localStorage עבר את המכסה וזרק שגיאה, ו-`JSON.stringify` של מגה-בייטים תקע את ה-UI.
2. **GpsTracker** כתב את כל ה-DB כל 60 שניות לכל טכנאי.
3. **שני DataProvider** מותקנים אחד על השני (root + (app)/layout) — שני state-ים, שני לולאות סנכרון, bizId שהגיע רק לאחד.
4. סנכרון כל 5 דקות עם חלון "last write wins" של 15 שניות — דריסות בין מכשירים.
5. `firebase.ts` נפל בשקט לפרויקט **zikkit-5e554** (Appointments) כשחסרו ENV; `api/portal/sign` היה מקודד קשיח לאותו פרויקט.
6. `vercel.json` הפנה ל-cron/billing routes שלא קיימים בקוד.
7. `firestore.rules`: כל משתמש מחובר יכול לכתוב לכל עסק; `bot_conversations` פתוח לעולם.
8. `users.json` / `temp.json` עם hash-ים של סיסמאות בתוך הריפו.

**המודל החדש:** `businesses/{id}/{collection}/{docId}` — מסמך לרשומה, onSnapshot בזמן אמת, כתיבה רק של מה שהשתנה, מדיה ב-Storage. ה-API של הדפים (`db`, `saveData`, `saveCfg`) **לא השתנה** — כל הדפים הישנים עובדים כמו שהם. המסמך הישן מומר אוטומטית בכניסה הראשונה (עם גיבוי ל-`businesses/{id}/backups/`).

---

## התקנה על מחשב חדש (Windows)

הקובץ `ZIKKIT-CA-SOLO-V1-FULL.zip` = **הפרויקט המלא** (כל הקבצים, בלי node_modules). לא פאץ'.

1. התקן **Node.js 20 LTS**: https://nodejs.org (Next)  
   ו-**Git**: https://git-scm.com (אופציונלי, בשביל push ל-GitHub/Vercel)
2. חלץ את ה-zip ל-`C:\zikkit` (שיהיה `C:\zikkit\package.json`)
3. ```cmd
   cd C:\zikkit
   SETUP-NEW-PC.bat
   ```
   ה-bat: בודק Node, יוצר `.env.local` מ-`.env.example`, מריץ `npm install`.
4. פתח `.env.local` ומלא (סעיף "הקמת סביבת קנדה" למטה)
5. `npm run dev` → http://localhost:3000

ידנית בלי ה-bat:
```cmd
cd C:\zikkit
copy .env.example .env.local
npm install
npm run dev
```

## Git — branch נפרד `ca` באותו ריפו (מומלץ)

קוד אחד, שני deployments: IL מ-`main`, CA מ-`ca`. **לא למזג `ca` ל-`main`** עד שלב 2 (ראוטי הבוט + rules + ENV של Firebase ב-Vercel של IL).

```cmd
:: 1. Git for Windows: https://git-scm.com  (פעם אחת)
git config --global user.name "Liel"
git config --global user.email "you@email.com"

:: 2. שכפל את הריפו הקיים (שומר היסטוריה) וצור branch
cd C:\
git clone https://github.com/<USER>/zikkit.git
cd zikkit
git checkout -b ca

:: 3. חלץ את ZIKKIT-CA-SOLO-V1-FULL.zip *על* התיקייה הזאת (לדרוס), ואז נקה:
del users.json temp.json curl 2>nul
rmdir /S /Q src\src 2>nul
del src\App.jsx ZIKKIT-*.tar.gz FIX-ROUTES.bat INSTALL.bat 2>nul

:: 4. commit + push
git add -A
git commit -m "CA Solo edition + data layer v2 (per-record docs, inbox migration, rules)"
git push -u origin ca
```
בפעם הראשונה GitHub יפתח חלון התחברות בדפדפן (Git Credential Manager).

אין ריפו קיים / רוצה ריפו נפרד: `git init` בתוך `C:\zikkit` → `git add -A` → `git commit -m "..."` → `git branch -M main` → `git remote add origin https://github.com/<USER>/zikkit-ca.git` → `git push -u origin main` (ואז ב-Vercel ה-Production Branch הוא `main`).

**Vercel:** Add New Project → Import אותו ריפו → שם `zikkit-ca` → Settings → Git → **Production Branch = `ca`** → Environment Variables (כל `.env.local`) → Deploy. ה-project של IL ממשיך לחיות מ-`main` בלי שינוי.

---

## אפשרות מהירה: אותו פרויקט Firebase כמו IL (בלי מפתחות חדשים)

לא חובה פרויקט חדש. הקוד לא מייצר מפתחות — הוא רק **קורא** אותם מ-ENV. אם רוצים לרוץ על הפרויקט הקיים:

1. Firebase Console → הפרויקט שבו יושבים הנתונים של Zikkit FSM (ודא: יש בו אוסף `businesses` עם הנתונים) → ⚙️ Project settings → General → Your apps → SDK setup and configuration → העתק `apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId` ל-`.env.local` (אלה ה-`NEXT_PUBLIC_FIREBASE_*`).
   או: Vercel → הפרויקט הקיים → Settings → Environment Variables → העתק. (Vercel לא משתף ENV בין פרויקטים — לפרויקט `zikkit-ca` צריך להדביק אותם שוב.)
2. `FIREBASE_SERVICE_ACCOUNT_KEY` — כבר קיים ב-Vercel של IL (ראוטי Dana משתמשים בו). אותו ערך.
3. **Rules**: הקובץ `firestore.rules` הרגיל מהדק את IL (סוגר `bot_conversations`, מגביל כתיבה ל-`businesses`). לפרויקט משותף השתמש ב-**`firestore.rules.shared`** — משאיר את IL בדיוק כמו שהיה ומוסיף גישה לתת-האוספים החדשים:
   ```cmd
   copy /Y firestore.rules.shared firestore.rules
   firebase use <project-id>
   firebase deploy --only firestore:rules,storage
   ```
   בלי זה — הדפים החדשים יקבלו `permission-denied` (ה-rules הישנים לא מכירים תת-אוספים).
4. Authentication → Sign-in method: Email/Password + Google כבר פעילים. Storage: אם לא הופעל — Get started (צריך ללוגו/תמונות).
5. חשבון: הירשם באימייל **אחר** מהעסק הישראלי (חשבון = עסק = tenant). אותו אימייל = תראה את הנתונים העבריים בתוך ה-UI האנגלי.

מה חדש בכל מקרה (לא "מפתחות"): `NEXT_PUBLIC_ZIKKIT_REGION=CA`, `NEXT_PUBLIC_APP_URL`, פרויקט Vercel שני, ומספר Twilio קנדי אם רוצים SMS.

**מתי כן פרויקט חדש:** נתונים בטורונטו (residency), הפרדה מלאה מ-IL (rules/מכסות/חיוב), ובלי סיכון ש-deploy של rules ישפיע על IL. אפשר להתחיל על הקיים ולפצל אחר כך — הנתונים של עסק אחד קטנים.

---

## הקמת סביבת קנדה (פעם אחת)

### 1. Firebase — פרויקט חדש `zikkit-ca`
1. https://console.firebase.google.com → Add project → `zikkit-ca`
2. **Firestore** → Create database → Location: **`northamerica-northeast2` (Toronto)** → production mode
3. **Storage** → Get started → אותו region
4. **Authentication** → Sign-in method → Email/Password + Google
5. Project settings → Your apps → Web app → העתק את הקונפיג ל-`.env.local`
6. Project settings → Service accounts → Generate new private key → את ה-JSON כשורה אחת ל-`FIREBASE_SERVICE_ACCOUNT_KEY`
7. פריסת חוקים (מתוך `C:\zikkit`):
   ```cmd
   npm i -g firebase-tools
   firebase login
   firebase use zikkit-ca
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### 2. `.env.local`
העתק מ-`.env.example`. חובה: `NEXT_PUBLIC_ZIKKIT_REGION=CA`, כל `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_APP_URL`.

### 3. הרצה מקומית
```cmd
npm install
npm run dev
```
→ http://localhost:3000/register → צור חשבון → ממלא Settings (setup) → Dashboard.

### 4. Vercel
1. Vercel → Add New Project → אותו ריפו (או ריפו/branch נפרד `ca`) → שם: `zikkit-ca`
2. Environment Variables: כל מה שב-`.env.local` (ל-Production + Preview)
3. Domains: `app.zikkit.ca` (או `ca.zikkit.com`) → CNAME לפי ההוראות. הדומיין כבר מותר ב-middleware; לכל דומיין אחר: `ALLOWED_HOSTS=...`
4. Deploy. `NEXT_PUBLIC_APP_URL` = הדומיין הסופי (זה מה שנכנס ללינקים ללקוחות).

### 5. אופציונלי
- **Email** (Resend): `RESEND_API_KEY` + דומיין מאומת ב-Resend → `RESEND_FROM_EMAIL=Leo Chimney <quotes@zikkit.ca>`
- **SMS** (Twilio): מספר **קנדי** → `TWILIO_PHONE_CA=+1416…`
- בלי שניהם: **Copy link + WhatsApp + Preview + Print/PDF** עובדים מיד.

---

## מה יש במהדורת CA
- **Dashboard** — סגור השבוע (ב'–א'), החודש, הצעות ממתינות, קבלות פתוחות, "Needs attention".
- **Customers** — ישות אמיתית (לא נגזר מעבודות), חיפוש, תגיות, היסטוריית הצעות/קבלות/סגירות.
- **Quotes** — בונה עם שורות, הנחה, HST 13% (ניתן לכיבוי), תוקף; מספור `Q-1001…` אטומי; שליחה כלינק `/q/<token>` (Copy / WhatsApp / SMS / Email); הלקוח **מאשר + חותם** מהטלפון; סטטוסים sent → viewed → accepted/declined; המרה לקבלה בקליק.
- **Receipts** — מקבלת מהצעה או ידנית; שולם/חלקי/לא שולם, אמצעי תשלום (e-Transfer/Cash/Card/Cheque); לינק `/r/<token>`; **PDF דרך Print** בדף הלקוח.
- **Closings** — יומן סגירות: תאריך, לקוח, סוג עבודה, סכום, מקדמה ולאן הלכה, יתרה ולאן הלכה, חומרים (אופציונלי), הערות. תצוגה שבועית ב'–א' עם סיכומים (לחברה / מזומן אצלי / e-Transfer אליי / טרם נגבה) + **CSV**. **בלי חישוב עמלה** — כפי שביקשת.
- **Settings** — פרטי עסק, לוגו (ל-Storage), HST/GST number, קידומות ומספור, הוראות תשלום, footers.

---

## מגבלות ידועות / שלב הבא
1. **ראוטים של הבוט/קול/SMS** (`api/voice/*`, `api/sms/*`, `api/dana/*`, `retell`, `elevenlabs`, `webhook/paddle`, `widget`) עדיין קוראים/כותבים למבנה הישן (`db.leads` וכו'). בקנדה זה לא רלוונטי כרגע. **אל תפרוס את הקוד הזה על פרויקט IL עד שלב 2** (העברת הראוטים ל-`firebase-admin` + תת-אוספים). לידים שהבוט יכתוב ייכנסו ל-Inbox ויעברו אוטומטית לתת-אוסף — אבל הבוט לא יראה `db.users` ריק.
2. `firestore.rules` כאן = לפרויקט CA. ב-IL להשאיר את הישן עד שלב 2.
3. PDF = Print-to-PDF מדף הלקוח (בלי תלויות שרת). PDF שרת (Puppeteer/react-pdf) — שלב 2 אם תרצה קובץ מצורף במייל.
4. `next.config.js` עדיין עם `ignoreBuildErrors` — נשארו 73 שגיאות TypeScript **ישנות** בדפים העבריים (היו 82). הקוד החדש נקי. `next build` עובר.
5. כניסת טכנאים ב-CA לא נבדקה בפועל (Solo). המנגנון קיים (`members/{uid}` + `tech_lookup`).
6. Stripe/billing ל-CA — לא כלול (חינם בשלב early access). Paywall/Trial כבויים ב-Solo.
