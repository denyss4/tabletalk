/* eslint-disable @next/next/no-img-element */
'use client';
import {receiptTemplates,type ReceiptTemplate} from '@/lib/receipt-templates';
export function ReceiptTemplates({disabled,onRead}:{disabled:boolean;onRead:(template:ReceiptTemplate)=>void}) {
 return <section className="receipt-templates" aria-labelledby="templates-heading">
  <h3 id="templates-heading">Your receipt templates</h3>
  <p>Choose a photo to run live recognition. These real EUR receipts use Italian or Croatian print; voice commands remain English.</p>
  <ul>{receiptTemplates.map(template=><li key={template.id}>
   <div className="template-summary"><img src={template.src} alt={template.name+' receipt photo'} width="90" height="120" loading="lazy" decoding="async"/><div><h4>{template.name}</h4><span>{template.detail}</span><p>{template.note}</p><button className="secondary-button" disabled={disabled} onClick={()=>onRead(template)} aria-label={'Read '+template.name+' receipt'}>Read this receipt</button></div></div>
   <details className="template-preview"><summary>View full photo<span className="sr-only"> of {template.name}</span></summary><img src={template.src} alt={'Full original '+template.name+' receipt'} loading="lazy" decoding="async"/></details>
  </li>)}</ul>
 </section>;
}
