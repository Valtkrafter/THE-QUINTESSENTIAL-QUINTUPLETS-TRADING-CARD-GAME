import type { KeyboardEvent } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps the Tab key inside a full-screen overlay that is not a native `<dialog>`: from its last control Tab goes to its first
 * one, and Shift+Tab the other way round, so the page behind cannot be reached with the keyboard while the overlay is open.
 */
export function trapTab(event: KeyboardEvent<HTMLElement>, root: HTMLElement): void {
  if (event.key !== 'Tab') {
    return;
  }
  const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (first === undefined || last === undefined) {
    event.preventDefault();
    root.focus();
    return;
  }
  const here = document.activeElement;
  if (event.shiftKey && (here === first || here === root)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && here === last) {
    event.preventDefault();
    first.focus();
  }
}
