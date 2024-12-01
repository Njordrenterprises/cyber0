import { assertEquals, assertExists } from 'jsr:@std/assert@^0.218.2';
import { beforeEach, describe, it } from 'jsr:@std/testing@^0.218.2/bdd';
import { kv } from '../db/core/kv.ts';
import { CardAuthor } from '../db/client/types.ts';

const TEST_USER: CardAuthor = {
  id: 'test-user-1',
  username: 'Test User',
  type: 'human',
  color: '#ff0000',
  sprite: 'default'
};

describe('Nested Card Operations', () => {
  let parentId: string;
  let childId: string;
  let targetId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    const iter = kv.list({ prefix: ['cards'] });
    for await (const entry of iter) {
      await kv.delete(entry.key);
    }

    // Create test cards
    const response = await fetch('http://localhost:8000/cards/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Parent Card',
        user: TEST_USER,
        content: { text: 'Parent card content' }
      })
    });

    assertEquals(response.status, 200);
    const parent = await response.json();
    parentId = parent.id;

    const childResponse = await fetch('http://localhost:8000/cards/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Child Card',
        user: TEST_USER,
        content: { text: 'Child card content' }
      })
    });

    assertEquals(childResponse.status, 200);
    const child = await childResponse.json();
    childId = child.id;

    const targetResponse = await fetch('http://localhost:8000/cards/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Target Card',
        user: TEST_USER,
        content: { text: 'Target card content' }
      })
    });

    assertEquals(targetResponse.status, 200);
    const target = await targetResponse.json();
    targetId = target.id;
  });

  it('should attach a card as a thread', async () => {
    const response = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(response.status, 200);

    // Verify parent card has nested card
    const parentResponse = await fetch(`http://localhost:8000/cards/info/${parentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(parentResponse.status, 200);
    const parent = await parentResponse.json();
    assertExists(parent.metadata.nestedCards);
    assertEquals(parent.metadata.nestedCards.length, 1);
    assertEquals(parent.metadata.nestedCards[0].id, childId);
    assertEquals(parent.metadata.nestedCards[0].relationship, 'thread');

    // Verify child card has parent reference
    const childResponse = await fetch(`http://localhost:8000/cards/info/${childId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(childResponse.status, 200);
    const child = await childResponse.json();
    assertExists(child.parentCard);
    assertEquals(child.parentCard.id, parentId);
    assertEquals(child.parentCard.relationship, 'thread');
  });

  it('should detach a nested card', async () => {
    // First attach the card
    const attachResponse = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(attachResponse.status, 200);

    // Then detach it
    const response = await fetch(`http://localhost:8000/cards/info/nested/detach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        user: TEST_USER
      })
    });

    assertEquals(response.status, 200);

    // Verify parent card no longer has nested card
    const parentResponse = await fetch(`http://localhost:8000/cards/info/${parentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(parentResponse.status, 200);
    const parent = await parentResponse.json();
    assertEquals(parent.metadata.nestedCards?.length || 0, 0);

    // Verify child card no longer has parent reference
    const childResponse = await fetch(`http://localhost:8000/cards/info/${childId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(childResponse.status, 200);
    const child = await childResponse.json();
    assertEquals(child.parentCard, undefined);
  });

  it('should move a nested card to another parent', async () => {
    // First attach the card to original parent
    const attachResponse = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(attachResponse.status, 200);

    // Then move it to target parent
    const response = await fetch(`http://localhost:8000/cards/info/nested/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId: childId,
        fromParentId: parentId,
        toParentId: targetId,
        user: TEST_USER
      })
    });

    assertEquals(response.status, 200);

    // Verify original parent no longer has nested card
    const parentResponse = await fetch(`http://localhost:8000/cards/info/${parentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(parentResponse.status, 200);
    const parent = await parentResponse.json();
    assertEquals(parent.metadata.nestedCards?.length || 0, 0);

    // Verify target parent has nested card
    const targetResponse = await fetch(`http://localhost:8000/cards/info/${targetId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(targetResponse.status, 200);
    const target = await targetResponse.json();
    assertExists(target.metadata.nestedCards);
    assertEquals(target.metadata.nestedCards.length, 1);
    assertEquals(target.metadata.nestedCards[0].id, childId);

    // Verify child card has updated parent reference
    const childResponse = await fetch(`http://localhost:8000/cards/info/${childId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(childResponse.status, 200);
    const child = await childResponse.json();
    assertExists(child.parentCard);
    assertEquals(child.parentCard.id, targetId);
  });

  it('should reorder nested cards', async () => {
    // Create another child card
    const child2Response = await fetch('http://localhost:8000/cards/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Child Card 2',
        user: TEST_USER,
        content: { text: 'Child card 2 content' }
      })
    });

    assertEquals(child2Response.status, 200);
    const child2 = await child2Response.json();
    const child2Id = child2.id;

    // Attach both cards
    const attach1Response = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(attach1Response.status, 200);

    const attach2Response = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId: child2Id,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(attach2Response.status, 200);

    // Reorder the first card to position 1
    const response = await fetch(`http://localhost:8000/cards/info/nested/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        cardId: childId,
        newPosition: 1,
        user: TEST_USER
      })
    });

    assertEquals(response.status, 200);

    // Verify the order of nested cards
    const parentResponse = await fetch(`http://localhost:8000/cards/info/${parentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: TEST_USER })
    });

    assertEquals(parentResponse.status, 200);
    const parent = await parentResponse.json();
    assertExists(parent.metadata.nestedCards);
    assertEquals(parent.metadata.nestedCards.length, 2);
    assertEquals(parent.metadata.nestedCards[0].id, child2Id);
    assertEquals(parent.metadata.nestedCards[1].id, childId);
  });

  it('should get nested cards filtered by relationship', async () => {
    // Attach cards with different relationships
    await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId,
        relationship: 'thread',
        user: TEST_USER
      })
    });

    const child2Response = await fetch('http://localhost:8000/cards/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Child Card 2',
        user: TEST_USER,
        content: { text: 'Child card 2 content' }
      })
    });
    const child2 = await child2Response.json();
    
    await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId: child2.id,
        relationship: 'attachment',
        user: TEST_USER
      })
    });

    // Get only thread relationships
    const response = await fetch(`http://localhost:8000/cards/info/${parentId}/nested?relationship=thread`);
    assertEquals(response.status, 200);
    
    const nestedCards = await response.json();
    assertEquals(nestedCards.length, 1);
    assertEquals(nestedCards[0].id, childId);
  });

  it('should handle errors gracefully', async () => {
    // Try to attach non-existent card
    const response = await fetch(`http://localhost:8000/cards/info/nested/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentId,
        childId: 'non-existent-id',
        relationship: 'thread',
        user: TEST_USER
      })
    });

    assertEquals(response.status, 404);
    const error = await response.json();
    assertEquals(error.error, 'Parent or child card not found');
  });
}); 