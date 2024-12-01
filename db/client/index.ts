import { getInfoCardScript } from './info.ts';

export function getClientScript(): string {
  return `
    ${getInfoCardScript()}
  `;
} 