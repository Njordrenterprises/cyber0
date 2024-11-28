const template = await Deno.readTextFile("./src/views/home/home.html");

export function layout(_content: string) {
  return template;
} 