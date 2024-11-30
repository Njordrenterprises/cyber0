const verbs = [
  'running', 'sleeping', 'dancing', 'jumping', 'flying',
  'swimming', 'climbing', 'diving', 'prowling', 'soaring',
  'dashing', 'gliding', 'hopping', 'leaping', 'prancing',
  'racing', 'sailing', 'skating', 'sliding', 'sprinting'
];

const animals = [
  'coyote', 'turtle', 'eagle', 'dolphin', 'panda',
  'tiger', 'penguin', 'koala', 'wolf', 'lion',
  'fox', 'owl', 'bear', 'hawk', 'deer',
  'rabbit', 'lynx', 'otter', 'seal', 'raven'
];

export function generateUsername(): string {
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${verb}-${animal}`;
} 