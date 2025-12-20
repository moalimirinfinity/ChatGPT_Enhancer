/**
 * Simple promise-based delay utility.
 */

export function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
