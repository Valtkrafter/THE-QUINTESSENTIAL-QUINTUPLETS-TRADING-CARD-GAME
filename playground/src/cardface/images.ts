const images = new Map<string, Promise<HTMLImageElement | null>>();

/** Loads a picture once and shares it. Resolves to null (and warns) when the file is missing, never rejects. */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let pending = images.get(url);
  if (pending === undefined) {
    pending = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        console.warn(`Could not load card art: ${url}`);
        resolve(null);
      };
      image.src = url;
    });
    images.set(url, pending);
  }
  return pending;
}
