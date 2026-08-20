# VFX Architecture Policy — v14.6.9

## Mandatory rule
Skill **art/animation** is sprite-sheet based. A skill's gameplay function directly creates the sprite VFX it owns.

## Allowed code responsibilities
- damage / hit detection
- range, direction, projectile movement
- chain, pierce, explosion, stun, buffs/debuffs
- cooldowns and timing
- boss telegraphs / danger zones
- shields and state/readability indicators
- projectile body rendering until that projectile receives a dedicated sprite

## Forbidden for skill art
- automatic `fireBasic` / `tickArts` wrappers that guess which VFX to add
- procedural decorative `glyph`, `rune`, `ornateRing`, `sparkCrown`, `demonHalo` overlays
- generic geometry fallback as final art for a newly added/reworked skill
- looping a one-shot sprite just to extend visibility

## Animation lifetime
One-shot skill VFX play exactly one sprite cycle. To increase visibility time, lower FPS / increase frame duration. Gameplay duration is independent of VFX animation duration.

## Migration rule
Legacy skills that have not yet received a dedicated sprite may retain their old renderer temporarily. Any skill newly created or reworked from v14.6.9 onward must use a registered sprite VFX and must not add a procedural attack-art overlay.
