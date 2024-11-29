# Cyber Framework

A real-time, card-based web framework built with Deno, featuring WebSocket-powered live updates and a modern cyberpunk aesthetic.

## Features

- 🚀 Real-time updates across all clients
- 💾 Persistent storage with Deno KV
- 🎨 TRON-inspired cyberpunk UI
- 🔌 WebSocket-based communication
- 🧩 Modular card-based architecture
- 🛠 Extensible framework for custom cards

## Quick Start

1. Install Deno:

```bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```

2. Clone and run:

```bash
git clone https://github.com/Njordrenterprises/cyber0.git
cd cyber0
deno task dev
```

3. Open http://localhost:8000

## Card Operations

### Create a Card

```bash
curl -X POST -H "Content-Type: application/json" \\
     -d '{"name":"My Card"}' \\
     http://localhost:8000/cards/info/create
```

### Send a Message

```bash
curl -X POST -H "Content-Type: application/json" \\
     -d '{"cardId":"CARD_ID", "text":"Hello World!"}' \\
     http://localhost:8000/cards/info/message/add
```

### View Card Messages

```bash
curl "http://localhost:8000/kv/get?key=cards,info,test-user,CARD_ID"
```

### Delete a Message

```bash
curl -X POST -H "Content-Type: application/json" \\
     -d '{"cardId":"CARD_ID", "messageId":"MESSAGE_ID"}' \\
     http://localhost:8000/cards/info/message/delete
```

### Delete a Card

```bash
curl -X POST -H "Content-Type: application/json" \\
     -d '{"cardId":"CARD_ID"}' \\
     http://localhost:8000/cards/info/delete
```

## Architecture

The framework uses a modular card-based architecture:

```
src/
├── cards/           # Card implementations
│   └── info/        # Info card example
├── ws/              # WebSocket handling
└── views/           # Page views
```

Each card type follows a consistent structure:

- Server-side TypeScript class
- Client-side methods
- HTML template
- Scoped CSS styles

## Real-Time Updates

All operations are immediately broadcast to all connected clients via WebSockets:

1. Client performs action (create/update/delete)
2. Server processes request
3. KV store is updated
4. WebSocket broadcast sent
5. All clients update automatically

## Development

### Create a New Card Type

1. Create directory structure:

```bash
mkdir -p src/cards/my-card
touch src/cards/my-card/{my-card.ts,my-card.html,my-card.css}
```

2. Implement the card class:

```typescript
// src/cards/my-card/my-card.ts
import { Card, CardState } from "../cards.ts";

export interface MyCardState extends CardState {
  // Card-specific state
}

class MyCard extends Card<MyCardState> {
  // Implementation
}

export default new MyCard("my-card");
```

3. Create the template:

```html
<!-- src/cards/my-card/my-card.html -->
<div class="card my-card" x-data="{ /* ... */ }">
  <!-- Card content -->
</div>
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Repository

https://github.com/Njordrenterprises/cyber0
