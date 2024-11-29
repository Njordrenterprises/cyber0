import type { CardManagerMethods, CardInfo } from './types.ts';

export function getCardManagerMethods(): CardManagerMethods {
  return {
    addCard: async (name: string, type: string) => {
      const response = await fetch('/cards/manage/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type })
      });
      if (!response.ok) throw new Error('Failed to add card');
    },
    deleteCard: async (id: string) => {
      const response = await fetch('/cards/manage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error('Failed to delete card');
    },
    renameCard: async (id: string, newName: string) => {
      const response = await fetch('/cards/manage/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName })
      });
      if (!response.ok) throw new Error('Failed to rename card');
    },
    getCards: async () => {
      const response = await fetch('/cards/list');
      if (!response.ok) throw new Error('Failed to get cards');
      const cards = await response.json() as CardInfo[];
      return cards;
    }
  };
} 