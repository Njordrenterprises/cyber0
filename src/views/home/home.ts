import { getClientScript } from '../../../db/client/index.ts';
import { getUserWidgetScript } from '../../../widgets/user/user.ts';

interface User {
  id: string;
  username: string;
  color: string;
  sprite: string;
  created: number;
  lastSeen: number;
}

export async function layout(user: User): Promise<string> {
  const template = await Deno.readTextFile(new URL('./home.html', import.meta.url));
  const userWidget = await Deno.readTextFile(new URL('../../../widgets/user/user.html', import.meta.url));
  
  // Log the full user object to verify data
  console.log('Layout received user:', user);
  
  const templateWithWidget = template.replace(
    '<div id="user-widget-container"></div>',
    userWidget
  );
  
  return `
    <link rel="stylesheet" href="/src/modals/modal.css">
    <link rel="stylesheet" href="/src/cards/info/info.css">
    <link rel="stylesheet" href="/src/cards/cards.css">
    <script>
      // Initialize cardData and user context
      window.cardData = window.cardData || {};
      window.userContext = ${JSON.stringify(user)};

      // Initialize user widget
      ${getUserWidgetScript()}

      // Wait for Alpine and initialize our scripts
      function initializeScripts() {
        if (typeof Alpine === 'undefined') {
          document.addEventListener('alpine:init', initializeScripts);
          return;
        }
        ${getClientScript()}
      }

      initializeScripts();
    </script>
    ${templateWithWidget}
  `;
} 