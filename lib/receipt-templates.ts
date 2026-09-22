// Photo assets only. Extraction always runs through the live receipt endpoint.
export const receiptTemplates = [
  {id:'bella-mbriana', name:'Bella Mbriana', src:'/samples/templates/bella-mbriana.jpg', type:'image/jpeg', detail:'4 item rows · EUR 51.00', note:'Italian receipt with a €2.50 cover charge and two colas. The item subtotal is not printed and needs confirmation.'},
  {id:'pochi-panini-e-poi', name:'Pochi Panini e Poi', src:'/samples/templates/pochi-panini-e-poi-16.jpg', type:'image/jpeg', detail:'7 rows · EUR 110.20', note:'Italian receipt with repeated quantities and a clearly printed €15.20 service charge. The item subtotal needs confirmation.'},
  {id:'pizzaferaj-city', name:'Pizzaferaj City', src:'/samples/templates/pizzaferaj-city.png', type:'image/png', detail:'5 rows · EUR 57.30', note:'Croatian receipt with two colas. No separate service charge is shown; recognition may need clarification. English commands only.'},
] as const;
export type ReceiptTemplate = typeof receiptTemplates[number];
