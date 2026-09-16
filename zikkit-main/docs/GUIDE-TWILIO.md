# מדריך Twilio — שיחת טלפון אמיתית מישראל

## שלב 1: הרשמה ל-Twilio Trial
1. לך ל-https://www.twilio.com/try-twilio
2. הירשם עם מייל
3. מקבלים **$15.50 קרדיט חינם** — מספיק ל-~100 דקות שיחה
4. לא צריך כרטיס אשראי

## שלב 2: אמת את המספר הישראלי שלך
1. ב-Twilio Console > **Verified Caller IDs**
2. לחץ + ותוסיף את מספר הפלאפון הישראלי שלך
3. תקבל SMS עם קוד אימות — תכניס אותו
4. **חשוב**: ב-Trial רק מספרים מאומתים יכולים להתקשר

## שלב 3: קח מספר אמריקאי
1. ב-Twilio Console > **Phone Numbers** > **Buy a Number**
2. בחר מספר אמריקאי (Country: US)
3. זה כלול ב-Trial — $0
4. העתק את המספר (למשל: +1-555-123-4567)

## שלב 4: חשוף את localhost (ngrok)
אם רץ על localhost, צריך לחשוף את השרת לאינטרנט:

```bash
# התקן ngrok (פעם אחת)
npm install -g ngrok

# הרץ את ZIKKIT בטרמינל אחד
npm run dev

# בטרמינל שני — חשוף
ngrok http 3000
```

תקבל URL כמו: `https://abc123.ngrok.io`

## שלב 5: הגדר Webhook ב-Twilio
1. ב-Twilio Console > **Phone Numbers** > **Active Numbers**
2. לחץ על המספר שקנית
3. תחת **Voice Configuration**:
   - "A CALL COMES IN" → **Webhook**
   - URL: `https://abc123.ngrok.io/api/voice/incoming`
   - Method: **HTTP POST**
4. **שמור**

## שלב 6: הגדר ב-ZIKKIT
1. ערוך `.env.local`:
```
TWILIO_ACCOUNT_SID=ACxxxxx   (מ-Twilio Console > Account Info)
TWILIO_AUTH_TOKEN=xxxxx       (מ-Twilio Console > Account Info)
```
2. הרץ מחדש: `npm run dev`
3. ב-ZIKKIT לך ל-**Settings** > הגדר Region
4. ב-**AI Voice Bot** > **Phone Setup** > הכנס את מספר Twilio

## שלב 7: התקשר
1. מהפלאפון הישראלי שלך — חייג למספר האמריקאי
2. תשמע הודעת Trial של Twilio (רק ב-Trial)
3. הבוט יענה, ישאל שאלות
4. בסוף — ליד נוצר במערכת

## הגבלות Trial
- רק מספרים מאומתים (Verified) יכולים להתקשר
- הודעת "Twilio Trial" בתחילת כל שיחה
- $15.50 קרדיט
- מספר אמריקאי בלבד (ישראלי דורש חשבון בתשלום)

## עלות שיחה מישראל
- תלוי בספק הסלולר שלך (כמה שקלים)
- חלופה חינמית: Skype / Google Voice — חייג למספר US בחינם

## פתרון בעיות
| בעיה | פתרון |
|------|-------|
| הבוט לא עונה | בדוק ש-ngrok רץ ושה-URL נכון ב-Twilio |
| שגיאת 502 | בדוק ש-`npm run dev` רץ |
| בוט מדבר אנגלית | הגדר Region: IL ב-Settings |
| אין ליד | בדוק ANTHROPIC_API_KEY ב-.env.local |
| שיחה נקטעת | בדוק שאין שגיאות ב-Terminal |
