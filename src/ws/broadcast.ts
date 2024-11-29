// Store WebSocket connections
const clients = new Set<WebSocket>();

// Add a new client
export function addClient(ws: WebSocket) {
  clients.add(ws);
  console.log(`WebSocket client connected, total: ${clients.size}`);
  
  ws.onclose = () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected, remaining: ${clients.size}`);
  };
}

// Broadcast a message to all connected clients
export function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  console.log(`Broadcasting to ${clients.size} clients:`, payload);
  
  const deadClients = new Set<WebSocket>();
  
  for (const client of clients) {
    try {
      client.send(payload);
    } catch (err) {
      console.error('Error broadcasting to client:', err);
      deadClients.add(client);
    }
  }
  
  // Cleanup any dead connections
  for (const client of deadClients) {
    clients.delete(client);
  }
} 