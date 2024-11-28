export interface HomeState {
  title: string;
}

export function layout(content: string) {
  // Create 8 card wrappers
  const cards = Array.from({ length: 8 }, (_, i) => `
    <div class="card-wrapper">
      <div hx-get="/api/cards/info/template" 
           hx-trigger="load"
           hx-swap="innerHTML"
           hx-vals='{"index": ${i}}'></div>
    </div>
  `).join('');

  return `
    <div class="view home" x-data="home">
      <h1 x-text="title"></h1>
      <div class="cards-container">
        ${cards}
      </div>
    </div>
  `;
}

export default {
  id: 'home',
  title: 'Welcome to Cyber Card System',

  getState(): HomeState {
    return {
      title: this.title
    };
  }
}; 