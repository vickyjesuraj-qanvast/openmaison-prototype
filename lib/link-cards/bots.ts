/*
 * (pending modules S02) The apps that fetch a link to draw its preview card — WhatsApp does it on the SENDER's phone the moment the studio
 * pastes the link, before the client has it. Only these fetchers' own names are listed (never an in-app browser's, such as LINE's or
 * Facebook's FBAN, which is a person reading): a page that stamps "Viewed" leaves the stamp to a person, and a shared file's link answers a
 * fetcher with its card instead of the file (app/f/[token]/route.ts).
 */
const PREVIEW_FETCHERS = /(WhatsApp\/|facebookexternalhit|Facebot|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Iframely|Embedly|Pinterestbot|redditbot|Applebot|vkShare|Googlebot|bingbot|Google-InspectionTool|DuckDuckBot)/i

export const isPreviewFetcher = (ua: string | null | undefined): boolean => !!ua && PREVIEW_FETCHERS.test(ua)
