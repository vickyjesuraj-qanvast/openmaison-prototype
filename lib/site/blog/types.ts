/**
 * (pending modules S35) 1.0's blog article definitions (src/app/(marketing)/blog/articles.ts) — the company's published articles.
 * Each article's content is stored as structured sections for SEO + AI citability.
 * Rendered by components/site/blog/article-page.tsx (the sections' HTML is the editors' own, in code — never a visitor's).
 */

export interface BlogAuthor {
  name: string
  role: string
  avatar?: string
  linkedin?: string
}

export interface ArticleSection {
  heading: string
  /** HTML-safe content (supports <strong>, <em>, <a>, <ul>, <li>, <blockquote>) */
  content: string
}

export interface BlogArticle {
  slug: string
  title: string
  excerpt: string
  category: "Product" | "Industry" | "How-To" | "Studio Stories" | "Thought Leadership" | "Comparison" | "Guide"
  keywords: string[]
  author: BlogAuthor
  publishedAt: string // ISO 8601
  updatedAt?: string
  readTime: string
  heroImage?: string
  heroAlt?: string
  sections: ArticleSection[]
  /** Quotable stat block for AI citability: rendered as a highlighted card */
  keyStats?: { label: string; value: string; source?: string }[]
  /** Related article slugs for internal linking */
  relatedSlugs?: string[]
}

