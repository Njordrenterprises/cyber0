import { getInfoCardScript } from './info.ts';
import { getTestCardScript } from '../../src/cards/test/test.ts';

export function getClientScript(): string {
  return `
    ${getInfoCardScript()}
    ${getTestCardScript()}
  `;
} 