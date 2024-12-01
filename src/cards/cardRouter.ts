import { 
  BaseCard, 
  CardAuthor, 
  CardRelationship,
  NestedCard,
  CardOperations
} from '../../db/client/types.ts';
import { kv, KvKey } from '../../db/core/kv.ts';

/**
 * Base router class for handling card operations.
 * Implements the CardOperations interface for core card functionality.
 */
export class BaseCardRouter implements CardOperations {
  protected cardType: string;
  protected user: CardAuthor;

  constructor(cardType: string, user: CardAuthor) {
    this.cardType = cardType;
    this.user = user;
  }

  protected getCardKey(cardId: string): KvKey {
    return ['cards', this.cardType, 'data', cardId].map(String);
  }

  /**
   * Creates a new card with the given name.
   * @param name The name of the card to create
   * @returns The created card
   */
  async createCard(name: string): Promise<BaseCard> {
    const cardId = crypto.randomUUID();
    const now = Date.now();

    const card: BaseCard = {
      id: cardId,
      name,
      type: this.cardType,
      created: now,
      lastUpdated: now,
      createdBy: this.user,
      content: {},
      metadata: {
        version: '1.0.0',
        permissions: {
          canView: ['human', 'ai'],
          canEdit: [this.user.id],
          canDelete: [this.user.id]
        },
        nestedCards: []
      }
    };

    const key = this.getCardKey(cardId);
    await kv.set(key, card);

    return card;
  }

  /**
   * Creates a new card with custom content.
   * @param data The card data including name and optional content
   * @returns The created card
   */
  protected async createCardWithContent(data: { name: string; content?: unknown }): Promise<BaseCard> {
    const card = await this.createCard(data.name);
    if (data.content) {
      const key = this.getCardKey(card.id);
      const entry = await kv.get<BaseCard>(key);
      if (entry?.value) {
        const updatedCard = {
          ...entry.value,
          content: data.content,
          lastUpdated: Date.now()
        };
        await kv.set(key, updatedCard);
        return updatedCard;
      }
    }
    return card;
  }

  /**
   * Updates a card with new data.
   * @param cardId The ID of the card to update
   * @param data The new card data
   * @returns The updated card
   * @throws Error if card not found or permission denied
   */
  protected async updateCard(cardId: string, data: { content?: unknown }): Promise<BaseCard> {
    const key = this.getCardKey(cardId);
    const entry = await kv.get<BaseCard>(key);

    if (!entry?.value) {
      throw new Error('Card not found');
    }

    if (!entry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    const updatedCard = {
      ...entry.value,
      content: {
        ...entry.value.content,
        ...data.content
      },
      lastUpdated: Date.now()
    };

    await kv.set(key, updatedCard);
    return updatedCard;
  }

  /**
   * Gets a card by ID.
   * @param cardId The ID of the card to get
   * @returns The requested card
   * @throws Error if card not found or permission denied
   */
  async getCard(cardId: string): Promise<BaseCard> {
    const key = this.getCardKey(cardId);
    const entry = await kv.get<BaseCard>(key);

    if (!entry?.value) {
      throw new Error('Card not found');
    }

    if (!entry.value.metadata.permissions.canView.includes(this.user.type)) {
      throw new Error('Permission denied');
    }

    return entry.value;
  }

  /**
   * Gets all cards the user has permission to view.
   * @returns Array of cards
   */
  async getCards(): Promise<BaseCard[]> {
    const cards: BaseCard[] = [];
    const prefix = ['cards', this.cardType, 'data'].map(String);
    const iter = kv.list<BaseCard>({ prefix });

    for await (const entry of iter) {
      if (entry.value && entry.value.metadata.permissions.canView.includes(this.user.type)) {
        cards.push(entry.value);
      }
    }

    return cards;
  }

  /**
   * Deletes a card by ID.
   * @param cardId The ID of the card to delete
   * @throws Error if card not found or permission denied
   */
  async deleteCard(cardId: string): Promise<void> {
    const key = this.getCardKey(cardId);
    const entry = await kv.get<BaseCard>(key);

    if (!entry?.value) {
      throw new Error('Card not found');
    }

    if (!entry.value.metadata.permissions.canDelete.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    await kv.delete(key);
  }

  /**
   * Attaches a card as a nested card to a parent card.
   * @param parentId The ID of the parent card
   * @param childId The ID of the child card to attach
   * @param relationship The type of relationship between the cards
   * @throws Error if cards not found or permission denied
   */
  async attachCard(parentId: string, childId: string, relationship: CardRelationship): Promise<void> {
    const parentKey = this.getCardKey(parentId);
    const childKey = this.getCardKey(childId);

    const [parentEntry, childEntry] = await Promise.all([
      kv.get<BaseCard>(parentKey),
      kv.get<BaseCard>(childKey)
    ]);

    if (!parentEntry?.value || !childEntry?.value) {
      throw new Error('Parent or child card not found');
    }

    if (!parentEntry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    const nestedCard: NestedCard = {
      id: childId,
      type: childEntry.value.type,
      relationship,
      addedAt: Date.now(),
      addedBy: this.user
    };

    const updatedParent = {
      ...parentEntry.value,
      lastUpdated: Date.now(),
      metadata: {
        ...parentEntry.value.metadata,
        nestedCards: [
          ...(parentEntry.value.metadata.nestedCards || []),
          nestedCard
        ]
      }
    };

    const updatedChild = {
      ...childEntry.value,
      lastUpdated: Date.now(),
      parentCard: {
        id: parentId,
        type: parentEntry.value.type,
        relationship
      }
    };

    await kv.atomic()
      .check(parentEntry)
      .check(childEntry)
      .set(parentKey, updatedParent)
      .set(childKey, updatedChild)
      .commit();
  }

  /**
   * Detaches a nested card from its parent.
   * @param parentId The ID of the parent card
   * @param childId The ID of the child card to detach
   * @throws Error if cards not found or permission denied
   */
  async detachCard(parentId: string, childId: string): Promise<void> {
    const parentKey = this.getCardKey(parentId);
    const childKey = this.getCardKey(childId);

    const [parentEntry, childEntry] = await Promise.all([
      kv.get<BaseCard>(parentKey),
      kv.get<BaseCard>(childKey)
    ]);

    if (!parentEntry?.value || !childEntry?.value) {
      throw new Error('Parent or child card not found');
    }

    if (!parentEntry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    const updatedParent = {
      ...parentEntry.value,
      lastUpdated: Date.now(),
      metadata: {
        ...parentEntry.value.metadata,
        nestedCards: parentEntry.value.metadata.nestedCards?.filter(
          nested => nested.id !== childId
        ) || []
      }
    };

    const updatedChild = {
      ...childEntry.value,
      lastUpdated: Date.now(),
      parentCard: undefined
    };

    await kv.atomic()
      .check(parentEntry)
      .check(childEntry)
      .set(parentKey, updatedParent)
      .set(childKey, updatedChild)
      .commit();
  }

  /**
   * Moves a nested card from one parent to another.
   * @param cardId The ID of the card to move
   * @param fromParentId The ID of the current parent card
   * @param toParentId The ID of the new parent card
   * @throws Error if cards not found or permission denied
   */
  async moveCard(cardId: string, fromParentId: string, toParentId: string): Promise<void> {
    const [cardKey, fromKey, toKey] = [
      this.getCardKey(cardId),
      this.getCardKey(fromParentId),
      this.getCardKey(toParentId)
    ];

    const [cardEntry, fromEntry, toEntry] = await Promise.all([
      kv.get<BaseCard>(cardKey),
      kv.get<BaseCard>(fromKey),
      kv.get<BaseCard>(toKey)
    ]);

    if (!cardEntry?.value || !fromEntry?.value || !toEntry?.value) {
      throw new Error('One or more cards not found');
    }

    if (!fromEntry.value.metadata.permissions.canEdit.includes(this.user.id) ||
        !toEntry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    const nestedCard = fromEntry.value.metadata.nestedCards?.find(
      nested => nested.id === cardId
    );

    if (!nestedCard) {
      throw new Error('Card is not nested in the source parent');
    }

    const updatedFrom = {
      ...fromEntry.value,
      lastUpdated: Date.now(),
      metadata: {
        ...fromEntry.value.metadata,
        nestedCards: fromEntry.value.metadata.nestedCards?.filter(
          nested => nested.id !== cardId
        ) || []
      }
    };

    const updatedTo = {
      ...toEntry.value,
      lastUpdated: Date.now(),
      metadata: {
        ...toEntry.value.metadata,
        nestedCards: [
          ...(toEntry.value.metadata.nestedCards || []),
          nestedCard
        ]
      }
    };

    const updatedCard = {
      ...cardEntry.value,
      lastUpdated: Date.now(),
      parentCard: {
        id: toParentId,
        type: toEntry.value.type,
        relationship: nestedCard.relationship
      }
    };

    await kv.atomic()
      .check(cardEntry)
      .check(fromEntry)
      .check(toEntry)
      .set(cardKey, updatedCard)
      .set(fromKey, updatedFrom)
      .set(toKey, updatedTo)
      .commit();
  }

  /**
   * Reorders a nested card within its parent.
   * @param parentId The ID of the parent card
   * @param cardId The ID of the card to reorder
   * @param newPosition The new position for the card
   * @throws Error if cards not found or permission denied
   */
  async reorderCard(parentId: string, cardId: string, newPosition: number): Promise<void> {
    const parentKey = this.getCardKey(parentId);
    const parentEntry = await kv.get<BaseCard>(parentKey);

    if (!parentEntry?.value) {
      throw new Error('Parent card not found');
    }

    if (!parentEntry.value.metadata.permissions.canEdit.includes(this.user.id)) {
      throw new Error('Permission denied');
    }

    const nestedCards = parentEntry.value.metadata.nestedCards || [];
    const cardIndex = nestedCards.findIndex(nested => nested.id === cardId);

    if (cardIndex === -1) {
      throw new Error('Card not found in parent');
    }

    const [card] = nestedCards.splice(cardIndex, 1);
    nestedCards.splice(newPosition, 0, card);

    const updatedParent = {
      ...parentEntry.value,
      lastUpdated: Date.now(),
      metadata: {
        ...parentEntry.value.metadata,
        nestedCards
      }
    };

    await kv.atomic()
      .check(parentEntry)
      .set(parentKey, updatedParent)
      .commit();
  }

  /**
   * Gets all nested cards for a given card, optionally filtered by relationship type.
   * @param cardId The ID of the parent card
   * @param relationship Optional relationship type to filter by
   * @returns Array of nested cards
   * @throws Error if card not found
   */
  async getNestedCards(cardId: string, relationship?: CardRelationship): Promise<BaseCard[]> {
    const key = ['cards', this.cardType, 'data', cardId];
    const entry = await kv.get<BaseCard>(key);

    if (!entry?.value) {
      throw new Error('Card not found');
    }

    const nestedCards = entry.value.metadata.nestedCards || [];
    const filteredCards = relationship 
      ? nestedCards.filter(nested => nested.relationship === relationship)
      : nestedCards;

    // Load all nested cards
    const cards = await Promise.all(
      filteredCards.map(async nested => {
        const cardKey = ['cards', nested.type, 'data', nested.id];
        const cardEntry = await kv.get<BaseCard>(cardKey);
        return cardEntry?.value;
      })
    );

    return cards.filter((card): card is BaseCard => card !== undefined)
      .sort((a, b) => {
        const posA = nestedCards.find(n => n.id === a.id)?.position || 0;
        const posB = nestedCards.find(n => n.id === b.id)?.position || 0;
        return posA - posB;
      });
  }

  /**
   * Handles HTTP requests for card operations.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  async handleRequest(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(`/cards/${this.cardType}/`, '');

      // Extract user from query parameters for GET requests
      if (req.method === 'GET') {
        const userParam = url.searchParams.get('user');
        if (userParam) {
          try {
            this.user = JSON.parse(decodeURIComponent(userParam));
          } catch (error) {
            console.error('Error parsing user from query parameters:', error);
          }
        }
      }
      // Extract user from request body for POST/PUT requests
      else if (req.method === 'POST' || req.method === 'PUT') {
        const clonedReq = req.clone();
        const data = await clonedReq.json();
        if (data.user) {
          this.user = data.user;
        }
      }

      // Handle nested card operations
      if (path.startsWith('nested/')) {
        return await this.handleNestedOperation(req);
      }

      // Handle core operations
      return await this.handleCoreOperation(req, path);
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
        status: error instanceof Error && error.message === 'Card not found' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles core card operations.
   * @param req The incoming HTTP request
   * @param path The request path
   * @returns HTTP response
   */
  protected async handleCoreOperation(req: Request, path: string): Promise<Response> {
    try {
      switch (req.method) {
        case 'GET':
          if (path === '') {
            return new Response(JSON.stringify(await this.getCards()), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify(await this.getCard(path)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        case 'POST':
          const data = await req.json();
          const card = await this.createCardWithContent(data);
          return new Response(JSON.stringify(card), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        case 'PUT':
          const updateData = await req.json();
          const cardId = path;
          const updatedCard = await this.updateCard(cardId, updateData);
          return new Response(JSON.stringify(updatedCard), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        case 'DELETE':
          await this.deleteCard(path);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        default:
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Error handling core operation:', error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
        status: error instanceof Error && error.message === 'Card not found' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles nested card operations.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleNestedOperation(req: Request): Promise<Response> {
    try {
      const path = new URL(req.url).pathname;
      const operation = path.split('/').pop();

      switch (operation) {
        case 'attach':
          return await this.handleAttachCard(req);
        case 'detach':
          return await this.handleDetachCard(req);
        case 'move':
          return await this.handleMoveCard(req);
        case 'reorder':
          return await this.handleReorderCard(req);
        case 'nested':
          const cardId = path.split('/')[path.split('/').length - 2];
          return await this.handleGetNestedCards(cardId, req);
        default:
          return new Response(JSON.stringify({ error: 'Invalid operation' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Error handling nested operation:', error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
        status: error instanceof Error && error.message === 'Card not found' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles attaching a card to a parent.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleAttachCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, childId, relationship, user } = data;

      if (user) {
        this.user = user;
      }

      if (!parentId || !childId || !relationship) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.attachCard(parentId, childId, relationship as CardRelationship);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Parent or child card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error attaching card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles detaching a card from its parent.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleDetachCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, childId, user } = data;

      if (user) {
        this.user = user;
      }

      if (!parentId || !childId) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.detachCard(parentId, childId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Parent or child card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error detaching card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles moving a card to a new parent.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleMoveCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { cardId, fromParentId, toParentId, user } = data;

      if (user) {
        this.user = user;
      }

      if (!cardId || !fromParentId || !toParentId) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.moveCard(cardId, fromParentId, toParentId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error moving card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles reordering a card within its parent.
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleReorderCard(req: Request): Promise<Response> {
    try {
      const data = await req.json();
      const { parentId, cardId, newPosition, user } = data;

      if (user) {
        this.user = user;
      }

      if (!parentId || !cardId || typeof newPosition !== 'number') {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.reorderCard(parentId, cardId, newPosition);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error reordering card:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handles getting nested cards for a parent.
   * @param cardId The ID of the parent card
   * @param req The incoming HTTP request
   * @returns HTTP response
   */
  protected async handleGetNestedCards(cardId: string, req: Request): Promise<Response> {
    try {
      const card = await this.getCard(cardId);
      const nestedCards = card.metadata.nestedCards || [];

      return new Response(JSON.stringify(nestedCards), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Card not found') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error getting nested cards:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
} 