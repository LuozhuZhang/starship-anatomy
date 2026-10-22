Anatomy kit and browser verification scripts from
https://github.com/wheresryan22/anatomy, copied on 22 October 2026.
Copyright (c) 2026 Ryan. The upstream MIT license is included here.

Local change: `kit/iso-kit.mjs` serializes path coordinates at 0.001 instead of
0.1 viewBox units. The atlas's detail camera magnifies the small engines up to
8x; the original rounding produced visible steps in the curve outlines.
No primitive construction, projection, audit rules, tolerances or checks were
changed. All other vendored files are unmodified copies.
