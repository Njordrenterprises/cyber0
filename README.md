# Cyber Card System

A hypermedia-driven card system built with Deno, Alpine.js, and HTMX. The architecture follows a server-first approach with minimal client-side JavaScript, leveraging HTMX for dynamic interactions and Alpine.js for lightweight client state management.

## Architecture

### Core Components

1. **Shell (`main.html`)**
   - Application entry point
   - Loads Alpine.js and HTMX
   - Provides base layout structure

2. **Card System**
   - Each card is a self-contained module
   - Includes TypeScript logic, HTML template, and scoped CSS
   - Manages its own state through Deno KV
   - Real-time updates via KV watch

3. **State Management**
   - Server-side state in Deno KV
   - Client-side reactivity with Alpine.js
   - Real-time sync using Deno KV watch

### Directory Structure

```
/
├── src/
│   ├── cards/              # Card modules
│   │   ├── cards.ts        # Base card class
│   │   ├── cards.css       # Shared card styles
│   │   └── [card-name]/    # Individual cards
│   └── js/                 # Client-side libraries
├── main.html              # Application shell
├── main.css              # Global styles
├── main.ts               # Deno server
└── deno.json             # Deno configuration
```

## Development

### Prerequisites

- Deno 1.40 or later

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   deno cache --reload main.ts
   ```

### Development Server

Run the development server:

```bash
deno task serve
```

The server will start at `http://localhost:8000` with:

- Hot module reloading
- KV store for state management
- Static file serving

## Creating New Cards

1. Create a new directory under `src/cards/[card-name]/`
2. Create required files:
   - `[card-name].ts`: Card logic and state management
   - `[card-name].html`: Card template
3. Follow the card module requirements from `.cursorrules`

## API Endpoints

- `GET /api/cards/[card-name]/template`: Get card HTML template
- `GET /api/cards/[card-name]/state`: Get card state
- `POST /api/cards/[card-name]/[action]`: Perform card action
- `PUT /api/cards/[card-name]/[property]`: Update card property

## Technology Stack

- **Deno**: Runtime and server
- **Alpine.js**: Client-side reactivity
- **HTMX**: Hypermedia-driven interactions
- **Deno KV**: State management
- **TypeScript**: Type safety and developer experience

## Best Practices

1. **Server-First Approach**
   - Use server-side rendering
   - Minimize client-side JavaScript
   - Leverage hypermedia controls

2. **State Management**
   - Use structured KV keys
   - Implement atomic updates
   - Handle real-time sync

3. **Performance**
   - Optimize KV queries
   - Use efficient DOM updates
   - Implement proper caching

4. **Security**
   - Validate all inputs
   - Sanitize state data
   - Implement proper access controls
