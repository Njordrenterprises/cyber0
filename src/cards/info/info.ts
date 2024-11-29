import { Card, CardState, CardKvEntry } from '../cards.ts';

export interface InfoState extends CardState {
  message: string;
  index: number;
}

export interface InfoKvEntry extends CardKvEntry {
  message: string;
  index: number;
}

export interface InfoCardMethods {
  handleKvUpdate(index: number, newMessage: string): Promise<void>;
  loadCardMessage(index: number): Promise<string>;
}

class InfoCard extends Card<InfoState, InfoKvEntry> implements InfoCardMethods {
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
  public async handleKvUpdate(index: number, newMessage: string): Promise<void> {
    console.log('Handling KV update:', index, newMessage);
    const entry: InfoKvEntry = {
      message: newMessage,
      index,
      timestamp: Date.now()
    };
    await this.setAlpineKvEntry(index, entry);
  }

  public async loadCardMessage(index: number): Promise<string> {
    console.log('Loading card message:', index);
    const entry = await this.getAlpineKvEntry<InfoKvEntry>(index);
    console.log('Loaded entry:', entry);
    return entry?.message || '';
  }

  // Method to expose Alpine.js methods
  public getAlpineMethods(): InfoCardMethods {
    return {
      handleKvUpdate: this.handleKvUpdate.bind(this),
      loadCardMessage: this.loadCardMessage.bind(this)
    };
  }
}

const infoCard = new InfoCard('info');
export default infoCard; 