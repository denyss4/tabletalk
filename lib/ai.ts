import { env } from 'cloudflare:workers';
export const MODEL='gpt-4.1-mini-2025-04-14';
export const TRANSCRIBE_MODEL='gpt-4o-mini-transcribe';
export type Operation={id:string;stage:string;model:string;latencyMs:number;status:string;inputTokens?:number;outputTokens?:number;cachedTokens?:number;audioSeconds?:number;costUSD:number|null;costBasis:string;usage?:unknown};
type ProviderUsage={seconds?:number;input_tokens?:number;output_tokens?:number;input_tokens_details?:{cached_tokens?:number}};
type ProviderContent={type?:string;text?:string};
type ProviderOutput={content?:ProviderContent[]};
type ProviderResponse={status?:string;usage?:ProviderUsage;output?:ProviderOutput[];text?:string};
export function apiKey(){return (env as unknown as Record<string,string>).OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';}
export class AppError extends Error { constructor(message:string,public status=400){super(message);} }
export async function provider(path:string,body:BodyInit,headers:Record<string,string>,stage:string,model:string,operations:Operation[],audioSeconds?:number){
 const key=apiKey(); if(!key)throw new AppError('Live recognition is not connected yet. Add OPENAI_API_KEY on the server, or explore the labelled example.',503);
 const started=Date.now(); const operation:Operation={id:crypto.randomUUID(),stage,model,latencyMs:0,status:'started',costUSD:null,costBasis:'Unknown until provider usage is received'};
 operations.push(operation);
 try{
  const response=await fetch(`https://api.openai.com/v1/${path}`,{method:'POST',headers:{...headers,Authorization:`Bearer ${key}`},body,signal:AbortSignal.timeout(45_000)});
  if(!response.ok){if(response.status===429)throw new AppError('Recognition is busy or the account has reached its limit. Please try again.',429);if(response.status===401)throw new AppError('The recognition key is not accepted. Check the server configuration.',503);throw new AppError(`Recognition failed (${response.status}). Your split has been kept. Please try again.`,502);}
  const data=await response.json() as ProviderResponse;
  operation.usage=data.usage??null;
  operation.status='succeeded';
  if(stage==='transcription'){
   const seconds=typeof data.usage?.seconds==='number'?data.usage.seconds:audioSeconds;
   operation.audioSeconds=seconds;
   operation.costUSD=seconds===undefined?null:seconds/60*0.003;
   operation.costBasis='Estimated at USD 0.003/audio minute; raw usage retained; pricing checked 2026-09-18';
  }else if(data.usage){
   operation.inputTokens=data.usage.input_tokens;operation.outputTokens=data.usage.output_tokens;operation.cachedTokens=data.usage.input_tokens_details?.cached_tokens??0;
   if(typeof operation.inputTokens==='number'&&typeof operation.outputTokens==='number')operation.costUSD=((operation.inputTokens-(operation.cachedTokens??0))*0.4+(operation.cachedTokens??0)*0.1+operation.outputTokens*1.6)/1_000_000;
   operation.costBasis='USD per million tokens: input 0.40, cached 0.10, output 1.60; checked 2026-09-18';
  }
  return data;
 }catch(error){operation.status='failed';if(error instanceof AppError)throw error;throw new AppError('Recognition timed out or could not connect. Please try again; your split is safe.',504);}
 finally{operation.latencyMs=Date.now()-started;console.info(JSON.stringify({event:'ai_operation',...operation}));}
}
export async function structured(instructions:string,input:unknown,schema:unknown,stage:string,operations:Operation[]){
 const data=await provider('responses',JSON.stringify({model:MODEL,store:false,temperature:0,instructions,input,text:{format:{type:'json_schema',name:stage,strict:true,schema}}}),{'Content-Type':'application/json'},stage,MODEL,operations);
 if(data.status!=='completed')throw new AppError('Recognition did not finish. Please retry with a clearer input.',502);
 const parts=(data.output??[]).flatMap(x=>x.content??[]);
 const value=parts.filter(x=>x.type==='output_text').map(x=>x.text??'').join('');
 if(!value)throw new AppError('The input could not be recognized. Please try a clearer photo or recording.',422);
 try{return JSON.parse(value);}catch{throw new AppError('The recognition response was incomplete. Please try again.',502);}
}
export function failure(error:unknown,operations:Operation[]){
 const message=error instanceof AppError?error.message:error instanceof Error&&error.name==='ZodError'?'The input could not be validated. Please try again with a clearer input.':error instanceof Error?error.message:'Something went wrong. Please try again.';
 return Response.json({error:message,operations},{status:error instanceof AppError?error.status:422});
}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AppError('Use this app to upload the input.',403);}
