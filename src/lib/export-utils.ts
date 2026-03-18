// Utility functions for exporting data as CSV or JSON
// Uses data URIs to work reliably inside preview iframes

export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  triggerDownload(json, "application/json", `${filename}.json`);
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = Array.isArray(val) ? val.join("; ") : String(val ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  triggerDownload(csvRows.join("\n"), "text/csv", `${filename}.csv`);
}

export function downloadText(text: string, filename: string) {
  triggerDownload(text, "text/plain", filename);
}

function triggerDownload(content: string, mimeType: string, filename: string) {
  // Try blob URL first, fall back to data URI
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Small delay before cleanup to ensure download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  } catch {
    // Fallback: data URI approach
    const encoded = encodeURIComponent(content);
    const dataUri = `data:${mimeType};charset=utf-8,${encoded}`;
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 150);
  }
}
