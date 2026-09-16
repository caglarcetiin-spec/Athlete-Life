/* Shared entry formatting. Internal dates stay ISO; durations stay numeric in their original unit. */
(function(root,factory){const api=factory();root.EntryFields=api;if(typeof module==='object')module.exports=api})(typeof window!=='undefined'?window:globalThis,()=>{
'use strict';
const pad=v=>String(v).padStart(2,'0');
function date(value){
 let s=String(value||'').trim(),m;
 if((m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)))s=`${m[1]}-${pad(m[2])}-${pad(m[3])}`;
 else if((m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)))s=`${m[3]}-${pad(m[2])}-${pad(m[1])}`;
 else if((m=s.match(/^(\d{2})(\d{2})(\d{4})$/)))s=`${m[3]}-${m[2]}-${m[1]}`;
 else return null;
 const n=new Date(s+'T12:00:00Z');return Number.isFinite(+n)&&n.toISOString().slice(0,10)===s?s:null;
}
function displayDate(value){const d=date(value);return d?d.split('-').reverse().join('.'):String(value||'')}
function time(value){let s=String(value||'').trim().replace('.',':'),m;if(/^\d{4}$/.test(s))s=s.slice(0,2)+':'+s.slice(2);m=s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);if(!m||+m[1]>23||+m[2]>59||+(m[3]||0)>59)return null;return pad(m[1])+':'+pad(m[2])+(m[3]!==undefined?':'+pad(m[3]):'')}
function duration(h,m,s,unit){const parts=[h,m,s].map(Number);if(parts.some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(parts[0])||!Number.isInteger(parts[1])||parts[1]>59||parts[2]>=60)throw Error('Süreyi saat, dakika ve saniye olarak seç.');return Number(((parts[0]*3600+parts[1]*60+parts[2])/({seconds:1,minutes:60,hours:3600}[unit]||60)).toFixed(8))}
function splitDuration(value,unit){const n=Number(String(value||0).replace(',','.')),total=Math.max(0,Number.isFinite(n)?n:0)*({seconds:1,minutes:60,hours:3600}[unit]||60);return {hours:Math.floor(total/3600),minutes:Math.floor(total%3600/60),seconds:Number((total%60).toFixed(6))}}
return {date,displayDate,time,duration,splitDuration};
});
