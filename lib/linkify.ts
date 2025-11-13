/**
 * Utility to parse URLs from text and create a structure for rendering with clickable links
 * Returns an array of segments where each segment is either plain text or a URL object
 */

interface TextSegment {
  type: 'text' | 'url'
  content: string
  href?: string
}

/**
 * Parse text and extract URLs, returning an array of text and URL segments
 * Handles http://, https://, and www. URLs
 *
 * @param text - The text to parse
 * @returns Array of text and URL segments
 */
export function parseUrlsFromText(text: string): TextSegment[] {
  // Regex to match URLs
  // Matches:
  // - http(s)://...
  // - www...
  // - ftp://...
  const urlRegex = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"`{}|\\^[\]]*[^\s<>"`{}|\\^[\].,;!?:)'"]/g

  const segments: TextSegment[] = []
  let lastIndex = 0

  const matches = [...text.matchAll(urlRegex)]

  matches.forEach((match) => {
    const urlStart = match.index!
    const urlEnd = urlStart + match[0].length

    // Add text before the URL
    if (urlStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, urlStart),
      })
    }

    // Add the URL
    let url = match[0]
    // If URL doesn't start with protocol, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
      url = 'https://' + url
    }

    segments.push({
      type: 'url',
      content: match[0], // Original URL text
      href: url,
    })

    lastIndex = urlEnd
  })

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  // If no URLs found, return the entire text as one segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: text,
    })
  }

  return segments
}
