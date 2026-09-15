(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.SubstitutionIntelligenceCore=api;
})(typeof window!=="undefined"?window:globalThis,function(){
"use strict";
function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function weightedJaccard(a={},b={}){
 const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);let mn=0,mx=0;
 keys.forEach(k=>{const x=Math.max(0,+a[k]||0),y=Math.max(0,+b[k]||0);mn+=Math.min(x,y);mx+=Math.max(x,y)});
 return mx?mn/mx*100:0;
}
function actionClass(pattern="",name=""){
 const s=`${pattern} ${name}`.toLowerCase();
 if(/run|sprint|walk|locomotion/.test(s))return"locomotion";
 if(/squat|lunge|split|knee dominant/.test(s))return"squat";
 if(/hinge|deadlift|rdl/.test(s))return"hinge";
 if(/pull|row|chin|lever/.test(s))return"pull";
 if(/push|dip|press|planche/.test(s))return"push";
 if(/core|anti-extension|compression|dragon/.test(s))return"core";
 if(/mobility|stretch/.test(s))return"mobility";
 return"other";
}
function planeClass(pattern="",name=""){
 const s=`${pattern} ${name}`.toLowerCase();
 if(/horizontal/.test(s)||/row|planche|front lever|back lever/.test(s))return"horizontal";
 if(/vertical/.test(s)||/pull-up|chin-up|dip|overhead|ohp/.test(s))return"vertical";
 return"other";
}
function patternScore(planned={},actual={}){
 const pa=actionClass(planned.pattern,planned.name),aa=actionClass(actual.pattern,actual.name),pp=planeClass(planned.pattern,planned.name),ap=planeClass(actual.pattern,actual.name);
 if(pa===aa){if(pp===ap)return 100;if(pp==="other"||ap==="other")return 82;return 70}
 if(new Set([pa,aa]).has("other"))return 35;
 if((pa==="squat"&&aa==="hinge")||(pa==="hinge"&&aa==="squat"))return 42;
 if((pa==="push"&&aa==="pull")||(pa==="pull"&&aa==="push"))return 0;
 if(pa==="locomotion"&&aa==="locomotion")return 80;
 return 18;
}
function qualitySimilarity(a={},b={}){
 const keys=["strength","hypertrophy","power","skill","stability","core","endurance"];let diff=0,n=0;
 keys.forEach(k=>{const x=+a[k]||0,y=+b[k]||0;if(x||y){diff+=Math.abs(x-y)/10;n++}});
 return n?clamp((1-diff/n)*100):50;
}
function score(planned={},actual={}){
 const muscle=weightedJaccard(planned.muscles||{},actual.muscles||{}),pattern=patternScore(planned,actual),quality=qualitySimilarity(planned.qualities||{},actual.qualities||{});
 const total=Math.round(clamp(muscle*.50+pattern*.35+quality*.15));
 const label=total>=80?"Yüksek eşleşme":total>=60?"İyi eşleşme":total>=40?"Orta eşleşme":"Düşük eşleşme";
 const pa=actionClass(planned.pattern,planned.name),aa=actionClass(actual.pattern,actual.name);
 const warning=pa!==aa&&((pa==="push"&&aa==="pull")||(pa==="pull"&&aa==="push"))?"Push/Pull yönü ters; bu hareket planlanan kas/pattern hedefinin yerine fizyolojik olarak eşdeğer sayılmaz.":total<40?"Planlanan stimulus ile belirgin fark var; gerçek etkiler actual movement üzerinden analiz edilmelidir.":"Planlanan harekete makul derecede benzer bir stimulus profili.";
 return {score:total,label,muscleOverlap:Math.round(muscle),patternScore:Math.round(pattern),qualityScore:Math.round(quality),plannedAction:pa,actualAction:aa,warning};
}
return {weightedJaccard,actionClass,planeClass,patternScore,qualitySimilarity,score};
});
