import { useState, useEffect, useRef } from "react";

const PASS = "leo2024";
const NPOINT_ID = "";

const D = {
  phone: "050-123-4567", waNum: "972501234567",
  services: [
    { name:"ניקוי ספות", desc:"ניקוי מקצועי לכל סוגי הספות — בד, עור, אימפלה, קטיפה. הסרת כתמים עמוקים, ריחות וחיידקים. כולל חיטוי ובישום.", price:"280₪", accent:"#C8A44E", icon:"🛋️" },
    { name:"ניקוי מזרן זוגי", desc:"חיטוי עמוק, הסרת קרדית אבק, כתמים ואלרגנים. צד אחד או שני צדדים.", price:"150/250₪", accent:"#6DC489", icon:"🛏️" },
    { name:"ניקוי מזרן יחיד", desc:"חיטוי מלא למזרן יחיד. הסרת כתמים, ריחות ואלרגנים. צד אחד או שניים.", price:"100/200₪", accent:"#82C8A0", icon:"🛏️" },
    { name:"ניקוי מזגן עילי", desc:"פירוק, ניקוי וחיטוי מזגן עילי. אוויר נקי ובריא, הפחתת ריחות וחיסכון בחשמל.", price:"170₪", accent:"#4ABDE0", icon:"❄️" },
    { name:"מזגן מיני מרכזי", desc:"ניקוי מערכת מיני מרכזי עד 10 יחידות פנימיות. כל יחידה נוספת 45₪.", price:"600₪", accent:"#3A9CC0", icon:"🌬️" },
    { name:"ניקוי רכב — 5 מושבים", desc:"שחזור מלא של פנים הרכב — ריפודים, תקרה, דשבורד, מושבים ותא מטען.", price:"250₪", accent:"#E07B5B", icon:"🚗" },
    { name:"ניקוי שטיחים", desc:"ניקוי עמוק לשטיחים מכל הסוגים. מחיר למ״ר — שטיחים קטנים וגדולים.", price:"40₪/מ״ר", accent:"#5BA0E0", icon:"🟫" },
    { name:"ניקוי כורסא", desc:"ניקוי וחיטוי כורסאות מכל הסוגים — בד, עור, קטיפה.", price:"70₪", accent:"#9B7ED8", icon:"💺" },
    { name:"ניקוי כיסא", desc:"כיסאות אוכל, משרדיים, גיימינג ובר.", price:"30₪", accent:"#D88ECF", icon:"🪑" },
    { name:"ניקוי ארובה", desc:"ניקוי ושטיפת ארובות מקצועי. שומן, פיח ולכלוך — הכל יורד.", price:"500₪", accent:"#B8860B", icon:"🔥" },
  ],
  reviews: [
    { n:"דנה כ׳", t:"הזמנתי ניקוי לספה של 3 מושבים — חזרה לצבע המקורי! הצוות מקצועי, אדיב ומהיר. ממליצה בחום.", s:"ניקוי ספות", stars:5 },
    { n:"יוסי מ׳", t:"ניקו לי את הרכב מבפנים ומבחוץ — ריח של חדש. כאילו קניתי אוטו חדש. אלופים!", s:"ניקוי רכבים", stars:5 },
    { n:"מיכל ש׳", t:"אחרי ניקוי המזרן הילדים ישנים הרבה יותר טוב. עשו גם חיטוי. ההבדל מורגש מהלילה הראשון.", s:"ניקוי מזרנים", stars:5 },
    { n:"אבי ר׳", t:"שטיח פרסי ענק שחשבנו לזרוק — חזר לחיים. הצבעים בוהקים כמו ביום שקנינו.", s:"ניקוי שטיחים", stars:5 },
    { n:"רונית ל׳", t:"ניקוי מזגן מיני מרכזי — 8 יחידות. מגיע בזמן, עובד נקי ומסודר. מחיר הוגן.", s:"מזגן מרכזי", stars:5 },
    { n:"עמית ב׳", t:"6 כיסאות אוכל + כורסא — הכל נראה חדש. מחיר מעולה ושירות 10/10.", s:"כיסאות", stars:5 },
  ],
  beforeAfter: [
    { title:"ספה עם כתמי קפה", desc:"3 שנים של שימוש → כמו מהחנות", bc:"#6b5544", ac:"#c9b99a", imgBefore:"", imgAfter:"" },
    { title:"מזרן עם כתמים", desc:"כתמים + ריח → נקי ומחוטא", bc:"#7a6e5e", ac:"#ddd0c0", imgBefore:"", imgAfter:"" },
    { title:"ריפודי רכב", desc:"רכב מוזנח → ריח של חדש", bc:"#484848", ac:"#aaa", imgBefore:"", imgAfter:"" },
    { title:"שטיח פרסי", desc:"שטיח עתיק שחזר לחיים", bc:"#5c4e3f", ac:"#b8a990", imgBefore:"", imgAfter:"" },
  ],
  areas: "תל אביב · רמת גן · גבעתיים · הרצליה · רעננה · פתח תקווה · ראשון לציון · חולון · בת ים · נתניה · ירושלים · בית שמש · אשדוד · אשקלון · באר שבע · חיפה · כפר סבא · מודיעין · רחובות · חדרה · הוד השרון · רעננה · קריית גת · אילת",
};

const PROCESS = [
  { step:"01", title:"שלחו תמונה", desc:"צלמו את הפריט ושלחו בוואטסאפ. נאבחן סוג בד, כתמים ודרך טיפול — בחינם ובלי התחייבות.", icon:"📸" },
  { step:"02", title:"קבלו הצעה ותאמו", desc:"תוך דקות תקבלו מחיר מדויק. מתאים? נתאם הגעה ליום ושעה שנוח לכם — גם בערב ובשישי.", icon:"💬" },
  { step:"03", title:"האריה מגיע ומנקה", desc:"מגיעים עם ציוד תעשייתי, מזריקים חומר מקצועי לעומק הסיבים, שואבים 95% מהלחות.", icon:"🦁" },
  { step:"04", title:"נהנים מחדש", desc:"חיטוי אנטיבקטריאלי + בישום. תוך 4-6 שעות הכל יבש, נקי ומריח מדהים.", icon:"✨" },
];

/* ─── Cloud ─── */
async function cloudLoad(id){if(!id)return null;try{const r=await fetch(`https://api.npoint.io/${id}`);if(r.ok){const d=await r.json();return d?.phone?d:null;}}catch(e){}return null;}
async function cloudSave(id,data){if(!id)return null;try{let r=await fetch(`https://api.npoint.io/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!r.ok)r=await fetch(`https://api.npoint.io/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});return r.ok?id:null;}catch(e){return null;}}
function compressImg(file,maxW=400){return new Promise(resolve=>{const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const ratio=Math.min(maxW/img.width,maxW/img.height,1);c.width=img.width*ratio;c.height=img.height*ratio;c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.5));};img.src=e.target.result;};reader.readAsDataURL(file);});}
const gL=()=>{try{return JSON.parse(localStorage.getItem("r_leads")||"[]");}catch{return[];}};
const sL=v=>localStorage.setItem("r_leads",JSON.stringify(v));

/* ─── CSS ─── */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Assistant:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Assistant',sans-serif;font-size:15px;color:#e8e6e1;direction:rtl;overflow-x:hidden;-webkit-font-smoothing:antialiased;background:#060606}
::selection{background:#C8A44E;color:#0E1A2B}img{max-width:100%;display:block}a{text-decoration:none;color:inherit}
h1,h2,h3,h4{font-family:'Heebo',sans-serif;font-weight:800;letter-spacing:-.02em}
.mx{max-width:1140px;margin:0 auto;padding:0 20px}.sec{padding:90px 0}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes glow{0%,100%{filter:drop-shadow(0 0 8px rgba(200,164,78,.15))}50%{filter:drop-shadow(0 0 28px rgba(200,164,78,.4))}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes slideR{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.4)}70%{box-shadow:0 0 0 14px rgba(37,211,102,0)}}
@keyframes countUp{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 34px;border-radius:14px;font-size:15px;font-weight:700;border:none;cursor:pointer;transition:all .25s;font-family:'Heebo';letter-spacing:.3px}
.btn:hover{transform:translateY(-3px)}.btn:active{transform:translateY(0)}
.btn-g{background:linear-gradient(135deg,#25D366,#1DA851);color:#fff;box-shadow:0 6px 20px rgba(37,211,102,.25)}
.btn-a{background:linear-gradient(135deg,#C8A44E,#DDB960);color:#0E1A2B;box-shadow:0 4px 16px rgba(200,164,78,.2)}
.btn-o{background:rgba(255,255,255,.03);border:1.5px solid rgba(200,164,78,.15);color:#ccc}.btn-o:hover{border-color:#C8A44E;color:#C8A44E;background:rgba(200,164,78,.04)}
.btn-d{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);font-size:13px;padding:10px 20px;border-radius:10px}
.crd{background:rgba(255,255,255,.02);backdrop-filter:blur(16px);border:1px solid rgba(200,164,78,.08);border-radius:18px;transition:all .35s}
.crd:hover{border-color:rgba(200,164,78,.22);box-shadow:0 16px 48px rgba(0,0,0,.25);transform:translateY(-5px)}
.gold-line{height:1px;background:linear-gradient(90deg,transparent,rgba(200,164,78,.25),transparent)}
.glow-border{box-shadow:inset 0 0 0 1px rgba(200,164,78,.06),0 0 40px rgba(200,164,78,.03)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:50px;font-size:12px;font-family:'Heebo';font-weight:600;background:rgba(200,164,78,.06);border:1px solid rgba(200,164,78,.1);color:#C8A44E}
@media(max-width:800px){.d-hide{display:none!important}.m-show{display:flex!important}.m-col{grid-template-columns:1fr!important}.m-col2{grid-template-columns:1fr 1fr!important}.m-stack{flex-direction:column!important}.m-full{width:100%!important}.m-center{text-align:center!important}.sec{padding:64px 0}}
`;

/* ─── Utils ─── */
function useV(t=.1){const r=useRef(null);const[v,s]=useState(false);useEffect(()=>{const e=r.current;if(!e)return;const o=new IntersectionObserver(([x])=>{if(x.isIntersecting){s(true);o.unobserve(e);}},{threshold:t});o.observe(e);return()=>o.disconnect();},[]);return[r,v];}
function F({children,d=0,s=""}){const[r,v]=useV();return<div ref={r} style={{opacity:v?1:0,transform:v?"none":"translateY(28px)",transition:`all .7s cubic-bezier(.22,1,.36,1) ${d}s`,...(s?{transitionProperty:"all"}:{})}}>{children}</div>;}
function Num({to,sfx=""}){const[v,s]=useState(0);const[r,vis]=useV();useEffect(()=>{if(!vis)return;const st=Date.now();const t=()=>{const p=Math.min((Date.now()-st)/1800,1);s(Math.round(to*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(t);};requestAnimationFrame(t);},[vis,to]);return<span ref={r} style={{animation:vis?"countUp .4s ease":"none"}}>{v.toLocaleString()}{sfx}</span>;}
const STit=({sub,children,light})=><div style={{textAlign:"center",marginBottom:52}}><h2 style={{fontSize:"clamp(28px,5vw,42px)",color:"#fff",marginBottom:sub?12:0,lineHeight:1.15}}>{children}</h2>{sub&&<p style={{color:light?"rgba(255,255,255,.45)":"rgba(255,255,255,.3)",fontSize:16,maxWidth:500,margin:"0 auto",lineHeight:1.7}}>{sub}</p>}</div>;

/* ═══ APP ═══ */
export default function App(){
  const[page,setPage]=useState("site");
  const[data,setData]=useState(D);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{const id=NPOINT_ID||localStorage.getItem("r_npoint")||"";if(id){cloudLoad(id).then(d=>{if(d)setData({...D,...d});setLoading(false);});}else{setLoading(false);}},[]);
  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060606"}}><style>{CSS}</style><div className="badge" style={{fontSize:16,padding:"12px 28px"}}>🦁 Leo — טוען...</div></div>;
  return<div><style>{CSS}</style>
    {page==="site"&&<Site data={data} goAdmin={()=>setPage("login")}/>}
    {page==="login"&&<Login ok={()=>setPage("admin")} back={()=>setPage("site")}/>}
    {page==="admin"&&<Admin data={data} setData={setData} back={()=>setPage("site")}/>}
  </div>;
}

/* ═══════════ SITE ═══════════ */
function Site({data:X,goAdmin}){
  const wa=`https://wa.me/${X.waNum}`;const wm=t=>`${wa}?text=${encodeURIComponent(t)}`;
  const SV=X.services||D.services;const RV=X.reviews||D.reviews;const BA=X.beforeAfter||D.beforeAfter;
  const[mm,setMm]=useState(false);const[showTop,setShowTop]=useState(false);
  useEffect(()=>{const f=()=>setShowTop(window.scrollY>500);window.addEventListener("scroll",f,{passive:true});return()=>window.removeEventListener("scroll",f);},[]);
  const go=id=>{document.getElementById(id)?.scrollIntoView({behavior:"smooth"});setMm(false);};
  const nav=[["services","שירותים"],["pricing","מחירון"],["process","התהליך"],["gallery","לפני ואחרי"],["reviews","ביקורות"],["faq","שאלות"],["contact","צור קשר"]];

return<div>

{/* ═══ HEADER ═══ */}
<header style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(6,6,6,.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(200,164,78,.05)"}}>
<div className="mx" style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:90}}>
  <img src="/img/logo.png" alt="Leo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{height:200,marginTop:55,cursor:"pointer",objectFit:"contain",animation:"glow 4s ease-in-out infinite",filter:"drop-shadow(0 8px 24px rgba(0,0,0,.7))",position:"relative",zIndex:10,mixBlendMode:"screen"}}/>
  <nav className="d-hide" style={{display:"flex",alignItems:"center",gap:22}}>
    {nav.map(([id,l])=><span key={id} onClick={()=>go(id)} style={{color:"rgba(255,255,255,.35)",fontSize:13.5,cursor:"pointer",fontFamily:"'Heebo'",fontWeight:500,transition:"all .2s",letterSpacing:.2}} onMouseEnter={e=>{e.target.style.color="#C8A44E";}} onMouseLeave={e=>{e.target.style.color="rgba(255,255,255,.35)";}}>{l}</span>)}
    <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{padding:"10px 22px",fontSize:13,animation:"pulse 2s infinite"}}>💬 וואטסאפ</a>
  </nav>
  <button className="m-show" onClick={()=>setMm(true)} style={{display:"none",background:"none",border:"none",color:"#C8A44E",fontSize:26,cursor:"pointer"}}>☰</button>
</div></header>

{/* Mobile menu */}
{mm&&<><div onClick={()=>setMm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,backdropFilter:"blur(4px)"}}/><div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(300px,82vw)",background:"#0a0a0a",zIndex:201,padding:24,display:"flex",flexDirection:"column",animation:"slideR .3s ease",borderLeft:"1px solid rgba(200,164,78,.06)"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}><img src="/img/logo.png" style={{height:50,mixBlendMode:"screen"}} alt=""/><button onClick={()=>setMm(false)} style={{background:"none",border:"none",color:"#C8A44E",fontSize:20,cursor:"pointer"}}>✕</button></div>
  {nav.map(([id,l])=><span key={id} onClick={()=>go(id)} style={{color:"rgba(255,255,255,.4)",fontSize:16,padding:"15px 0",borderBottom:"1px solid rgba(255,255,255,.03)",cursor:"pointer",fontFamily:"'Heebo'",fontWeight:500}}>{l}</span>)}
  <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{marginTop:20,justifyContent:"center",fontSize:16}}>💬 שלחו הודעה</a>
</div></>}

{/* ═══ HERO ═══ */}
<section style={{minHeight:"100vh",display:"flex",alignItems:"center",position:"relative",overflow:"hidden",padding:"110px 0 60px"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"url(/img/hero-sofa.png)",backgroundSize:"cover",backgroundPosition:"center 25%",opacity:.6}}/>
  <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(6,6,6,.82) 0%,rgba(6,6,6,.4) 50%,rgba(6,6,6,.2) 100%)"}}/>
  <div style={{position:"absolute",bottom:0,left:0,right:0,height:120,background:"linear-gradient(transparent,#060606)"}}/>
  <div className="mx" style={{position:"relative",zIndex:2,width:"100%"}}>
    <div className="m-center" style={{maxWidth:560}}>
      <F><div className="badge" style={{marginBottom:18}}>🦁 Leo — שירותי ניקיון מקצועיים</div></F>
      <F d={.1}><h1 style={{fontSize:"clamp(36px,7vw,58px)",lineHeight:1.06,color:"#fff",marginBottom:18}}>כשהאריה מנקה<br/><span style={{background:"linear-gradient(135deg,#C8A44E,#E8D48A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>הלכלוך נעלם</span></h1></F>
      <F d={.2}><p style={{fontSize:17,color:"rgba(255,255,255,.5)",lineHeight:1.85,maxWidth:440,marginBottom:28}}>ניקוי מקצועי ברמה של מלך החיות.<br/>ספות · מזרנים · שטיחים · מזגנים · רכבים · כיסאות</p></F>
      <F d={.3}><div style={{display:"inline-flex",alignItems:"center",gap:14,padding:"14px 24px",borderRadius:16,background:"rgba(200,164,78,.04)",border:"1px solid rgba(200,164,78,.08)",marginBottom:28}}>
        <span style={{fontFamily:"'Heebo'",fontSize:36,fontWeight:900,background:"linear-gradient(135deg,#C8A44E,#E8D48A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₪{SV[0]?.price||"280₪"}</span>
        <span style={{fontSize:13,color:"rgba(255,255,255,.3)",lineHeight:1.4}}>ניקוי ספה<br/>כולל חיטוי ובישום</span>
      </div></F>
      <F d={.4}><div className="m-stack" style={{display:"flex",gap:10}}>
        <a href={wa} target="_blank" rel="noopener" className="btn btn-g m-full" style={{fontSize:16,padding:"18px 34px"}}>💬 שלחו תמונה — הצעה חינם</a>
        <a href={`tel:${X.phone.replace(/-/g,"")}`} className="btn btn-o m-full" style={{fontSize:16,padding:"18px 34px"}}>📞 {X.phone}</a>
      </div></F>
    </div>
  </div>
</section>

{/* ═══ TRUST BAR ═══ */}
<div style={{background:"rgba(200,164,78,.03)",borderTop:"1px solid rgba(200,164,78,.06)",borderBottom:"1px solid rgba(200,164,78,.06)",padding:"24px 0"}}><div className="mx"><div className="m-col2" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,textAlign:"center"}}>
  {[["3,000","+","לקוחות מרוצים"],["100","%","שביעות רצון"],["7","","ימים בשבוע"],["5","⭐","דירוג ממוצע"]].map(([n,s,l],i)=><div key={i}><div style={{fontFamily:"'Heebo'",fontSize:30,fontWeight:900,color:"#C8A44E"}}><Num to={parseInt(n.replace(",",""))} sfx={s}/></div><div style={{fontSize:12,color:"rgba(255,255,255,.2)",marginTop:4,fontFamily:"'Heebo'",fontWeight:500}}>{l}</div></div>)}
</div></div></div>

{/* ═══ PROBLEM → SOLUTION ═══ */}
<section className="sec" style={{position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(6,6,6,.55),rgba(6,6,6,.55)),url(/img/lion-ac.png)",backgroundSize:"cover",backgroundPosition:"center 30%"}}/>
  <div className="mx" style={{position:"relative",zIndex:1}}>
    <F><STit sub="אתם לא לבד. רוב הבתים בישראל סובלים מזה.">הבעיה שכולם מכירים 😤</STit></F>
    <div className="m-col" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:52}}>
      {[["🤢","ריחות שנספגו","זיעה, אוכל ישן ועובש שנכנסו עמוק לסיבי הבד. שום ספריי לא עוזר."],["🦠","חיידקים ואלרגנים","קרדית אבק, חיידקים ופטריות שחיים בתוך הספה. סכנה בריאותית אמיתית."],["💧","כתמים שלא יורדים","קפה, יין, שתן, שוקולד — כתמים שום חומר ביתי לא יכול להוריד."]].map(([ic,t,d],i)=>
      <F key={i} d={i*.08}><div className="crd" style={{padding:"32px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:14}}>{ic}</div><h3 style={{fontSize:18,fontWeight:700,marginBottom:10,color:"#fff"}}>{t}</h3><p style={{fontSize:14,color:"rgba(255,255,255,.3)",lineHeight:1.8}}>{d}</p></div></F>)}
    </div>
    <F d={.3}><div style={{textAlign:"center"}}>
      <h3 style={{fontSize:"clamp(24px,4.5vw,34px)",color:"#fff",marginBottom:14}}>הפתרון? <span style={{color:"#C8A44E"}}>Leo 🦁</span></h3>
      <p style={{color:"rgba(255,255,255,.3)",maxWidth:440,margin:"0 auto 24px",fontSize:15,lineHeight:1.7}}>ציוד תעשייתי. חומרים מקצועיים. תוצאות מובטחות.</p>
      <a href={wa} target="_blank" rel="noopener" className="btn btn-a" style={{fontSize:16}}>💬 בואו לאריה 🦁</a>
    </div></F>
  </div>
</section>

{/* ═══ SERVICES ═══ */}
<section className="sec" id="services" style={{position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"url(/img/lion-van.png)",backgroundSize:"cover",backgroundPosition:"center 30%",opacity:.5}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(rgba(6,6,6,.4),rgba(6,6,6,.35))"}}/>
  <div className="mx" style={{position:"relative",zIndex:1}}>
    <F><STit sub="פתרון מקצועי לכל פריט בבית וברכב">השירותים שלנו</STit></F>
    <div className="m-col2" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
      {SV.slice(0,6).map((s,i)=><F key={i} d={i*.05}><div className="crd" style={{padding:"28px 22px",cursor:"pointer",height:"100%",display:"flex",flexDirection:"column",borderTop:`3px solid ${s.accent||"#C8A44E"}`}} onClick={()=>window.open(wm("היי, מעוניין/ת ב"+s.name),"_blank")}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><h3 style={{fontSize:17,fontWeight:700,color:"#fff"}}>{s.name}</h3><span style={{fontSize:22}}>{s.icon||"🔹"}</span></div>
        <p style={{fontSize:13.5,color:"rgba(255,255,255,.3)",lineHeight:1.7,marginBottom:"auto",paddingBottom:16}}>{s.desc}</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,borderTop:"1px solid rgba(200,164,78,.06)"}}>
          <span style={{fontFamily:"'Heebo'",fontSize:20,fontWeight:900,color:s.accent||"#C8A44E"}}>{s.price}</span>
          <span className="btn-d" style={{padding:"6px 14px"}}>הזמינו →</span>
        </div>
      </div></F>)}
    </div>
  </div>
</section>

{/* ═══ FULL PRICING ═══ */}
<section className="sec" id="pricing" style={{background:"rgba(200,164,78,.015)"}}>
  <div className="mx">
    <F><STit sub="מחירים שקופים — בלי הפתעות">מחירון מלא 💰</STit></F>
    <F d={.1}><div className="crd glow-border" style={{padding:0,overflow:"hidden",maxWidth:700,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,rgba(200,164,78,.08),rgba(200,164,78,.02))",padding:"18px 28px",borderBottom:"1px solid rgba(200,164,78,.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:"'Heebo'",fontWeight:700,color:"#C8A44E",fontSize:14}}>שירות</span><span style={{fontFamily:"'Heebo'",fontWeight:700,color:"#C8A44E",fontSize:14}}>מחיר</span></div>
      </div>
      {SV.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 28px",borderBottom:i<SV.length-1?"1px solid rgba(255,255,255,.03)":"none",transition:"background .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(200,164,78,.03)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:18}}>{s.icon||"🔹"}</span><div><div style={{fontSize:14,color:"#fff",fontFamily:"'Heebo'",fontWeight:600}}>{s.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,.2)"}}>{s.desc?.slice(0,50)}...</div></div></div>
        <span style={{fontFamily:"'Heebo'",fontSize:18,fontWeight:800,color:s.accent||"#C8A44E",whiteSpace:"nowrap"}}>{s.price}</span>
      </div>)}
      <div style={{padding:"18px 28px",background:"rgba(200,164,78,.04)",textAlign:"center"}}>
        <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{fontSize:14}}>💬 שלחו תמונה — הצעה מדויקת תוך דקות</a>
      </div>
    </div></F>
  </div>
</section>

{/* ═══ PROCESS ═══ */}
<section className="sec" id="process" style={{position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"url(/img/lion-inspect.png)",backgroundSize:"cover",backgroundPosition:"center 20%",opacity:.5}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(rgba(6,6,6,.4),rgba(6,6,6,.35))"}}/>
  <div className="mx" style={{position:"relative",zIndex:1}}>
    <F><STit sub="מהתמונה הראשונה ועד לספה כמו חדשה">איך זה עובד? 🔄</STit></F>
    <div className="m-col2" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
      {PROCESS.map((p,i)=><F key={i} d={i*.1}><div className="crd" style={{padding:"28px 20px",textAlign:"center",height:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"rgba(200,164,78,.06)",border:"1px solid rgba(200,164,78,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:14}}>{p.icon}</div>
        <span style={{fontFamily:"'Heebo'",fontSize:11,fontWeight:800,color:"#C8A44E",letterSpacing:1,marginBottom:6}}>שלב {p.step}</span>
        <h3 style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:8}}>{p.title}</h3>
        <p style={{fontSize:13,color:"rgba(255,255,255,.3)",lineHeight:1.75}}>{p.desc}</p>
      </div></F>)}
    </div>
    <F d={.5}><div style={{textAlign:"center",marginTop:40}}>
      <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{fontSize:16,padding:"18px 40px",animation:"pulse 2s infinite"}}>💬 שלחו תמונה — הצעה חינם</a>
    </div></F>
  </div>
</section>

{/* ═══ CTA ═══ */}
<section style={{padding:"80px 0",position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"url(/img/lion-office.png)",backgroundSize:"cover",backgroundPosition:"center 25%",opacity:.55}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to left,rgba(6,6,6,.08),rgba(6,6,6,.6) 55%)"}}/>
  <div className="mx" style={{position:"relative",zIndex:2}}><div className="m-center" style={{maxWidth:500}}>
    <F><div className="badge" style={{marginBottom:14}}>📞 זמינים 7 ימים בשבוע</div></F>
    <F d={.1}><h2 style={{fontSize:"clamp(24px,4.5vw,32px)",color:"#fff",marginBottom:12}}>רוצים הצעת מחיר?<br/><span style={{color:"#C8A44E"}}>האריה כבר בדרך 🦁</span></h2></F>
    <F d={.15}><p style={{color:"rgba(255,255,255,.4)",fontSize:15,marginBottom:24,lineHeight:1.75}}>שלחו תמונה של הפריט → הצעה מדויקת תוך דקות → מתאמים הגעה. פשוט ככה.</p></F>
    <F d={.2}><div className="m-stack" style={{display:"flex",gap:10}}>
      <a href={wa} target="_blank" rel="noopener" className="btn btn-g m-full" style={{fontSize:16}}>💬 שלחו תמונה</a>
      <a href={`tel:${X.phone.replace(/-/g,"")}`} className="btn btn-a m-full" style={{fontSize:16}}>📞 חייגו עכשיו</a>
    </div></F>
  </div></div>
</section>

{/* ═══ BEFORE/AFTER ═══ */}
<section className="sec" id="gallery"><div className="mx">
  <F><STit sub="ראו בעיניים — ההבדל מדבר בעד עצמו">לפני ואחרי 📸</STit></F>
  <div className="m-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
    {BA.map((b,i)=><F key={i} d={i*.06}><div className="crd" style={{overflow:"hidden"}}><div style={{display:"flex",height:190}}>
      <div style={{flex:1,background:b.imgBefore?"none":`linear-gradient(135deg,${b.bc},${b.bc}cc)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>{b.imgBefore?<img src={b.imgBefore} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:36,opacity:.06}}>✕</span>}<span style={{position:"absolute",bottom:10,right:10,padding:"5px 12px",borderRadius:8,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",color:"#fff",fontSize:11,fontFamily:"'Heebo'",fontWeight:700}}>לפני</span></div>
      <div style={{width:2,background:"linear-gradient(transparent,rgba(200,164,78,.3),transparent)"}}/>
      <div style={{flex:1,background:b.imgAfter?"none":`linear-gradient(135deg,${b.ac},${b.ac}dd)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>{b.imgAfter?<img src={b.imgAfter} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:36,opacity:.06}}>✓</span>}<span style={{position:"absolute",bottom:10,left:10,padding:"5px 12px",borderRadius:8,background:"#C8A44E",color:"#0E1A2B",fontSize:11,fontFamily:"'Heebo'",fontWeight:700}}>אחרי ✨</span></div>
    </div><div style={{padding:"16px 20px"}}><h4 style={{fontSize:15,color:"#fff",marginBottom:3}}>{b.title}</h4><p style={{fontSize:12,color:"rgba(255,255,255,.25)"}}>{b.desc}</p></div></div></F>)}
  </div>
</div></section>

{/* ═══ REVIEWS ═══ */}
<section className="sec" id="reviews" style={{background:"rgba(200,164,78,.015)"}}><div className="mx">
  <F><STit sub="אלפי לקוחות מרוצים — הנה כמה מהם">מה אומרים עלינו ⭐</STit></F>
  <div className="m-col" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
    {RV.map((r,i)=><F key={i} d={i*.06}><div className="crd" style={{padding:"26px 22px",height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{color:"#C8A44E",fontSize:13,letterSpacing:1,marginBottom:12}}>{"★".repeat(r.stars||5)}</div>
      <p style={{fontSize:14.5,lineHeight:1.9,color:"rgba(255,255,255,.55)",marginBottom:"auto",paddingBottom:16}}>״{r.t}״</p>
      <div style={{display:"flex",alignItems:"center",gap:12,paddingTop:14,borderTop:"1px solid rgba(200,164,78,.06)"}}>
        <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#C8A44E,#9A7B30)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0E1A2B",fontFamily:"'Heebo'",fontWeight:900,fontSize:15}}>{r.n[0]}</div>
        <div><div style={{fontSize:14,fontFamily:"'Heebo'",fontWeight:700,color:"#fff"}}>{r.n}</div><div style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>{r.s}</div></div>
      </div>
    </div></F>)}
  </div>
</div></section>

{/* ═══ FAQ ═══ */}
<section className="sec" id="faq"><div className="mx" style={{maxWidth:700}}>
  <F><STit>שאלות נפוצות ❓</STit></F>
  {[
["כמה זמן לוקח ניקוי ספה?","הניקוי אורך 30-60 דקות. ייבוש: 4-6 שעות. ספות עור מתייבשות מהר יותר. מומלץ לאוורר."],
["החומרים בטוחים לילדים ולחיות?","כן — היפואלרגניים, ללא כלור ואמוניה. בטוחים לתינוקות, ילדים, בעלי חיים ואנשים רגישים."],
["מנקים כל סוגי הספות?","כן — בד, עור, דמוי עור, אימפלה, קטיפה, מיקרופייבר ועוד. לכל בד שיטת ניקוי מותאמת."],
["מה אם הכתם לא יורד?","95% מהכתמים יורדים בטיפול הראשון. לגבי כתמים עקשנים — נעדכן מראש ונציע פתרון."],
["אתם מביאים ציוד?","כן, מגיעים עם הכל — מכונת שאיבה תעשייתית, חומרי ניקוי, ציוד חיטוי ובישום. רק תפנו גישה."],
["לאן מגיעים?","פריסה ארצית — גוש דן, שרון, שפלה, ירושלים, חיפה, באר שבע, אשדוד ועוד. הגעה חינם ברוב האזורים."],
["גם מזרנים, שטיחים ורכבים?","כן! מזרנים מ-100₪, שטיחים 40₪/מ״ר, כיסאות מ-30₪, רכבים מ-250₪, מזגנים 170₪, ארובות 500₪."],
["יש אחריות?","אחריות מלאה. לא מרוצים — נחזור בחינם. עובדים בשקיפות ולא גובים על שירות שלא סופק."],
["איך מזמינים?","שלחו תמונה בוואטסאפ → הצעה תוך דקות → מתאמים מועד (7 ימים בשבוע). תשלום: מזומן, ביט, אשראי."]
  ].map(([q,a],i)=><F key={i} d={i*.04}><FaqItem q={q} a={a}/></F>)}
</div></section>

{/* ═══ AREAS ═══ */}
<section className="sec" id="areas" style={{background:"rgba(200,164,78,.015)"}}><div className="mx">
  <F><STit>🚐 איפה שאתם — אנחנו שם</STit></F>
  <F d={.08}><div className="crd glow-border" style={{padding:"36px 40px",textAlign:"center"}}>
    <p style={{fontSize:15,lineHeight:2.4,color:"rgba(255,255,255,.35)",fontFamily:"'Heebo'",fontWeight:500}}>{X.areas||D.areas}</p>
    <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{marginTop:24}}>💬 בדקו אם מגיעים אליכם</a>
  </div></F>
</div></section>

{/* ═══ FINAL CTA ═══ */}
<section className="sec" style={{textAlign:"center"}}>
  <div className="mx">
    <F><img src="/img/logo.png" alt="" style={{height:160,objectFit:"contain",margin:"0 auto 28px",mixBlendMode:"screen",animation:"glow 3s ease-in-out infinite"}}/></F>
    <F d={.1}><h2 style={{fontSize:"clamp(26px,5vw,38px)",color:"#fff",marginBottom:12}}>הבית שלך צריך את <span style={{color:"#C8A44E"}}>האריה 🦁</span></h2></F>
    <F d={.15}><p style={{color:"rgba(255,255,255,.3)",fontSize:16,marginBottom:32}}>Leo — ניקיון ברמה של מלך</p></F>
    <F d={.2}><div className="m-stack" style={{display:"flex",gap:12,justifyContent:"center"}}>
      <a href={wa} target="_blank" rel="noopener" className="btn btn-g m-full" style={{fontSize:17,padding:"18px 40px",animation:"pulse 2s infinite"}}>💬 הזמינו עכשיו</a>
      <a href={`tel:${X.phone.replace(/-/g,"")}`} className="btn btn-o m-full" style={{fontSize:17,padding:"18px 40px"}}>📞 {X.phone}</a>
    </div></F>
  </div>
</section>

{/* ═══ FORM ═══ */}
<section className="sec" id="contact" style={{background:"rgba(200,164,78,.015)"}}><div className="mx">
  <F><STit>השאירו פרטים ונחזור אליכם 📋</STit></F>
  <F d={.1}><LeadForm services={SV} wa={wa}/></F>
</div></section>

{/* ═══ FOOTER ═══ */}
<footer style={{background:"rgba(0,0,0,.5)",padding:"52px 0 18px",borderTop:"1px solid rgba(200,164,78,.04)"}}><div className="mx">
  <div className="m-col" style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",gap:28,marginBottom:36}}>
    <div><img src="/img/logo.png" alt="" style={{height:56,marginBottom:16,mixBlendMode:"screen"}}/><p style={{fontSize:13,color:"rgba(255,255,255,.12)",lineHeight:1.8}}>Leo — שירותי ניקיון מקצועיים.<br/>ניקיון ברמה של מלך החיות.</p></div>
    <div><h4 style={{color:"#C8A44E",fontSize:12,marginBottom:14}}>שירותים</h4>{SV.slice(0,6).map((s,i)=><div key={i} style={{fontSize:12,color:"rgba(255,255,255,.12)",marginBottom:6}}>{s.name}</div>)}</div>
    <div><h4 style={{color:"#C8A44E",fontSize:12,marginBottom:14}}>ניווט</h4>{nav.map(([id,l])=><div key={id} style={{fontSize:12,color:"rgba(255,255,255,.12)",marginBottom:6,cursor:"pointer"}} onClick={()=>go(id)}>{l}</div>)}</div>
    <div><h4 style={{color:"#C8A44E",fontSize:12,marginBottom:14}}>צור קשר</h4><a href={`tel:${X.phone.replace(/-/g,"")}`} style={{display:"block",fontSize:12,color:"rgba(255,255,255,.12)",marginBottom:6}}>📞 {X.phone}</a><a href={wa} target="_blank" rel="noopener" style={{display:"block",fontSize:12,color:"rgba(255,255,255,.12)",marginBottom:6}}>💬 וואטסאפ</a><div style={{fontSize:11,color:"rgba(255,255,255,.07)",marginTop:8}}>א׳-ש׳ | כולל ערבים</div></div>
  </div>
  <div className="gold-line"/><div style={{paddingTop:14,display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,.06)"}}><span>© 2026 Leo — שירותי ניקיון</span><span onClick={goAdmin} style={{cursor:"pointer"}}>ניהול</span></div>
</div></footer>

{/* Floating */}
<a href={wa} target="_blank" rel="noopener" style={{position:"fixed",bottom:22,left:22,zIndex:999,width:58,height:58,borderRadius:16,background:"linear-gradient(135deg,#25D366,#1DA851)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",boxShadow:"0 6px 20px rgba(37,211,102,.3)",animation:"pulse 2s infinite"}}>💬</a>
{showTop&&<button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{position:"fixed",bottom:22,right:22,zIndex:999,width:42,height:42,borderRadius:12,background:"rgba(200,164,78,.06)",border:"1px solid rgba(200,164,78,.08)",color:"#C8A44E",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>↑</button>}
<div className="m-show" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,background:"rgba(6,6,6,.95)",backdropFilter:"blur(16px)",padding:"10px 14px",display:"none",gap:8,borderTop:"1px solid rgba(200,164,78,.05)"}}>
  <a href={wa} target="_blank" rel="noopener" className="btn btn-g" style={{flex:1,padding:"14px 6px",fontSize:15}}>💬 וואטסאפ</a>
  <a href={`tel:${X.phone.replace(/-/g,"")}`} className="btn btn-a" style={{flex:1,padding:"14px 6px",fontSize:15}}>📞 חייגו</a>
</div>
</div>;}

/* ═══ Components ═══ */
function FaqItem({q,a}){const[o,s]=useState(false);return<div className="crd" style={{marginBottom:10,borderColor:o?"rgba(200,164,78,.15)":"rgba(200,164,78,.05)"}}><div onClick={()=>s(!o)} style={{padding:"20px 24px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontFamily:"'Heebo'",fontWeight:600}}>{q}</span><span style={{color:"#C8A44E",fontSize:11,transition:"transform .3s",transform:o?"rotate(180deg)":"",opacity:.6}}>▼</span></div>{o&&<div style={{padding:"0 24px 20px",fontSize:14.5,color:"rgba(255,255,255,.4)",lineHeight:1.85}}>{a}</div>}</div>;}
function LeadForm({services,wa}){const[f,setF]=useState({name:"",phone:"",service:""});const[sent,setSent]=useState(false);const inp={width:"100%",padding:"15px 18px",borderRadius:14,border:"1px solid rgba(200,164,78,.06)",fontSize:14,fontFamily:"'Assistant'",background:"rgba(255,255,255,.02)",color:"#fff",direction:"rtl",outline:"none",transition:"border-color .2s"};const submit=()=>{const l=gL();l.push({...f,id:"l"+Date.now(),date:new Date().toISOString(),status:"new"});sL(l);setSent(true);setTimeout(()=>{setSent(false);setF({name:"",phone:"",service:""});},5000);};if(sent)return<div style={{maxWidth:480,margin:"0 auto",textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:14}}>✅</div><h3 style={{fontSize:22,color:"#fff",marginBottom:8}}>הפרטים נשלחו!</h3><p style={{color:"rgba(255,255,255,.3)",marginBottom:20}}>ניצור קשר בהקדם</p><a href={wa} target="_blank" rel="noopener" className="btn btn-g">💬 או שלחו הודעה</a></div>;return<form onSubmit={e=>{e.preventDefault();if(f.name&&f.phone)submit();}} style={{maxWidth:480,margin:"0 auto",background:"rgba(6,6,6,.5)",backdropFilter:"blur(16px)",borderRadius:22,padding:"40px 30px",border:"1px solid rgba(200,164,78,.06)"}}>{[["שם מלא","text","name","הכנסו שם מלא"],["טלפון","tel","phone","050-000-0000"]].map(([l,t,k,p])=><div key={k} style={{marginBottom:16}}><label style={{display:"block",fontSize:12,fontFamily:"'Heebo'",fontWeight:600,color:"rgba(255,255,255,.25)",marginBottom:6}}>{l} *</label><input type={t} style={inp} value={f[k]} placeholder={p} required onChange={e=>setF(x=>({...x,[k]:e.target.value}))} onFocus={e=>e.target.style.borderColor="#C8A44E"} onBlur={e=>e.target.style.borderColor="rgba(200,164,78,.06)"}/></div>)}<div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,fontFamily:"'Heebo'",fontWeight:600,color:"rgba(255,255,255,.25)",marginBottom:6}}>שירות</label><select style={{...inp,appearance:"none"}} value={f.service} onChange={e=>setF(x=>({...x,service:e.target.value}))}><option value="">בחר שירות</option>{services.map((s,i)=><option key={i} value={s.name}>{s.name} — {s.price}</option>)}</select></div><button type="submit" className="btn btn-a" style={{width:"100%",fontSize:16,padding:"18px 0"}}>שלחו פרטים 🦁</button><p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.08)",marginTop:12}}>🔒 הפרטים מאובטחים</p></form>;}

function Login({ok,back}){const[p,setP]=useState("");const[e,setE]=useState(false);return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060606"}}><style>{CSS}</style><div style={{background:"rgba(255,255,255,.02)",borderRadius:22,padding:44,width:380,maxWidth:"90vw",textAlign:"center",border:"1px solid rgba(200,164,78,.06)"}}><img src="/img/logo.png" alt="" style={{height:65,margin:"0 auto 22px",mixBlendMode:"screen"}}/><h2 style={{fontSize:20,color:"#fff",marginBottom:22,fontFamily:"'Heebo'"}}>כניסת מנהל</h2><input type="password" style={{width:"100%",padding:"14px 20px",borderRadius:14,border:"1px solid rgba(200,164,78,.06)",fontSize:15,textAlign:"center",fontFamily:"'Assistant'",background:"rgba(255,255,255,.02)",color:"#fff",outline:"none",marginBottom:14}} value={p} onChange={x=>{setP(x.target.value);setE(false);}} placeholder="סיסמה" onKeyDown={x=>{if(x.key==="Enter"){p===PASS?ok():setE(true);}}}/>{e&&<p style={{color:"#F87171",fontSize:13,marginBottom:12}}>סיסמה שגויה</p>}<button onClick={()=>p===PASS?ok():setE(true)} className="btn btn-a" style={{width:"100%",marginBottom:12}}>כניסה</button><button onClick={back} style={{background:"none",border:"none",color:"rgba(255,255,255,.15)",cursor:"pointer",fontSize:13}}>← חזרה</button></div></div>;}

/* ═══ ADMIN ═══ */
function Admin({data,setData,back}){
  const[tab,setTab]=useState("contact");const[leads,setLeads]=useState(gL());const[toast,setToast]=useState("");const[d,sd]=useState(JSON.parse(JSON.stringify(data)));const[saving,setSaving]=useState(false);const[cloudId]=useState(NPOINT_ID||localStorage.getItem("r_npoint")||"");
  const show=m=>{setToast(m);setTimeout(()=>setToast(""),4000);};
  const downloadJson=()=>{setData(d);const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="data.json";a.click();URL.revokeObjectURL(url);show("✅ data.json הורד! שים בתיקיית public ודחוף ל-GitHub");};
  const saveAll=async()=>{if(cloudId){setSaving(true);const ok=await cloudSave(cloudId,d);if(ok){setData(d);show("✅ נשמר!");}else{show("⚠️ ענן נכשל — הורד JSON");} setSaving(false);}else{downloadJson();}};
  const upS=(i,k,v)=>{const s=[...(d.services||[])];s[i]={...s[i],[k]:v};sd({...d,services:s});};
  const upR=(i,k,v)=>{const r=[...(d.reviews||[])];r[i]={...r[i],[k]:v};sd({...d,reviews:r});};
  const upB=(i,k,v)=>{const b=[...(d.beforeAfter||[])];b[i]={...b[i],[k]:v};sd({...d,beforeAfter:b});};
  const handleImg=async(i,key,file)=>{if(!file)return;const c=await compressImg(file,400);const ba=[...(d.beforeAfter||[])];ba[i]={...ba[i],[key]:c};sd({...d,beforeAfter:ba});show("תמונה נוספה — שמור");};
  const box={background:"rgba(255,255,255,.02)",border:"1px solid rgba(200,164,78,.05)",borderRadius:16,padding:20,marginBottom:12};
  const inp={width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid rgba(200,164,78,.06)",fontSize:14,fontFamily:"'Assistant'",background:"rgba(255,255,255,.02)",color:"#fff",direction:"rtl",outline:"none",marginBottom:8};
  const lbl={display:"block",fontSize:11,color:"rgba(255,255,255,.25)",marginBottom:3,fontFamily:"'Heebo'",fontWeight:600};
return<div style={{minHeight:"100vh",background:"#060606",direction:"rtl"}}><style>{CSS}</style>
  {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:10000,background:toast.startsWith("❌")?"#DC2626":toast.startsWith("⚠")?"#D97706":"#059669",color:"#fff",padding:"12px 24px",borderRadius:14,fontSize:14,fontFamily:"'Heebo'",fontWeight:600}}>{toast}</div>}
  <div style={{background:"rgba(14,26,43,.5)",borderBottom:"1px solid rgba(200,164,78,.04)",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'Heebo'",fontSize:14,fontWeight:800,color:"#C8A44E"}}>🦁 Leo — ניהול</span></div><div style={{display:"flex",gap:8}}><button onClick={saveAll} disabled={saving} className="btn btn-g" style={{padding:"8px 18px",fontSize:13}}>{saving?"שומר...":"🚀 שמור"}</button><button onClick={downloadJson} className="btn btn-a" style={{padding:"8px 14px",fontSize:12}}>📥 JSON</button><button onClick={back} style={{background:"none",border:"1px solid rgba(255,255,255,.04)",borderRadius:10,padding:"8px 14px",color:"rgba(255,255,255,.25)",cursor:"pointer",fontSize:12}}>←</button></div></div>
  <div style={{display:"flex",gap:4,padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.02)",flexWrap:"wrap"}}>{[["contact","📞"],["services","💰"],["reviews","⭐"],["ba","📸"],["areas","🗺️"],["leads","📋("+leads.length+")"]].map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontFamily:"'Heebo'",fontWeight:600,background:tab===id?"rgba(200,164,78,.1)":"transparent",color:tab===id?"#C8A44E":"rgba(255,255,255,.25)"}}>{l}</button>)}</div>
  <div style={{maxWidth:820,margin:"0 auto",padding:20}}>
    {tab==="contact"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>📞 קשר</h3><div style={box}><label style={lbl}>טלפון</label><input style={inp} value={d.phone||""} onChange={e=>sd({...d,phone:e.target.value})}/><label style={lbl}>וואטסאפ</label><input style={inp} value={d.waNum||""} onChange={e=>sd({...d,waNum:e.target.value})}/></div></div>}
    {tab==="services"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>💰 שירותים <button onClick={()=>sd({...d,services:[...(d.services||[]),{name:"חדש",desc:"תיאור",price:"100₪",accent:"#C8A44E",icon:"🔹"}]})} style={{fontSize:12,background:"rgba(200,164,78,.08)",border:"none",color:"#C8A44E",padding:"4px 12px",borderRadius:8,cursor:"pointer"}}>+</button></h3>{(d.services||[]).map((s,i)=><div key={i} style={box}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><strong style={{color:"#C8A44E"}}>{s.name}</strong><button onClick={()=>sd({...d,services:d.services.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#F87171",cursor:"pointer",fontSize:12}}>🗑</button></div><label style={lbl}>שם</label><input style={inp} value={s.name} onChange={e=>upS(i,"name",e.target.value)}/><label style={lbl}>תיאור</label><textarea style={{...inp,height:50,resize:"vertical"}} value={s.desc} onChange={e=>upS(i,"desc",e.target.value)}/><div style={{display:"flex",gap:8}}><div style={{flex:1}}><label style={lbl}>מחיר</label><input style={inp} value={s.price} onChange={e=>upS(i,"price",e.target.value)}/></div><div style={{flex:1}}><label style={lbl}>אייקון</label><input style={inp} value={s.icon||""} onChange={e=>upS(i,"icon",e.target.value)}/></div></div></div>)}</div>}
    {tab==="reviews"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>⭐ ביקורות <button onClick={()=>sd({...d,reviews:[...(d.reviews||[]),{n:"שם",t:"ביקורת",s:"שירות",stars:5}]})} style={{fontSize:12,background:"rgba(200,164,78,.08)",border:"none",color:"#C8A44E",padding:"4px 12px",borderRadius:8,cursor:"pointer"}}>+</button></h3>{(d.reviews||[]).map((r,i)=><div key={i} style={box}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><strong style={{color:"#C8A44E"}}>{r.n}</strong><button onClick={()=>sd({...d,reviews:d.reviews.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#F87171",cursor:"pointer",fontSize:12}}>🗑</button></div><label style={lbl}>שם</label><input style={inp} value={r.n} onChange={e=>upR(i,"n",e.target.value)}/><label style={lbl}>ביקורת</label><textarea style={{...inp,height:50,resize:"vertical"}} value={r.t} onChange={e=>upR(i,"t",e.target.value)}/><label style={lbl}>שירות</label><input style={inp} value={r.s} onChange={e=>upR(i,"s",e.target.value)}/></div>)}</div>}
    {tab==="ba"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>📸 לפני/אחרי <button onClick={()=>sd({...d,beforeAfter:[...(d.beforeAfter||[]),{title:"חדש",desc:"תיאור",bc:"#555",ac:"#aaa",imgBefore:"",imgAfter:""}]})} style={{fontSize:12,background:"rgba(200,164,78,.08)",border:"none",color:"#C8A44E",padding:"4px 12px",borderRadius:8,cursor:"pointer"}}>+</button></h3>{(d.beforeAfter||[]).map((b,i)=><div key={i} style={box}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><strong style={{color:"#C8A44E"}}>{b.title}</strong><button onClick={()=>sd({...d,beforeAfter:d.beforeAfter.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#F87171",cursor:"pointer",fontSize:12}}>🗑</button></div><label style={lbl}>כותרת</label><input style={inp} value={b.title} onChange={e=>upB(i,"title",e.target.value)}/><label style={lbl}>תיאור</label><input style={inp} value={b.desc} onChange={e=>upB(i,"desc",e.target.value)}/><div style={{display:"flex",gap:12,marginBottom:8}}><div style={{flex:1}}><label style={lbl}>📷 לפני</label>{b.imgBefore&&<img src={b.imgBefore} style={{width:"100%",height:70,objectFit:"cover",borderRadius:8,marginBottom:6}}/>}<input type="file" accept="image/*" onChange={e=>handleImg(i,"imgBefore",e.target.files[0])} style={{fontSize:11,color:"rgba(255,255,255,.2)",width:"100%"}}/></div><div style={{flex:1}}><label style={lbl}>📷 אחרי</label>{b.imgAfter&&<img src={b.imgAfter} style={{width:"100%",height:70,objectFit:"cover",borderRadius:8,marginBottom:6}}/>}<input type="file" accept="image/*" onChange={e=>handleImg(i,"imgAfter",e.target.files[0])} style={{fontSize:11,color:"rgba(255,255,255,.2)",width:"100%"}}/></div></div></div>)}</div>}
    {tab==="areas"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>🗺️ אזורים</h3><div style={box}><label style={lbl}>ערים</label><textarea style={{...inp,height:100,resize:"vertical"}} value={d.areas||""} onChange={e=>sd({...d,areas:e.target.value})}/></div></div>}
    {tab==="leads"&&<div><h3 style={{fontSize:18,color:"#fff",marginBottom:16}}>📋 לידים</h3>{leads.length===0?<p style={{color:"rgba(255,255,255,.15)"}}>אין לידים</p>:[...leads].reverse().map(l=><div key={l.id} style={box}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}><div><strong style={{color:"#fff"}}>{l.name}</strong> — <span style={{color:"rgba(255,255,255,.25)"}}>{l.phone}</span>{l.service&&<span style={{color:"#C8A44E"}}> · {l.service}</span>}</div><div style={{display:"flex",gap:4}}><a href={`https://wa.me/972${l.phone.replace(/^0/,"").replace(/-/g,"")}`} target="_blank" rel="noopener" style={{padding:"4px 8px",borderRadius:6,background:"#25D366",color:"#fff",fontSize:10}}>💬</a><button onClick={()=>{setLeads(leads.filter(x=>x.id!==l.id));sL(leads.filter(x=>x.id!==l.id));}} style={{padding:"4px 8px",borderRadius:6,background:"rgba(248,113,113,.05)",border:"none",color:"#F87171",fontSize:10,cursor:"pointer"}}>🗑</button></div></div></div>)}</div>}
  </div>
</div>;}
