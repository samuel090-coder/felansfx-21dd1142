/** Clipboard access with a fallback for insecure contexts and webviews. */
export async function copyText(text: string): Promise<boolean> {
  try {
    const native = (window as any).Capacitor?.Plugins?.Clipboard;
    if (native?.write) {
      await native.write({ string: text });
      return true;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "true");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
