import { apiKey,MODEL,TRANSCRIBE_MODEL } from '@/lib/ai';
export async function GET(){return Response.json({configured:!!apiKey(),visionModel:MODEL,intentModel:MODEL,transcriptionModel:TRANSCRIBE_MODEL},{headers:{'Cache-Control':'no-store'}});}
