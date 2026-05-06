const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "hwp",
  "hwpx",
  "doc",
  "docx",
  "txt",
]);

export const NOTICE_FILE_ACCEPT =
  ".pdf,.hwp,.hwpx,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function isAllowedNoticeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot >= 0) {
    const ext = name.slice(dot + 1);
    if (ALLOWED_EXTENSIONS.has(ext)) return true;
  }
  const mime = (file.type || "").toLowerCase();
  if (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "text/plain"
  ) {
    return true;
  }
  return false;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
