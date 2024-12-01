export function getUserWidgetScript(): string {
  return `
    // User widget functionality
    Alpine.data('userWidget', () => ({
      user: window.userContext,
      init() {
        // Watch for user context changes
        window.addEventListener('userContextChanged', (e) => {
          this.user = e.detail;
        });
      }
    }));
  `;
} 