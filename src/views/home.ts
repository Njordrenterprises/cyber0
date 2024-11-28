export interface HomeState {
  title: string;
}

const template = await Deno.readTextFile("./src/views/home/home.html");

export function layout(_content: string) {
  return template;
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