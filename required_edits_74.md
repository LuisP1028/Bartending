# RE74

1. State shellStagePan {x,y}; apply as transform on .pov-stage under shell.
2. On openCategory/frame mount: measure frame vs playfield section; compute pan; clamp to keep stage covering section.
3. On close: pan = 0.
4. No pan when only shellFocusZoneId changes.
