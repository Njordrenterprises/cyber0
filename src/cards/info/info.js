// src/cards/info/info.js
(function() {
  // Skip if already registered
  if (globalThis.infoCard) return;

  // Create a card instance using the global createCard function
  globalThis.infoCard = globalThis.createCard('info');

  // Define Alpine.js component
  Alpine.data('infoCard', () => ({
    cardIndex: 0,
    messages: [],
    newMessage: '',
    card: globalThis.infoCard,
    eventSource: null,
    
    async init() {
      const wrapper = this.$el.closest('.card-wrapper');
      if (!wrapper) throw new Error('No card wrapper found');
      const index = wrapper.dataset.index;
      if (!index) throw new Error('No index found');
      
      this.cardIndex = parseInt(index);
      this.card.cardIndex = this.cardIndex;
      
      // Load initial messages
      this.messages = await this.card.loadMessages();
      
      // Set up real-time updates
      this.eventSource = this.card.setupKvWatch((messages) => {
        this.messages = messages;
      });
    },

    async updateMessage() {
      if (!this.newMessage.trim()) return;
      await this.card.updateMessage(this.newMessage);
      this.messages = await this.card.loadMessages();
      this.newMessage = '';
    },

    // Cleanup when component is destroyed
    destroy() {
      if (this.eventSource) {
        this.eventSource.close();
      }
      this.card.cleanup();
    }
  }));
})(); 