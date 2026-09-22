// Photo assets only. Extraction always runs through the live receipt endpoint.
export const receiptTemplates = [
  {id:'westin-fort-lauderdale', name:'Westin Fort Lauderdale', src:'/samples/templates/westin-fort-lauderdale.jpg', type:'image/jpeg', detail:'2 item rows · USD 42.50', note:'US receipt with an 18% service charge plus sales and alcohol tax. It is outside the EUR prototype and should be declined rather than treated as complete.'},
  {id:'pochi-panini-e-poi', name:'Pochi Panini e Poi', src:'/samples/templates/pochi-panini-e-poi-16.jpg', type:'image/jpeg', detail:'7 rows · EUR 110.20', note:'Italian receipt with repeated quantities and a clearly printed €15.20 service charge. The item subtotal needs confirmation.'},
  {id:'pizzaferaj-city', name:'Pizzaferaj City', src:'/samples/templates/pizzaferaj-city.png', type:'image/png', detail:'5 rows · EUR 57.30', note:'Croatian receipt with two colas. No separate service charge is shown; recognition may need clarification. English commands only.'},
] as const;
export type ReceiptTemplate = typeof receiptTemplates[number];
