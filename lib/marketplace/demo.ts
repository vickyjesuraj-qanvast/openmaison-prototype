/**
 * (pending modules S24) The demo's Marketplace — a catalogue in the shape of Qanvast's brand feed (lib/marketplace/feed.ts, 1.0's
 * BrandModel / BrandPromoModel / BrandProductModel), so it reaches the pages the way a real feed would: through `rowsFromFeed` and
 * `feedStatements` (repair R141). Every brand is invented for the demo — names, numbers, addresses' units, deals and prices — with web
 * addresses on the reserved `.example` domain, so no press ever lands on a real business. The pictures are the demo's own (public/marketplace,
 * cut from the AI Visualizer's sample rooms by scripts/marketplace/gen-assets.mjs). Dates are days from `today`, so the deals are always live
 * on the demo day. 1.0's eight categories (its platform seed, `marketplace_categories`). *(invented copy: every brand, deal and product)*
 */
import type { FeedBrand, FeedPayload, FeedProduct, FeedPromo } from './feed'

const DAY = 86_400_000
const pic = (path: string | null) => (path ? { baseUrl: path } : undefined)
const room = (name: string) => `/marketplace/rooms/${name}.jpg`

type ProductSpec = [id: number, name: string, price: string, picture: string | null, description: string, slug: string]
type DealSpec = { id: number; title: string; description: string; terms: string; redemption: string; from: number; to: number; picture: string | null; flash?: boolean; ctaUrl?: string; ctaText?: string }
type BrandSpec = {
  id: number; slug: string; title: string; categories: string[]; featuredRank?: number; leadCount: number; reviewCount: number; publishedDaysAgo: number
  whatsapp?: string; email?: string; site?: string; instagram?: boolean; facebook?: boolean; youtube?: boolean; tagline: string; services: string
  addresses: string[]; cover: string; gallery: string[]; products: ProductSpec[]; deals: DealSpec[]; faqs: [string, string][]
}

const BRANDS: BrandSpec[] = [
  {
    id: 4101, slug: 'oak-linen', title: 'Oak & Linen', categories: ['Furniture'], featuredRank: 1, leadCount: 412, reviewCount: 128, publishedDaysAgo: 400,
    whatsapp: '91550201', email: 'hello@oakandlinen.example', site: 'oakandlinen', instagram: true, facebook: true,
    tagline: 'Solid-wood furniture, made to your room’s measurements',
    services: 'Sofas, dining tables, beds and wardrobes in solid oak and teak, made to measure in our Kaki Bukit workshop. We measure on site within the week, and deliver and assemble island-wide at no charge. Trade prices for interior design studios on every order.',
    addresses: ['61 Kaki Bukit Avenue 1, #02-11, Singapore 417943'],
    cover: 'living-room-scandinavian', gallery: ['living-room-original', 'bedroom-scandinavian', 'kitchen-scandinavian', 'bedroom-original'],
    products: [
      [4201, 'Oslo 3-seater sofa', 'S$2,480 per piece', 'oslo-sofa', 'Deep seat, feather-wrapped cushions and a solid oak frame; 220 cm wide, in any of 40 fabrics.', 'oslo-sofa'],
      [4202, 'Hudson leather sofa', 'S$3,280 per piece', 'hudson-sofa', 'Buttoned aniline leather on a kiln-dried hardwood frame; 230 cm wide.', 'hudson-sofa'],
      [4203, 'Haven bed frame, queen', 'S$1,350 per piece', 'haven-bed', 'Upholstered headboard on a solid oak base, with slats for any mattress.', 'haven-bed'],
      [4204, 'Arc counter stool', 'S$290 per piece', 'arc-stool', 'Curved upholstered seat on an oak frame, 65 cm seat height for a 90 cm island.', 'arc-stool'],
    ],
    deals: [
      { id: 4501, title: '12% off every sofa for design studios', description: 'The trade price on every sofa in the catalogue, fabric or leather, for orders placed by an interior design studio.', terms: 'For orders placed by an interior design studio. Not with other offers. One order per project.', redemption: 'Quote QANVAST12 on WhatsApp or at the showroom when you order.', from: -20, to: 45, picture: 'oak-sofas' },
      { id: 4502, title: 'Free fabric upgrade on dining chairs', description: 'Any fabric from the premium range at the standard price, on orders of four chairs or more.', terms: 'Orders of four dining chairs or more. While the premium fabrics last.', redemption: 'Ask for the fabric upgrade when you order.', from: -2, to: 5, picture: 'oak-chairs', flash: true },
    ],
    faqs: [
      ['Can I see the fabrics before I order?', 'Yes — book a slot at the showroom, or ask for a swatch kit; we courier up to eight swatches free.'],
      ['How long does a made-to-measure piece take?', 'Five to seven weeks from the signed drawing, eight weeks for teak.'],
    ],
  },
  {
    id: 4102, slug: 'kampong-teak', title: 'Kampong Teak Works', categories: ['Furniture'], leadCount: 168, reviewCount: 54, publishedDaysAgo: 900,
    whatsapp: '91550202', tagline: 'Reclaimed teak, built to last another hundred years',
    services: 'Coffee tables, consoles, benches and shelving from reclaimed teak beams, finished by hand. Made-to-measure pieces in four to six weeks.',
    addresses: ['Blk 3015 Bedok North Street 5, #01-12, Singapore 486350'],
    cover: 'living-room-japandi', gallery: ['living-room-bohemian'],
    products: [
      [4211, 'Reclaimed teak coffee table', 'S$880 per piece', 'teak-table', 'Solid reclaimed teak with a hand-oiled finish; 120 × 60 cm.', 'teak-table'],
      [4212, 'Teak media console, 1.8 m', 'S$1,240 per piece', 'teak-console', 'Slatted doors, soft-close hinges and a cable channel at the back.', 'teak-console'],
    ],
    deals: [],
    faqs: [['Is reclaimed teak treated against termites?', 'Every beam is kiln-dried and treated before it is cut.']],
  },
  {
    id: 4103, slug: 'lumen-lane', title: 'Lumen Lane', categories: ['Lighting'], featuredRank: 2, leadCount: 365, reviewCount: 97, publishedDaysAgo: 300,
    whatsapp: '91550203', email: 'studio@lumenlane.example', site: 'lumenlane', instagram: true,
    tagline: 'Lighting for the way you live after dark',
    services: 'Pendants, floor lamps and wall lights from European and local makers, with a free lighting plan for any project above S$3,000. Electrician referrals on request.',
    addresses: ['1 Kaki Bukit Road 1, #03-08, Singapore 415934'],
    cover: 'kitchen-scandinavian', gallery: ['kitchen-original', 'living-room-japandi', 'bedroom-japandi'],
    products: [
      [4221, 'Dome pendant, 40 cm', 'S$320 per piece', 'dome-pendant', 'Spun aluminium in white or black, with a 2 m fabric cord.', 'dome-pendant'],
      [4222, 'Paper floor lamp', 'S$410 per piece', 'paper-lamp', 'A washi-paper globe on an oak tripod; warm white, dimmable.', 'paper-lamp'],
      [4223, 'Bedside table lamp', 'S$145 per piece', 'bedside-lamp', 'A mushroom shade in opal glass on a ceramic base.', 'bedside-lamp'],
    ],
    deals: [
      { id: 4503, title: 'Buy three pendants, get the fourth free', description: 'Mix and match any four pendants in the range — the lowest-priced of the four is on us.', terms: 'The free pendant is the lowest-priced of the four. Delivery is charged as usual.', redemption: 'Tell Lumen Lane on WhatsApp which four pendants you want.', from: -10, to: 30, picture: 'lumen-pendants' },
    ],
    faqs: [
      ['Do you install?', 'We refer licensed electricians we work with; most fit a pendant in under an hour.'],
      ['Can I return a light?', 'Unused and in its box within 14 days, yes.'],
    ],
  },
  {
    id: 4104, slug: 'floor-xpert', title: 'Floor Xpert', categories: ['Flooring'], leadCount: 240, reviewCount: 76, publishedDaysAgo: 700,
    whatsapp: '98765432', email: 'sales@floorxpert.example.sg',
    tagline: 'Vinyl, SPC and timber floors, laid by our own team',
    services: 'Supply and installation of vinyl, SPC and engineered timber flooring, with skirting and levelling. Site measurement within three working days; most homes are laid in two days.',
    addresses: ['10 Ubi Crescent, #04-21, Singapore 408564'],
    cover: 'bedroom-original', gallery: ['living-room-original'],
    products: [
      [4231, 'Vinyl flooring, supply and install', 'S$5.50 per sqft', 'vinyl-floor', 'Click-lock luxury vinyl, 4 mm, in 24 wood and stone looks; laid with underlay.', 'vinyl-floor'],
      [4232, 'SPC flooring 5 mm, oak grain', 'S$6.20 per sqft', 'spc-floor', 'Stone-plastic core, fully waterproof, for kitchens and bathrooms too.', 'spc-floor'],
    ],
    deals: [
      { id: 4504, title: 'S$0.50 off every sqft above 800 sqft', description: 'On vinyl and SPC flooring, supply and install, for any one home.', terms: 'Above 800 sqft laid in one home. Skirting and levelling as quoted.', redemption: 'Mention the Marketplace deal when you book the site measurement.', from: -5, to: 60, picture: 'floor' },
    ],
    faqs: [['Can you lay over existing tiles?', 'Yes, if the tiles are level and sound — we check at the site measurement.']],
  },
  {
    id: 4105, slug: 'tessera', title: 'Tessera Tile House', categories: ['Flooring', 'Bathroom'], leadCount: 132, reviewCount: 41, publishedDaysAgo: 520,
    whatsapp: '91550205', tagline: 'Porcelain and terrazzo, cut to size',
    services: 'Porcelain slabs, cast terrazzo and mosaic for floors, walls and bathrooms. Samples couriered free to studios.',
    addresses: ['21 Sungei Kadut Street 4, Singapore 729046'],
    cover: 'living-room-dubai-luxury', gallery: ['kitchen-dubai-luxury'],
    products: [[4241, 'Marble-look porcelain, 600 × 1200', 'S$12 per sqft', 'marble-porcelain', 'Polished porcelain with a book-matched vein, 9 mm.', 'marble-porcelain']],
    deals: [],
    faqs: [],
  },
  {
    id: 4106, slug: 'hearth-ember', title: 'Hearth & Ember Kitchens', categories: ['Kitchen'], featuredRank: 3, leadCount: 288, reviewCount: 83, publishedDaysAgo: 200,
    whatsapp: '91550206', email: 'projects@hearthember.example', site: 'hearthember', facebook: true, youtube: true,
    tagline: 'Kitchens drawn, built and fitted in eight weeks',
    services: 'Kitchen cabinets in oak, walnut and lacquer, with quartz and sintered-stone worktops, built in our Woodlands factory and fitted by our own carpenters. 3D drawings in two days.',
    addresses: ['2 Woodlands Sector 1, #01-30, Singapore 738068'],
    cover: 'kitchen-japandi', gallery: ['kitchen-scandinavian', 'kitchen-original'],
    products: [
      [4251, 'Fluted oak cabinet doors', 'S$190 per ft run', 'fluted-doors', 'Solid oak fluted fronts on moisture-resistant carcasses, soft-close throughout.', 'fluted-doors'],
      [4252, 'Woven counter stool', 'S$260 per piece', 'woven-stool', 'Paper-cord seat on a solid ash frame, 65 cm high.', 'woven-stool'],
    ],
    deals: [
      { id: 4505, title: 'Kitchen month: 15% off every worktop', description: 'Quartz, sintered stone and solid-surface worktops, cut and fitted.', terms: 'On worktops ordered with a Hearth & Ember kitchen. Not with other offers.', redemption: 'Quote KITCHENMONTH on the order.', from: -8, to: 20, picture: 'hearth-worktops' },
    ],
    faqs: [
      ['How soon can you start?', 'We draw in two days and build in six weeks; fitting takes two to three days.'],
      ['Do you work with the studio’s own drawings?', 'Yes — send them over and we quote from them.'],
    ],
  },
  {
    id: 4107, slug: 'stone-republic', title: 'Stone Republic', categories: ['Kitchen', 'Bathroom'], leadCount: 150, reviewCount: 39, publishedDaysAgo: 610,
    whatsapp: '91550207', tagline: 'Quartz and natural stone, templated on site',
    services: 'Quartz, granite and marble worktops and vanity tops, templated on site and fitted within a week.',
    addresses: ['7 Kaki Bukit Crescent, #05-02, Singapore 416239'],
    cover: 'kitchen-dubai-luxury', gallery: ['kitchen-original'],
    products: [
      [4261, 'Pure white quartz worktop, 20 mm', 'S$95 per ft run', 'white-quartz', 'A plain white quartz with a polished edge.', 'white-quartz'],
      [4262, 'Calacatta quartz worktop, 20 mm', 'S$110 per ft run', 'calacatta-quartz', 'A white quartz with a warm gold vein, with a waterfall end if you like.', 'calacatta-quartz'],
    ],
    deals: [],
    faqs: [],
  },
  {
    id: 4108, slug: 'basin-tap', title: 'Basin & Tap Co.', categories: ['Bathroom', 'Kitchen'], leadCount: 121, reviewCount: 33, publishedDaysAgo: 450,
    whatsapp: '91550208', email: 'orders@basinandtap.example', tagline: 'Taps, sinks and showers, delivered next day',
    services: 'Mixers, sinks, showers and bathroom fittings from stock, with next-day delivery to site. Installation by licensed plumbers on request.',
    addresses: ['Blk 5000 Ang Mo Kio Avenue 5, #01-09, Singapore 569870'],
    cover: 'kitchen-original', gallery: ['kitchen-scandinavian'],
    products: [
      [4271, 'Matte black kitchen mixer', 'S$289 per piece', 'black-mixer', 'A swan-neck mixer with a pull-out spray, in matte black.', 'black-mixer'],
      [4272, 'Brushed brass kitchen mixer', 'S$349 per piece', 'brass-mixer', 'The same mixer in brushed brass, with a ten-year cartridge.', 'brass-mixer'],
    ],
    deals: [
      { id: 4506, title: 'Free installation with any two mixers', description: 'A licensed plumber fits both, in one visit.', terms: 'Two mixers or more on one order, one visit, one address.', redemption: 'Ask for the free installation when you order.', from: -14, to: 25, picture: 'basin-mixer' },
    ],
    faqs: [],
  },
  {
    id: 4109, slug: 'kaya-paints', title: 'Kaya Paints', categories: ['Paint'], leadCount: 199, reviewCount: 61, publishedDaysAgo: 120,
    whatsapp: '91550209', email: 'hello@kayapaints.example', tagline: 'Low-VOC paint in 120 colours, mixed in Singapore',
    services: 'Interior emulsions, limewash and mineral paints, low in VOC and mixed to order. Colour cards and A4 swatches for studios, free.',
    addresses: ['30 Loyang Way, #03-15, Singapore 508769'],
    cover: 'bedroom-japandi', gallery: ['bedroom-original', 'living-room-japandi'],
    products: [
      [4281, 'Interior emulsion, 5 L', 'S$78 per piece', 'emulsion', 'A washable matt emulsion in any of 120 colours; about 60 sqm a tin.', 'emulsion'],
      [4282, 'Limewash, 5 L', 'S$135 per piece', 'limewash', 'A soft, chalky lime finish for feature walls, brushed on in two coats.', 'limewash'],
    ],
    deals: [
      { id: 4507, title: '20% off a studio’s first order', description: 'Any paint in the range, on a studio’s first order.', terms: 'A studio’s first order only, up to 60 litres.', redemption: 'Order on WhatsApp and say it’s your first.', from: -1, to: 6, picture: 'kaya-paint', flash: true },
    ],
    faqs: [['Can you match a colour from a photo?', 'Send it on WhatsApp and we mix a sample pot for you.']],
  },
  {
    id: 4110, slug: 'shade-atelier', title: 'Shade Atelier', categories: ['Curtains & Blinds'], leadCount: 176, reviewCount: 58, publishedDaysAgo: 380,
    whatsapp: '91550210', tagline: 'Curtains and blinds, measured and hung',
    services: 'Day-and-night curtains, sheers, blackout linings and motorised tracks, measured at home and hung within two weeks.',
    addresses: ['111 North Bridge Road, #04-40, Singapore 179098'],
    cover: 'bedroom-dubai-luxury', gallery: ['living-room-dubai-luxury'],
    products: [
      [4291, 'Linen sheer curtain, per panel', 'S$165 per piece', 'sheer-curtain', 'Washed linen sheer, pinch-pleated, up to 2.7 m drop.', 'sheer-curtain'],
      [4292, 'Jacquard drapery, per panel', 'S$240 per piece', 'jacquard', 'A woven jacquard with a blackout lining, up to 2.7 m drop.', 'jacquard'],
    ],
    deals: [],
    faqs: [],
  },
  {
    id: 4111, slug: 'drape-draw', title: 'Drape & Draw', categories: ['Curtains & Blinds', 'Smart Home'], leadCount: 88, reviewCount: 19, publishedDaysAgo: 60,
    whatsapp: '91550211', tagline: 'Blinds and motorised tracks',
    services: 'Roman, roller and bamboo blinds, and motorised curtain tracks that work from a phone.',
    addresses: ['Blk 1 Thomson Road, #01-330, Singapore 300001'],
    cover: 'living-room-bohemian', gallery: [],
    products: [
      [4301, 'Bamboo roman blind', 'S$210 per piece', 'bamboo-blind', 'Woven bamboo on a cord-free lift, made to the window.', 'bamboo-blind'],
      [4302, 'Motorised curtain track, up to 3 m', 'S$480 per piece', null, 'A quiet motor and track, set up on the owner’s phone.', 'motor-track'],
    ],
    deals: [],
    faqs: [],
  },
  {
    id: 4112, slug: 'homesense', title: 'HomeSense Smart Living', categories: ['Smart Home'], leadCount: 140, reviewCount: 44, publishedDaysAgo: 330,
    whatsapp: '91550212', email: 'hi@homesense.example', site: 'homesense', tagline: 'Smart switches, locks and lighting, set up for you',
    services: 'Smart switches, digital locks, sensors and scenes, installed and set up on the owner’s phone before handover.',
    addresses: ['2 Kallang Avenue, #06-12, Singapore 339407'],
    cover: 'living-room-original', gallery: ['bedroom-scandinavian'],
    products: [
      [4311, 'Smart switch, 2-gang', 'S$95 per point', null, 'A glass touch switch that works with the hub, voice and the phone.', 'smart-switch'],
      [4312, 'Digital door lock', 'S$520 per piece', null, 'Fingerprint, PIN and key; fitted to HDB and condo doors.', 'door-lock'],
    ],
    deals: [
      { id: 4508, title: 'Studio bundle: ten switches and a hub, S$990', description: 'Ten 2-gang smart switches and the hub that runs them, installed.', terms: 'One home. Wiring changes are quoted on site.', redemption: 'Ask for the studio bundle on WhatsApp.', from: -30, to: 40, picture: 'homesense-living' },
    ],
    faqs: [['Do the switches need a neutral wire?', 'No — they fit any Singapore switch box.']],
  },
  {
    id: 4113, slug: 'nook', title: 'Nook Smart Home', categories: ['Smart Home', 'Lighting'], leadCount: 72, reviewCount: 12, publishedDaysAgo: 150,
    email: 'hello@nook.example', tagline: 'Smart bulbs and sensors that just work',
    services: 'Smart bulbs, motion sensors and plugs, sold in sets for a whole home.',
    addresses: [],
    cover: 'bedroom-scandinavian', gallery: [],
    products: [[4321, 'Smart bulbs, set of four', 'S$120 per set', null, 'Warm-to-cool white, dimmable, E27 fittings.', 'smart-bulbs']],
    deals: [
      { id: 4509, title: 'A free hub with any two sets', description: 'The Nook hub, free with any two sets of bulbs or sensors.', terms: 'One hub per order.', redemption: 'Email Nook with the two sets you want.', from: -3, to: 21, picture: null },
    ],
    faqs: [],
  },
  {
    id: 4114, slug: 'rattan-row', title: 'Rattan Row', categories: ['Furniture', 'Lighting'], leadCount: 205, reviewCount: 66, publishedDaysAgo: 30,
    whatsapp: '91550214', instagram: true, tagline: 'Handwoven rattan, made in Southeast Asia',
    services: 'Headboards, pendants, chairs and screens, handwoven in rattan and cane.',
    addresses: ['Blk 85 Redhill Lane, #01-48, Singapore 150085'],
    cover: 'bedroom-bohemian', gallery: ['living-room-bohemian', 'kitchen-japandi'],
    products: [
      [4331, 'Rattan headboard, queen', 'S$690 per piece', 'rattan-headboard', 'A fan-woven headboard on a teak frame, wall-mounted.', 'rattan-headboard'],
      [4332, 'Rattan pendant, 50 cm', 'S$260 per piece', 'rattan-pendant', 'A woven bell shade that throws a soft pattern.', 'rattan-pendant'],
    ],
    deals: [
      { id: 4510, title: 'Free delivery island-wide this month', description: 'Every order, any size, delivered free.', terms: 'Delivery to one address in Singapore.', redemption: 'Nothing to quote — it’s on every order.', from: -12, to: 18, picture: 'rattan-bedroom' },
    ],
    faqs: [],
  },
]

const CATEGORIES = ['Furniture', 'Lighting', 'Flooring', 'Kitchen', 'Bathroom', 'Paint', 'Curtains & Blinds', 'Smart Home']

/** The demo feed as Qanvast would send it on `today`. */
export function demoFeed(today: Date): FeedPayload {
  const day0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const iso = (days: number, endOfDay = false) => new Date(day0 + days * DAY + (endOfDay ? DAY - 60_000 : 9 * 3_600_000)).toISOString()
  const brands: FeedBrand[] = BRANDS.map((b) => {
    const products: FeedProduct[] = b.products.map(([id, name, price, picture, description, slug]) => ({ id, name, price, description, isPublished: true, image: pic(picture ? `/marketplace/products/${picture}.jpg` : null), externalUrl: b.site ? `https://www.${b.site}.example/${slug}` : undefined }))
    const brandPromos: FeedPromo[] = b.deals.map((d) => ({ id: d.id, title: d.title, description: d.description, terms: d.terms, redemption: d.redemption, startDate: iso(d.from), endDate: iso(d.to, true), isDeleted: false, isFlashDeal: !!d.flash, ctaUrl: d.ctaUrl, ctaText: d.ctaText, images: d.picture ? { Cover: { baseUrl: `/marketplace/deals/${d.picture}.jpg` } } : undefined }))
    return {
      id: b.id, title: b.title, categories: b.categories, isPublished: true, publishedAt: iso(-b.publishedDaysAgo), whatsappContact: b.whatsapp, leadCount: String(b.leadCount), reviewCount: b.reviewCount,
      featuredRank: b.featuredRank ?? null, editorNote: b.services, quote: b.tagline, email: b.email,
      websites: b.site ? [{ title: `${b.title} — website`, url: `https://www.${b.site}.example` }] : [],
      instagram: b.instagram ? `https://instagram.example/${b.slug}` : undefined, facebook: b.facebook ? `https://facebook.example/${b.slug}` : undefined, youtube: b.youtube ? `https://youtube.example/@${b.slug}` : undefined,
      locations: b.addresses.map((address) => ({ address })), faqs: b.faqs.map(([question, answer]) => ({ question, answer })),
      images: { Cover: { baseUrl: room(b.cover) }, Logo: { baseUrl: `/marketplace/logos/${b.slug}.svg` }, Gallery: b.gallery.map((g) => ({ baseUrl: room(g) })) },
      products, brandPromos,
    }
  })
  return {
    categories: CATEGORIES.map((category, i) => ({ id: 4001 + i, category })),
    brands,
    banners: [
      { id: 4601, image: '/marketplace/banners/kitchen-month.jpg', link: '/marketplace?view=deals&deal=mkd-4505', title: 'Kitchen month at Hearth & Ember', line: '15% off every worktop, cut and fitted', startDate: iso(-8), endDate: iso(20, true) },
      { id: 4602, image: '/marketplace/banners/rattan-row.jpg', link: '/marketplace/mkb-4114', title: 'New on the Marketplace: Rattan Row', line: 'Handwoven headboards and pendants, delivered free this month', startDate: iso(-12), endDate: iso(18, true) },
      { id: 4603, image: '/marketplace/banners/pendants.jpg', link: '/marketplace?view=deals&deal=mkd-4503', title: 'Lumen Lane: the fourth pendant is free', line: 'Mix and match any four pendants in the range', startDate: iso(-10), endDate: iso(30, true) },
    ],
  }
}

/** The pictures the catalogue names, for the asset script and the repair's check. */
export const DEMO_PICTURES = {
  rooms: [...new Set(BRANDS.flatMap((b) => [b.cover, ...b.gallery]))],
  logos: BRANDS.map((b) => ({ slug: b.slug, title: b.title })),
}
