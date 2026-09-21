export type SpeechResultEvent={results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>};
export type SpeechEngine={
 lang:string;continuous:boolean;interimResults:boolean;
 onresult:((event:SpeechResultEvent)=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start:()=>void;stop:()=>void;abort:()=>void;
};
export function speechConstructor(){
 const browser=window as unknown as {SpeechRecognition?:new()=>SpeechEngine;webkitSpeechRecognition?:new()=>SpeechEngine};
 return browser.SpeechRecognition??browser.webkitSpeechRecognition;
}
// Final hypotheses replace their indexed result; repeated events cannot duplicate a command.
export function listenForSpeech(engine:SpeechEngine,callbacks:{onPreview:(text:string)=>void;onComplete:(text:string)=>void;onError:(message:string)=>void}){
 let cancelled=false;let ended=false;let finalText='';
 engine.lang='en-US';engine.continuous=true;engine.interimResults=true;
 engine.onresult=event=>{if(cancelled||ended)return;const results=Array.from(event.results);finalText=results.filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ').trim();callbacks.onPreview(results.map(r=>r[0].transcript).join(' ').trim());};
 engine.onerror=event=>{if(cancelled||ended)return;ended=true;callbacks.onError(event.error==='not-allowed'||event.error==='service-not-allowed'?'Allow microphone and speech recognition in your browser, then try again.':event.error==='no-speech'?'No speech was heard. Please try again.':'Browser speech recognition could not connect. Try a browser with speech recognition, or use the receipt row controls.');};
 engine.onend=()=>{if(cancelled||ended)return;ended=true;if(finalText)callbacks.onComplete(finalText);else callbacks.onError('No complete speech was recognized. Please try again.');};
 engine.start();
 return {stop:()=>engine.stop(),abort:()=>{cancelled=true;engine.onresult=null;engine.onerror=null;engine.onend=null;engine.abort();}};
}
