{{-- Orbe de Mega Bo : celui de Bo (sphère noire, yeux rouges) avec un anneau rouge qui tourne et le distingue.
     États (data-state) : idle = les yeux clignent · thinking = yeux ronds et trois points · found = yeux rieurs.
     Les dégradés viennent de _orb-defs (inclus une fois par le layout) ; les animations de _orb-styles. --}}
<svg class="mbo {{ $class ?? '' }}" data-state="{{ $state ?? 'idle' }}" width="{{ $size ?? 40 }}" height="{{ $size ?? 40 }}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle class="mbo-ring" cx="50" cy="50" r="48.5" fill="none" stroke="#FF0000" stroke-width="2.4" stroke-dasharray="46 9" stroke-linecap="round" opacity="0.9"/>
    <circle cx="50" cy="50" r="41" fill="url(#mbo-body)"/>
    <ellipse cx="38" cy="29" rx="16" ry="9" fill="#fff" opacity="0.2" transform="rotate(-24 38 29)"/>
    <circle cx="29" cy="27" r="2.6" fill="#fff" opacity="0.45"/>
    <g filter="url(#mbo-eye)" fill="#FF0000" stroke="#FF0000">
        <g class="mbo-s-idle" stroke="none">
            <rect class="mbo-blink" x="35" y="42" width="8" height="18" rx="4"/>
            <rect class="mbo-blink" x="57" y="42" width="8" height="18" rx="4"/>
        </g>
        <g class="mbo-s-thinking" stroke="none">
            <circle cx="39" cy="46" r="5"/>
            <circle cx="61" cy="46" r="5"/>
            <circle class="mbo-dot" cx="42" cy="64" r="2.4"/>
            <circle class="mbo-dot" cx="50" cy="64" r="2.4"/>
            <circle class="mbo-dot" cx="58" cy="64" r="2.4"/>
        </g>
        <g class="mbo-s-found" fill="none" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M31 56 L38 48 L45 56"/>
            <path d="M55 56 L62 48 L69 56"/>
        </g>
    </g>
</svg>
