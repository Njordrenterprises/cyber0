(function() {
  // Skip if already loaded
  if (globalThis.Card) return;

  globalThis.Card = class Card {
    constructor(cardType) {
      this.cardType = cardType;
      this.cardIndex = 0;
      this.messages = [];
    }

    async loadMessages() {
      const response = await fetch(`/kv/get?key=cards,${this.cardType},test-user,${this.cardIndex}`);
      const data = await response.json();
      this.messages = data?.messages || [];
      return this.messages;
    }

    async updateMessage(message) {
      this.messages = [...this.messages, message];

      await fetch(`/kv/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: `cards,${this.cardType},test-user,${this.cardIndex}`,
          value: {
            messages: this.messages
          }
        })
      });
    }

    setupKvWatch(callback) {
      const eventSource = new EventSource(
        `/kv/watch?key=cards,${this.cardType},test-user,${this.cardIndex}`
      );
      eventSource.onmessage = async () => {
        await this.loadMessages();
        callback(this.messages);
      };
      return eventSource;
    }

    cleanup() {
      if (this.eventSource) {
        this.eventSource.close();
      }
    }

    getState() {
      return {
        cardType: this.cardType,
        cardIndex: this.cardIndex,
        messages: this.messages
      };
    }
  };

  globalThis.createCard = function(cardType) {
    return new Card(cardType);
  };
})(); 