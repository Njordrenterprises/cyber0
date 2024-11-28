// src/cards/index/index.ts
import { Card, CardState, CardKvEntry } from '../cards.ts';

export interface IndexState extends CardState {
  message: string;
}

export interface IndexKvEntry extends CardKvEntry {
  message: string;
}

class IndexCard extends Card<IndexState, IndexKvEntry> {
  message: string = 'Rendered Successfully!';

  protected override async loadInitialState(): Promise<void> {
    const entry = await this.getKvEntry();
    if (entry) {
      this.message = entry.message;
    }
  }

  async updateMessage(newMessage: string) {
    const entry: IndexKvEntry = {
      message: newMessage,
      timestamp: Date.now()
    };
    await this.setKvEntry(entry);
    this.message = newMessage;
  }

  override getState(): IndexState {
    return {
      ...super.getState(),
      message: this.message
    };
  }
}

export default new IndexCard('index');