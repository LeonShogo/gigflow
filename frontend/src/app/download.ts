/**
 * Triggers a browser download of a Blob by name.
 * Anchor + object URL avoids any external library.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Turns a free-form title into a safe, readable file-name fragment. */
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'stueck';
}
