{{-- Dégradés et filtre partagés par tous les orbes de la page, définis une seule fois : un SVG masqué par display:none
     ne fournirait pas ses dégradés aux autres. Les animations de l'orbe sont ici aussi. --}}
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
        <radialGradient id="mbo-body" cx="34%" cy="26%" r="80%">
            <stop offset="0" stop-color="#4a4a4a"/>
            <stop offset="0.38" stop-color="#1c1c1c"/>
            <stop offset="1" stop-color="#050505"/>
        </radialGradient>
        <filter id="mbo-eye" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
    </defs>
</svg>
<style>
    .mbo { display:block; flex-shrink:0; overflow:visible; }
    .mbo-center { margin-left:auto; margin-right:auto; }
    .mbo-s-thinking, .mbo-s-found { display:none; }
    .mbo[data-state="thinking"] .mbo-s-idle, .mbo[data-state="found"] .mbo-s-idle { display:none; }
    .mbo[data-state="thinking"] .mbo-s-thinking { display:inline; }
    .mbo[data-state="found"] .mbo-s-found { display:inline; }
    .mbo-blink { transform-box:fill-box; transform-origin:center; animation:mbo-blink 5.5s ease-in-out infinite; }
    .mbo-dot { animation:mbo-dot 1.1s ease-in-out infinite; }
    .mbo-dot:nth-of-type(4) { animation-delay:.18s; } .mbo-dot:nth-of-type(5) { animation-delay:.36s; }
    .mbo-ring { transform-box:fill-box; transform-origin:center; animation:mbo-spin 16s linear infinite; }
    .mbo[data-state="thinking"] .mbo-ring { animation-duration:2.6s; }
    @keyframes mbo-blink { 0%,44%,50%,100% { transform:scaleY(1); } 47% { transform:scaleY(.12); } }
    @keyframes mbo-dot { 0%,100% { opacity:.25; } 40% { opacity:1; } }
    @keyframes mbo-spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .mbo-blink, .mbo-dot, .mbo-ring { animation:none; } }
</style>
