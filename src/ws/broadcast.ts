// @ts-ignore: Deno unstable API
const channel = new BroadcastChannel("cyber-updates");

// Broadcast a message to all clients
export function broadcast(message: unknown) {
  console.log(`Broadcasting message:`, message);
  try {
    channel.postMessage(message);
  } catch (err) {
    console.error('Error broadcasting message:', err);
  }
}

// Initialize broadcast channel
export function initBroadcast() {
  try {
    channel.onmessage = (event) => {
      console.log("Server received broadcast:", event.data);
    };
  } catch (err) {
    console.error('Error initializing broadcast:', err);
  }
} 