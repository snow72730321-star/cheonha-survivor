# VFX asset layout

- `common/` — shared hit sparks, beams, trails, explosions and smoke.
- `weapons/` — generic weapon/projectile sprites shared by multiple skills.
- `magic/` — reusable magic/element sprites and persistent poison cloud art.
- `skills/<weapon>/` — named, skill-specific combat VFX. New or reworked skill art belongs here.
- `cutscenes/` — ultimate/awakening GIF cut-ins.
- `crests/` — weapon-family crest art used by cutscenes.

Temporary folders such as `user/`, `user_batch02/`, and `user_poison/` must not be reintroduced. Imported assets should be renamed to their gameplay role before being committed.
