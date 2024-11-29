import { Card, CardState, CardKvEntry } from '../cards.ts';

export interface InfoState extends CardState {
  message: string;
  index: number;
}

export interface InfoKvEntry extends CardKvEntry {
  message: string;
  index: number;
}

class InfoCard extends Card<InfoState, InfoKvEntry> {
  message: string = '';
  index: number = 0;

  protected override async loadInitialState(): Promise<void> {
    const entry = await this.getKvEntry();
    if (entry) {
      this.message = entry.message;
      this.index = entry.index;
    }
  }

  async updateMessage(newMessage: string) {
    const entry: InfoKvEntry = {
      message: newMessage,
      index: this.index,
      timestamp: Date.now()
    };
    await this.setKvEntry(entry);
    this.message = newMessage;
  }

  override getState(): InfoState {
    return {
      ...super.getState(),
      message: this.message,
      index: this.index
    };
  }

  protected override getKvKey(): ['cards', string, string, number] {
    return ['cards', this.id, this.userId, this.index];
  }

  // Alpine.js methods
  async handleKvUpdate(index: number, newMessage: string) {
    const entry: InfoKvEntry = {
      message: newMessage,
      index,
      timestamp: Date.now()
    };
    await this.setAlpineKvEntry(index, entry);
  }

  async loadCardMessage(index: number): Promise<string> {
    const entry = await this.getAlpineKvEntry<InfoKvEntry>(index);
    return entry?.message || '';
  }
}

export default new InfoCard('info'); 