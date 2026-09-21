// Photo assets only. Extraction always runs through the live receipt endpoint.
export const receiptTemplates = [
  {id:'vault-164', name:'Vault 164', src:'/samples/templates/vault-164.jpg', type:'image/jpeg', detail:'3 rows · drinks', note:'Currency is not printed clearly. Includes tax and a wage surcharge, outside the current EUR-only split.'},
  {id:'bang-ria-grill', name:'Bang Ria Grill', src:'/samples/templates/bang-ria-grill.jpg', type:'image/jpeg', detail:'7 rows · repeated items', note:'Includes service charge and PB1 tax. Currency needs confirmation; this tax layout is outside the current split.'},
  {id:'pizzaferaj-city', name:'Pizzaferaj City', src:'/samples/templates/pizzaferaj-city.png', type:'image/png', detail:'5 rows · EUR 57.30', note:'Croatian receipt with two colas. No separate service charge is shown; recognition may need clarification. English commands only.'},
] as const;
export type ReceiptTemplate = typeof receiptTemplates[number];
