export function isExternalFileUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

export function assignmentFileServePath(submissionId: string, fileIndex: number): string {
  return `/api/academia/assignments/submissions/${submissionId}/file/${fileIndex}`;
}
