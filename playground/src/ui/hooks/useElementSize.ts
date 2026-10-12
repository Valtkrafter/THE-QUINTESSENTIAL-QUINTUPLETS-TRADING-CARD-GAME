import { useCallback, useRef, useState, type RefCallback } from 'react';

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

/** The size of an element, kept up to date while it is on the screen. Give the returned function to the element's `ref`. */
export function useElementSize<T extends HTMLElement>(): readonly [RefCallback<T>, ElementSize] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (element === null) {
      return;
    }
    const read = (): void => setSize((current) => (current.width === element.clientWidth && current.height === element.clientHeight ? current : { width: element.clientWidth, height: element.clientHeight }));
    observer.current = new ResizeObserver(read);
    observer.current.observe(element);
    read();
  }, []);
  return [ref, size];
}
