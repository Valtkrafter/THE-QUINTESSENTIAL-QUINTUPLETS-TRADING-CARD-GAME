// Where the tutorial layer is drawn. Normally on the page itself; while a modal dialog is open the rest of the page is switched off
// (the browser makes it inert), so the layer has to live inside the dialog to be usable. A dialog offers itself while it is open.

import { useSyncExternalStore } from 'react';

const hosts: HTMLElement[] = [];
const listeners = new Set<() => void>();
let root: HTMLElement | null = null;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** The element on the page that holds the layer while no dialog is open. */
function pageHost(): HTMLElement {
  if (root === null || !root.isConnected) {
    root = document.createElement('div');
    root.dataset['tutorialRoot'] = '';
    document.body.append(root);
  }
  return root;
}

/** A dialog that is open offers `element` as the place for the layer. Returns the call that takes the offer back. */
export function registerOverlayHost(element: HTMLElement): () => void {
  hosts.push(element);
  notify();
  return () => {
    const index = hosts.lastIndexOf(element);
    if (index >= 0) {
      hosts.splice(index, 1);
    }
    notify();
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The topmost open dialog if there is one, else the page. */
function current(): HTMLElement {
  return hosts[hosts.length - 1] ?? pageHost();
}

export function useOverlayHost(): HTMLElement {
  return useSyncExternalStore(subscribe, current);
}

/** Is a dialog open that the introduction has to work inside of? */
export function openDialogHost(): HTMLElement | null {
  return hosts[hosts.length - 1] ?? null;
}
