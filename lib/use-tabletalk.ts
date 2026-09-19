'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {PEOPLE,applyAssignments,calculate,itemsOf,type Assignment,type Person,type SplitState,type Receipt} from './split';
import {sampleReceipt} from './sample';
import {confirmReceipt} from './intent';
import type {Confirmation,Intent} from './schemas';
import type {Operation} from './ai';
export type Activity={at:string;text:string;kind:'voice'|'change'|'system'};
export type Recording={url:string;name:string;duration:number};
export function useTabletalk(){
 const [state,setState]=useState<SplitState|null>(null);const stateRef=useRef(state);
 useEffect(()=>{stateRef.current=state;},[state]);
 const [people,setPeople]=useState<Person[]>(structuredClone(PEOPLE));
 const [photo,setPhoto]=useState('');const [example,setExample]=useState(false);
 const [busy,setBusy]=useState('');const busyRef=useRef(false);const [error,setError]=useState('');const [configured,setConfigured]=useState<boolean|null>(null);
 const [pending,setPending]=useState<Intent|null>(null);const [confirmation,setConfirmation]=useState<Confirmation|null>(null);
 const [operations,setOperations]=useState<Operation[]>([]);const [activity,setActivity]=useState<Activity[]>([]);
 const [recording,setRecording]=useState(false);const recorder=useRef<MediaRecorder|null>(null);const streamRef=useRef<MediaStream|null>(null);const recordingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [recordings,setRecordings]=useState<Recording[]>([]);const recordingUrls=useRef<string[]>([]);
 const startedAt=useRef<number|null>(null);const [settledMs,setSettledMs]=useState<number|null>(null);const [firstSettledMs,setFirstSettledMs]=useState<number|null>(null);
 const [history,setHistory]=useState<SplitState[]>([]);
 const result=state?calculate(state):null;const settled=!!result?.settled&&!pending&&!confirmation&&!busy&&!recording;
 const note=useCallback((text:string,kind:Activity['kind']='system')=>setActivity(a=>[...a,{at:new Date().toISOString(),text,kind}]),[]);
 const commit=useCallback((next:SplitState)=>{const previous=stateRef.current;if(previous)setHistory(h=>[...h,structuredClone(previous)]);stateRef.current=next;setState(next);setSettledMs(null);},[]);
 useEffect(()=>{fetch('/api/status').then(r=>r.json()).then(data=>setConfigured((data as {configured?:boolean}).configured===true)).catch(()=>setConfigured(false));return()=>{if(recordingTimer.current)clearTimeout(recordingTimer.current);if(recorder.current?.state==='recording'){recorder.current.onstop=null;recorder.current.stop();}streamRef.current?.getTracks().forEach(t=>t.stop());recordingUrls.current.forEach(url=>URL.revokeObjectURL(url));};},[]);
 useEffect(()=>{if(settled&&startedAt.current!==null){const ms=Date.now()-startedAt.current;setSettledMs(ms);setFirstSettledMs(x=>x??ms);}else setSettledMs(null);},[settled,state?.revision]);
 const run=useCallback(async(label:string,task:()=>Promise<void>)=>{if(busyRef.current)return;busyRef.current=true;setBusy(label);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Something went wrong. Please try again.');}finally{busyRef.current=false;setBusy('');}},[]);
 async function api(path:string,body:BodyInit,headers?:HeadersInit){const response=await fetch(path,{method:'POST',body,headers,signal:AbortSignal.timeout(100_000)});const data=await response.json() as {operations?:Operation[];error?:string;receipt:Receipt;intent:Intent;transcript:string;revision:number};if(data.operations)setOperations(o=>[...o,...(data.operations??[])]);if(!response.ok)throw new Error(data.error??'Recognition failed. Please try again.');return data;}
 function reset(){if(busyRef.current||recording)return;stateRef.current=null;setState(null);setPhoto('');setExample(false);setPending(null);setConfirmation(null);setOperations([]);setActivity([]);setHistory([]);setError('');setSettledMs(null);setFirstSettledMs(null);startedAt.current=null;recordingUrls.current.forEach(url=>URL.revokeObjectURL(url));recordingUrls.current=[];setRecordings([]);}
 function startExample(){reset();startedAt.current=Date.now();setExample(true);setPhoto('/samples/receipt.png');const next={receipt:structuredClone(sampleReceipt),people:structuredClone(people),allocation:{},revision:0};stateRef.current=next;setState(next);note('Opened the allocation example. Photo recognition was not run.');}
 async function uploadPhoto(file:File){
  await run('Reading your receipt…',async()=>{
   startedAt.current??=Date.now();
   if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
   if(file.size>20_000_000)throw new Error('Choose a photo under 20 MB.');
   const data=await resizeImage(file);const response=await api('/api/receipt',JSON.stringify({image:data}),{'Content-Type':'application/json'});
   const next={receipt:response.receipt,people:structuredClone(people),allocation:{},revision:0};stateRef.current=next;setState(next);setPhoto(data);setExample(false);setPending(null);setConfirmation(null);setHistory([]);setFirstSettledMs(null);setSettledMs(null);note('Receipt read. Tell us who had what.');
  });
 }
 async function readSample(unreadable=false){try{const response=await fetch(`/samples/receipt${unreadable?'-unreadable':''}.png`);if(!response.ok)throw new Error('Sample photo could not be loaded.');await uploadPhoto(new File([await response.blob()],'sample.png',{type:'image/png'}));}catch(e){setError(e instanceof Error?e.message:'Sample unavailable.');}}
 function assign(assignments:Assignment[],description='Updated the item allocation.'){if(busyRef.current||recording||!stateRef.current)return;try{commit(applyAssignments(stateRef.current,assignments));note(description,'change');setError('');}catch(e){setError(e instanceof Error?e.message:'Please check the allocation.');}}
 function resolveCandidate(id:string){if(!pending||!stateRef.current)return;try{commit(applyAssignments(stateRef.current,[{itemIds:[id],personIds:pending.candidatePersonIds}]));note(`Clarified ${itemsOf(stateRef.current.receipt).find(i=>i.id===id)?.name}.`,'change');setPending(null);}catch(e){setError(e instanceof Error?e.message:'Please try again.');}}
 function acceptConfirmation(){if(!confirmation||!stateRef.current)return;try{commit(confirmReceipt(stateRef.current,confirmation));note('Confirmed the receipt detail from your spoken answer.','change');setConfirmation(null);setPending(null);}catch(e){setError(e instanceof Error?e.message:'Please try again.');}}
 function confirmVisibleRow(id:string){if(!stateRef.current)return;const row=stateRef.current.receipt.rows.find(r=>r.id===id);if(row?.amountMinor===null)return;try{commit(confirmReceipt(stateRef.current,{field:'row',rowId:id,amountMinor:row?.amountMinor??null,name:row?.name??null}));note('Confirmed the highlighted row against the photo.','change');}catch(e){setError(e instanceof Error?e.message:'Please try again.');}}
 function undo(){if(busyRef.current||recording||!history.length)return;const previous=structuredClone(history[history.length-1]);previous.revision=(stateRef.current?.revision??0)+1;stateRef.current=previous;setState(previous);setHistory(h=>h.slice(0,-1));setPending(null);setConfirmation(null);note('Undid the last change.','change');}
 function rename(names:string[]){const clean=names.map(n=>n.trim());if(clean.some(n=>!n||n.length>30)||new Set(clean.map(n=>n.toLowerCase())).size!==clean.length)throw new Error('Enter three different names, up to 30 characters each.');const next=people.map((p,i)=>({...p,name:clean[i]}));setPeople(next);if(stateRef.current)commit({...stateRef.current,people:next,revision:stateRef.current.revision+1});}
 async function sendAudio(blob:Blob,name:string,duration:number){const snapshot=stateRef.current;if(!snapshot)return;await run('Listening and updating…',async()=>{
  startedAt.current??=Date.now();
  const url=URL.createObjectURL(blob);recordingUrls.current.push(url);setRecordings(r=>[...r,{url,name,duration}]);
  const form=new FormData();form.append('audio',blob,name);form.append('state',JSON.stringify(snapshot));form.append('duration',String(duration));form.append('pending',JSON.stringify(pending));
  const data=await api('/api/voice',form);
  if(stateRef.current?.revision!==data.revision)throw new Error('The receipt changed during recognition. Please repeat that command.');
  note(data.transcript,'voice');const intent:Intent=data.intent;
  if(intent.assignments.length){commit(applyAssignments(stateRef.current!,intent.assignments));note(`Updated ${intent.assignments.reduce((n,a)=>n+a.itemIds.length,0)} item(s).`,'change');}
  const resolvedPrevious=!pending||intent.assignments.some(a=>a.itemIds.some(id=>pending.candidateItemIds.includes(id)))||!!intent.confirmation;
  if(intent.question)setPending(intent);else if(resolvedPrevious)setPending(null);
  setConfirmation(intent.confirmation);
 });}
 async function toggleRecording(){
  if(recording){if(recordingTimer.current)clearTimeout(recordingTimer.current);recorder.current?.stop();return;}
  if(busyRef.current||!stateRef.current)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('Recording is unavailable in this browser. Upload an audio recording instead.');return;}
  try{setError('');const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder.current=rec;const chunks:BlobPart[]=[];const start=Date.now();rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());streamRef.current=null;setRecording(false);const duration=(Date.now()-start)/1000;const type=rec.mimeType||'audio/webm';void sendAudio(new Blob(chunks,{type}),`voice-${Date.now()}.${type.includes('mp4')?'m4a':'webm'}`,duration);};rec.onerror=()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);setError('Recording failed. Try uploading an audio file.');};rec.start();setRecording(true);recordingTimer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop();},60_000);}catch{setError('Microphone access was not granted. Allow it in your browser, or upload an audio recording.');}
 }
 async function uploadAudio(file:File){if(file.size>10_000_000){setError('Use an audio recording under 10 MB.');return;}try{const context=new AudioContext();let duration:number;try{duration=(await context.decodeAudioData(await file.arrayBuffer())).duration;}finally{await context.close();}if(duration>90)throw new Error('Keep the recording under 90 seconds.');await sendAudio(file,file.name,duration);}catch(e){setError(e instanceof Error?e.message:'Could not read that audio file. Try WAV, MP3 or WebM.');}}
 async function useSampleAudio(name:string){try{const response=await fetch(`/samples/${name}.wav`);if(!response.ok)throw new Error('The sample recording is unavailable.');await uploadAudio(new File([await response.blob()],`${name}.wav`,{type:'audio/wav'}));}catch(e){setError(e instanceof Error?e.message:'Sample unavailable.');}}
 function exportEvidence(){const payload={exportedAt:new Date().toISOString(),inputMode:example?'prefilled allocation example; no photo recognition':'photo recognition',state,verification:result,settled,unresolvedQuestion:pending,unconfirmedReceiptEdit:confirmation,timing:{startAt:startedAt.current?new Date(startedAt.current).toISOString():null,firstSettledMs,lastSettledMs:settledMs,includesUserThinkingAndRecording:true},operations,activity,estimatedKnownCostUSD:operations.reduce((n,o)=>n+(o.costUSD??0),0),costIncomplete:operations.some(o=>o.costUSD===null),pricingDate:'2026-09-18',hosting:'Excluded; report actual host plan separately',speechOutput:'No generated speech; clarification choices only',paidIntermediaries:'None in recognition pipeline',recordings:recordings.map(({name,duration})=>({name,duration}))};download(JSON.stringify(payload,null,2),'tabletalk-evidence.json','application/json');}
 return {state,people,photo,example,busy,error,configured,pending,confirmation,operations,activity,recording,recordings,result,settled,settledMs,firstSettledMs,history,reset,startExample,uploadPhoto,readSample,assign,resolveCandidate,acceptConfirmation,confirmVisibleRow,undo,rename,toggleRecording,uploadAudio,useSampleAudio,exportEvidence,dismissPending:()=>{setPending(null);setConfirmation(null);note('Discarded the unresolved change. Existing allocations kept.','change');}};
}
export function download(content:string,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function resizeImage(file:File):Promise<string>{const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');if(!context)throw new Error('Could not prepare the photo.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.9);}finally{bitmap.close();}}


