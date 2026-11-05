const htmlEscape = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\\s+/g, ' ').trim()

function meta(html, name) {
  const re = new RegExp('<meta[^>]+(?:name|property)=["\\']' + name.replace(/[.*+?^{}()|[\]\\]/g, '\\$&') + '["\\'][^>]+content=["\\']([^"\\']*)["\\']', 'i')
  const m = html.match(re)
  return m ? htmlEscape(m[1]) : ''
}

export default async function handler(req, res) {
  const raw = req.query && req.query.url
  if (!raw) return res.status(400).json({ error: 'Missing website URL' })

  let url
  try {
    url = new URL(String(raw))
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http/https websites are supported')
  } catch {
    return res.status(400).json({ error: 'Invalid website URL' })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YogeCommandCentre/1.0)' },
      redirect: 'follow',
    })
    clearTimeout(timeout)

    const html = await response.text()
    const lower = html.toLowerCase()

    const wixMarkers = [
      'wix.com',
      'wixsite.com',
      'static.parastorage.com',
      'wixstatic.com',
      'x-wix',
      'wix-bi-session',
      'wix-code-sdk',
    ]
    const matched = wixMarkers.filter(x => lower.includes(x))
    const wixDetected = matched.length > 0

    const titleMatch = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)
    const title = titleMatch ? htmlEscape(titleMatch[1]) : ''
    const description = meta(html, 'description')
    const ogDescription = meta(html, 'og:description')

    const bodyText = htmlEscape((html.match(/<body[^>]*>([\\s\\S]*?)<\\/body>/i) || [,''])[1])
      .replace(/\\s+/g, ' ')
      .slice(0, 500)

    const screenshotUrl = 'https://image.thum.io/get/width/1200/crop/900/' + encodeURIComponent(url.toString())
    const summaryParts = []
    if (title) summaryParts.push('Title: ' + title)
    if (description || ogDescription) summaryParts.push('Meta: ' + (description || ogDescription))
    summaryParts.push(wixDetected ? 'Wix detected from website source.' : 'No Wix marker detected in the fetched source.')
    if (bodyText) summaryParts.push('Page text: ' + bodyText)

    return res.status(200).json({
      ok: true,
      final_url: response.url,
      status: response.status,
      title,
      description: description || ogDescription,
      wix_detected: wixDetected,
      wix_evidence: matched.length ? 'Detected markers: ' + matched.join(', ') : 'No known Wix markers found in fetched HTML.',
      screenshot_url: screenshotUrl,
      summary: summaryParts.join(' '),
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(502).json({ error: error && error.name === 'AbortError' ? 'Website took too long to respond.' : 'Could not fetch that website.' })
  }
}
