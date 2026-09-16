# מדריך Deploy

## אפשרות 1: Vercel (מומלץ)
1. לך ל-https://vercel.com
2. חבר את ה-GitHub repo
3. הגדר Environment Variables (כמו ב-.env.local)
4. Deploy

### דומיינים
- `app.zikkit.com` → המערכת (Vercel)
- `zikkit.com` → דף נחיתה (Vercel/Netlify נפרד)

## אפשרות 2: Docker
```bash
docker build -t zikkit .
docker run -p 3000:3000 --env-file .env.local zikkit
```

## דף נחיתה — Deploy נפרד
הקובץ `zikkit-landing/index.html` הוא אתר סטטי.
שים על Vercel / Netlify / כל hosting:
1. צור פרויקט חדש
2. העלה את הקובץ
3. הגדר דומיין: zikkit.com
