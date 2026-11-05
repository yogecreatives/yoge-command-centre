import { Business } from './types'
export const HIDDEN_SLUGS = ['other']
export const ORDER = ['yogecreatives', 'white-label', 'yogeworks', 'yogefolio']
export const visibleBusinesses = (list: Business[]) =>
  list.filter(b => !HIDDEN_SLUGS.includes(b.slug)).sort((a, b) => (ORDER.indexOf(a.slug) + 99) % 99 - (ORDER.indexOf(b.slug) + 99) % 99)
export const businessRoute = (slug: string) =>
  slug === 'yogecreatives' ? '/w/yogecreatives/overview' : slug === 'white-label' ? '/pipeline' : '/b/' + slug
