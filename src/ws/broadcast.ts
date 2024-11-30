// @ts-ignore: Deno unstable API
let channel: BroadcastChannel | null = null;

// Initialize broadcast channel
export function initBroadcast() {
  try {
    if (channel) {
      console.log("Broadcast channel already exists");
      return;
    }

    channel = new BroadcastChannel("cyber-updates");
    channel.onmessage = (event) => {
      console.log("Server received broadcast:", event.data);
    };

    // Add error handler
    channel.onmessageerror = (error) => {
      console.error("Broadcast channel message error:", error);
      closeBroadcast();
      initBroadcast();
    };

    console.log("Broadcast channel initialized");
  } catch (err) {
    console.error('Error initializing broadcast:', err);
  }
}

// Broadcast a message to all clients
export function broadcast(message: unknown) {
  console.log(`Broadcasting message:`, message);
  try {
    if (!channel) {
      console.warn('Broadcast channel not initialized, initializing now...');
      initBroadcast();
    }

    // Ensure channel exists
    if (!channel) {
      throw new Error('Failed to initialize broadcast channel');
    }

    // Send the message
    channel.postMessage(message);
  } catch (err) {
    console.error('Error broadcasting message:', err);
    // Try to reinitialize the channel
    try {
      console.warn('Attempting to reinitialize broadcast channel...');
      closeBroadcast();
      initBroadcast();
      if (channel) {
        channel.postMessage(message);
      }
    } catch (retryErr) {
      console.error('Failed to reinitialize broadcast channel:', retryErr);
    }
  }
}

// Clean up broadcast channel
export function closeBroadcast() {
  try {
    if (channel) {
      channel.close();
      channel = null;
      console.log("Broadcast channel closed");
    }
  } catch (err) {
    console.error('Error closing broadcast channel:', err);
    channel = null;
  }
} 