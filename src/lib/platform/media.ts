/**
 * Media capture / picking. Today this uses a hidden file input (works in every
 * browser and webview); a native build can replace the body with
 * @capacitor/camera without changing any caller.
 */

export type PickSource = "camera" | "gallery" | "any";

export function pickImage(source: PickSource = "any"): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.style.display = "none";

    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    };
    // Covers the user dismissing the picker without choosing a file.
    input.oncancel = () => {
      resolve(null);
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  });
}

/** Saves/downloads a remote file in a way that also works inside a webview. */
export async function saveFile(url: string, filename?: string): Promise<void> {
  try {
    const a = document.createElement("a");
    a.href = url;
    if (filename) a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank");
  }
}
