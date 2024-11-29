# Cyber Card System

A hypermedia-driven card system built with Deno, HTMX, and Alpine.js.

## Architecture

The system follows a card-based architecture where each card is a self-contained module with three required files:

- HTML template with HTMX and Alpine.js bindings
- CSS for card-specific styling
- JavaScript for Alpine.js component logic

### Key Features

- Server-side dynamic loading of card modules
- Real-time updates via EventSource
- Persistent storage with Deno KV
- Minimal client-side JavaScript

## Project Structure

```
/
├── src/
│   ├── cards/              # Card modules
│   │   ├── cards.js        # Base card functionality
│   │   ├── cards.css       # Shared card styles
│   │   └── info/           # Example card
│   │       ├── info.js     # Card logic
│   │       ├── info.css    # Card styles
│   │       └── info.html   # Card template
│   ├── js/                 # Client libraries
│   │   ├── htmx.min.js
│   │   └── alpine.min.js
│   └── views/              # View templates
├── main.ts                 # Server + routing
├── main.css               # Global styles
└── index.html            # Application shell
```

## Development Standards

### Card Module Requirements

Every card MUST include all three files:

1. `[name].html` - Template and bindings
2. `[name].css` - Card-specific styles
3. `[name].js` - Component logic

The server automatically bundles these files together when serving card templates.

### State Management

- Persistent state stored in Deno KV
- UI state managed by Alpine.js
- Real-time updates via EventSource
- Standard KV operations through REST endpoints

### Server Features

- Dynamic loading of views and cards
- Automatic bundling of card files
- KV operations via standard endpoints
- Static file serving for libraries

## Getting Started

1. Install Deno
2. Clone the repository
3. Run the development server:
   ```bash
   deno task dev
   ```

## Creating a New Card

1. Create a new directory in `src/cards/[card-name]/`
2. Add all three required files:
   - `[card-name].html`
   - `[card-name].css`
   - `[card-name].js`
3. Follow the existing card patterns for:
   - HTMX attributes
   - Alpine.js bindings
   - KV operations

## API Endpoints

### Views

- `GET /views/[name]` - Load a view template

### Cards

- `GET /cards/[name]/template` - Load a card template

### KV Operations

- `GET /kv/get` - Retrieve KV data
- `POST /kv/set` - Update KV data
- `GET /kv/watch` - Watch KV changes
