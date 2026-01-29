// /lib/diff/textDiff.ts

export function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const max = Math.max(oldLines.length, newLines.length);

  let result = [];

  for (let i = 0; i < max; i++) {
    const oldLine = oldLines[i] ?? "";
    const newLine = newLines[i] ?? "";

    if (oldLine === newLine) {
      result.push({ type: "same", oldLine, newLine });
    } else if (!oldLine && newLine) {
      result.push({ type: "added", oldLine, newLine });
    } else if (oldLine && !newLine) {
      result.push({ type: "removed", oldLine, newLine });
    } else {
      result.push({ type: "changed", oldLine, newLine });
    }
  }

  return result;
}
