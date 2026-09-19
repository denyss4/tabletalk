import type { Receipt } from './split';
export const sampleReceipt: Receipt = {
  merchant: 'Table Nine', currency: 'EUR',
  rows: [
    { id: 'r1', name: 'Coffee', quantity: 1, amountMinor: 280, uncertain: false },
    { id: 'r2', name: 'Coffee', quantity: 1, amountMinor: 280, uncertain: false },
    { id: 'r3', name: 'Pasta', quantity: 1, amountMinor: 1240, uncertain: false },
    { id: 'r4', name: 'Burger', quantity: 1, amountMinor: 1160, uncertain: false },
    { id: 'r5', name: 'Salad', quantity: 1, amountMinor: 810, uncertain: false },
    { id: 'r6', name: 'Fries', quantity: 1, amountMinor: 570, uncertain: false },
  ], subtotalMinor: 4340, serviceMinor: 435, totalMinor: 4775, warnings: [],
};
