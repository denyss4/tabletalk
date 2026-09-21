import {apiKey,MODEL,TRANSCRIBE_MODEL,SPEECH_MODE,providerBase} from '@/lib/ai';
export async function GET(){return Response.json({configured:!!apiKey(),provider:new URL(providerBase()).origin,visionModel:MODEL,intentModel:MODEL,speechMode:SPEECH_MODE,transcriptionModel:SPEECH_MODE==='browser'?'browser speech recognition':TRANSCRIBE_MODEL},{headers:{'Cache-Control':'no-store'}});}
