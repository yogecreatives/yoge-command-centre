import { Business } from './types'

export const HIDDEN_SLUGS = ['other', 'yogefolio']
export const ORDER = ['yogecreatives', 'white-label', 'yogeworks']

export const visibleBusinesses = (list: Business[]) =>
  list
    .filter(b => !HIDDEN_SLUGS.includes(b.slug) && ORDER.includes(b.slug))
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug))

export const businessRoute = (slug: string) =>
  slug === 'yogecreatives'
    ? '/w/yogecreatives/overview'
    : slug === 'white-label'
      ? '/w/white-label/pipeline'
      : slug === 'yogeworks'
        ? '/w/yogeworks/overview'
        : '/b/' + slug
