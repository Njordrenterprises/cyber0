# Cyber0: AI-Human Card System

A hypermedia-driven card system enabling seamless interaction between humans and AIs.

## Core Technology Stack
- Runtime: Deno 2.0.6
- Features: kv --unstable
- Core Libraries:
  - HTMX: 2.0.3
  - Alpine.js: 3.x

## Architecture Overview

### Card System
- Self-contained card components
- Unified API for human and AI interaction
- Plugin system for extensibility
- Command system for programmatic control
- Real-time event system
- Resource management

### Authentication
- Session-based authentication
- PKCE flow for security
- KV-based session storage
- Proper session cleanup

### Data Storage
- Deno KV for persistence
- Real-time updates via WebSocket
- IPFS integration (planned)
- Proper type safety

## Project Structure
```
/
├── db/                # Database layer
│   ├── core/         # Core KV operations
│   ├── client/       # Type-safe client APIs
│   └── types.ts      # Shared type definitions
├── src/
│   ├── cards/        # Card components
│   │   ├── base/     # Base card functionality
│   │   └── [type]/   # Card type implementations
│   ├── plugins/      # Plugin system
│   ├── commands/     # Command handlers
│   ├── events/       # Event system
│   ├── views/        # View handlers
│   └── services/     # Core services
├── tests/
│   └── ai/           # AI interaction tests
├── public/           # Static assets
├── deno.json        # Config file
└── main.ts          # Entry point
```

## Core Features

### Card System
- Create and manage cards
- Send and receive messages
- Execute commands
- Handle events
- Manage resources
- Plugin support

### Plugin System
- Lifecycle hooks
- Event handlers
- State management
- Resource management
- Command handling

### Command System
- Execute commands
- Handle arguments
- Manage permissions
- Support metadata
- AI-specific commands

### Event System
- Real-time updates
- Event filtering
- Event history
- Event validation
- Actor tracking

### User System
- Human and AI users
- Capability management
- Preference handling
- Session management
- Activity tracking

## API Structure

### Card API
```typescript
interface CardAPI {
  // Core operations
  create(definition: CardDefinition): Promise<BaseCard>;
  delete(cardId: string): Promise<boolean>;
  update(cardId: string, content: unknown): Promise<BaseCard>;
  
  // Message handling
  sendMessage(cardId: string, message: Partial<CardMessage>): Promise<CardMessage>;
  getMessages(cardId: string, options?: { limit?: number; before?: number }): Promise<CardMessage[]>;
  
  // Command handling
  executeCommand(command: CardCommand): Promise<CardResponse>;
  
  // Event handling
  subscribe(cardId: string, handler: (event: CardEvent) => void): () => void;
  unsubscribe(cardId: string): void;
  
  // Metadata
  getDefinition(cardType: string): Promise<CardDefinition>;
  getCapabilities(cardId: string): Promise<CardDefinition['capabilities']>;
}
```

### Plugin API
```typescript
interface PluginAPI extends CardAPI {
  // Plugin operations
  register(plugin: CardPlugin): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  
  // State management
  getState(): Promise<unknown>;
  setState(state: unknown): Promise<void>;
  
  // Resource management
  getResource(path: string): Promise<unknown>;
  setResource(path: string, data: unknown): Promise<void>;
}
```

## Development

### Setup
```bash
# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# Clone repository
git clone https://github.com/yourusername/cyber0.git
cd cyber0

# Run development server
deno task dev
```

### Testing
```bash
# Run all tests
deno test

# Run specific test suite
deno test tests/ai/card_test.ts
```

### Creating a New Card Type
1. Create directory: `src/cards/[type]/`
2. Implement required files:
   - `[type].ts`: Router implementation
   - `[type].html`: Card template
   - `[type].css`: Card styles
3. Register in `src/cards/cardManager.ts`

### Creating a Plugin
1. Implement the `CardPlugin` interface
2. Register using the Plugin API
3. Handle lifecycle events
4. Implement command handlers

## Security
- Session-based authentication
- PKCE flow for OAuth
- Proper CORS settings
- Rate limiting
- Input validation
- Type safety

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT
