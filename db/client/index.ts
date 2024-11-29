import { getInfoCardScript } from './info.ts';

export function getClientScript(): string {
  return `
    // Initialize cardData
    window.cardData = window.cardData || {};
    
    // Define KV methods
    window.cardData.kv = {
      get: async (key) => {
        const response = await fetch(\`/kv/get?key=\${key.join(',')}\`);
        return await response.json();
      },
      set: async (key, value) => {
        await fetch('/kv/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.join(','), value })
        });
      }
    };

    // Initialize info card methods
    ${getInfoCardScript()}
  `;
} 