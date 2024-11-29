import { getClientScript } from '../../../db/client/index.ts';

export async function layout(_content: string): Promise<string> {
  const template = await Deno.readTextFile(new URL('./home.html', import.meta.url));
  return `
    <link rel="stylesheet" href="/src/modals/modal.css">
    <link rel="stylesheet" href="/src/cards/info/info.css">
    <link rel="stylesheet" href="/src/cards/cards.css">
    <script>
      // Initialize cardData
      window.cardData = window.cardData || {};

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
    ${template}
  `;
} 