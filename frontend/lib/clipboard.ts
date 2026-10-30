export async function copyTextToClipboard(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Try the legacy copy path if clipboard permissions are unavailable.
    }
  }

  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable.');

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();

  if (!copied) throw new Error('The browser could not copy the link.');
}
