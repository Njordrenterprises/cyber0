import { getInfoCardScript } from './info.ts';
import { getCardManagerMethods } from './card-manager.ts';
import { initializeCardData } from './utils.ts';

export function getClientScript(): string {
  return `
    ${initializeCardData.toString()}
    ${getInfoCardScript()}
    ${getCardManagerMethods.toString()}

    initializeCardData();
    window.cardData.cards = window.cardData.cards || getCardManagerMethods();
  `;
} 