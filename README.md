# Cyber Project

A hypermedia-driven web application using Deno, HTMX, Alpine.js, and Deno KV.

## Architecture

This project uses a modular card-based architecture where:

1. The application shell (index.html) uses HTMX to load views
2. Views are composed of reusable cards
3. Each card is a self-contained module with:
   - Base functionality from cards.ts
   - Card-specific implementation
   - Alpine.js component integration
   - Real-time KV store connection

### Data Flow

```plaintext
User Input -> Alpine.js Component -> Card API -> Base Card -> KV Store
     ↑                                                          |
     └─────────────── KV Watch Events ────────────────────────┘
```

## Technology Stack

- **Deno**: Runtime and KV store
- **HTMX**: View swapping and server interaction
- **Alpine.js**: Card-level interactivity
- **TypeScript**: Type-safe card implementations

## Project Structure

```plaintext
/
├── src/
│   ├── cards/              # Card modules
│   │   ├── cards.ts        # Base card class + KV operations
│   │   └── [card-name]/    # Individual cards
│   │       ├── [card-name].ts   # Implementation + Alpine.js
│   │       ├── [card-name].css  # Card styles
│   │       └── [card-name].html # Card template
│   ├── js/                 # Client libraries
│   └── views/              # HTMX views
├── main.ts                # Server routing
└── index.html            # App shell
```

## Development

1. Install Deno
2. Clone the repository
3. Run the server:
   ```bash
   deno task dev
   ```

## Creating a New Card

1. Create a new directory in `src/cards/[card-name]/`
2. Create the required files:
   - `[card-name].ts`: Card implementation and Alpine.js component
   - `[card-name].html`: Card template
   - `[card-name].css`: Card-specific styles

Example card implementation:

```typescript
// src/cards/example/example.ts
import { Card, CardKvEntry, CardState } from "../cards.ts";

// Card-specific interfaces
export interface ExampleState extends CardState {
  message: string;
}

export interface ExampleKvEntry extends CardKvEntry {
  message: string;
}

// Card implementation
class ExampleCard extends Card<ExampleState, ExampleKvEntry> {
  // Card-specific methods
  public async loadCardMessages(): Promise<string[]> {
    await this.loadMessages();
    return this.messages;
  }
}

const exampleCard = new ExampleCard("example");

// Alpine.js component registration
document.addEventListener("alpine:init", () => {
  const component = {
    // Component implementation
    async init() {
      // Initialize with card
    },
  };

  globalThis.Alpine.data("exampleCard", () => component);
});

export default exampleCard;
```

Example template:

```html
<!-- src/cards/example/example.html -->
<div class="card example-card" x-data="exampleCard" x-init="init">
  <!-- Card template -->
</div>
```

## Server Endpoints

- Views: `GET /views/[view-name]`
- Cards: `GET /cards/[card-name]/template`
- KV Operations:
  - `POST /kv/get`
  - `POST /kv/set`
  - `GET /kv/watch`

## License

MIT
