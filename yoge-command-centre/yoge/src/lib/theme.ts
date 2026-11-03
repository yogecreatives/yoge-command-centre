export type ThemePref = 'light' | 'dark' | 'auto'
const KEY = 'yoge_theme' // display preference only; no business data is stored locally
export const getTheme = (): ThemePref => {
  try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'auto' ? v : 'light' } catch { return 'light' }
}
export function applyTheme(pref: ThemePref = getTheme()) {
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0e0f' : '#f2f4f1')
}
export function setTheme(pref: ThemePref) {
  try { localStorage.setItem(KEY, pref) } catch { /* ignore */ }
  applyTheme(pref)
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme())
