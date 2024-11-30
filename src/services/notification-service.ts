interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
}

export function sendNotification(_userId: string, payload: NotificationPayload): void {
  try {
    if ('Notification' in globalThis && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon.svg'
      });
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
} 