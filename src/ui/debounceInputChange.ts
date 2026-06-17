/**
 * Debounces text-input change notifications while typing.
 *
 * @param onChange - Callback invoked after typing pauses.
 * @param delayMs - Idle delay before firing (default 100ms).
 */
export function debounceInputChange(
  onChange: () => void,
  delayMs = 100,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, delayMs);
  };
}
