export class Card {
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
    await fetch(`/kv/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: `cards,${this.cardType},test-user,${this.cardIndex}`,
        value: {
          messages: [...this.messages, message]
        }
      })
    });
  }

  getState() {
    return {
      cardType: this.cardType,
      cardIndex: this.cardIndex
    };
  }
} 