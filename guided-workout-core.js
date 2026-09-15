
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.GuidedWorkoutCore=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  function finitePositive(v,fallback=1){
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:fallback;
  }
  function normalizeText(text){
    return String(text||"")
      .replace(/,/g,".")
      .replace(/[–—−]/g,"-")
      .replace(/[×✕]/g,"x")
      .replace(/\s+/g," ")
      .trim();
  }
  function parsePrescription(text,fallbackMetric="reps"){
    const s=normalizeText(text);
    // Examples: 3x2-4, 4x5-10 sn, 5 x 5, 3x8-12
    const m=s.match(/(\d+)\s*x\s*([\d.]+)(?:\s*-\s*([\d.]+))?\s*(sn|s|sec|saniye|dk|min|km)?/i);
    if(m){
      const setCount=Math.max(1,Math.round(finitePositive(m[1],1)));
      const min=finitePositive(m[2],null);
      const max=m[3]!=null?finitePositive(m[3],min):min;
      let unit=String(m[4]||"").toLowerCase();
      if(["sn","s","sec","saniye"].includes(unit))unit="seconds";
      else if(["dk","min"].includes(unit))unit="minutes";
      else if(unit==="km")unit="km";
      else unit=fallbackMetric||"reps";
      return {setCount,min,max,unit,valid:true,source:s};
    }
    const setWords=s.match(/(\d+)\s*(?:set|tur|round|hold)\s*(?:x|×)?\s*([\d.]+)?(?:\s*-\s*([\d.]+))?\s*(sn|s|sec|saniye|dk|min|km|tekrar|rep)?/i);
    if(setWords){
      const setCount=sanitizeSetCount(setWords[1]),min=setWords[2]!=null?finitePositive(setWords[2],null):null,max=setWords[3]!=null?finitePositive(setWords[3],min):min;
      let unit=String(setWords[4]||fallbackMetric||"reps").toLowerCase();
      if(["sn","s","sec","saniye"].includes(unit))unit="seconds";
      else if(["dk","min"].includes(unit))unit="minutes";
      else if(unit==="km")unit="km";
      else unit=fallbackMetric||"reps";
      return {setCount,min,max,unit,valid:true,source:s};
    }
    const range=s.match(/([\d.]+)\s*-\s*([\d.]+)\s*(sn|s|sec|saniye|dk|min|km)/i);
    if(range){
      let unit=range[3].toLowerCase();
      if(["sn","s","sec","saniye"].includes(unit))unit="seconds";
      else if(["dk","min"].includes(unit))unit="minutes";
      return {setCount:1,min:+range[1],max:+range[2],unit,valid:true,source:s};
    }
    if(s==="—"||s==="-"||!s)return {setCount:1,min:null,max:null,unit:"completion",valid:true,source:s};
    return {setCount:1,min:null,max:null,unit:fallbackMetric||"reps",valid:false,source:s};
  }
  function sanitizeSetCount(v){return Math.max(1,Math.min(20,Math.round(finitePositive(v,1))))}
  function ensureRowArrays(row){
    row.sets=Array.isArray(row.sets)?row.sets:[];
    row.setDurationsSec=Array.isArray(row.setDurationsSec)?row.setDurationsSec:[];
    row.restBetweenSets=Array.isArray(row.restBetweenSets)?row.restBetweenSets:[];
    row.guidedTiming=Array.isArray(row.guidedTiming)?row.guidedTiming:[];
    return row;
  }
  function savedSetCount(row){
    if(!row)return 0;
    ensureRowArrays(row);
    let n=0;
    for(let i=0;i<row.sets.length;i++){
      const v=Number(row.sets[i]);
      if(Number.isFinite(v)&&v>0)n++;
      else break;
    }
    return n;
  }
  function writeSet(row,index,payload){
    ensureRowArrays(row);
    index=Math.max(0,Math.floor(Number(index)||0));
    row.sets[index]=Number(payload.value)||0;
    row.setDurationsSec[index]=Number(payload.workSec)||0;
    row.guidedTiming[index]={
      ...(row.guidedTiming[index]||{}),
      set:index+1,
      workSec:Number(payload.workSec)||0,
      workMinSec:Number(payload.workMinSec)||0,
      workMaxSec:Number(payload.workMaxSec)||0,
      workHardMaxSec:Number(payload.workHardMaxSec)||0,
      workScore:Number(payload.workScore)||0,
      workStatus:payload.workStatus||"neutral",
      metric:payload.metric||"reps",
      result:Number(payload.value)||0,
      note:payload.note||"",
      savedAt:payload.savedAt||new Date().toISOString()
    };
    return row;
  }
  function writeRest(row,setIndex,restSec,meta={}){
    ensureRowArrays(row);
    setIndex=Math.max(0,Math.floor(Number(setIndex)||0));
    row.restBetweenSets[setIndex]=Math.max(0,Math.round(Number(restSec)||0));
    if(row.guidedTiming[setIndex]){
      Object.assign(row.guidedTiming[setIndex],{
        restSec:row.restBetweenSets[setIndex],
        restTargetSec:Number(meta.target)||0,
        restScore:Number(meta.score)||0,
        restStatus:meta.status||"target"
      });
      const ws=Number(row.guidedTiming[setIndex].workScore)||0,rs=Number(meta.score)||0;
      row.guidedTiming[setIndex].timingScore=Math.round(ws*.58+rs*.42);
    }
    return row;
  }
  function performedSetCount(row){
    if(!row)return 0;
    const sets=Array.isArray(row.sets)?row.sets:[];
    return sets.reduce((n,v)=>n+(Number.isFinite(Number(v))&&Number(v)>0?1:0),0);
  }
  function aggregatePerformedSets(rows){
    return (rows||[]).reduce((n,row)=>n+performedSetCount(row),0);
  }
  function firstIncomplete(items,rowGetter){
    for(let i=0;i<items.length;i++){
      const count=savedSetCount(rowGetter(i));
      const total=sanitizeSetCount(items[i]?.setCount);
      if(count<total)return {complete:false,exerciseIndex:i,setIndex:count,saved:count,total};
    }
    return {complete:true,exerciseIndex:Math.max(0,items.length-1),setIndex:0,saved:0,total:0};
  }
  function firstIncompleteByCount(items,countGetter){
    for(let i=0;i<items.length;i++){
      const count=Math.max(0,Number(countGetter(i))||0);
      const total=sanitizeSetCount(items[i]?.setCount);
      if(count<total)return {complete:false,exerciseIndex:i,setIndex:Math.min(count,total),saved:count,total};
    }
    return {complete:true,exerciseIndex:Math.max(0,items.length-1),setIndex:0,saved:0,total:0};
  }
  function safeProgress(current,total,completeValue=null){
    const t=Number(total),c=Number(current);
    if(!Number.isFinite(t)||t<1)return completeValue||"—";
    const cc=Number.isFinite(c)?Math.max(0,Math.min(Math.round(c),Math.round(t))):0;
    return `${cc}/${Math.round(t)}`;
  }
  function finiteIndex(v,max=999){
    const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
  }
  function firstUnresolved(items,countGetter,resolutionGetter=()=>null){
    for(let i=0;i<(items||[]).length;i++){
      const total=sanitizeSetCount(items[i]?.setCount),count=Math.max(0,Number(countGetter(i))||0),resolution=resolutionGetter(i);
      if(count>=total)continue;
      if(resolution&&["partial","skipped","closed","substituted"].includes(resolution.status))continue;
      return {complete:false,exerciseIndex:i,setIndex:Math.min(count,total),saved:count,total};
    }
    return {complete:true,exerciseIndex:Math.max(0,(items||[]).length-1),setIndex:0,saved:0,total:0};
  }
  function completionSummary(items,countGetter,resolutionGetter=()=>null){
    let plannedSets=0,performedSets=0,exactPerformedSets=0,fidelityCreditSets=0,fullExercises=0,partialExercises=0,skippedExercises=0,substitutionExercises=0,untouchedExercises=0;
    const details=(items||[]).map((it,i)=>{
      const planned=sanitizeSetCount(it?.setCount),raw=Math.max(0,Number(countGetter(i))||0),exact=Math.min(planned,raw),resolution=resolutionGetter(i)||null;
      plannedSets+=planned;exactPerformedSets+=exact;
      let performed=exact,status="untouched",fidelityCredit=exact;
      if(exact>=planned){status="completed";fullExercises++}
      else if(resolution?.status==="substituted"){
        const replacementSets=Math.min(planned,Math.max(0,+resolution.replacementSets||0)),sim=Math.max(0,Math.min(100,+resolution.similarityPct||0));
        performed=Math.max(exact,replacementSets);fidelityCredit=exact+Math.max(0,replacementSets-exact)*(sim/100);status="substituted";substitutionExercises++;
      }
      else if(resolution?.status==="skipped"&&exact===0){status="skipped";skippedExercises++}
      else if(exact>0||resolution?.status==="partial"){status="partial";partialExercises++}
      else {untouchedExercises++}
      performedSets+=performed;fidelityCreditSets+=Math.min(planned,fidelityCredit);
      return {index:i,name:it?.name||`Exercise ${i+1}`,plannedSets:planned,performedSets:performed,exactPerformedSets:exact,status,reason:resolution?.reason||null,note:resolution?.note||null,actualMovement:resolution?.actualMovement||null,similarityPct:resolution?.similarityPct??null,fidelityCreditSets:Math.min(planned,fidelityCredit)};
    });
    const completionPct=plannedSets?Math.round(performedSets/plannedSets*100):100;
    const exactCompletionPct=plannedSets?Math.round(exactPerformedSets/plannedSets*100):100;
    const planFidelityPct=plannedSets?Math.round(fidelityCreditSets/plannedSets*100):100;
    const status=substitutionExercises?(completionPct>=100?"modified":"partial_modified"):(completionPct>=100?"completed":performedSets>0?"partial":skippedExercises?"skipped":"unperformed");
    return {status,completionPct,exactCompletionPct,planFidelityPct,plannedSets,performedSets,exactPerformedSets,fidelityCreditSets:+fidelityCreditSets.toFixed(2),fullExercises,partialExercises,skippedExercises,substitutionExercises,untouchedExercises,details};
  }

  return {normalizeText,parsePrescription,sanitizeSetCount,ensureRowArrays,savedSetCount,performedSetCount,aggregatePerformedSets,writeSet,writeRest,firstIncomplete,firstIncompleteByCount,safeProgress,finiteIndex,firstUnresolved,completionSummary};
});
