# Cyber Card System

A hypermedia-driven card system built with Deno, HTMX, and Alpine.js.

## Architecture

The system follows a modular card-based architecture where each card is a self-contained component with:

1. Server-side TypeScript class extending base `Card`
2. Client-side Alpine.js component
3. Scoped CSS styles
4. Shared TypeScript interfaces
5. Cross-platform data access

### Key Components

- `db/card.ts` - Base card class with KV operations
- `db/kv.ts` - Centralized KV store management
- `db/client/types.ts` - Shared TypeScript interfaces and cross-platform helpers
- `db/client/[card-name].ts` - Client-side card methods

## Cross-Platform Data Access

The system uses a unified approach to handle both browser (Alpine.js) and Deno contexts:

```typescript
// Types that work in both environments
declare global {
  interface Window extends Record<string, unknown> {
    cardData: CardData;
  }
  var cardData: CardData;
}

// Helper to access cardData consistently
export const getCardData = (): CardData => {
  if (typeof window !== "undefined") {
    return (window as Window).cardData;
  }
  return globalThis.cardData;
};
```

## Creating a New Card

1. Create the card directory:
   ```bash
   mkdir -p src/cards/[card-name]
   ```

2. Create the server-side card class (`src/cards/[card-name]/[card-name].ts`):
   ```typescript
   import { Card, CardKvEntry, CardState } from "../cards.ts";

   export interface MyCardState extends CardState {
     // Card-specific state
   }

   export interface MyCardKvEntry extends CardKvEntry {
     // Card-specific KV data
   }

   class MyCard extends Card<MyCardState, MyCardKvEntry> {
     protected override async loadInitialState(): Promise<void> {
       const entry = await this.getKvEntry();
       if (entry) {
         // Initialize from KV
       }
     }

     override getState(): MyCardState {
       return {
         ...super.getState(),
         // Return card state
       };
     }

     protected override getKvKey(): Deno.KvKey {
       return ["cards", this.id, this.userId];
     }

     getAlpineMethods() {
       return {
         // Expose methods for client
       };
     }
   }

   const myCard = new MyCard("my-card");
   export default myCard;
   ```

3. Create the client-side methods (`db/client/[card-name].ts`):
   ```typescript
   import type { MyCardMethods } from "./types.ts";
   import { getCardData } from "./types.ts";

   export function getMyCardMethods(): MyCardMethods {
     return {
       kv: {
         get: async <T>(key: unknown[]) => {
           const response = await fetch(`/kv/get?key=${key.join(",")}`);
           return await response.json() as T | null;
         },
         set: async (key: unknown[], value: unknown) => {
           await fetch("/kv/set", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ key: key.join(","), value }),
           });
         },
       },
       // Card-specific methods using getCardData()
     };
   }

   export function getMyCardScript(): string {
     return `
       globalThis.cardData = globalThis.cardData || {};
       globalThis.cardData.myCard = globalThis.cardData.myCard || ${
       JSON.stringify(getMyCardMethods())
     };
     `;
   }
   ```

4. Create the HTML template (`src/cards/[card-name]/[card-name].html`):
   ```html
   <div
     class="card my-card"
     x-data="{ 
          cardData: window.cardData.myCard,
          async init() {
            // Initialize card
          }
        }"
     x-init="init"
   >
     <!-- Card content -->
   </div>
   ```

5. Create the CSS styles (`src/cards/[card-name]/[card-name].css`):
   ```css
   .my-card {
     /* Card-specific styles */
   }
   ```

## Card API

Each card exposes a standard API through `window.cardData.[cardName]` in the browser and `globalThis.cardData.[cardName]` in Deno:

```typescript
interface CardData {
  kv: {
    get: <T>(key: unknown[]) => Promise<T | null>;
    set: (key: unknown[], value: unknown) => Promise<void>;
  };
  // Card-specific methods
}

// Access in TypeScript:
const cardData = getCardData();
await cardData.myCard.someMethod();

// Access in HTML template:
x-data="{ cardData: window.cardData.myCard }"
```

## Development Standards

1. Type Safety
   - All card state must be typed
   - Use shared interfaces from `db/client/types.ts`
   - Validate all data operations
   - Use proper Window/globalThis types

2. State Management
   - Server is source of truth
   - Use KV for persistence
   - Use Alpine.js for UI state
   - Use getCardData() in TypeScript

3. Styling
   - Use scoped class names
   - Follow CSS custom properties
   - Maintain responsive design

## Example Cards

### Info Card

A simple message board card that demonstrates:

- KV persistence
- Real-time updates
- Message CRUD operations
- Responsive design
- Cross-platform data access

See `src/cards/info` for implementation details.
