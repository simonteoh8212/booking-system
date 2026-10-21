import fs from "fs";
import path from "path";
import sharp from "sharp";

const outDir = path.resolve("public/images/services");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Haircut Scissors & Comb SVG (512x512, Transparent)
const scissorsSvg = `
<svg width="512" height="512" viewBox="50 50 412 412" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Steel Blade Gradients -->
    <linearGradient id="bladeGrad1" x1="120" y1="120" x2="380" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#E2E8F0" />
      <stop offset="50%" stop-color="#94A3B8" />
      <stop offset="85%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="bladeGrad2" x1="380" y1="120" x2="120" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="30%" stop-color="#F1F5F9" />
      <stop offset="60%" stop-color="#CBD5E1" />
      <stop offset="90%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
    <linearGradient id="bladeHighlight" x1="200" y1="100" x2="260" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Handle Metallic Gradients -->
    <linearGradient id="handleGrad1" x1="100" y1="300" x2="220" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="40%" stop-color="#CBD5E1" />
      <stop offset="70%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="handleGrad2" x1="300" y1="300" x2="420" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="40%" stop-color="#CBD5E1" />
      <stop offset="70%" stop-color="#64748B" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>

    <!-- Comb Gradient -->
    <linearGradient id="combGrad" x1="80" y1="180" x2="440" y2="280" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>

    <!-- Jewel Pivot -->
    <radialGradient id="pivotJewel" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#075985" />
    </radialGradient>

    <!-- Drop Shadow -->
    <filter id="shadow3D" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.22" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.15" />
    </filter>
  </defs>

  <g filter="url(#shadow3D)">
    <!-- SALON COMB (Backdrop Element) -->
    <g transform="rotate(-32 256 256)">
      <!-- Comb Spine -->
      <rect x="70" y="240" width="372" height="28" rx="8" fill="url(#combGrad)" />
      <!-- Comb Spine Highlight -->
      <rect x="74" y="242" width="364" height="6" rx="3" fill="#64748B" fill-opacity="0.6" />
      <!-- Teeth (Fine) -->
      <path d="
        M90 268 v64 M100 268 v64 M110 268 v64 M120 268 v64 M130 268 v64 M140 268 v64 M150 268 v64
        M160 268 v64 M170 268 v64 M180 268 v64 M190 268 v64 M200 268 v64 M210 268 v64 M220 268 v64
        M230 268 v64 M240 268 v64 M250 268 v64
        M268 268 v72 M282 268 v72 M296 268 v72 M310 268 v72 M324 268 v72 M338 268 v72
        M352 268 v72 M366 268 v72 M380 268 v72 M394 268 v72 M408 268 v72 M422 268 v72
      " stroke="url(#combGrad)" stroke-width="4.5" stroke-linecap="round" />
    </g>

    <!-- LEFT BLADE (extends to top-left, handle at bottom-right) -->
    <path d="
      M256 256
      L140 80
      Q132 68 144 72
      L240 216
      Q256 240 266 256
      L328 340
      Q348 368 348 400
      A 42 42 0 1 1 292 364
      L256 256 Z
    " fill="url(#bladeGrad1)" stroke="#64748B" stroke-width="2" />

    <!-- RIGHT BLADE (extends to top-right, handle at bottom-left) -->
    <path d="
      M256 256
      L372 80
      Q380 68 368 72
      L272 216
      Q256 240 246 256
      L184 340
      Q164 368 164 400
      A 42 42 0 1 0 220 364
      L256 256 Z
    " fill="url(#bladeGrad2)" stroke="#94A3B8" stroke-width="2" />

    <!-- BLADE BEVEL & SHARP EDGES -->
    <path d="M142 75 L252 245" stroke="url(#bladeHighlight)" stroke-width="4" stroke-linecap="round" />
    <path d="M370 75 L260 245" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="3" stroke-linecap="round" />

    <!-- FINGER RINGS (ERGONOMIC SALON SHEARS) -->
    <!-- Left Ring Outer -->
    <circle cx="164" cy="406" r="42" fill="none" stroke="url(#handleGrad1)" stroke-width="18" />
    <circle cx="164" cy="406" r="42" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3" />
    <circle cx="164" cy="406" r="32" fill="none" stroke="#1E293B" stroke-width="2" />

    <!-- Right Ring Outer with Finger Rest / Tang -->
    <circle cx="348" cy="406" r="42" fill="none" stroke="url(#handleGrad2)" stroke-width="18" />
    <circle cx="348" cy="406" r="42" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3" />
    <circle cx="348" cy="406" r="32" fill="none" stroke="#1E293B" stroke-width="2" />
    <!-- Pinky Finger Rest (Tang) -->
    <path d="M386 424 Q418 438 436 430 Q442 422 432 414 Q410 412 388 416 Z" fill="url(#handleGrad2)" stroke="#64748B" stroke-width="1.5" />

    <!-- Rubber Bumper Stop -->
    <circle cx="256" cy="380" r="7" fill="#F59E0B" stroke="#D97706" stroke-width="2" />

    <!-- CENTER PIVOT SCREW & GEM -->
    <circle cx="256" cy="256" r="22" fill="#1E293B" stroke="#CBD5E1" stroke-width="3" />
    <circle cx="256" cy="256" r="16" fill="url(#handleGrad1)" />
    <circle cx="256" cy="256" r="11" fill="url(#pivotJewel)" />
    <circle cx="253" cy="253" r="3.5" fill="#FFFFFF" fill-opacity="0.8" />
  </g>
</svg>
`;

// 2. Hair Dye Tint Bowl & Brush SVG (512x512, Transparent)
const dyeSvg = `
<svg width="512" height="512" viewBox="40 50 432 412" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Bowl Gradients -->
    <linearGradient id="bowlBody" x1="100" y1="260" x2="412" y2="460" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="40%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="bowlRim" x1="100" y1="240" x2="412" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#64748B" />
      <stop offset="50%" stop-color="#94A3B8" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>

    <!-- Hair Color Creme Gradient (Glossy Purple-Magenta Tint) -->
    <radialGradient id="dyeColor" cx="48%" cy="46%" r="52%">
      <stop offset="0%" stop-color="#F43F5E" />
      <stop offset="35%" stop-color="#D946EF" />
      <stop offset="70%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#6B21A8" />
    </radialGradient>
    <linearGradient id="glossHighlight" x1="160" y1="270" x2="340" y2="310" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Brush Handle & Bristles -->
    <linearGradient id="brushHandle" x1="380" y1="60" x2="220" y2="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="30%" stop-color="#CBD5E1" />
      <stop offset="70%" stop-color="#475569" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="bristlesGrad" x1="180" y1="280" x2="240" y2="230" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#D946EF" />
      <stop offset="40%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>

    <filter id="shadow3D" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.25" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.18" />
    </filter>
  </defs>

  <g filter="url(#shadow3D)">
    <!-- BOWL BASE / OUTER SHELL -->
    <path d="
      M90 280
      C90 380 160 440 256 440
      C352 440 422 380 422 280
      C422 250 410 240 380 240
      L132 240
      C102 240 90 250 90 280 Z
    " fill="url(#bowlBody)" stroke="#475569" stroke-width="3" />

    <!-- Bowl Handle Tab (Classic Salon Tint Bowl) -->
    <path d="
      M94 250
      C64 250 48 270 48 290
      C48 310 68 318 90 310
    " fill="url(#bowlBody)" stroke="#475569" stroke-width="3" stroke-linecap="round" />
    <circle cx="70" cy="285" r="9" fill="#0F172A" />

    <!-- BOWL INNER BASIN / LIQUID RECESS -->
    <ellipse cx="256" cy="275" rx="150" ry="55" fill="#0F172A" stroke="url(#bowlRim)" stroke-width="6" />

    <!-- VIBRANT HAIR DYE MIXTURE -->
    <ellipse cx="256" cy="285" rx="136" ry="44" fill="url(#dyeColor)" />
    <!-- Glossy reflection on dye surface -->
    <path d="M160 280 Q250 310 340 278 Q250 295 160 280 Z" fill="url(#glossHighlight)" />
    <ellipse cx="220" cy="278" rx="36" ry="8" fill="#FFFFFF" fill-opacity="0.35" transform="rotate(-6 220 278)" />

    <!-- Measuring Grooves in Bowl -->
    <path d="M125 320 Q145 350 170 375" stroke="#475569" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
    <path d="M140 335 L155 330" stroke="#64748B" stroke-width="2" stroke-linecap="round" />
    <path d="M152 355 L168 350" stroke="#64748B" stroke-width="2" stroke-linecap="round" />

    <!-- DYE APPLICATOR BRUSH (Angled Across Bowl) -->
    <g transform="rotate(-18 280 220)">
      <!-- Long Pointed Sectioning Tail -->
      <path d="
        M440 90
        L230 225
        Q220 232 215 245
        L210 260
        L232 264
        L245 250
        L448 98
        Q452 94 440 90 Z
      " fill="url(#brushHandle)" stroke="#334155" stroke-width="2" />
      <path d="M440 92 L236 228" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="2" />

      <!-- Bristle Ferrule -->
      <path d="M205 250 L240 258 L232 278 L196 268 Z" fill="#1E293B" stroke="#64748B" stroke-width="1.5" />

      <!-- Bristles (Wide Angled Tint Brush) -->
      <path d="
        M196 268
        L160 320
        C155 328 165 335 174 332
        L225 300
        L232 278 Z
      " fill="url(#bristlesGrad)" />
      <!-- Bristle individual stroke accents -->
      <path d="
        M192 276 L164 322
        M202 279 L175 321
        M212 281 L187 318
        M222 284 L200 312
      " stroke="#F43F5E" stroke-width="2.5" stroke-linecap="round" />
      <!-- Wet color on brush tip -->
      <path d="M162 316 Q185 330 212 306" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8" fill="none" />
    </g>

    <!-- Floating Vibrant Sparkle/Droplets -->
    <circle cx="160" cy="180" r="10" fill="#D946EF" />
    <circle cx="157" cy="177" r="3.5" fill="#FFFFFF" />
    <circle cx="395" cy="185" r="7" fill="#F43F5E" />
    <circle cx="393" cy="183" r="2.5" fill="#FFFFFF" />
    <circle cx="360" cy="130" r="13" fill="#9333EA" />
    <circle cx="356" cy="126" r="4.5" fill="#FFFFFF" />
  </g>
</svg>
`;

// 3. Wash & Blow Dry Hair Dryer SVG (512x512, Transparent)
const washSvg = `
<svg width="512" height="512" viewBox="0 50 420 410" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Dryer Body Gradients (Modern Matte Obsidian + Rose Gold / Cyan Ring) -->
    <linearGradient id="dryerBody" x1="120" y1="120" x2="380" y2="280" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="35%" stop-color="#1E293B" />
      <stop offset="85%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accentRing" x1="280" y1="100" x2="330" y2="220" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#06B6D4" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="chromeNozzle" x1="100" y1="150" x2="160" y2="230" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#64748B" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Water & Breeze Gradients -->
    <linearGradient id="waterDroplet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E0F2FE" />
      <stop offset="50%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="windBreeze" x1="140" y1="160" x2="40" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#06B6D4" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#0284C7" stop-opacity="0" />
    </linearGradient>

    <filter id="shadow3D" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.25" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.18" />
    </filter>
  </defs>

  <g filter="url(#shadow3D)">
    <!-- HAIR DRYER (Modern Salon Ionic Styling Blower) -->
    <!-- Handle -->
    <path d="
      M265 240
      L295 410
      C298 428 285 442 268 442
      L240 442
      C224 442 212 428 215 410
      L235 240 Z
    " fill="url(#dryerBody)" stroke="#334155" stroke-width="2.5" />
    <!-- Handle Soft Grip Inlay -->
    <path d="M242 270 L260 395" stroke="#475569" stroke-width="6" stroke-linecap="round" />
    <!-- Rocker Switch on Handle -->
    <rect x="238" y="280" width="10" height="24" rx="4" fill="#020617" stroke="#64748B" stroke-width="1.5" />
    <circle cx="243" cy="288" r="2.5" fill="#EF4444" />
    <rect x="242" y="320" width="10" height="20" rx="4" fill="#020617" stroke="#64748B" stroke-width="1.5" />

    <!-- Main Barrel Cylindrical Body -->
    <rect x="140" y="130" width="220" height="110" rx="45" fill="url(#dryerBody)" stroke="#475569" stroke-width="3" />
    <!-- Highlight Reflection on Barrel -->
    <path d="M170 144 L320 144" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="6" stroke-linecap="round" />

    <!-- Rear Air Intake Filter (Fine Hex/Mesh Grill) -->
    <ellipse cx="360" cy="185" rx="24" ry="50" fill="#0F172A" stroke="url(#accentRing)" stroke-width="6" />
    <!-- Filter Mesh Lines -->
    <path d="
      M360 140 v90 M352 145 v80 M368 145 v80
      M344 155 v60 M376 155 v60
    " stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />

    <!-- Accent Styling Ring on Barrel -->
    <rect x="280" y="130" width="14" height="110" fill="url(#accentRing)" />

    <!-- Professional Styling Concentrator Nozzle (Left) -->
    <path d="
      M145 150
      L90 162
      C82 164 82 206 90 208
      L145 220 Z
    " fill="url(#chromeNozzle)" stroke="#475569" stroke-width="2" />
    <ellipse cx="88" cy="185" rx="5" ry="24" fill="#020617" stroke="#64748B" stroke-width="2" />

    <!-- DYNAMIC FRESH AIRFLOW & SHAMPOO WATER DROPLETS -->
    <!-- Airflow / Heat Styling Beams -->
    <path d="M78 174 Q40 170 15 160" stroke="url(#windBreeze)" stroke-width="4.5" stroke-linecap="round" />
    <path d="M78 185 Q30 185 8 190" stroke="url(#windBreeze)" stroke-width="6" stroke-linecap="round" />
    <path d="M78 196 Q40 200 20 215" stroke="url(#windBreeze)" stroke-width="4.5" stroke-linecap="round" />

    <!-- Water Droplet 1 (Large Fresh Wash Droplet) -->
    <path d="
      M70 110
      C70 110 50 135 50 150
      A 20 20 0 1 0 90 150
      C90 135 70 110 70 110 Z
    " fill="url(#waterDroplet)" />
    <circle cx="65" cy="148" r="4.5" fill="#FFFFFF" fill-opacity="0.8" />

    <!-- Water Droplet 2 (Medium) -->
    <path d="
      M125 75
      C125 75 110 92 110 102
      A 15 15 0 1 0 140 102
      C140 92 125 75 125 75 Z
    " fill="url(#waterDroplet)" />
    <circle cx="120" cy="100" r="3.5" fill="#FFFFFF" fill-opacity="0.8" />

    <!-- Water Droplet 3 (Bottom) -->
    <path d="
      M95 245
      C95 245 84 260 84 268
      A 11 11 0 1 0 106 268
      C106 260 95 245 95 245 Z
    " fill="url(#waterDroplet)" />
    <circle cx="92" cy="266" r="2.5" fill="#FFFFFF" fill-opacity="0.8" />

    <!-- Fresh Wash Suds / Bubbles -->
    <circle cx="140" cy="290" r="14" fill="none" stroke="#38BDF8" stroke-width="3" opacity="0.8" />
    <circle cx="136" cy="286" r="4" fill="#FFFFFF" opacity="0.9" />
    <circle cx="168" cy="330" r="9" fill="none" stroke="#38BDF8" stroke-width="2.5" opacity="0.7" />
    <circle cx="165" cy="327" r="2.5" fill="#FFFFFF" opacity="0.9" />
  </g>
</svg>
`;

async function main() {
  console.log("Generating transparent salon icons...");

  // Save SVGs
  fs.writeFileSync(path.join(outDir, "haircut.svg"), scissorsSvg.trim());
  fs.writeFileSync(path.join(outDir, "dye.svg"), dyeSvg.trim());
  fs.writeFileSync(path.join(outDir, "wash.svg"), washSvg.trim());
  console.log("SVGs saved.");

  // Convert to high-res transparent PNGs (512x512)
  await sharp(Buffer.from(scissorsSvg))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, "haircut.png"));

  await sharp(Buffer.from(dyeSvg))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, "dye.png"));

  await sharp(Buffer.from(washSvg))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, "wash.png"));

  console.log("PNGs generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
