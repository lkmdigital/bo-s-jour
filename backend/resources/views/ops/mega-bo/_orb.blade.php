{{-- Orbe de Mega Bo : celui de Bo (sphère noire, yeux rouges), avec un anneau rouge qui le distingue. --}}
@php($uid = 'mb' . substr(md5(uniqid('', true)), 0, 6))
<svg width="{{ $size ?? 40 }}" height="{{ $size ?? 40 }}" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="{{ $class ?? '' }}">
    <defs>
        <radialGradient id="{{ $uid }}-body" cx="34%" cy="26%" r="80%">
            <stop offset="0" stop-color="#4a4a4a"/>
            <stop offset="0.38" stop-color="#1c1c1c"/>
            <stop offset="1" stop-color="#050505"/>
        </radialGradient>
        <filter id="{{ $uid }}-eye" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
    </defs>
    <circle cx="50" cy="50" r="48.5" fill="none" stroke="#FF0000" stroke-width="2.4" stroke-dasharray="46 9" stroke-linecap="round" opacity="0.9"/>
    <circle cx="50" cy="50" r="41" fill="url(#{{ $uid }}-body)"/>
    <ellipse cx="38" cy="29" rx="16" ry="9" fill="#fff" opacity="0.2" transform="rotate(-24 38 29)"/>
    <circle cx="29" cy="27" r="2.6" fill="#fff" opacity="0.45"/>
    <g filter="url(#{{ $uid }}-eye)" fill="#FF0000">
        <rect x="35" y="42" width="8" height="18" rx="4"/>
        <rect x="57" y="42" width="8" height="18" rx="4"/>
    </g>
</svg>
