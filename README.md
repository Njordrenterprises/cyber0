# Cyber0 Development Rules

## Core Technology Stack
- Runtime: Deno 2.0.6
- Features: Deno KV
- Core Libraries:
  - HTMX: 2.0.3
  - Alpine.js: 3.x

## System Role
You are an expert Deno developer specializing in hypermedia-driven applications using HTMX, Alpine.js, and Deno KV for secure state management.

## Core Principles
- Write concise, native Deno TypeScript code
- Use hypermedia patterns over client-side JavaScript
- Maintain locality of behavior in components
- Leverage Deno KV for data persistence and session management
- Implement security best practices by default
- Use HTMX for dynamic updates
- Use Alpine.js for lightweight interactivity

## Project Structure
/
├── db/                # Database layer
│   ├── core/         # Core KV operations
│   ├── client/       # Type-safe client APIs
│   └── types.ts      # Shared type definitions
├── src/
│   ├── cards/        # Card components
│   │   ├── base/     # Base card functionality
│   │   ├── info/     # Info card implementation
│   │   └── message/  # Message card implementation
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

## Card System Architecture
Each card type must:
- Have its own directory
- Implement required interfaces
- Support both human and AI interaction
- Handle commands and events
- Support plugins
- Manage resources

### Card Directory Structure
```
src/cards/[type]/
├── [type].ts     # Router + Client script
├── [type].html   # Template
└── [type].css    # Styles
```

### Card Requirements
1. Router must:
   - Extend BaseCardRouter
   - Implement required interfaces
   - Support both human and AI APIs
   - Handle commands and events
   - Support plugin system
   - Handle nested cards

2. Template must:
   - Use semantic HTML
   - Support HTMX updates
   - Use Alpine.js for interactivity
   - Support fullscreen mode
   - Handle both human and AI content
   - Support nested card views

3. Styles must:
   - Be scoped to card
   - Support themes
   - Use CSS variables
   - Handle responsive design
   - Support fullscreen mode
   - Handle nested card layouts

## Nested Card System
All cards must:
- Support being nested within info cards
- Maintain parent-child relationships
- Support reordering within parent
- Handle relationship types
- Track nested card metadata
- Support moving between parents

### Nested Card Operations
1. Attach:
   - Validate parent and child exist
   - Check permissions
   - Set relationship type
   - Update both cards atomically

2. Detach:
   - Validate relationship exists
   - Check permissions
   - Remove relationship
   - Update both cards atomically

3. Move:
   - Validate source and target parents
   - Check permissions
   - Maintain relationship type
   - Update all cards atomically

4. Reorder:
   - Validate parent and child
   - Check permissions
   - Update positions atomically
   - Maintain relationships

## Plugin System
Plugins must:
- Implement CardPlugin interface
- Handle lifecycle events
- Support state management
- Manage resources
- Handle commands

## Command System
Commands must:
- Be type-safe
- Support validation
- Handle permissions
- Support metadata
- Work for both humans and AIs

## Event System
Events must:
- Be type-safe
- Support filtering
- Maintain history
- Validate data
- Track actors

## Development Rules
- Use native Deno APIs over third-party modules
- If native Deno won't work, use hono from jsr
- Co-locate related code in components
- Use KV for persistence
- Implement proper security
- Write self-documenting code
- Keep components focused
- Ensure type safety
- Include error handling
- Write performant code

## IDE Settings
- Quotes: single
- Indent: 2
- Max Line Length: 80
- TypeScript:
  - strict: true
  - noImplicitAny: true

## Naming Conventions
- Components: PascalCase
- Pages: camelCase
- API: kebab-case
- Styles: kebab-case

## File Extensions
- TypeScript: .ts
- Styles: .css
- Templates: .html

## Development Commands
```json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-read server.ts",
    "start": "deno run --allow-net --allow-read server.ts",
    "test": "deno test --allow-net --allow-read",
    "test:cards": "deno test --allow-net tests/ai/curlCards.ts",
    "test:messages": "deno test --allow-net tests/ai/message_test.ts",
    "test:nested": "deno test --allow-net tests/ai/nested_cards_test.ts",
    "test:all": "deno test --allow-net tests/ai/",
    "kill": "./scripts/kill_deno.sh"
  }
}
```

## Prohibited Practices
- Build steps or bundlers
- Client-side routing
- Complex state management
- External dependencies when Deno stdlib suffices
- Framework abstractions
- jQuery or similar libraries
- Custom session implementations
- Manual OAuth flows
- Client-side OAuth state management
- Session storage outside of KV
- Modifying main.ts for card routing
- Direct KV access (use db/client APIs)
- Manual template loading
- Inline styles
- Direct WebSocket handling

## Documentation Requirements
- Clear component documentation
- Type definitions
- Security considerations
- Usage examples
- API documentation
