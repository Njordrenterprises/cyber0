const sprites = [
  '🦊', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🦑',
  '🦈', '🐠', '🐳', '🐋', '🦕', '🦖', '🐢', '🦎',
  '🐍', '🦜', '🦩', '🦚', '🦉', '🦅', '🦄', '🐝',
  '🦋', '🐌', '🐛', '🦗', '🐞', '🐜', '🕷️', '🦂'
];

export function getRandomSprite(): string {
  return sprites[Math.floor(Math.random() * sprites.length)];
} 