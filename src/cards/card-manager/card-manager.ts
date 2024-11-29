import { Card, CardState, CardKvEntry } from '../cards.ts';
import type { CardInfo } from '../../../db/client/types.ts';

export interface CardManagerState extends CardState {
  cards: CardInfo[];
}

export interface CardManagerKvEntry extends CardKvEntry {
  cards: CardInfo[];
}

class CardManagerCard extends Card<CardManagerState, CardManagerKvEntry> {
  cards: CardInfo[] = [];

  protected override async loadInitialState(): Promise<void> {
    const entry = await this.getKvEntry();
    if (entry) {
      this.cards = entry.cards;
    }
  }

  override getState(): CardManagerState {
    return {
      ...super.getState(),
      cards: this.cards
    };
  }

  protected override getKvKey(): ['cards', string, string] {
    return ['cards', 'list', this.userId];
  }

  // Alpine.js methods
  async addCard(name: string, type: string) {
    console.log('Adding card:', name, type);
    const entry = await this.getKvEntry();
    const cards = entry?.cards || [];
    
    const card: CardInfo = {
      id: crypto.randomUUID(),
      name,
      type,
      created: Date.now()
    };

    cards.push(card);
    await this.setKvEntry({
      cards,
      timestamp: Date.now()
    });
  }

  async deleteCard(id: string) {
    console.log('Deleting card:', id);
    const entry = await this.getKvEntry();
    if (!entry) return;

    const cards = entry.cards.filter(c => c.id !== id);
    await this.setKvEntry({
      cards,
      timestamp: Date.now()
    });

    // Also delete the card's data
    await this.deleteCardEntry(id);
  }

  async renameCard(id: string, newName: string) {
    console.log('Renaming card:', id, newName);
    const entry = await this.getKvEntry();
    if (!entry) return;

    const cards = entry.cards.map(card => 
      card.id === id ? { ...card, name: newName } : card
    );

    await this.setKvEntry({
      cards,
      timestamp: Date.now()
    });
  }

  async getCards(): Promise<CardInfo[]> {
    const entry = await this.getKvEntry();
    return entry?.cards || [];
  }

  // Method to expose Alpine.js methods
  getAlpineMethods() {
    return {
      addCard: this.addCard.bind(this),
      deleteCard: this.deleteCard.bind(this),
      renameCard: this.renameCard.bind(this),
      getCards: this.getCards.bind(this)
    };
  }
}

const cardManager = new CardManagerCard('card-manager');
export default cardManager; 