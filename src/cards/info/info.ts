import { Card, CardState, CardKvEntry } from '../cards.ts';
import type { CardMessage } from '../../../db/client/types.ts';

export interface InfoState extends CardState {
  messages: CardMessage[];
  cardId: string;
}

export interface InfoKvEntry extends CardKvEntry {
  messages: CardMessage[];
  cardId: string;
}

class InfoCard extends Card<InfoState, InfoKvEntry> {
  messages: CardMessage[] = [];
  cardId: string = '';

  protected override async loadInitialState(): Promise<void> {
    const entry = await this.getKvEntry();
    if (entry) {
      this.messages = entry.messages;
      this.cardId = entry.cardId;
    }
  }

  async updateMessages(messages: CardMessage[]) {
    const entry: InfoKvEntry = {
      messages,
      cardId: this.cardId,
      timestamp: Date.now()
    };
    await this.setKvEntry(entry);
    this.messages = messages;
  }

  override getState(): InfoState {
    return {
      ...super.getState(),
      messages: this.messages,
      cardId: this.cardId
    };
  }

  protected override getKvKey(): ['cards', string, string] {
    return ['cards', this.id, this.userId];
  }

  // Alpine.js methods
  async handleKvUpdate(cardId: string, newMessage: string) {
    console.log('Handling KV update:', cardId, newMessage);
    const _key = ['cards', 'info', this.userId, cardId];
    let entry = await this.getCardEntry<InfoKvEntry>(cardId);
    if (!entry) {
      entry = { messages: [], cardId, timestamp: Date.now() };
    }
    
    const message: CardMessage = {
      id: crypto.randomUUID(),
      text: newMessage,
      timestamp: Date.now()
    };

    entry.messages.push(message);
    await this.setCardEntry(cardId, entry);
  }

  async handleKvDelete(cardId: string, messageId: string) {
    console.log('Handling KV delete:', cardId, messageId);
    const entry = await this.getCardEntry<InfoKvEntry>(cardId);
    if (!entry) return;

    const messages = entry.messages.filter((m: CardMessage) => m.id !== messageId);
    const updatedEntry = {
      ...entry,
      messages,
      timestamp: Date.now()
    };
    
    await this.setCardEntry(cardId, updatedEntry);
    return updatedEntry;
  }

  async loadCardMessages(cardId: string): Promise<CardMessage[]> {
    console.log('Loading messages for card:', cardId);
    const entry = await this.getCardEntry<InfoKvEntry>(cardId);
    console.log('Loaded entry:', entry);
    if (!entry?.messages) return [];
    // Sort messages by timestamp, newest first
    return entry.messages.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Method to expose Alpine.js methods
  getAlpineMethods() {
    return {
      handleKvUpdate: this.handleKvUpdate.bind(this),
      handleKvDelete: this.handleKvDelete.bind(this),
      loadCardMessages: this.loadCardMessages.bind(this),
      deleteCard: async (cardId: string) => {
        console.log('Deleting card:', cardId);
        await deleteCard(this.userId, cardId, this.id);
      }
    };
  }
}

const infoCard = new InfoCard('info');
export default infoCard; 