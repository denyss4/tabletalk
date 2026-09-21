'use client';
import {AlertCircle} from 'lucide-react';
import {money,receiptAmountLabel,type Receipt} from '@/lib/split';

type AmountField='subtotalMinor'|'serviceMinor'|'totalMinor';

export function ReceiptVerification({receipt,disabled,onConfirm}:{receipt:Receipt;disabled:boolean;onConfirm:(field:AmountField,amountMinor:number,description:string)=>void}){
 const itemTotal=receipt.rows.reduce((sum,row)=>sum+(row.amountMinor??0),0);
 const rowsAreReadable=receipt.rows.every(row=>row.amountMinor!==null&&!row.uncertain);
 const checks=[
  receipt.subtotalMinor===null?{key:'subtotal',message:receipt.subtotalStatus==='not_printed'?(rowsAreReadable?`Subtotal is not printed. The item rows add to ${money(itemTotal)}.`:'Subtotal is not printed. Check the unclear rows before confirming it.'):'The subtotal is visible but unreadable. Say the amount or upload a clearer photo.',action:receipt.subtotalStatus==='not_printed'&&rowsAreReadable?{label:`Use ${money(itemTotal)}`,run:()=>onConfirm('subtotalMinor',itemTotal,`Confirmed ${money(itemTotal)} as the subtotal from the item rows.`)}:null}:null,
  receipt.serviceMinor===null?{key:'service',message:receipt.serviceStatus==='not_printed'?'No service charge is printed on this receipt.':'The service charge is visible but unreadable. Say the amount or upload a clearer photo.',action:receipt.serviceStatus==='not_printed'?{label:'Confirm €0.00',run:()=>onConfirm('serviceMinor',0,'Confirmed that the receipt has no service charge.')}:null}:null,
  receipt.totalMinor===null?{key:'total',message:receipt.totalStatus==='not_printed'?'The receipt total is not printed. Say the total before finishing.':'The receipt total is visible but unreadable. Say the amount or upload a clearer photo.',action:null}:null,
 ].filter(Boolean) as Array<{key:string;message:string;action:{label:string;run:()=>void}|null}>;

 return <>
  <div className="receipt-foot">
   <div><span>Subtotal</span><span>{receiptAmountLabel(receipt.subtotalMinor,receipt.subtotalStatus)}</span></div>
   <div><span>Service charge {receipt.serviceMinor!==null&&receipt.serviceMinor>0&&<small>split proportionally</small>}</span><span>{receiptAmountLabel(receipt.serviceMinor,receipt.serviceStatus)}</span></div>
   <div className="receipt-total"><strong>Receipt total</strong><strong>{receiptAmountLabel(receipt.totalMinor,receipt.totalStatus)}</strong></div>
  </div>
  {!!checks.length&&<section className="receipt-checks" aria-labelledby="receipt-checks-title"><h4 id="receipt-checks-title">Finish checking the receipt</h4>{checks.map(check=><div key={check.key}><AlertCircle size={16}/><p>{check.message}</p>{check.action&&<button className="secondary-button" disabled={disabled} onClick={check.action.run}>{check.action.label}</button>}</div>)}</section>}
 </>;
}
