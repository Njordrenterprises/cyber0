// src/cards/info/info.ts
import { Card, CardState, CardKvEntry } from '../cards.ts';

// Add Alpine.js type declarations
declare global {
  interface Window {
    Alpine: {
      data<T>(name: string, callback: () => T): void;
    };
  }
}

type Alpine = Window['Alpine'];
declare const Alpine: Alpine;

// Alpine.js component interface
interface InfoCardComponent {
  cardIndex: number;
  messages: string[];
  newMessage: string;
  $el: HTMLElement;
  init(): Promise<void>;
  updateMessage(): Promise<void>;
}

export interface InfoState extends CardState {
  message: string;
  index: number;
}

export interface InfoKvEntry extends CardKvEntry {
  message: string;
  index: number;
}

interface CardWrapperElement extends HTMLDivElement {
  dataset: {
    index: string;
  };
}

class InfoCard extends Card<InfoState, InfoKvEntry> {
  message: string = '';

  protected override async loadInitialState(): Promise<void> {
    await super.loadInitialState();
  }

  override getState(): InfoState {
    return {
      ...super.getState(),
      message: this.message,
      index: this.cardIndex
    };
  }

  // Public methods for Alpine.js component
  public async loadCardMessages(): Promise<string[]> {
    await this.loadMessages();
    return this.messages;
  }

  public async updateCardMessage(message: string): Promise<void> {
    await this.updateMessage(message);
  }
}

const infoCard = new InfoCard('info');

// Register Alpine.js component
document.addEventListener('alpine:init', () => {
  const component: InfoCardComponent = {
    cardIndex: 0,
    messages: [],
    newMessage: '',
    $el: undefined as unknown as HTMLElement,

    async init() {
      const wrapper = this.$el.closest('.card-wrapper') as CardWrapperElement;
      this.cardIndex = parseInt(wrapper.dataset.index);
      infoCard.cardIndex = this.cardIndex;
      this.messages = await infoCard.loadCardMessages();

      // Watch for KV updates
      const eventSource = new EventSource(`/kv/watch?key=cards,info,test-user,${this.cardIndex}`);
      eventSource.onmessage = async () => {
        this.messages = await infoCard.loadCardMessages();
      };
    },

    async updateMessage() {
      if (!this.newMessage.trim()) return;
      await infoCard.updateCardMessage(this.newMessage);
      this.messages = await infoCard.loadCardMessages();
      this.newMessage = '';
    }
  };

  globalThis.Alpine.data('infoCard', () => component);
});

export default infoCard;