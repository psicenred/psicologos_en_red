export function getBaseUrl(): string {
  return (
    process.env.BASE_URL?.trim() ||
    process.env.PUBLIC_URL?.trim() ||
    'http://localhost:3000'
  );
}
