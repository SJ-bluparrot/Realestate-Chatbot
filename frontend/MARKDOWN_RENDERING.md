# Markdown Rendering in Chat

ARIA's responses come from the backend as Markdown-formatted strings inside the `answer` field. The frontend renders them using `react-markdown` in `ChatMessage.tsx`.

## What the backend sends

The `answer` field in every `/chat` response is plain Markdown text. Example:

```
**Westin Residences** sits on 21 acres along the Dwarka Expressway.

Key highlights:
- Marriott-managed hospitality services
- 43-floor towers with panoramic views
- LEED Platinum certified

> Ideal for investors seeking a branded, hands-off asset.
```

## How the frontend renders it

`ReactMarkdown` in `AssistantMessage` maps each Markdown element to a styled component:

| Markdown | Rendered as |
|---|---|
| `**bold**` | `<strong>` — dark, semibold |
| `## Heading` | `<h2>` — section header |
| `### Heading` | `<h3>` — sub-section header |
| `- item` | `<ul>` bullet list |
| `1. item` | `<ol>` numbered list |
| `> text` | `<blockquote>` — gold left border, italic |
| plain text | `<p>` — spaced paragraphs |

## Rules for backend prompt authors

- Use `**bold**` for project names, feature names, and key terms
- Use `- bullets` when listing 3+ items (amenities, features, specs)
- Use `##` headers only when the response covers 2+ distinct topics
- Keep short/simple replies as plain paragraphs — no forced formatting
- Never use code fences (` ``` `) — they are not styled for chat
- Never use `# H1` — too large for a chat bubble

## Adding new Markdown elements

To support a new element (e.g. tables, inline code), add a component mapping in the `ReactMarkdown` `components` prop inside `ChatMessage.tsx`:

```tsx
code: ({ children }) => (
  <code className="px-1 rounded text-xs" style={{ background: 'rgba(184,150,90,0.1)', color: '#B8965A' }}>
    {children}
  </code>
),
```
