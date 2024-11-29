import { Card, CardState, CardKvEntry } from '../cards.ts';

export interface InfoState extends CardState {
  messages: InfoMessage[];
  index: number;
}

export interface InfoMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface InfoKvEntry extends CardKvEntry {
  messages: InfoMessage[];
  index: number;
}

class InfoCard extends Card<InfoState, InfoKvEntry> {
  messages: InfoMessage[] = [];
  index: number = 0;

  protected override async loadInitialState(): Promise<void> {
    const entry = await this.getKvEntry();
    if (entry) {
      this.messages = entry.messages;
      this.index = entry.index;
    }
  }

  async updateMessages(messages: InfoMessage[]) {
    const entry: InfoKvEntry = {
      messages,
      index: this.index,
      timestamp: Date.now()
    };
    await this.setKvEntry(entry);
    this.messages = messages;
  }

  override getState(): InfoState {
    return {
      ...super.getState(),
      messages: this.messages,
      index: this.index
    };
  }

  protected override getKvKey(): ['cards', string, string, number] {
    return ['cards', this.id, this.userId, this.index];
  }

  // Alpine.js methods
  async handleKvUpdate(index: number, newMessage: string) {
    console.log('Handling KV update:', index, newMessage);
    const entry = await this.getAlpineKvEntry<InfoKvEntry>(index);
    const messages = entry?.messages || [];
    
    const message: InfoMessage = {
      id: crypto.randomUUID(),
      text: newMessage,
      timestamp: Date.now()
    };

    messages.push(message);
    await this.setAlpineKvEntry(index, {
      messages,
      index,
      timestamp: Date.now()
    });
  }

  async handleKvDelete(index: number, messageId: string) {
    console.log('Handling KV delete:', index, messageId);
    const entry = await this.getAlpineKvEntry<InfoKvEntry>(index);
    if (!entry) return;

    const messages = entry.messages.filter(m => m.id !== messageId);
    await this.setAlpineKvEntry(index, {
      messages,
      index,
      timestamp: Date.now()
    });
  }

  async loadCardMessages(index: number): Promise<InfoMessage[]> {
    console.log('Loading messages for index:', index);
    const entry = await this.getAlpineKvEntry<InfoKvEntry>(index);
    console.log('Loaded entry:', entry);
    return entry?.messages || [];
  }

  // Method to expose Alpine.js methods
  getAlpineMethods() {
    return {
      handleKvUpdate: this.handleKvUpdate.bind(this),
      handleKvDelete: this.handleKvDelete.bind(this),
      loadCardMessages: this.loadCardMessages.bind(this)
    };
  }
}

const infoCard = new InfoCard('info');
export default infoCard; 