/** Hands a text to the player as a file download. */
export function downloadText(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `tqq-save-2026-10-10.json` */
export function saveFileName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `tqq-save-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
