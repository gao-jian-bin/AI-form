export function useCanonical(path: () => string): void {
  const requestUrl = useRequestURL()
  useHead(() => ({
    link: [{
      rel: 'canonical',
      href: new URL(path(), requestUrl.origin).href,
    }],
  }))
}
