import { z } from 'zod';
export const minor = z.number().int().min(0).max(100_000_000);
const receiptFieldStatus=z.enum(['printed','not_printed','unreadable','confirmed']);
export const receiptSchema = z.object({
 merchant:z.string().max(100), currency:z.string().max(5),
 rows:z.array(z.object({id:z.string().max(30),name:z.string().min(1).max(100),quantity:z.number().int().min(1).max(10),amountMinor:minor.nullable(),uncertain:z.boolean()}).strict()).min(1).max(10),
 subtotalMinor:minor.nullable(),subtotalStatus:receiptFieldStatus,serviceMinor:minor.nullable(),serviceStatus:receiptFieldStatus,totalMinor:minor.nullable(),totalStatus:receiptFieldStatus,warnings:z.array(z.string().max(300)).max(10)
}).strict();
export const stateSchema=z.object({receipt:receiptSchema,people:z.array(z.object({id:z.string().regex(/^p[123]$/),name:z.string().min(1).max(30)}).strict()).min(1).max(3),allocation:z.record(z.array(z.string().max(30)).max(3)),revision:z.number().int().nonnegative()}).strict();
export const assignmentSchema=z.object({itemIds:z.array(z.string().max(30)).min(1).max(100),personIds:z.array(z.string().max(30)).max(3)}).strict();
export const confirmationSchema=z.object({field:z.enum(['row','subtotalMinor','serviceMinor','totalMinor']),rowId:z.string().nullable(),amountMinor:minor.nullable(),name:z.string().max(100).nullable()}).strict();
export const intentSchema=z.object({assignments:z.array(assignmentSchema).max(100),question:z.string().max(400).nullable(),candidateItemIds:z.array(z.string()).max(100),candidatePersonIds:z.array(z.string()).max(3),confirmation:confirmationSchema.nullable()}).strict();
export type Intent=z.infer<typeof intentSchema>;
export type Confirmation=z.infer<typeof confirmationSchema>;
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'}; const strings={type:'array',items:str}; const amount={type:['integer','null']};
const extractedFieldStatus={type:'string',enum:['printed','not_printed','unreadable']};
export const receiptJsonSchema=object({merchant:str,currency:str,rows:{type:'array',items:object({name:str,quantity:{type:'integer'},amountMinor:amount,uncertain:{type:'boolean'}})},subtotalMinor:amount,subtotalStatus:extractedFieldStatus,serviceMinor:amount,serviceStatus:extractedFieldStatus,totalMinor:amount,totalStatus:extractedFieldStatus,warnings:strings});
export const intentJsonSchema=object({assignments:{type:'array',items:object({itemIds:strings,personIds:strings})},question:{type:['string','null']},candidateItemIds:strings,candidatePersonIds:strings,confirmation:{anyOf:[{type:'null'},object({field:{type:'string',enum:['row','subtotalMinor','serviceMinor','totalMinor']},rowId:{type:['string','null']},amountMinor:amount,name:{type:['string','null']}})]}});
