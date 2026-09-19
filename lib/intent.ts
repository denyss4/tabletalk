import type { Intent,Confirmation } from './schemas';
import {applyAssignments,itemsOf,isMinor,type SplitState} from './split.ts';
export function validateIntent(state:SplitState,intent:Intent,transcript:string):Intent{
 const result=structuredClone(intent);const items=itemsOf(state.receipt);const ids=new Set(items.map(i=>i.id));
 if(result.candidateItemIds.some(id=>!ids.has(id))||result.candidatePersonIds.some(id=>!state.people.some(p=>p.id===id)))throw new Error('The clarification refers to an unknown item or person. Please try again.');
 applyAssignments(state,result.assignments);
 // A duplicate name without an ordinal or explicit collective reference must not silently choose a unit.
 const names=[...new Set(state.receipt.rows.map(r=>r.name.toLowerCase()))];
 for(const name of names){
  const group=items.filter(i=>state.receipt.rows.find(r=>r.id===i.rowId)?.name.toLowerCase()===name);
  if(group.length<2)continue;
  const touched=result.assignments.filter(a=>a.itemIds.some(id=>group.some(i=>i.id===id)));
  if(!touched.length)continue;
  const ordinal=/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|number\s*\d|#\s*\d|1st|2nd|3rd)\b/i.test(transcript);
  const collective=/\b(both|all|two|three)\b/i.test(transcript)&&touched.length===1&&group.every(i=>touched[0].itemIds.includes(i.id));
  if(!ordinal&&!collective){
   result.assignments=result.assignments.map(a=>({...a,itemIds:a.itemIds.filter(id=>!group.some(i=>i.id===id))})).filter(a=>a.itemIds.length);
   result.question=`Which ${name} did ${state.people.filter(p=>touched[0].personIds.includes(p.id)).map(p=>p.name).join(' and ')||'you'} mean?`;
   result.candidateItemIds=group.map(i=>i.id);result.candidatePersonIds=touched[0].personIds;break;
  }
 }
 if(result.confirmation){const c=result.confirmation;if(c.field==='row'&&!state.receipt.rows.some(r=>r.id===c.rowId))throw new Error('Unknown receipt row.');}
 if(result.candidateItemIds.length&&!result.question)throw new Error('Missing clarification question.');
 return result;
}
export function confirmReceipt(state:SplitState,confirmation:Confirmation):SplitState{
 const next=structuredClone(state);const c=confirmation;
 if(c.amountMinor!==null&&!isMinor(c.amountMinor))throw new Error('Invalid amount.');
 if(c.field==='row'){
  const row=next.receipt.rows.find(r=>r.id===c.rowId);if(!row)throw new Error('Unknown row.');
  if(c.name!==null)row.name=c.name;
  if(c.amountMinor!==null)row.amountMinor=c.amountMinor;
  if(row.amountMinor===null)throw new Error('Read the amount aloud before confirming.');
  row.uncertain=false;
 }else{if(c.amountMinor===null)throw new Error('Read the amount aloud before confirming.');next.receipt[c.field]=c.amountMinor;}
 next.revision++;return next;
}

