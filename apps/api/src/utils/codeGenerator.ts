export const generateCode = (random: () => number) => (length: number) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  return Array.from({ length }, () => {
    const index = Math.floor(random() * chars.length);
    return chars[index];
  }).join("");
};
