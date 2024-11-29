import { Card } from '../cards.js';

class InfoCard extends Card {
  message = '';

  getState() {
    return {
      ...super.getState(),
      message: this.message,
      index: this.cardIndex
    };
  }

  // Public methods for Alpine.js component
  async loadCardMessages() {
    await this.loadMessages();
    return this.messages;
  }

  async updateCardMessage(message) {
    await this.updateMessage(message);
  }

  // Register Alpine.js component
  registerComponent() {
    globalThis.Alpine?.data('infoCard', () => ({
      cardIndex: 0,
      messages: [],
      newMessage: '',
      card: this,
      
      async init() {
        const wrapper = this.$el.closest('.card-wrapper');
        this.cardIndex = parseInt(wrapper.dataset.index);
        this.card.cardIndex = this.cardIndex;
        this.messages = await this.card.loadCardMessages();

        // Watch for KV updates
        const eventSource = new EventSource(`/kv/watch?key=cards,info,test-user,${this.cardIndex}`);
        eventSource.onmessage = async () => {
          this.messages = await this.card.loadCardMessages();
        };
      },

      async updateMessage() {
        if (!this.newMessage.trim()) return;
        await this.card.updateCardMessage(this.newMessage);
        this.messages = await this.card.loadCardMessages();
        this.newMessage = '';
      }
    }));
  }
}

const infoCard = new InfoCard('info');

// Register the component when Alpine is ready
document.addEventListener('alpine:init', () => {
  infoCard.registerComponent();
}); 