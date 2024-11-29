import { getKv } from './kv.ts';

export interface CardState {
  userId: string;
}

export interface CardKvEntry {
  timestamp: number;
}

export class Card<State extends CardState, Entry extends CardKvEntry> {
  protected userId: string = '';

  constructor(public id: string) {}

  async init(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadInitialState();
  }

  protected async loadInitialState(): Promise<void> {
    // Override in subclass
  }

  getState(): State {
    return { userId: this.userId } as State;
  }

  protected getKvKey(): Deno.KvKey {
    throw new Error('Must override getKvKey in subclass');
  }

  protected async getKvEntry(): Promise<Entry | null> {
    const kv = getKv();
    const result = await kv.get<Entry>(this.getKvKey());
    return result.value;
  }

  protected async setKvEntry(entry: Entry): Promise<void> {
    const kv = getKv();
    await kv.set(this.getKvKey(), entry);
  }

  protected async getCardEntry<T>(cardId: string): Promise<T | null> {
    const kv = getKv();
    const key = ['cards', this.id, this.userId, cardId] as const;
    const result = await kv.get<T>(key);
    return result.value;
  }

  protected async setCardEntry<T>(cardId: string, entry: T): Promise<void> {
    const kv = getKv();
    const key = ['cards', this.id, this.userId, cardId] as const;
    await kv.set(key, entry);
  }

  protected async deleteCardEntry(cardId: string): Promise<void> {
    const kv = getKv();
    const key = ['cards', this.id, this.userId, cardId] as const;
    await kv.delete(key);
  }
} 