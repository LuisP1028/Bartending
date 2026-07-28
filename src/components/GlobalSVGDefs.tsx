import React from 'react';
import CustomBottleDefs from './CustomBottleDefs';

export default function GlobalSVGDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
      <CustomBottleDefs />

{/* WELL BOTTLE */}
<clipPath clipPathUnits="userSpaceOnUse" id="well-clip"><path d="M 26 10 h 12 v 24 h 14 v 60 h -40 v -60 h 14 z"></path></clipPath>
<g id="well-outline">
<path className="outline" d="M 12 34 h 40 v 60 h -40 z M 26 10 h 12 v 24 h -12 z"></path>
<rect fill="#FFB000" height="8" width="8" x="28" y="2"></rect>
<rect fill="#FFF" height="20" width="4" x="16" y="44"></rect>
</g>
{/* SLENDER */}
<clipPath clipPathUnits="userSpaceOnUse" id="slen-clip"><path d="M 28 6 h 8 v 12 h 12 v 76 h -32 v -76 h 12 z"></path></clipPath>
<g id="slen-outline">
<path className="outline" d="M 16 18 h 32 v 76 h -32 z M 28 6 h 8 v 12 h -8 z"></path>
<rect fill="#111" height="6" width="8" x="28" y="0"></rect>
<rect fill="#FFF" height="30" width="4" x="20" y="30"></rect>
</g>
{/* DECANTER */}
<clipPath clipPathUnits="userSpaceOnUse" id="dec-clip"><path d="M 26 40 h 12 v 8 h 6 v 10 h 6 v 10 h 4 v 26 h -44 v -26 h 4 v -10 h 6 v -10 h 6 z"></path></clipPath>
<g id="dec-outline">
<path className="outline" d="M 20 48 v 10 h -6 v 10 h -4 v 26 h 44 v -26 h -4 v -10 h -6 v -10 z M 26 40 h 12 v 8 h -12 z"></path>
<rect fill="#FFB000" height="8" width="16" x="24" y="32"></rect>
<rect fill="#FFF" height="10" width="6" x="16" y="68"></rect>
</g>
{/* PREMIUM DECANTER */}
<clipPath clipPathUnits="userSpaceOnUse" id="prem-clip"><path d="M 28 14 h 8 v 14 h 4 v 10 h 4 v 10 h 4 v 10 h 4 v 36 h -40 v -36 h 4 v -10 h 4 v -10 h 4 v -10 h 4 z"></path></clipPath>
<g id="prem-outline">
<path className="outline" d="M 24 28 v 10 h -4 v 10 h -4 v 10 h -4 v 36 h 40 v -36 h -4 v -10 h -4 v -10 h -4 v -10 z M 28 14 h 8 v 14 h -8 z"></path>
<rect fill="#5D4037" height="8" width="16" x="24" y="6"></rect>
<rect fill="#FFF" height="14" width="4" x="18" y="60"></rect>
</g>
{/* ARTISANAL JUG */}
<clipPath clipPathUnits="userSpaceOnUse" id="jug-clip"><path d="M 26 22 h 12 v 12 h 6 v 8 h 6 v 6 h 4 v 8 h 2 v 22 h -2 v 8 h -4 v 6 h -6 v 4 h -24 v -4 h -6 v -6 h -4 v -8 h -2 v -22 h 2 v -8 h 4 v -6 h 6 v -8 h 6 z"></path></clipPath>
<g id="jug-outline">
<path d="M 20 34 v 8 h -6 v 6 h -4 v 8 h -2 v 22 h 2 v 8 h 4 v 6 h 6 v 4 h 24 v -4 h 6 v -6 h 4 v -8 h 2 v -22 h -2 v -8 h -4 v -6 h -6 v -8 z M 26 22 h 12 v 12 h -12 z" fill="var(--bg)" stroke="#4E342E" strokeWidth="2"></path>
<rect fill="#8D6E63" height="6" width="20" x="22" y="16"></rect>
<rect fill="#FFF" height="10" width="6" x="22" y="56"></rect>
</g>
{/* WELL 16-BIT */}
<g id="well-bg">
<path d="M 12 34 h 40 v 60 h -40 z M 26 10 h 12 v 24 h -12 z" fill="#1A1510"></path>
<rect fill="#0A0805" height="6" width="40" x="12" y="88"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="well-clip-16bit">
<path d="M 28 12 h 8 v 24 h 14 v 54 h -36 v -54 h 14 z"></path>
</clipPath>
<g id="well-fg">
<path d="M 12 34 h 40 v 60 h -40 z M 26 10 h 12 v 24 h -12 z" fill="none" stroke="var(--pixel-black)" strokeWidth="2"></path>
<path d="M 14 36 h 2 v 52 h -2 z M 28 12 h 2 v 22 h -2 z" fill="#FFFFFF" opacity="0.4"></path>
<path d="M 18 36 h 2 v 52 h -2 z" fill="#FFFFFF" opacity="0.1"></path>
<path d="M 48 36 h 2 v 52 h -2 z" fill="#000000" opacity="0.5"></path>
<rect fill="#8D6E63" height="6" stroke="var(--pixel-black)" strokeWidth="2" width="12" x="26" y="4"></rect>
<rect fill="#E8E6D9" height="24" stroke="var(--pixel-black)" strokeWidth="2" width="40" x="12" y="50"></rect>
<rect fill="#3E2723" height="4" width="28" x="18" y="54"></rect>
<rect fill="#795548" height="2" width="20" x="22" y="62"></rect>
</g>
{/* JUG 16-BIT */}
<g id="jug-bg">
<path d="M 20 34 v 8 h -6 v 6 h -4 v 8 h -2 v 22 h 2 v 8 h 4 v 6 h 6 v 4 h 24 v -4 h 6 v -6 h 4 v -8 h 2 v -22 h -2 v -8 h -4 v -6 h -6 v -8 z M 26 22 h 12 v 12 h -12 z" fill="#2E1B15"></path>
<path d="M 16 88 h 32 v 4 h -32 z" fill="#140B08"></path>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="jug-clip-16bit">
<path d="M 28 24 h 8 v 12 h 6 v 8 h 6 v 6 h 4 v 8 h 2 v 20 h -2 v 6 h -4 v 4 h -6 v 2 h -20 v -2 h -6 v -4 h -4 v -6 h -2 v -20 h 2 v -8 h 4 v -6 h 6 v -8 z"></path>
</clipPath>
<g id="jug-fg">
<path d="M 20 34 v 8 h -6 v 6 h -4 v 8 h -2 v 22 h 2 v 8 h 4 v 6 h 6 v 4 h 24 v -4 h 6 v -6 h 4 v -8 h 2 v -22 h -2 v -8 h -4 v -6 h -6 v -8 z M 26 22 h 12 v 12 h -12 z" fill="none" stroke="var(--pixel-black)" strokeWidth="2"></path>
<path d="M 52 56 v 22 h -2 v 6 h -4 v 4 h -2 v -32 z" fill="#000000" opacity="0.6"></path>
<path d="M 10 56 v 22 h 2 v -22 z M 12 48 v 8 h 2 v -8 z" fill="#FFFFFF" opacity="0.15"></path>
<path d="M 22 14 h 20 v 8 h -20 z M 26 22 h 4 v 6 h -4 z" fill="#A1887F" stroke="var(--pixel-black)" strokeWidth="2"></path>
<rect fill="#D7CCC8" height="20" stroke="#3E2723" strokeWidth="2" width="24" x="20" y="52"></rect>
<rect fill="#8D6E63" height="4" width="16" x="24" y="56"></rect>
</g>


{/* BITTERS */}
<clipPath clipPathUnits="userSpaceOnUse" id="bitter-clip"><path d="M 26 14 h 12 v 12 h 10 v 36 h -32 v -36 h 10 z"></path></clipPath>
<g id="bitter-outline">
<path className="outline" d="M 16 26 h 32 v 36 h -32 z M 26 14 h 12 v 12 h -12 z"></path>
<path d="M 22 8 h 20 v 6 h -20 z" fill="#FFB000"></path>
<rect fill="#FFF" height="12" width="4" x="20" y="30"></rect>
</g>
{/* SYRUP (ITALIAN BOTTLE) */}
<clipPath clipPathUnits="userSpaceOnUse" id="syrup-clip"><path d="M 12 30 v 32 h 40 v -32 h -2 v -4 h -4 v -4 h -4 v -4 h -4 v -4 h -2 v -6 h -8 v 6 h -2 v 4 h -4 v 4 h -4 v 4 h -4 v 4 h -2 z"></path></clipPath>
<g id="syrup-outline">
<path className="outline" d="M 12 30 v 32 h 40 v -32 h -2 v -4 h -4 v -4 h -4 v -4 h -4 v -4 h -2 v -6 h -8 v 6 h -2 v 4 h -4 v 4 h -4 v 4 h -4 v 4 h -2 z"></path>
<rect fill="#333" height="6" width="12" x="26" y="2"></rect>
<rect fill="#FFF" height="16" width="4" x="16" y="34"></rect>
</g>
{/* SQUEEZE BOTTLE */}
<clipPath clipPathUnits="userSpaceOnUse" id="sq-clip"><path d="M 28 8 h 8 v 16 h 12 v 40 h -32 v -40 h 12 z"></path></clipPath>
<g id="sq-outline">
<path className="outline" d="M 16 24 h 32 v 40 h -32 z M 28 8 h 8 v 16 h -8 z"></path>
{/* Nozzle */}
<path d="M 30 2 h 4 v 6 h -4 z" fill="#FFF" stroke="#000" strokeWidth="1"></path>
<rect fill="rgba(255,255,255,0.5)" height="20" width="4" x="20" y="30"></rect>
</g>


<clipPath clipPathUnits="userSpaceOnUse" id="rocks-clip">
<path d="M 14 44 V 76 H 50 V 44 Z"></path>
</clipPath>
<g id="rocks-outline">
<path className="outline" d="M 12 44 v 32 h 2 v 6 h 36 v -6 h 2 v -32 z"></path>
<rect fill="rgba(255,255,255,0.05)" height="6" width="36" x="14" y="76"></rect>
<rect fill="rgba(255,255,255,0.08)" height="6" width="32" x="16" y="76"></rect>
<rect fill="rgba(255,255,255,0.15)" height="2" width="36" x="14" y="76"></rect>
<rect fill="#FFF" height="10" width="4" x="16" y="50"></rect>
<rect fill="#FFF" height="6" width="4" x="16" y="66"></rect>
<rect fill="#FFF" height="2" width="12" x="16" y="78"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="highball-clip">
<path d="M 18 16 V 76 H 46 V 16 Z"></path>
</clipPath>
<g id="highball-outline">
<path className="outline" d="M 16 16 v 60 h 2 v 6 h 28 v -6 h 2 v -60 z"></path>
<rect fill="rgba(255,255,255,0.05)" height="6" width="28" x="18" y="76"></rect>
<rect fill="rgba(255,255,255,0.15)" height="2" width="28" x="18" y="76"></rect>
<rect fill="#FFF" height="16" width="4" x="20" y="24"></rect>
<rect fill="#FFF" height="16" width="4" x="20" y="44"></rect>
<rect fill="#FFF" height="8" width="4" x="20" y="64"></rect>
<rect fill="#FFF" height="2" width="10" x="24" y="78"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="collins-clip">
<path d="M 20 10 V 76 H 44 V 10 Z"></path>
</clipPath>
<g id="collins-outline">
<path className="outline" d="M 18 10 v 66 h 2 v 6 h 24 v -6 h 2 v -66 z"></path>
<rect fill="rgba(255,255,255,0.05)" height="6" width="24" x="20" y="76"></rect>
<rect fill="rgba(255,255,255,0.15)" height="2" width="24" x="20" y="76"></rect>
<rect fill="#FFF" height="16" width="4" x="22" y="24"></rect>
<rect fill="#FFF" height="16" width="4" x="22" y="44"></rect>
<rect fill="#FFF" height="8" width="4" x="22" y="64"></rect>
<rect fill="#FFF" height="2" width="10" x="26" y="78"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="coupe-clip">
<path d="M 10 36 V 44 h 4 v 6 h 6 v 4 h 6 v 2 H 38 v -2 h 6 v -4 h 6 v -6 h 4 V 36 Z"></path>
</clipPath>
<g id="coupe-outline">
<path className="outline" d="M 8 36 v 8 h 4 v 6 h 6 v 4 h 8 v 2 h 4 v 20 h -10 v 2 h -4 v 4 h 32 v -4 h -4 v -2 h -10 v -20 h 4 v -2 h 8 v -4 h 6 v -6 h 4 v -8 z"></path>
<rect fill="rgba(255,255,255,0.15)" height="2" width="24" x="20" y="54"></rect>
<rect fill="#FFF" height="6" width="2" x="12" y="40"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="48"></rect>
<rect fill="#FFF" height="10" width="2" x="30" y="60"></rect>
<rect fill="#FFF" height="2" width="6" x="20" y="80"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="martini-clip">
<path d="M 10 24 V 28 h 4 v 4 h 4 v 4 h 4 v 4 h 4 v 4 h 2 v 4 H 36 v -4 h 2 v -4 h 4 v -4 h 4 v -4 h 4 v -4 h 4 V 24 Z"></path>
</clipPath>
<g id="martini-outline">
<path className="outline" d="M 8 24 v 4 h 4 v 4 h 4 v 4 h 4 v 4 h 4 v 4 h 4 v 4 h 2 v 28 h -14 v 4 h 32 v -4 h -14 v -28 h 2 v -4 h 4 v -4 h 4 v -4 h 4 v -4 h 4 v -4 h 4 v -4 z"></path>
<rect fill="rgba(255,255,255,0.05)" height="4" width="12" x="26" y="44"></rect>
<rect fill="rgba(255,255,255,0.15)" height="2" width="12" x="26" y="44"></rect>
<rect fill="#FFF" height="4" width="4" x="12" y="28"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="36"></rect>
<rect fill="#FFF" height="12" width="2" x="30" y="56"></rect>
<rect fill="#FFF" height="2" width="4" x="20" y="80"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="nora-clip">
<path d="M 14 24 V 36 h 2 v 6 h 4 v 4 h 4 v 4 H 40 v -4 h 4 v -4 h 4 v -6 h 2 V 24 Z"></path>
</clipPath>
<g id="nora-outline">
<path className="outline" d="M 12 24 v 12 h 2 v 6 h 4 v 4 h 4 v 4 h 4 v 2 h 4 v 24 h -10 v 4 h 24 v -4 h -10 v -24 h 4 v -2 h 4 v -4 h 4 v -4 h 4 v -6 h 2 v -12 z"></path>
<rect fill="rgba(255,255,255,0.15)" height="2" width="16" x="24" y="50"></rect>
<rect fill="#FFF" height="8" width="2" x="16" y="28"></rect>
<rect fill="#FFF" height="4" width="4" x="20" y="42"></rect>
<rect fill="#FFF" height="12" width="2" x="30" y="60"></rect>
<rect fill="#FFF" height="2" width="8" x="24" y="80"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="flute-clip">
<path d="M 24 16 V 56 h 2 v 6 h 12 v -6 h 2 V 16 Z"></path>
</clipPath>
<g id="flute-outline">
<path className="outline" d="M 22 16 v 40 h 2 v 6 h 6 v 14 h -10 v 4 h 24 v -4 h -10 v -14 h 6 v -6 h 2 v -40 z"></path>
<rect fill="#FFF" height="16" width="2" x="26" y="24"></rect>
<rect fill="#FFF" height="8" width="2" x="26" y="46"></rect>
<rect fill="#FFF" height="6" width="2" x="30" y="66"></rect>
<rect fill="#FFF" height="2" width="6" x="24" y="80"></rect>
</g>
<clipPath clipPathUnits="userSpaceOnUse" id="ribbed-coupe-clip">
<path d="M 12 36 V 50 h 4 v 2 h 6 v 2 h 6 v 2 H 36 v -2 h 6 v -2 h 6 v -2 h 4 V 36 Z"></path>
</clipPath>
<g id="ribbed-coupe-outline">
<path className="outline" d="M 10 36 h 44 v 16 h -2 v 2 h -6 v 2 h -8 v 2 h -4 v 16 h 10 v 4 h -24 v -4 h 10 v -16 h -4 v -2 h -8 v -2 h -6 v -2 h -2 v -16 z"></path>
<rect fill="rgba(255,255,255,0.15)" height="2" width="8" x="28" y="56"></rect>
<g clipPath="url(#ribbed-coupe-clip)">
<path d="M 14 36 v 24 M 18 36 v 24 M 22 36 v 24 M 26 36 v 24 M 30 36 v 24 M 34 36 v 24 M 38 36 v 24 M 42 36 v 24 M 46 36 v 24 M 50 36 v 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"></path>
<rect fill="#000" height="2" width="2" x="24" y="52"></rect>
<rect fill="#000" height="2" width="2" x="38" y="52"></rect>
<rect fill="#000" height="2" width="2" x="28" y="54"></rect>
<rect fill="#000" height="2" width="2" x="34" y="54"></rect>
<rect fill="#FFF" height="2" width="4" x="30" y="52"></rect>
<rect fill="#FFF" height="2" width="2" x="20" y="50"></rect>
<rect fill="#FFF" height="2" width="2" x="42" y="50"></rect>
</g>
<rect fill="#FFF" height="16" width="2" x="30" y="60"></rect>
<rect fill="#FFF" height="2" width="10" x="24" y="80"></rect>
</g>


<g id="citrus-wheel">
<path d="M 24 10 h 16 v 4 h 8 v 4 h 4 v 8 h 4 v 16 h -4 v 8 h -4 v 4 h -8 v 4 h -16 v -4 h -8 v -4 h -4 v -8 h -4 v -16 h 4 v -8 h 4 v -4 h 8 z" fill="var(--rind)" stroke="#000" strokeWidth="2"></path>
<path d="M 26 14 h 12 v 4 h 6 v 6 h 4 v 16 h -4 v 6 h -6 v 4 h -12 v -4 h -6 v -6 h -4 v -16 h 4 v -6 h 6 z" fill="#FFF"></path>
<rect fill="var(--pulp)" height="8" width="8" x="28" y="18"></rect>
<rect fill="var(--pulp)" height="6" width="6" x="40" y="24"></rect>
<rect fill="var(--pulp)" height="8" width="4" x="42" y="34"></rect>
<rect fill="var(--pulp)" height="6" width="8" x="28" y="42"></rect>
<rect fill="var(--pulp)" height="8" width="6" x="18" y="34"></rect>
<rect fill="var(--pulp)" height="8" width="6" x="18" y="22"></rect>
<rect fill="#FFF" height="2" width="6" x="26" y="12"></rect>
</g>
<g id="pineapple-slice">
<path d="M 24 8 h 16 v 4 h 10 v 6 h 4 v 4 h 2 v 10 h -2 v 8 h -4 v 4 h -10 v 6 h -16 v -6 h -8 v -4 h -4 v -8 h -2 v -10 h 2 v -4 h 4 v -6 h 8 z M 24 12 h 16 v 4 h 8 v 4 h 4 v 12 h -4 v 8 h -8 v 4 h -16 v -4 h -8 v -8 h -4 v -12 h 4 v -4 h 8 z" fill="#5D4037" fillRule="evenodd"></path>
<path d="M 24 12 h 16 v 4 h 8 v 4 h 4 v 12 h -4 v 8 h -8 v 4 h -16 v -4 h -8 v -8 h -4 v -12 h 4 v -4 h 8 z M 28 28 h 8 v 8 h -8 z" fill="#B8860B" fillRule="evenodd"></path>
<path d="M 32 12 v 16 M 32 36 v 16 M 12 32 h 16 M 36 32 h 16 M 22 22 v 6 M 42 22 v 6 M 22 42 v -6 M 42 42 v -6" fill="none" stroke="#8B6508" strokeWidth="2"></path>
<rect fill="none" height="8" stroke="#2c1e1a" strokeWidth="2" width="8" x="28" y="28"></rect>
</g>

<g id="herbrosemarysprig">
<rect fill="#4E342E" height="50" stroke="#050505" strokeWidth="2" width="4" x="30" y="10"></rect>
<rect fill="#6D4C41" height="46" width="2" x="30" y="12"></rect>
<g fill="#388E3C" stroke="#050505" strokeWidth="2">
<path d="M 30 50 h -6 v -6 h 4 v 2 h 2 z"></path>
<path d="M 30 42 h -8 v -6 h 4 v 2 h 4 z"></path>
<path d="M 30 34 h -6 v -6 h 4 v 2 h 2 z"></path>
<path d="M 30 26 h -8 v -6 h 4 v 2 h 4 z"></path>
<path d="M 30 18 h -6 v -6 h 4 v 2 h 2 z"></path>
<path d="M 34 46 h 6 v -6 h -4 v 2 h -2 z"></path>
<path d="M 34 38 h 8 v -6 h -4 v 2 h -4 z"></path>
<path d="M 34 30 h 6 v -6 h -4 v 2 h -2 z"></path>
<path d="M 34 22 h 8 v -6 h -4 v 2 h -4 z"></path>
<path d="M 34 14 h 6 v -6 h -4 v 2 h -2 z"></path>
<path d="M 30 10 h -2 v -4 h 2 v -4 h 4 v 4 h 2 v 4 z"></path>
</g>
<g fill="#A5D6A7">
<rect height="2" width="2" x="24" y="44"></rect>
<rect height="2" width="2" x="22" y="36"></rect>
<rect height="2" width="2" x="24" y="28"></rect>
<rect height="2" width="2" x="22" y="20"></rect>
<rect height="2" width="2" x="24" y="12"></rect>
<rect height="2" width="2" x="38" y="40"></rect>
<rect height="2" width="2" x="40" y="32"></rect>
<rect height="2" width="2" x="38" y="24"></rect>
<rect height="2" width="2" x="40" y="16"></rect>
<rect height="2" width="2" x="38" y="8"></rect>
<rect height="2" width="4" x="30" y="2"></rect>
</g>
</g>
<g id="herbfreshmintsprig">
{/* Base Stem Horizontal */}
<path d="M 12 22 h 20 v 4 h -20 z" fill="#1B5E20" stroke="#050505" strokeWidth="2"></path>
{/* Leaf Cluster Left */}
<path d="M 16 22 h -4 v -4 h -4 v -4 h -4 v 4 h 4 v 4 h 4 v 4 h 4 z" fill="#2E7D32" stroke="#050505" strokeWidth="2"></path>
<path d="M 16 22 h -4 v -4 h -4 v -4 h -4 v 4 h 4 v 4 h 4 z" fill="#4CAF50"></path>
{/* Leaf Cluster Center/Right (Buoyant profile) */}
<path d="M 24 22 h 4 v -8 h 4 v -4 h -4 v 4 h -4 v 8 z" fill="#2E7D32" stroke="#050505" strokeWidth="2"></path>
<path d="M 28 22 v -8 h 4 v -4 h -4 v 4 h -4 v 8 h 4 z" fill="#4CAF50"></path>
<rect fill="#81C784" height="4" width="4" x="26" y="12"></rect>
{/* Right Leaf Overhang */}
<path d="M 32 22 h 8 v 4 h -8 z" fill="#2E7D32" stroke="#050505" strokeWidth="2"></path>
<path d="M 32 22 h 8 v 4 h -8 z" fill="#4CAF50"></path>
<rect fill="#81C784" height="2" width="4" x="34" y="22"></rect>
</g>
<g id="producecucumberwheel">
<path d="M 20 8 h 24 v 4 h 8 v 8 h 4 v 24 h -4 v 8 h -8 v 4 h -24 v -4 h -8 v -8 h -4 v -24 h 4 v -8 h 8 z" fill="#E8F5E9" stroke="#1B5E20" strokeWidth="4"></path>
<rect fill="#C8E6C9" height="4" width="4" x="24" y="24"></rect>
<rect fill="#C8E6C9" height="4" width="4" x="36" y="36"></rect>
<rect fill="#C8E6C9" height="4" width="4" x="24" y="36"></rect>
<rect fill="#C8E6C9" height="4" width="4" x="36" y="24"></rect>
</g>
<g id="producejalapenoslice">
<path d="M 24 20 h 16 v 4 h 4 v 16 h -4 v 4 h -16 v -4 h -4 v -16 h 4 z" fill="#4CAF50" stroke="#1B5E20" strokeWidth="2"></path>
<rect fill="#FFF" height="2" width="2" x="28" y="28"></rect>
<rect fill="#FFF" height="2" width="2" x="34" y="32"></rect>
<rect fill="#FFF" height="2" width="2" x="28" y="34"></rect>
</g>
<g id="accentedibleflower">
<path d="M 32 10 l 8 16 l 16 2 l -12 12 l 4 16 l -16 -10 l -16 10 l 4 -16 l -12 -12 l 16 -2 z" fill="#E91E63" stroke="#000" strokeWidth="2"></path>
<rect fill="#FFEB3B" height="8" width="8" x="28" y="32"></rect>
</g>
<g id="accentchilithreads">
<path d="M 20 20 l 10 30 M 24 50 l 20 -20 M 40 10 l -10 40 M 10 30 l 40 10" fill="none" stroke="#D32F2F" strokeWidth="1"></path>
</g>
<g id="accentespressobeans">
<path d="M 20 36 h 8 v 2 h 4 v 6 h -2 v 4 h -6 v 2 h -8 v -2 h -2 v -6 h 2 v -4 h 4 z" fill="#3E2723"></path>
<path d="M 22 38 v 2 h 2 v 4 h 2 v 4 h 2" fill="none" stroke="#1C110F" strokeWidth="2"></path>
<rect fill="#5D4037" height="2" width="2" x="22" y="38"></rect>
<path d="M 32 20 h 10 v 4 h 2 v 8 h -2 v 4 h -10 v -4 h -2 v -8 h 2 z" fill="#3E2723"></path>
<path d="M 34 24 h 6 v 4 h 2" fill="none" stroke="#1C110F" strokeWidth="2"></path>
<rect fill="#5D4037" height="2" width="4" x="36" y="22"></rect>
<path d="M 40 32 h 6 v 4 h 2 v 8 h -4 v 2 h -6 v -4 h -2 v -8 h 4 z" fill="#3E2723"></path>
<path d="M 42 34 v 6 h -2 v 4" fill="none" stroke="#1C110F" strokeWidth="2"></path>
<rect fill="#5D4037" height="4" width="2" x="42" y="34"></rect>
</g>
<g id="accentcoffeebeans">
<path d="M 24 24 h 16 v 4 h 4 v 8 h -4 v 4 h -16 v -4 h -4 v -8 h 4 z" fill="#4A2C1F"></path>
<path d="M 28 26 h 8 v 4 h 2 v 2" fill="none" stroke="#2A1810" strokeWidth="2"></path>
<rect fill="#6B412D" height="2" width="4" x="30" y="26"></rect>
</g>
<g id="accentchocolatestrips">
<path d="M 16 20 h 8 v 4 h 8 v 4 h 8 v 4 h -8 v 4 h -8 v -4 h -8 v -4 h -4 z" fill="#2C1F1F"></path>
<path d="M 36 40 h 8 v 4 h 8 v 4 h 4 v 4 h -8 v 4 h -8 v -4 h -4 z" fill="#2C1F1F"></path>
<path d="M 12 44 h 6 v 4 h 2 v 4 h 6 v 2 h -6 v -4 h -6 v -4 z" fill="#1A1212"></path>
</g>
<g id="accentwhitechocolate">
<path d="M 16 20 h 8 v 4 h 8 v 4 h 8 v 4 h -8 v 4 h -8 v -4 h -8 v -4 h -4 z" fill="#F5EDE3"></path>
<path d="M 18 20 h 6 v 4 h 6 v 4 h 4 v 4" fill="none" stroke="#FFFFFF" strokeWidth="2"></path>
<path d="M 36 40 h 8 v 4 h 8 v 4 h 4 v 4 h -8 v 4 h -8 v -4 h -4 z" fill="#F5EDE3"></path>
</g>
<g id="accentcocoanibs">
<rect fill="#3C2F2F" height="4" width="4" x="20" y="24"></rect>
<rect fill="#1C1111" height="4" width="2" x="26" y="20"></rect>
<rect fill="#3C2F2F" height="4" width="6" x="32" y="26"></rect>
<rect fill="#1C1111" height="6" width="4" x="40" y="22"></rect>
<rect fill="#3C2F2F" height="4" width="4" x="28" y="32"></rect>
<rect fill="#3C2F2F" height="2" width="6" x="36" y="34"></rect>
<rect fill="#1C1111" height="2" width="4" x="22" y="38"></rect>
<rect fill="#3C2F2F" height="4" width="4" x="42" y="38"></rect>
</g>
<g id="herbcinnamonstick">
<rect fill="#C66F2E" height="48" width="12" x="26" y="8"></rect>
<rect fill="#8A4A1C" height="48" width="4" x="26" y="8"></rect>
<path d="M 26 8 h 12 v 4 h -8 v 4 h 6 v 4 h -10 z" fill="#5D2D0C"></path>
<rect fill="#C66F2E" height="2" width="4" x="18" y="44"></rect>
<rect fill="#8A4A1C" height="4" width="2" x="42" y="36"></rect>
</g>
<g id="herbcinnamonflakes">
<rect fill="#D4A017" height="2" width="4" x="20" y="20"></rect>
<rect fill="#C66F2E" height="4" width="2" x="32" y="16"></rect>
<rect fill="#D4A017" height="2" width="2" x="40" y="26"></rect>
<rect fill="#8A4A1C" height="2" width="2" x="18" y="32"></rect>
<rect fill="#D4A017" height="4" width="4" x="28" y="36"></rect>
<rect fill="#C66F2E" height="2" width="4" x="38" y="40"></rect>
<rect fill="#D4A017" height="2" width="2" x="24" y="48"></rect>
<rect fill="#8A4A1C" height="4" width="2" x="44" y="44"></rect>
</g>
<g id="herbstaranise">
<path d="M 30 16 h 4 v 6 h 6 v -4 h 4 v 10 h 6 v 4 h -8 v 4 h 8 v 4 h -6 v 10 h -4 v -4 h -6 v 6 h -4 v -6 h -6 v 4 h -4 v -10 h -6 v -4 h 8 v -4 h -8 v -4 h 6 v -10 h 4 v 4 h 6 z" fill="#D4A017" stroke="#8A4A1C" strokeWidth="2"></path>
<rect fill="#F5E1C2" height="4" width="4" x="30" y="30"></rect>
<path d="M 32 18 v 12 M 32 34 v 12 M 18 32 h 12 M 34 32 h 12" fill="none" stroke="#F5E1C2" strokeWidth="2"></path>
</g>
<g id="herbfreshgingerslice">
<path d="M 24 16 h 16 v 4 h 8 v 24 h -8 v 4 h -16 v -4 h -8 v -24 h 8 z" fill="#FFF59D"></path>
<path d="M 26 22 h 12 v 4 h 4 v 12 h -4 v 4 h -12 v -4 h -4 v -12 h 4 z" fill="#FBC02D"></path>
<path d="M 24 16 h 16 v 4 h 8 v 24 h -8 v 4 h -16 v -4 h -8 v -24 h 8 z" fill="none" stroke="#D4A017" strokeWidth="2"></path>
</g>
<g id="herblemonzest">
<path d="M 16 16 h 16 v 8 h -8 v 8 h 16 v 8 h -8 v 8 h 16 v 8 h -4 v -4 h -16 v -8 h 8 v -8 h -16 v -8 h 8 v -8 h -16 z" fill="#C0CA33" stroke="#050505" strokeWidth="2"></path>
<path d="M 18 18 h 12 v 8 h -8 v 8 h 12 v 8 h -8 v 8 h 12" fill="none" stroke="#FBC02D" strokeWidth="4"></path>
</g>
<g id="herborangezest">
<path d="M 16 16 h 16 v 8 h -8 v 8 h 16 v 8 h -8 v 8 h 16 v 8 h -4 v -4 h -16 v -8 h 8 v -8 h -16 v -8 h 8 v -8 h -16 z" fill="#E65100" stroke="#050505" strokeWidth="2"></path>
<path d="M 18 18 h 12 v 8 h -8 v 8 h 12 v 8 h -8 v 8 h 12" fill="none" stroke="#FF8F00" strokeWidth="4"></path>
</g>
<g id="herbthymesprig">
<rect fill="#4E342E" height="48" width="2" x="30" y="8"></rect>
<rect fill="#4CAF50" height="4" width="4" x="26" y="12"></rect>
<rect fill="#2E7D32" height="4" width="4" x="32" y="16"></rect>
<rect fill="#388E3C" height="4" width="6" x="24" y="24"></rect>
<rect fill="#4CAF50" height="4" width="6" x="32" y="32"></rect>
<rect fill="#2E7D32" height="4" width="4" x="26" y="40"></rect>
</g>
<g id="producemaraschinocherry">
<path d="M 28 28 h 12 v 4 h 4 v 12 h -4 v 4 h -12 v -4 h -4 v -12 h 4 z" fill="#E91E63" stroke="#880E4F" strokeWidth="2"></path>
<rect fill="#FCE4EC" height="2" width="4" x="30" y="30"></rect>
<path d="M 34 28 v -4 h -4 v -8 h -4 v -4 h 8" fill="none" stroke="#1B5E20" strokeWidth="2"></path>
</g>
<g id="produceluxardocherry">
<path d="M 28 28 h 12 v 4 h 4 v 12 h -4 v 4 h -12 v -4 h -4 v -12 h 4 z" fill="#9B1D4E" stroke="#111111" strokeWidth="2"></path>
<rect fill="#D81B60" height="2" width="4" x="30" y="30"></rect>
<path d="M 34 28 v -4 h -4 v -8 h -4 v -4 h 8" fill="none" stroke="#333333" strokeWidth="2"></path>
</g>
<g id="producegreenolive">
<path d="M 24 28 h 20 v 4 h 4 v 12 h -4 v 4 h -20 v -4 h -4 v -12 h 4 z" fill="#8BC34A" stroke="#33691E" strokeWidth="2"></path>
<rect fill="#FF0000" height="8" width="8" x="30" y="32"></rect>
<path d="M 24 28 h 4 v 4 h -4 z" fill="#C5E1A5"></path>
</g>
<g id="producecocktailonion">
<path d="M 26 28 h 12 v 2 h 4 v 12 h -2 v 4 h -12 v -4 h -2 v -12 h 2 z" fill="#F5EDE3" stroke="#D7CCC8" strokeWidth="2"></path>
<rect fill="#FFFFFF" height="4" width="6" x="28" y="30"></rect>
<path d="M 30 46 v 4 M 34 46 v 2" fill="none" stroke="#8D6E63" strokeWidth="2"></path>
</g>
<g id="producecucumberribbon">
<path d="M 24 8 h 16 v 8 h -8 v 12 h 16 v 8 h -16 v 12 h 8 v 8 h -16 v -8 h -8 v -12 h 16 v -8 h -16 v -12 h 8 z" fill="#C8E6C9" stroke="#8BC34A" strokeWidth="2"></path>
</g>
<g id="driedpineapplewedge">
<path d="M 16 16 h 24 v 8 h -6 v 8 h -6 v 8 h -6 v 8 h -6 z" fill="#FBC02D" stroke="#5D4037" strokeWidth="2"></path>
<path d="M 20 24 v 16 M 26 24 v 8" fill="none" stroke="#F57F17" strokeWidth="2"></path>
</g>
<g id="accentchilithreadssmoked">
<path d="M 20 20 h 4 v 12 h -8 v 20 h 6 v -12 h 12 v 6 h -4 v 8" fill="none" stroke="#D32F2F" strokeWidth="2"></path>
<path d="M 40 24 h -8 v 8 h 12 v 8 h -6 v 12" fill="none" stroke="#B71C1C" strokeWidth="2"></path>
</g>
<g id="accentediblegoldleaf">
<rect fill="#FFD700" height="6" width="8" x="22" y="24"></rect>
<rect fill="#FFEA00" height="4" width="6" x="36" y="22"></rect>
<rect fill="#FBC02D" height="8" width="10" x="26" y="38"></rect>
<rect fill="#FFD700" height="4" width="4" x="42" y="40"></rect>
<rect fill="#FFEA00" height="8" width="4" x="18" y="36"></rect>
</g>
<g id="accentlavenderbuds">
<rect fill="#7CB342" height="32" width="4" x="30" y="16"></rect>
<rect fill="#8E24AA" height="4" width="4" x="26" y="16"></rect>
<rect fill="#E1BEE7" height="4" width="4" x="34" y="20"></rect>
<rect fill="#BA68C8" height="4" width="6" x="24" y="26"></rect>
<rect fill="#8E24AA" height="4" width="6" x="34" y="32"></rect>
<rect fill="#E1BEE7" height="4" width="4" x="26" y="38"></rect>
</g>
<g id="KOSHER_SALT_SEA_SALT">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
{/* Salt Blocks */}
<rect fill="#FFF" height="4" width="4" x="2" y="4"></rect>
<rect fill="#DDD" height="6" width="6" x="8" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="6"></rect>
<rect fill="#EEE" height="6" width="8" x="22" y="4"></rect>
<rect fill="#FFF" height="8" width="4" x="32" y="2"></rect>
<rect fill="#DDD" height="4" width="6" x="40" y="6"></rect>
<rect fill="#FFF" height="6" width="4" x="50" y="4"></rect>
</g>\n<g id="TAJIN_CHILE_LIME">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
{/* Dense Tajin blocks: Brick Red, Orange, Green */}
<rect fill="#D84315" height="4" width="60" x="0" y="6"></rect>
<rect fill="#1B5E20" height="4" width="4" x="4" y="4"></rect>
<rect fill="#E64A19" height="6" width="6" x="10" y="2"></rect>
<rect fill="#1B5E20" height="4" width="4" x="20" y="6"></rect>
<rect fill="#D84315" height="8" width="8" x="28" y="2"></rect>
<rect fill="#E64A19" height="4" width="4" x="40" y="4"></rect>
<rect fill="#1B5E20" height="6" width="6" x="48" y="2"></rect>
<rect fill="#D84315" height="6" width="4" x="56" y="4"></rect>
</g>\n<g id="BLACK_SALT_LAVA_SALT">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#212121" height="4" width="60" x="0" y="6"></rect>
<rect fill="#424242" height="6" width="6" x="2" y="2"></rect>
<rect fill="#111" height="4" width="8" x="12" y="4"></rect>
<rect fill="#424242" height="6" width="6" x="24" y="2"></rect>
<rect fill="#111" height="6" width="4" x="36" y="4"></rect>
<rect fill="#212121" height="6" width="6" x="44" y="2"></rect>
<rect fill="#424242" height="4" width="4" x="52" y="6"></rect>
</g>\n<g id="SMOKED_SALT_HICKORY">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#795548" height="4" width="60" x="0" y="4"></rect>
<rect fill="#5D4037" height="6" width="6" x="4" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="14" y="2"></rect>
<rect fill="#8D6E63" height="4" width="6" x="22" y="4"></rect>
<rect fill="#4E342E" height="6" width="6" x="32" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="42" y="4"></rect>
<rect fill="#8D6E63" height="6" width="6" x="50" y="2"></rect>
</g>\n<g id="CINNAMON_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#FFF" height="4" width="4" x="2" y="4"></rect>
<rect fill="#D4A017" height="6" width="6" x="8" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="6"></rect>
<rect fill="#D4A017" height="6" width="8" x="22" y="4"></rect>
<rect fill="#FFF" height="8" width="4" x="32" y="2"></rect>
<rect fill="#D4A017" height="4" width="6" x="40" y="6"></rect>
<rect fill="#FFF" height="6" width="4" x="50" y="4"></rect>
</g>\n<g id="CHILI_CINNAMON_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#D84315" height="4" width="60" x="0" y="6"></rect>
<rect fill="#D4A017" height="4" width="4" x="4" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="10" y="2"></rect>
<rect fill="#D4A017" height="4" width="4" x="20" y="6"></rect>
<rect fill="#D84315" height="8" width="8" x="28" y="2"></rect>
<rect fill="#D4A017" height="4" width="4" x="40" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="48" y="2"></rect>
<rect fill="#D84315" height="6" width="4" x="56" y="4"></rect>
</g>\n<g id="COCOA_POWDER">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#3E2723" height="4" width="60" x="0" y="6"></rect>
<rect fill="#1C1310" height="6" width="6" x="2" y="2"></rect>
<rect fill="#3E2723" height="4" width="8" x="12" y="4"></rect>
<rect fill="#1C1310" height="6" width="6" x="24" y="2"></rect>
<rect fill="#3E2723" height="6" width="4" x="36" y="4"></rect>
<rect fill="#3E2723" height="6" width="6" x="44" y="2"></rect>
<rect fill="#1C1310" height="4" width="4" x="52" y="6"></rect>
</g>\n<g id="VANILLA_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#FFF" height="4" width="4" x="2" y="4"></rect>
<rect fill="#F5E1C2" height="6" width="6" x="8" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="6"></rect>
<rect fill="#F5E1C2" height="6" width="8" x="22" y="4"></rect>
<rect fill="#FFF" height="8" width="4" x="32" y="2"></rect>
<rect fill="#F5E1C2" height="4" width="6" x="40" y="6"></rect>
<rect fill="#FFF" height="6" width="4" x="50" y="4"></rect>
</g>\n<g id="DEMERARA_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#C66F2E" height="4" width="60" x="0" y="4"></rect>
<rect fill="#8C4000" height="6" width="6" x="4" y="2"></rect>
<rect fill="#C66F2E" height="4" width="4" x="14" y="2"></rect>
<rect fill="#8C4000" height="4" width="6" x="22" y="4"></rect>
<rect fill="#C66F2E" height="6" width="6" x="32" y="2"></rect>
<rect fill="#8C4000" height="4" width="4" x="42" y="4"></rect>
<rect fill="#C66F2E" height="6" width="6" x="50" y="2"></rect>
</g>\n<g id="TAJIN_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#D84315" height="4" width="60" x="0" y="6"></rect>
<rect fill="#FFF" height="4" width="4" x="4" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="10" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="20" y="6"></rect>
<rect fill="#D84315" height="8" width="8" x="28" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="40" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="48" y="2"></rect>
<rect fill="#D84315" height="6" width="4" x="56" y="4"></rect>
</g>\n<g id="SMOKED_PAPRIKA">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#8B4513" height="2" width="60" x="0" y="6"></rect>
{/* Dust effect */}
<rect fill="#8B4513" height="2" width="2" x="2" y="4"></rect>
<rect fill="#8B4513" height="2" width="2" x="12" y="6"></rect>
<rect fill="#8B4513" height="2" width="2" x="24" y="4"></rect>
<rect fill="#8B4513" height="2" width="2" x="34" y="6"></rect>
<rect fill="#8B4513" height="2" width="2" x="44" y="4"></rect>
<rect fill="#8B4513" height="2" width="2" x="54" y="6"></rect>
</g>\n<g id="BLACK_LAVA_SALT_CHILI">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#212121" height="4" width="60" x="0" y="6"></rect>
<rect fill="#D84315" height="6" width="6" x="2" y="2"></rect>
<rect fill="#212121" height="4" width="8" x="12" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="24" y="2"></rect>
<rect fill="#212121" height="6" width="4" x="36" y="4"></rect>
<rect fill="#D84315" height="6" width="6" x="44" y="2"></rect>
<rect fill="#212121" height="4" width="4" x="52" y="6"></rect>
</g>\n<g id="GOLD_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
{/* Sparser luxury gold specs */}
<rect fill="#FFD700" height="4" width="4" x="4" y="4"></rect>
<rect fill="#FFD700" height="4" width="4" x="16" y="2"></rect>
<rect fill="#FFD700" height="4" width="4" x="32" y="6"></rect>
<rect fill="#FFD700" height="4" width="4" x="46" y="2"></rect>
<rect fill="#FFD700" height="4" width="2" x="56" y="4"></rect>
</g>\n<g id="MATCHA_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#FFF" height="4" width="4" x="2" y="4"></rect>
<rect fill="#8BC34A" height="6" width="6" x="8" y="2"></rect>
<rect fill="#FFF" height="4" width="4" x="16" y="6"></rect>
<rect fill="#8BC34A" height="6" width="8" x="22" y="4"></rect>
<rect fill="#FFF" height="8" width="4" x="32" y="2"></rect>
<rect fill="#8BC34A" height="4" width="6" x="40" y="6"></rect>
<rect fill="#FFF" height="6" width="4" x="50" y="4"></rect>
</g>\n<g id="HIBISCUS_SUGAR">
<rect fill="rgba(255,255,255,0.2)" height="4" width="60" x="0" y="8"></rect>
<rect fill="#E91E63" height="4" width="60" x="0" y="4"></rect>
{/* Jagged shards */}
<rect fill="#E91E63" height="6" width="2" x="4" y="2"></rect>
<rect fill="#E91E63" height="4" width="2" x="14" y="2"></rect>
<rect fill="#E91E63" height="4" width="4" x="22" y="4"></rect>
<rect fill="#E91E63" height="6" width="2" x="32" y="2"></rect>
<rect fill="#E91E63" height="4" width="2" x="42" y="4"></rect>
<rect fill="#E91E63" height="6" width="2" x="50" y="2"></rect>
</g>\n<g id="BOSTON_SHAKER_TIN">
{/* Base Tin */}
<path d="M 24 20 h 32 v 4 h -2 v 8 h -2 v 16 h -2 v 16 h -2 v 8 h -16 v -8 h -2 v -16 h -2 v -16 h -2 v -8 h -2 z" fill="#E0E0E0" stroke="#000" strokeWidth="2"></path>
<rect fill="#FFF" height="50" width="6" x="30" y="22"></rect>
<rect fill="#333" height="46" width="4" x="50" y="24"></rect>
</g>\n<g id="JAPANESE_JIGGER">
{/* Top */}
<path d="M 28 20 h 24 v 4 h -2 v 6 h -4 v 6 h -4 v 4 h -4 v -4 h -4 v -6 h -4 v -6 h -2 z" fill="#E0E0E0" stroke="#000" strokeWidth="2"></path>
{/* Bottom */}
<path d="M 36 40 h 8 v 8 h 4 v 6 h 2 v 6 h -20 v -6 h 2 v -6 h 4 z" fill="#E0E0E0" stroke="#000" strokeWidth="2"></path>
{/* Highlights */}
<rect fill="#FFF" height="6" width="4" x="32" y="22"></rect>
<rect fill="#FFF" height="10" width="2" x="40" y="44"></rect>
</g>\n<g id="STANDARD_ICE">
{/* Cube 3 (Back/Top) */}
<rect fill="#306070" height="20" width="20" x="22" y="24"></rect>
<rect fill="#90C8D8" height="16" width="16" x="24" y="26"></rect>
<rect fill="#FFFFFF" height="2" width="16" x="24" y="26"></rect>
<rect fill="#FFFFFF" height="14" width="2" x="24" y="28"></rect>
<rect fill="#60A0B0" height="14" width="2" x="38" y="28"></rect>
<rect fill="#60A0B0" height="2" width="14" x="26" y="40"></rect>
{/* Cube 1 (Bottom Left) */}
<rect fill="#408090" height="20" width="20" x="12" y="44"></rect>
<rect fill="#A0D8E8" height="16" width="16" x="14" y="46"></rect>
<rect fill="#FFFFFF" height="2" width="16" x="14" y="46"></rect>
<rect fill="#FFFFFF" height="14" width="2" x="14" y="48"></rect>
<rect fill="#70B0C0" height="14" width="2" x="28" y="48"></rect>
<rect fill="#70B0C0" height="2" width="14" x="16" y="60"></rect>
{/* Cube 2 (Bottom Right) */}
<rect fill="#408090" height="24" width="22" x="32" y="40"></rect>
<rect fill="#A0D8E8" height="20" width="18" x="34" y="42"></rect>
<rect fill="#FFFFFF" height="2" width="18" x="34" y="42"></rect>
<rect fill="#FFFFFF" height="18" width="2" x="34" y="44"></rect>
<rect fill="#70B0C0" height="18" width="2" x="50" y="44"></rect>
<rect fill="#70B0C0" height="2" width="16" x="36" y="60"></rect>
</g>\n<g id="LARGE_ICE_ROCK">
{/* Main Outline/Shadow (Dark Blue/Grey) */}
<rect fill="#408090" height="32" width="32" x="16" y="32"></rect>
{/* Mid-tone Ice Body */}
<rect fill="#A0D8E8" height="28" width="28" x="18" y="34"></rect>
{/* Top & Left Highlight */}
<rect fill="#FFFFFF" height="4" width="28" x="18" y="34"></rect>
<rect fill="#FFFFFF" height="24" width="4" x="18" y="38"></rect>
{/* Diagonal specular reflection (stair-stepped) */}
<rect fill="#FFFFFF" height="4" width="4" x="26" y="42"></rect>
<rect fill="#FFFFFF" height="4" width="4" x="30" y="46"></rect>
<rect fill="#FFFFFF" height="4" width="4" x="34" y="50"></rect>
{/* Bottom right inner shadow */}
<rect fill="#70B0C0" height="4" width="24" x="22" y="58"></rect>
<rect fill="#70B0C0" height="24" width="4" x="42" y="38"></rect>
</g>\n<g id="BAR_SPOON_STIRRER">
{/* Silhouettes */}
<path d="M 36 6 h 8 v 2 h 2 v 6 h -2 v 2 h -8 v -2 h -2 v -6 h 2 z" fill="#000"></path>
<rect fill="#000" height="40" width="8" x="36" y="16"></rect>
<path d="M 36 56 h 8 v 2 h 2 v 4 h 2 v 6 h -2 v 4 h -4 v 2 h -4 v -2 h -4 v -4 h -2 v -6 h 2 v -4 h 2 z" fill="#000"></path>
{/* Stem Base Twist Colors */}
<rect fill="#408090" height="2" width="4" x="38" y="16"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="18"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="20"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="22"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="24"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="26"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="28"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="30"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="32"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="34"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="36"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="38"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="40"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="42"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="44"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="46"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="48"></rect>
<rect fill="#E0E0E0" height="2" width="4" x="38" y="50"></rect>
<rect fill="#408090" height="2" width="4" x="38" y="52"></rect>
<rect fill="#90C8D8" height="2" width="4" x="38" y="54"></rect>
{/* Bowl Inner */}
<path d="M 38 58 h 4 v 2 h 2 v 2 h 2 v 6 h -2 v 2 h -2 v 2 h -4 v -2 h -2 v -2 h -2 v -6 h 2 v -2 h 2 z" fill="#90C8D8"></path>
<rect fill="#408090" height="4" width="4" x="42" y="64"></rect>
<rect fill="#408090" height="2" width="4" x="40" y="68"></rect>
{/* Cap Inner */}
<rect fill="#D32F2F" height="6" width="4" x="38" y="8"></rect>
<rect fill="#D32F2F" height="4" width="8" x="36" y="10"></rect>
{/* Highlights */}
<rect fill="#FFF" height="2" width="2" x="36" y="10"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="16"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="22"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="28"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="34"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="40"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="46"></rect>
<rect fill="#FFF" height="4" width="2" x="38" y="52"></rect>
<rect fill="#FFF" height="2" width="2" x="36" y="60"></rect>
<rect fill="#FFF" height="4" width="2" x="34" y="62"></rect>
</g>\n
      </defs>
    </svg>
  );
}
