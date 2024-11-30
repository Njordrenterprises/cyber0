/**
 * Generates a consistent color class for a given username
 * @param username - The username to generate a color class for
 * @returns CSS class name for the color
 */
export function getUsernameColor(username: string): string {
  if (!username) return '';
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Map hash to one of 12 color classes
  const colorIndex = Math.abs(hash % 12) + 1;
  return `username-color-${colorIndex}`;
} 