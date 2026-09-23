/* The display name rides along as the last path segment so the attachment list
   can keep deriving a label with basename(), and so a download lands under a
   sensible filename. Only the id is read server-side. */
export function attachmentUrl(id: string, name: string) {
  return `/api/attachments/${id}/${encodeURIComponent(name)}`;
}

export function isLegacyUploadPath(path: string) {
  return path.startsWith("/uploads/");
}
