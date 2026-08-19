/** Kenyan matatu — side-on van, sized like a path stop, not a speck. */
export const MatatuIcon = ({ className = 'h-full w-full' }: { className?: string }) => (
  <svg viewBox="0 0 220 130" className={className} role="img" aria-label="Matatu">
    <title>Matatu</title>
    <ellipse cx="110" cy="118" rx="78" ry="9" fill="#2E3A45" opacity="0.2" />
    <rect x="18" y="78" width="28" height="12" rx="3" fill="#2E3A45" />
    <rect x="168" y="78" width="28" height="12" rx="3" fill="#2E3A45" />
    <path d="M24 46 H148 C154 46 158 50 158 56 V92 H24 C18 92 14 88 14 82 V56 C14 50 18 46 24 46 Z" fill="#2BB3F3" stroke="#1A93CE" strokeWidth="3" />
    <path d="M148 40 H196 C206 40 212 48 212 58 V92 H158 V56 C158 48 154 40 148 40 Z" fill="#FF5CA8" stroke="#DB3B87" strokeWidth="3" />
    <path d="M158 44 H194 C202 44 206 50 206 56 V70 H158 Z" fill="#E0F5FE" stroke="#1A93CE" strokeWidth="2.5" />
    <circle cx="176" cy="58" r="7" fill="#FFE7F2" />
    <circle cx="176" cy="56" r="2.4" fill="#2E3A45" />
    <rect x="28" y="54" width="26" height="18" rx="4" fill="#E0F5FE" stroke="#1A93CE" strokeWidth="2" />
    <rect x="62" y="54" width="26" height="18" rx="4" fill="#E0F5FE" stroke="#1A93CE" strokeWidth="2" />
    <rect x="96" y="54" width="26" height="18" rx="4" fill="#E0F5FE" stroke="#1A93CE" strokeWidth="2" />
    <rect x="14" y="78" width="198" height="14" fill="#7ED957" />
    <rect x="14" y="88" width="198" height="8" fill="#FF5CA8" />
    <rect x="20" y="34" width="22" height="12" rx="3" fill="#7ED957" stroke="#5FB93B" strokeWidth="2" />
    <path d="M198 32 H214 L208 44 H198 Z" fill="#7ED957" stroke="#5FB93B" strokeWidth="2" />
    <circle cx="52" cy="102" r="18" fill="#2E3A45" />
    <circle cx="52" cy="102" r="11" fill="#E0F5FE" />
    <circle cx="52" cy="102" r="5" fill="#2BB3F3" />
    <circle cx="176" cy="102" r="18" fill="#2E3A45" />
    <circle cx="176" cy="102" r="11" fill="#E0F5FE" />
    <circle cx="176" cy="102" r="5" fill="#2BB3F3" />
    <rect x="204" y="80" width="10" height="10" rx="2" fill="#FACC15" stroke="#2E3A45" strokeWidth="1.5" />
    <rect x="8" y="80" width="8" height="8" rx="2" fill="#DB3B87" />
  </svg>
)
