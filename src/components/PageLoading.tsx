export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-crimson-bright" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
