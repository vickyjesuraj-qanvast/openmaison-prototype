import { site } from './model'

/* (pending modules S35 — 1.0's INTRO_GATE in its marketing layout) The home page's first-visit welcome: the key a session keeps once it has played,
   and the script the layout runs before paint. Server-safe (the layout inlines it; components/site/site-shell.tsx plays it). */
export const INTRO_KEY = 'om.site.intro'
/* (1.0's INTRO_GATE) Before paint, only on the home page, once a session, only with motion allowed: flags the welcome to play — so it never
   flashes for a returning visitor, another page or reduced motion; a plain timer takes the flag away after 4 s whatever happens (a slow or
   failed script never leaves the page stuck behind it). */
export const INTRO_GATE = `(function(){try{if(location.pathname==='${site('/')}'&&!sessionStorage.getItem('${INTRO_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var h=document.documentElement;h.setAttribute('data-intro','play');sessionStorage.setItem('${INTRO_KEY}','1');setTimeout(function(){h.removeAttribute('data-intro');},4000);}}catch(e){}})();`
