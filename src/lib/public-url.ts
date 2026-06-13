/** Resolve a public/ asset path for the current Vite base (e.g. GitHub Pages subpath). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const normalized = path.replace(/^\//, '')
  return `${base}${normalized}`
}
