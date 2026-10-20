import type {SVGProps} from 'react';

type IconProps = {
  size?: number | string;
  className?: string;
};

type AccessibleArt = {
  label?: string;
  className?: string;
};

const accent = 'var(--visual-accent, #fb522f)';
const energy = 'var(--visual-energy, #f8d64e)';
const ink = 'var(--visual-ink, #111111)';

function artA11y(label?: string): Pick<SVGProps<SVGSVGElement>, 'role' | 'aria-label' | 'aria-hidden' | 'focusable'> {
  return label
    ? {role: 'img', 'aria-label': label, focusable: 'false'}
    : {'aria-hidden': true, focusable: 'false'};
}

/** A portal and a target in one mark: enter a Chog's arena, then face it. */
export function BrandGlyph({size = 44, className}: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...artA11y()}>
      <path d="M4 4h35c12 0 21 9 21 21s-9 21-21 21H23v14H4V4Z" fill="currentColor" />
      <path d="M23 22h16a4 4 0 0 1 0 8H23v-8Z" fill={ink} />
      <circle cx="39" cy="26" r="14" stroke={accent} strokeWidth="3" />
      <path d="M39 7v8m0 22v8M20 26h8m22 0h9" stroke={accent} strokeWidth="3" strokeLinecap="square" />
      <circle cx="39" cy="26" r="3" fill={energy} />
    </svg>
  );
}

export function ArrowIcon({direction = 'right', size = 20, className}: IconProps & {direction?: 'right' | 'left' | 'up' | 'down'}) {
  const angle = {right: 0, down: 90, left: 180, up: 270}[direction];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...artA11y()}>
      <path d="M4 12h15m-6-6 6 6-6 6" transform={`rotate(${angle} 12 12)`} stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function SoundIcon({muted = false, size = 22, className}: IconProps & {muted?: boolean}) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...artA11y()}>
      <path d="M3 9h4l5-4v14l-5-4H3V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <>
          <path d="M16 9a5 5 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M19 6a9 9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

type AttackFamily = 'pulse' | 'falling' | 'sweep' | 'orbit';

const signatureFamilies: Record<string, AttackFamily> = {
  'coin-rain': 'falling', 'token-rain': 'falling', 'gold-rain': 'falling', 'trait-rain': 'falling',
  'cell-bars': 'sweep', 'frost-sweep': 'sweep', 'stripe-sweep': 'sweep', 'body-sweep': 'sweep', 'visor-scan': 'sweep',
  'rally-orbit': 'orbit', 'spell-orbit': 'orbit', 'round-gaze': 'orbit', 'aura-spiral': 'orbit', 'eye-orbit': 'orbit',
  'ember-burst': 'pulse', 'joy-pulse': 'pulse', 'headwear-burst': 'pulse',
};

export function AttackDiagram({signatureId, family, className, label}: AccessibleArt & {signatureId?: string; family?: string}) {
  const kind: AttackFamily = signatureFamilies[signatureId || ''] || (
    family === 'falling' || family === 'sweep' || family === 'orbit' ? family : 'pulse'
  );
  const isCoin = signatureId === 'coin-rain';
  const isCell = signatureId === 'cell-bars';
  const isRally = signatureId === 'rally-orbit';

  return (
    <svg className={className} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" {...artA11y(label)}>
      <rect x="0.5" y="0.5" width="319" height="179" stroke="currentColor" strokeOpacity=".25" />
      <path d="M0 45h320M0 90h320M0 135h320M64 0v180m64-180v180m64-180v180m64-180v180" stroke="currentColor" strokeOpacity=".11" strokeWidth="1" />
      <path d="M9 13h14M9 13v14m302-14h-14m14 0v14M9 167h14m-14 0v-14m302 14h-14m14 0v-14" stroke="currentColor" strokeWidth="2" />
      <circle cx="159" cy="39" r="12" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="159" cy="39" r="4" fill={energy} />
      <path d="M159 54v8" stroke="currentColor" strokeWidth="2" />
      {kind === 'falling' && (
        <>
          {[71, 116, 161, 206, 251].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 69v75`} stroke={i % 2 ? 'currentColor' : accent} strokeOpacity={i % 2 ? '.4' : '.75'} strokeWidth="2" strokeDasharray="5 5" />
              <ellipse cx={x} cy={94 + (i % 2) * 19} rx="14" ry="9" fill={i % 2 ? energy : accent} />
              <ellipse cx={x} cy={94 + (i % 2) * 19} rx="9" ry="5" stroke={ink} strokeWidth="1.5" />
              {isCoin && <path d={`M${x - 3} ${94 + (i % 2) * 19}h6`} stroke={ink} strokeWidth="1.5" />}
            </g>
          ))}
          <path d="M56 154h220" stroke={accent} strokeWidth="3" />
        </>
      )}
      {kind === 'sweep' && (
        <>
          {[79, 109, 139].map((y, i) => (
            <g key={y}>
              <path d={`M${i % 2 ? 68 : 24} ${y}h${i % 2 ? 228 : 206}`} stroke={i === 1 ? energy : accent} strokeWidth="11" strokeLinecap="square" />
              {isCell && [61, 104, 147, 190, 233].map(x => <path key={`${y}-${x}`} d={`M${x} ${y - 6}v12`} stroke={ink} strokeWidth="3" />)}
              <path d={i % 2 ? `m81 ${y - 13}-12 13 12 13` : `m238 ${y - 13}12 13-12 13`} stroke="currentColor" strokeWidth="2" />
            </g>
          ))}
        </>
      )}
      {kind === 'orbit' && (
        <>
          <circle cx="160" cy="108" r="49" stroke={accent} strokeWidth="2" strokeDasharray="8 7" />
          <circle cx="160" cy="108" r="69" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
          {[0, 60, 120, 180, 240, 300].map(deg => {
            const x = 160 + Math.cos(deg * Math.PI / 180) * 49;
            const y = 108 + Math.sin(deg * Math.PI / 180) * 49;
            return isRally
              ? <path key={deg} d={`M${x} ${y - 9}l2.6 5.8 6.4.7-4.8 4.5 1.5 6.4-5.7-3.2-5.7 3.2 1.5-6.4-4.8-4.5 6.4-.7Z`} fill={energy} stroke={ink} strokeWidth="1" />
              : <circle key={deg} cx={x} cy={y} r="6" fill={energy} stroke={ink} strokeWidth="1.5" />;
          })}
          <circle cx="160" cy="108" r="9" fill={accent} />
        </>
      )}
      {kind === 'pulse' && (
        <>
          <circle cx="160" cy="73" r="14" fill={accent} />
          <path d="M160 73 64 152M160 73 108 158M160 73l0 91M160 73l52 85M160 73l96 79" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M160 73 40 160M160 73l120 87" stroke={energy} strokeWidth="2" strokeDasharray="5 6" />
          <circle cx="160" cy="73" r="30" stroke={energy} strokeWidth="2" />
        </>
      )}
      <path d="M282 24h20m-10-10v20" stroke={energy} strokeWidth="2" />
    </svg>
  );
}

/** 0..1 progress value; pair with an accessible text label in the parent UI. */
export function ScrollProgressGraphic({progress, className}: {progress: number; className?: string}) {
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return (
    <svg className={className} viewBox="0 0 100 4" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" {...artA11y()}>
      <rect x="0" y="0" width="100" height="4" fill="currentColor" fillOpacity=".2" />
      <rect x="0" y="0" width={value * 100} height="4" fill={accent} />
    </svg>
  );
}
