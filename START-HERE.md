# Zikkit CA — מחשב חדש, בקיצור (העתק-הדבק, בלי לשנות כלום)

## 1. פעם אחת — תוכנות
- Node.js 20 LTS: https://nodejs.org → Next, Next, Next
- Git: https://git-scm.com/download/win → Next, Next, Next

## 2. הקוד (CMD — `Win+R` → `cmd`)
```cmd
cd C:\
git clone https://github.com/lielohana8-wq/zikkit.git
cd C:\zikkit
git checkout -b ca
powershell -Command "Expand-Archive -Force '%USERPROFILE%\Downloads\ZIKKIT-CA-SOLO-V1-FULL.zip' 'C:\zikkit'"
del /Q users.json temp.json curl src\App.jsx ZIKKIT-*.tar.gz FIX-ROUTES.bat INSTALL.bat 2>nul
rmdir /S /Q src\src 2>nul
npm install
npm run dev
```
→ http://localhost:3000/register — הירשם באימייל **אחר** מהעסק הישראלי.
(`.env.local` כבר מלא ובפנים. עוצרים את השרת עם `Ctrl+C`.)

## 3. Firestore Rules (פעם אחת, בלי זה הדפים החדשים חסומים)
```cmd
cd C:\zikkit
npm i -g firebase-tools
firebase login
firebase use zikkit-e87ff
copy /Y firestore.rules.shared firestore.rules
firebase deploy --only firestore:rules,storage
```

## 4. Push ל-Git (branch `ca` — לא נוגע ב-`main` של ישראל)
```cmd
cd C:\zikkit
git config --global user.name "lielohana8-wq"
git config --global user.email "ohanaliel@gmail.com"
git add -A
git commit -m "CA Solo edition + data layer v2"
git push -u origin ca
```
(בפעם הראשונה נפתח חלון התחברות ל-GitHub בדפדפן.)

## 5. Vercel (דפדפן, פעם אחת)
1. https://vercel.com/new → Import `lielohana8-wq/zikkit` → Project Name: `zikkit-ca`
2. Environment Variables → פתח את `C:\zikkit\.env.local` בנוטפד, **העתק הכל, הדבק** בתיבה (Vercel קולט את כל השורות) → Deploy
3. Settings → Git → Production Branch: `ca` → Save
4. חזרה ל-CMD:
   ```cmd
   cd C:\zikkit
   git commit --allow-empty -m "deploy ca"
   git push
   ```
5. Google Sign-In בדומיין החדש: https://console.firebase.google.com/project/zikkit-e87ff/authentication/settings → Authorized domains → Add domain → `zikkit-ca.vercel.app`

## 6. (אופציונלי) אישור הצעות מחיר אונליין
`FIREBASE_SERVICE_ACCOUNT_KEY` — https://vercel.com/lielohana8-wqs-projects/zikkit-jvc7/settings/environment-variables → העתק את הערך → הדבק ב-`.env.local` וב-Vercel של `zikkit-ca`.
אם Vercel לא מראה את הערך: https://console.firebase.google.com/project/zikkit-e87ff/settings/serviceaccounts/adminsdk → Generate new private key → פתח את ה-JSON בנוטפד → העתק הכל לשורה אחת.

## עדכונים בעתיד
```cmd
cd C:\zikkit
git add -A
git commit -m "update"
git push
```
Vercel מפרסם לבד.
