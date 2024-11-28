export interface CardState {
  id: string;
  userId: string;
}

export interface CardKvEntry {
  timestamp: number;
}

type CardKvKey = ['cards', string, string];

export class Card<State extends CardState, KvEntry extends CardKvEntry> {
  id: string;
  userId: string = '';
  kv: Deno.Kv | null = null;
  #watchController: AbortController | null = null;

  constructor(id: string) {
    this.id = id;
  }

  async init(kv: Deno.Kv, userId: string) {
    this.kv = kv;
    this.userId = userId;
    this.#watchController = new AbortController();
    this.setupKvWatch();
    await this.loadInitialState();
    return this;
  }

  protected setupKvWatch() {
    const kv = this.kv;
    if (!kv) return;

    const watchKey: CardKvKey = ['cards', this.id, this.userId];
    
    (async () => {
      try {
        const watcher = kv.watch([watchKey, watchKey]);
        
        try {
          for await (const entries of watcher) {
            for (const entry of entries) {
              if (entry.value) {
                await this.loadInitialState();
                break;
              }
            }
          }
        } catch (watchError) {
          if (!(watchError instanceof Error && watchError.name === 'AbortError')) {
            console.error('KV Watch iteration error:', watchError);
          }
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.name !== 'AbortError') {
          console.error('KV Watch setup error:', err);
        }
      }
    })();
  }

  protected async loadInitialState(): Promise<void> {
    // Override in child class
  }

  getState(): State {
    // Override in child class
    return { id: this.id, userId: this.userId } as State;
  }

  destroy() {
    if (this.#watchController) {
      this.#watchController.abort();
      this.#watchController = null;
    }
  }

  protected async getKvEntry(): Promise<KvEntry | null> {
    if (!this.kv) return null;
    const entry = await this.kv.get<KvEntry>(['cards', this.id, this.userId]);
    return entry.value;
  }

  protected async setKvEntry(entry: KvEntry): Promise<void> {
    if (!this.kv) return;
    await this.kv.set(['cards', this.id, this.userId], entry);
  }
}
