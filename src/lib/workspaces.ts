import { Business } from './types'

export const HIDDEN_SLUGS = ['other', 'yogefolio']
export const ORDER = ['yogecreatives', 'white-label', 'yogeworks']

export const visibleBusinesses = (list: Business[]) =>
  list.filter(b => !HIDDEN_SLUGS.includes(b.slug)).sort((a, b) => {
    const ai = ORDER.indexOf(a.slug), bi = ORDER.indexOf(b.slug)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return a.sort_order - b.sort_order
  })

export const businessRoute = (slug: string) =>
  slug === 'yogecreatives'
    ? '/w/yogecreatives/overview'
    : slug === 'white-label'
      ? '/w/white-label/overview'
      : slug === 'yogeworks'
        ? '/w/yogeworks/overview'
        : '/b/' + slug
