# Cyber Framework

A real-time, hypermedia-driven web framework built with Deno, featuring WebSocket-powered live updates, AI-ready JSON APIs, and a modern cyberpunk aesthetic.

## Core Technology Stack

- 🦕 Deno 2.0.6
- 🔄 HTMX 2.0.3
- ⚡ Alpine.js 3.x
- 🗄️ Deno KV (unstable)
- 🌐 WebSockets
- 🔒 KV OAuth
- 🤖 AI-Ready JSON APIs

## Features

- 🚀 Real-time updates across all clients
- 💾 Persistent storage with Deno KV
- 🎨 TRON-inspired cyberpunk UI
- 🔌 WebSocket-based communication
- 🧩 Modular card-based architecture
- 🛠 Extensible framework for custom cards
- 🔐 Built-in OAuth security
- 🎯 Hypermedia-driven architecture
- 🤖 AI-accessible JSON endpoints

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

## Project Structure

```
/
├── db/                # Database layer
│   ├── core/         # Core KV operations
│   ├── client/       # Type-safe client APIs
│   └── router.ts     # Database request router
├── src/
│   ├── cards/        # Card components
│   │   ├── base-card.html  # Base card template
│   │   └── [card-name]/    # Card implementations
│   ├── middleware/   # Request middleware
│   ├── modals/       # Modal components
│   ├── views/        # View handlers
│   └── kv/           # KV utilities
├── public/           # Static assets
├── deno.json        # Config file
└── main.ts          # Entry point
```

## Database Layer

The framework uses Deno's native KV store with a simple, direct approach:

### 1. Basic Usage

```typescript
import { kv, type KvKey } from "./db/core/kv.ts";

// Type-safe key
const key: KvKey = ['users', userId];

// Basic operations
const user = await kv.get(key);
await kv.set(key, userData);
await kv.delete(key);
```

### 2. List Operations

```typescript
// List all users
const users = kv.list({ prefix: ['users'] });
for await (const user of users) {
  console.log(user.value);
}

// List with options
const recentUsers = kv.list({
  prefix: ['users'],
  start: ['users', Date.now() - 24 * 60 * 60 * 1000],
});
```

### 3. Atomic Operations

```typescript
// Atomic updates
await kv.atomic()
  .check({ key: ['users', userId], versionstamp: oldVersion })
  .set(['users', userId], newData)
  .commit();

// Multi-key transactions
await kv.atomic()
  .set(['users', userId], userData)
  .set(['sessions', sessionId], sessionData)
  .delete(['temp', tempId])
  .commit();
```

### 4. Real-time Updates

```typescript
// Watch for changes
const watcher = kv.watch([['users', userId]]);
for await (const change of watcher) {
  console.log('User data changed:', change);
}
```

### Key Structure Patterns

The framework uses these key patterns:

```typescript
// Collections
['users']                    // All users
['cards']                    // All cards
['sessions']                 // All sessions

// Resources
['users', userId]           // Specific user
['cards', cardId]          // Specific card

// Nested Data
['cards', cardId, 'messages']         // Card messages
['users', userId, 'preferences']      // User preferences

// Time-based
['sessions', Date.now(), sessionId]   // Time-indexed sessions
```

### Best Practices

1. **Type Safety**:
   ```typescript
   import { type KvKey } from "./db/core/kv.ts";
   
   function getUserData(userId: string): Promise<UserData | null> {
     const key: KvKey = ['users', userId];
     return kv.get(key);
   }
   ```

2. **Atomic Operations**:
   ```typescript
   // Always use atomic for multi-step operations
   await kv.atomic()
     .check(condition)
     .set(key, value)
     .commit();
   ```

3. **List Operations**:
   ```typescript
   // Use prefixes for efficient queries
   const iterator = kv.list({ prefix: ['users', '2024'] });
   ```

4. **Real-time Updates**:
   ```typescript
   // Use watch for real-time features
   const watcher = kv.watch([['live', 'updates']]);
   ```

## View Architecture

Views are managed through the ViewRouter:

```typescript
import { ViewRouter } from "./src/views/viewRouter.ts";

const router = new ViewRouter();
await router.registerView("home", import("./views/home/home.ts"));
```

## Card System

The framework uses a modular card system where each card type is self-contained and automatically loaded. Here's how to create a new card:

### 1. Create Card Structure

Create a new directory in `src/cards/` with your card name:

```
src/cards/my-card/
├── my-card.ts     # Router + Logic
├── my-card.html   # Template
└── my-card.css    # Styles
```

### 2. Implement Card Router

Create your router in `my-card.ts`:

```typescript
import { BaseCardRouter } from '../cardRouter.ts';
import * as kv from '../../../db/core/kv.ts';
import * as kvBroadcast from '../../ws/kvBroadcast.ts';

// Define your card's state
interface MyCardState {
  id: string;
  name: string;
  // Add card-specific fields
}

export class MyCardRouter extends BaseCardRouter {
  constructor(userId: string) {
    super('my-card', userId);
  }

  async getCards(): Promise<MyCardState[]> {
    const cards: MyCardState[] = [];
    const iterator = await kv.list(['cards', 'my-card', 'data']);
    
    for await (const entry of iterator) {
      // Transform KV data to card state
      cards.push({/*...*/});
    }
    return cards;
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

    // Handle base routes
    switch (path) {
      case 'list': return this.handleList();
      case 'create': return this.handleCreate(req);
      case 'delete': return this.handleDelete(req);
    }

    return new Response('Not Found', { status: 404 });
  }
}
```

### 3. Create Card Template

Create your template in `my-card.html`:

```html
<template id="my-card">
  <div class="card my-card" 
       x-data="{ 
         isFullscreen: false,
         toggleFullscreen() {
           this.isFullscreen = !this.isFullscreen;
         }
       }"
       :class="{ 'fullscreen': isFullscreen }">
    
    <div class="card-header">
      <h3 x-text="card.name"></h3>
      <button @click="toggleFullscreen">⤢</button>
    </div>

    <div class="card-content">
      <!-- Card-specific content -->
    </div>
  </div>
</template>
```

### 4. Add Card Styles

Create your styles in `my-card.css`:

```css
.my-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  height: 400px;
  transition: all 0.3s ease;
}

.my-card.fullscreen {
  position: fixed;
  inset: 1rem;
  z-index: 100;
  height: calc(100vh - 2rem);
}

/* Add card-specific styles */
```

### 5. Using Your Card

The card will be automatically loaded and available:

```typescript
// Client-side usage
const card = await cardData.myCard.createCard('My New Card');

// Server-side usage
const router = new CardRouter(userId);
await router.handleRequest(req);
```

### Card Requirements

1. **Router**:
   - Must extend BaseCardRouter
   - Must implement getCards() and handleRequest()
   - Should use KV for persistence
   - Should use broadcasts for real-time updates

2. **Template**:
   - Must use template tag with card-specific ID
   - Must support fullscreen mode
   - Should use Alpine.js for interactivity
   - Should use HTMX for server communication

3. **Styles**:
   - Must be scoped to card-specific class
   - Must support fullscreen mode
   - Should use framework CSS variables
   - Should follow cyberpunk theme

## Security

- OAuth 2.0 with PKCE flow
- Secure session management
- KV-based state verification
- Proper CORS configuration
- XSS protection
- CSRF protection

## Best Practices

- Use type-safe database clients
- Extend base card template
- Follow view router patterns
- Implement proper error handling
- Use TypeScript strict mode
- Follow OAuth security guidelines
- Expose JSON APIs for AI interaction

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
