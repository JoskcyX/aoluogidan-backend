import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes rich-text HTML before it is persisted to the database.
 *
 * Content edited via the Tiptap editor (blog posts, static pages) is stored
 * as raw HTML and later rendered with `dangerouslySetInnerHTML` on public
 * pages. The browser-side editor only ever *produces* a safe subset of HTML,
 * but nothing stops a request from being sent to the API directly with
 * arbitrary HTML in the `content` field (a compromised or malicious admin
 * session, a bug in a future editor feature, etc). Without a server-side
 * allowlist, that HTML is stored and then executed in every visitor's
 * browser — a stored XSS vector against site visitors and other admins.
 *
 * This allowlist mirrors what the Tiptap StarterKit + extensions in
 * components/admin/rich-text-editor.tsx can actually produce, so legitimate
 * content is unaffected.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr",
      "h2", "h3",
      "strong", "b", "em", "i", "s", "u", "blockquote",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    // Only allow safe URL schemes; blocks javascript:, data: (except images), etc.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
    },
    // Strip anything else (script, style, iframe, event handlers, etc.)
    // rather than escaping it into visible text.
    disallowedTagsMode: "discard",
  });
}
