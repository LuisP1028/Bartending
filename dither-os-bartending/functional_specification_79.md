# FS79 — Boot intro video on Game Boy screen

On page load, play `public/assets/boot/doom_gamestudio.mp4` full-bleed inside Game Boy housing screen only (no native video controls / system player UI). On `ended` (or error/failsafe), reveal the normal interactive game. Muted + playsInline for mobile autoplay.

**Skip:** five discrete taps/clicks on the housing screen (playfield) dismiss the intro immediately and reveal the game. Taps outside the glass do not count.
