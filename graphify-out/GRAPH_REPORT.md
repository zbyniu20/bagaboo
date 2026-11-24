# Graph Report - bagaboo  (2026-11-24)

## Corpus Check
- 507 files · ~1,328,555 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 99 file(s) not represented in the graph (top: .css 84, .glb 12, (none) 3)

## Summary
- 6204 nodes · 16106 edges · 250 communities (224 shown, 26 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 542 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `79d63a31`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- economy.js
- textures.js
- silence.js
- nursery.js
- addCrispBlock
- levelkit.js
- banana.js
- redlight.js
- lib
- Tests & Module Imports
- games.js
- monster.js
- main.js
- pause.js
- auth.js
- ./core/engine.js
- room000map.js
- config.js
- audio.js
- games.js
- toast
- common.py
- hospital.js
- graffiti.js
- catacombs.js
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- dodgeball.js
- dotted-globe/effect.js
- pet.js
- icons.mjs
- print3d.js
- nursery.js
- core/ui.js
- hideseek.js
- lightbake.js
- hauntlogic.js
- workshoplogic.js
- monsters.py
- build.js
- lobbygames.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- engine.js
- petstore.js
- Docs: Accounts & Rules
- cosmetics.js
- make-posters.mjs
- avatarfxlogic.js
- xrperf.js
- gate.mjs
- hotel.js
- bake.mjs
- trainingdummy.js
- moments.mjs
- handleGuest
- duotone-grade/effect.js
- gore.mjs
- steps
- loop
- ui/ui.js
- three
- bag
- shader
- room000.js
- perf.mjs
- ref_url
- gradient-mesh/effect.js
- logic.mjs
- settings.js
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- lobbyplay.js
- diagram.js
- static.mjs
- lobby.mjs
- monstermaps.js
- player.js
- moments/lib.js
- _demo/shoot.mjs
- place
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- account.mjs
- system.js
- ref_node_fs
- color
- Diagram
- mount
- layout/check.mjs
- motion.js
- Cards
- norm
- runWidth
- Objects and prints (`assets/objects`)
- soft-light-bars/effect.js
- photoGL
- tube
- film-light-leak/effect.js
- sleep
- clamp
- still
- deal.mjs
- Copy registers
- reduced
- mountProduct
- shared.js
- product-render/auto.js
- engine.js
- stage
- 4. Place
- System
- block
- hide.mjs
- layout.js
- registry.mjs
- fx-feature-card/component.js
- .render
- orb-sphere/effect.js
- product-turntable/object.js
- Copy moves
- Effects beyond backgrounds
- addCrispBlock
- murals.js
- bag
- .build
- halftone-screen/effect.js
- ruled-grounds/effect.js
- Motion
- god-rays/effect.js
- .pause
- s
- Layout: one section per screen, equal edges, heroes, type
- Photographs
- tasteskill 2.5
- fx-dither-object/component.js
- painterly-landscape/effect.js
- Objects (`assets/objects/print-*`)
- init
- Copy
- Copy voice
- Effects usage
- Features
- Monster
- furas.js
- blender/README.md
- workshop.js
- tutorial.mjs
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- dismemberlogic.js
- bakeDraw
- withLoop
- compilerOptions
- print-globe/object.js
- Copy tells
- Icons
- homelogic.js
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- vrmenu.js
- haunt.mjs
- home.js
- hunt.mjs
- lobby-door.js
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- props.py
- pages.yml
- photo-chapters/moment.js
- package.json
- sdf.py
- lobbylogic.js
- visuals.js
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- presence.js
- spectate.js
- terminal.js
- glbmonster.js
- smoke-dist.mjs
- shots.mjs
- heightlogic.js
- refsOf
- modmenu.js
- monsterskins.js
- core/ui.js
- dotOf
- applyFlags
- browserChecks
- staticChecks
- opt
- dread.mjs
- props.js
- runSweep
- tickHunt
- shaderLint
- homestore.js
- monsters/README.md
- custom.js
- music.js
- staffhaunt.mjs
- prism-dispersion/effect.js
- props.mjs
- humanoid_clips
- monster.mjs
- Nowe pomysły (burza mózgów)
- .skin
- silk-folds/effect.js
- terminal.js
- Product render (`assets/objects/product-render`)
- props/README.md
- dust.mjs
- normalise

## God Nodes (most connected - your core abstractions)
1. `toast()` - 235 edges
2. `lib()` - 148 edges
3. `makeCanvas()` - 105 edges
4. `addCrispBlock()` - 97 edges
5. `mkRng()` - 96 edges
6. `toTex()` - 83 edges
7. `buzz()` - 83 edges
8. `buildDoor()` - 73 edges
9. `levelReward()` - 60 edges
10. `shader()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)` --references--> `decodeMap()`  [INFERRED]
  docs/POMYSLY.md → core/workshoplogic.js
- `7. Wspólny pokój ekipy` --references--> `normalizeHome()`  [INFERRED]
  docs/POMYSLY.md → core/homelogic.js
- `The eleven heroes` --references--> `collage()`  [INFERRED]
  .claude/skills/taste-skill/references/layout-v4.md → .claude/skills/taste-skill/assets/layout/layout.js
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `build()` --calls--> `isInvitedToStaff()`  [EXTRACTED]
  levels/staff.js → core/network.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (250 total, 26 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (68): getAudioContext(), clearWounds(), BANS_CLEARED, lostHead(), lostLeft(), lostRight(), animateFaces(), answerCall() (+60 more)

### Community 1 - "economy.js"
Cohesion: 0.05
Nodes (89): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, addBones(), bumpStat(), buyItem(), capped(), checkCounters() (+81 more)

### Community 2 - "textures.js"
Cohesion: 0.06
Nodes (87): plateTexture(), rustDoorTexture(), storyTextures(), vignetteTexture(), crackTex(), eggTexture(), ANISO(), crackWalk() (+79 more)

### Community 3 - "silence.js"
Cohesion: 0.09
Nodes (48): attachMic(), rewardActivity(), isOnRope(), releaseRope(), avoidObstacles(), BALLS, build(), buildClockBoard() (+40 more)

### Community 4 - "nursery.js"
Cohesion: 0.09
Nodes (28): tex, createGridMaze(), ARRIVAL_FROM_NURSERY, animate(), buildKeys(), caught(), COOLDOWN, DOLL_START (+20 more)

### Community 5 - "addCrispBlock"
Cohesion: 0.07
Nodes (42): addPortal(), animateMonster(), bag(), buildCeiling(), buildGlimpse(), buildGrid(), buildMachines(), buildMask() (+34 more)

### Community 6 - "levelkit.js"
Cohesion: 0.07
Nodes (33): dreadScared(), boxAt(), buildComputerDesk(), LP, GROUP, L, physicsMat, head (+25 more)

### Community 7 - "banana.js"
Cohesion: 0.14
Nodes (28): applyEvent(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+20 more)

### Community 8 - "redlight.js"
Cohesion: 0.10
Nodes (51): drawInstructions(), introSeen(), panelBg(), clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine() (+43 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.08
Nodes (21): ./core/emotes.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js, ./core/ui.js, ./core/voicehub.js, ./core/workshopstore.js, ./core/xrperf.js (+13 more)

### Community 11 - "games.js"
Cohesion: 0.07
Nodes (42): IS_QUEST, DIFF_ORDER, DIFFS, setDailyMode(), setDiff(), AMB, AMBD, BEAT (+34 more)

### Community 12 - "monster.js"
Cohesion: 0.08
Nodes (38): cleanMapPick(), cleanOptions(), cleanVotes(), generateMap(), pickMap(), buildMonsterSkin(), setAvatarHidden(), setSpectatorCheck() (+30 more)

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (63): setAmbience(), stopLoops(), updateListener(), errorText(), GFX, LIGHT_MODE, box, c (+55 more)

### Community 14 - "pause.js"
Cohesion: 0.21
Nodes (17): autoStartTutorial(), debugTutorial(), enterStep(), finish(), metrics(), nextStep(), skipTutorial(), ST (+9 more)

### Community 15 - "auth.js"
Cohesion: 0.13
Nodes (23): API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login(), logout() (+15 more)

### Community 16 - "./core/engine.js"
Cohesion: 0.04
Nodes (44): DEPS, errors, HERE, LEVELS, MIME, ROOT, run(), server (+36 more)

### Community 17 - "room000map.js"
Cohesion: 0.07
Nodes (50): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), clearLine() (+42 more)

### Community 18 - "config.js"
Cohesion: 0.14
Nodes (35): ADMIN_NAMES, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModMenuUser() (+27 more)

### Community 19 - "audio.js"
Cohesion: 0.04
Nodes (114): AC, occludedFilter(), occludedGain(), _af, _ap, app, aroundPlayer(), DEFS (+106 more)

### Community 20 - "games.js"
Cohesion: 0.08
Nodes (34): addComputers(), drawEcg(), drawEye(), ensureAssets(), makeDread(), mmss(), CARDS, AR (+26 more)

### Community 21 - "toast"
Cohesion: 0.14
Nodes (32): checkCompletionist(), dailyKey(), fmtDuration(), getDiff(), levelReward(), pruneDaily(), recordKey(), recordTime() (+24 more)

### Community 22 - "common.py"
Cohesion: 0.11
Nodes (7): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts()

### Community 23 - "hospital.js"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), buildCards(), buildGrid(), buildStatues(), _c, CARDS (+20 more)

### Community 24 - "graffiti.js"
Cohesion: 0.05
Nodes (92): isMouseDown(), addPoster(), apply(), AREA, buildGraffiti(), buildHaunt(), buildPads(), canClear() (+84 more)

### Community 25 - "catacombs.js"
Cohesion: 0.09
Nodes (28): animate(), BONES, buildDecor(), buildKeys(), buildWalls(), caught(), crunchBones(), drawHud() (+20 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.05
Nodes (75): addFurShells(), addRoleTag(), addScaryFace(), ARM_GEO, BADGES, badgeTex, bakeShade(), BONE() (+67 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (56): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+48 more)

### Community 31 - "dodgeball.js"
Cohesion: 0.05
Nodes (88): recordScore(), camera, broadcast(), myId(), onLevelMsg(), sendLevelMsg(), hands, broadcast() (+80 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "pet.js"
Cohesion: 0.10
Nodes (37): squeak(), HAUNT_STATE, hideSpot(), petFear(), buildPet(), carryStep(), _dir, disposePet() (+29 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.06
Nodes (35): EFFECT_LABEL, PAPERS, atlas, CELL, colMajor(), COMMON_PARAMS, config, cross() (+27 more)

### Community 36 - "nursery.js"
Cohesion: 0.10
Nodes (41): appFigure(), createBot(), LIGHT_PRESETS, swapModel(), addMonsterFace(), buildMannequin(), addWarden(), buildWardens() (+33 more)

### Community 37 - "core/ui.js"
Cohesion: 0.07
Nodes (36): LOBBY_MOVE_SCALE, _e, EMOTE, emotePose(), EMOTES, _pq, _q, basePose() (+28 more)

### Community 38 - "hideseek.js"
Cohesion: 0.14
Nodes (27): BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), fromNet() (+19 more)

### Community 39 - "lightbake.js"
Cohesion: 0.10
Nodes (37): blendRoom(), blockCount(), DIRS, freeDistances(), occlusionFor(), rayBox(), roomFromRays(), smoothRoom() (+29 more)

### Community 40 - "hauntlogic.js"
Cohesion: 0.11
Nodes (38): MOD_NAMES, tickHaunt(), eyesDistance(), grafAlpha(), manStep(), nextIn(), num(), pickKind() (+30 more)

### Community 41 - "workshoplogic.js"
Cohesion: 0.24
Nodes (19): blockError(), canGo(), centre(), copy(), covers(), eraseAt(), gap(), isInt() (+11 more)

### Community 42 - "monsters.py"
Cohesion: 0.38
Nodes (5): hair(), run(), self_rand(), read_glb(), shrink()

### Community 43 - "build.js"
Cohesion: 0.08
Nodes (50): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+42 more)

### Community 44 - "lobbygames.js"
Cohesion: 0.18
Nodes (20): BOARD, buildLobbyGames(), drawBoard(), lobbyGamesNet(), updateLobbyGames(), addHoop(), addTarget(), BALL_COOLDOWN (+12 more)

### Community 45 - "fx.js"
Cohesion: 0.07
Nodes (45): BASE_UNIFORMS, CALM_SPOTS, clamp(), compose(), cssToHex(), DEFAULT_PALETTE, enforceBudget(), FOCAL (+37 more)

### Community 46 - "start.mjs"
Cohesion: 0.05
Nodes (45): ALIAS, allTypes, args, axisOrder(), axisVal(), block(), buttonInk(), dealTypes() (+37 more)

### Community 47 - "copy-lint.mjs"
Cohesion: 0.07
Nodes (47): APART, args, attrOf(), BLOCK, brandsOf(), CAST, CAST_CO, clip() (+39 more)

### Community 48 - "photo.js"
Cohesion: 0.06
Nodes (43): FLAT, inks(), mount(), params, analyse(), analyses, BASE, bestSrc() (+35 more)

### Community 49 - "engine.js"
Cohesion: 0.09
Nodes (45): addBlobAO(), addBody(), addConstraint(), addStaticBody(), attachGorillaMachine(), detachGorillaMachine(), poseVariant(), debugLobbyPlay() (+37 more)

### Community 50 - "petstore.js"
Cohesion: 0.11
Nodes (52): equipItem(), saveGame(), spendBones(), petPage(), canFeed(), canHatch(), canPat(), clamp() (+44 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "cosmetics.js"
Cohesion: 0.17
Nodes (20): at(), BLOOD(), BLOOD_DARK, cache, CUTE, dark(), EXTRA_BADGES, EXTRA_SKINS (+12 more)

### Community 53 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 54 - "avatarfxlogic.js"
Cohesion: 0.13
Nodes (19): addWound(), animateFace(), applyGrime(), hairTexture(), shellMat(), addWound(), DIRT, droolLevel() (+11 more)

### Community 55 - "xrperf.js"
Cohesion: 0.17
Nodes (18): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), renderer, clampFrame(), DESKTOP_STEPS (+10 more)

### Community 56 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 57 - "hotel.js"
Cohesion: 0.06
Nodes (53): heardVoice(), fuse(), stepBot(), buildMachineTerminal(), addCollider(), setFlashHolder(), box(), buildFlashlight() (+45 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "trainingdummy.js"
Cohesion: 0.24
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "handleGuest"
Cohesion: 0.14
Nodes (31): containBall(), banList(), bannedNamesList(), checkIntruder(), cleanRouted(), electNewHost(), handleGuest(), hostStatus() (+23 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "gore.mjs"
Cohesion: 0.07
Nodes (27): d, DEPS, errors, HERE, MIME, ROOT, server, st() (+19 more)

### Community 64 - "steps"
Cohesion: 0.12
Nodes (22): runs-on, steps, runs-on, steps, jobs, build, fast, types (+14 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.10
Nodes (27): addPause(), AGAIN, bakeQueue, BASE, boxes, boxOf(), cache, css (+19 more)

### Community 67 - "three"
Cohesion: 0.09
Nodes (26): playwright, typescript, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.187.0, typescript@^5.9.3 (+18 more)

### Community 68 - "bag"
Cohesion: 0.27
Nodes (15): init(), PARAMS, init(), ease(), init(), PARAMS, init(), init() (+7 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "room000.js"
Cohesion: 0.06
Nodes (49): takeRespawn(), releaseAll(), AISLES_X, AISLES_Z, animate(), buildRelics(), caught(), CRYPTS (+41 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_url"
Cohesion: 0.04
Nodes (40): defs, HERE, num(), range(), ROOT, check(), done(), bot (+32 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.07
Nodes (23): setTension(), clamp01(), hushMul(), TENSION, tensionParams(), tensionSmooth(), b64u(), bad (+15 more)

### Community 75 - "settings.js"
Cohesion: 0.07
Nodes (35): build(), _c, disposeDust(), softSprite(), updateDust(), advance(), driftStep(), DUST (+27 more)

### Community 76 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "lobbyplay.js"
Cohesion: 0.07
Nodes (42): bell(), applyLighting(), A, canCatch(), clamp01(), GATE_Z, gateOpen(), GENS (+34 more)

### Community 80 - "diagram.js"
Cohesion: 0.10
Nodes (30): api, CAPS, cleanName(), h(), iconCache, iconMeta, iconSource(), inkify() (+22 more)

### Community 81 - "static.mjs"
Cohesion: 0.11
Nodes (19): avSrc, code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph (+11 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.07
Nodes (21): generate(), AMB, CAT, CEM, FUR, GRF, HOM, HTL (+13 more)

### Community 83 - "monstermaps.js"
Cohesion: 0.19
Nodes (24): aisles(), box(), carnival(), free(), gbox(), GEN, HEDGE, hedge() (+16 more)

### Community 84 - "player.js"
Cohesion: 0.05
Nodes (48): cross, DESKTOP, help, keyHooks, keys, _o, onDesktopKey(), _q (+40 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "place"
Cohesion: 0.16
Nodes (24): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, bloodMat, buildArm() (+16 more)

### Community 88 - "rng"
Cohesion: 0.16
Nodes (23): BAYER4, fallbackCSS(), hash2(), makeNoise(), mountAscii(), buildAtlas(), draw(), layout() (+15 more)

### Community 89 - "scripts/shoot.mjs"
Cohesion: 0.09
Nodes (22): tilesMod, args, call(), child, defaultProfile(), guard, HEIGHTS, jumpTo() (+14 more)

### Community 90 - "backgrounds/check.mjs"
Cohesion: 0.08
Nodes (21): allIds, args, boxIds, by, child, defaultProfile(), fails, guard (+13 more)

### Community 91 - "mountPrint"
Cohesion: 0.12
Nodes (35): acquire(), ease(), finishProgram(), glyphAtlas(), hexRgb(), injectStyles(), isDarkPaper(), monoFamily() (+27 more)

### Community 92 - "effects.mjs"
Cohesion: 0.07
Nodes (47): clashes(), dealable(), filterEffects(), fitsKind(), kindOf(), KINDS, parseSlot(), pick() (+39 more)

### Community 93 - "account.mjs"
Cohesion: 0.12
Nodes (13): destroy(), DEPS, errors, errs, HERE, MIME, ROOT, server (+5 more)

### Community 94 - "system.js"
Cohesion: 0.14
Nodes (26): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+18 more)

### Community 95 - "ref_node_fs"
Cohesion: 0.06
Nodes (25): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+17 more)

### Community 96 - "color"
Cohesion: 0.19
Nodes (22): makeLayer(), mount(), calmAt(), colours(), count(), draw(), drawGrid(), drawPulse() (+14 more)

### Community 98 - "mount"
Cohesion: 0.15
Nodes (21): config, lifecycle(), loop(), sync(), makeGL(), makeNoise(), mount(), applyMask() (+13 more)

### Community 99 - "layout/check.mjs"
Cohesion: 0.09
Nodes (19): args, child, chrome, defaultProfile(), guard, here, { heroes }, kill() (+11 more)

### Community 100 - "motion.js"
Cohesion: 0.19
Nodes (19): boxOf(), counts(), enter(), enterSteps(), fontsIn(), hostOf(), init(), jump() (+11 more)

### Community 101 - "Cards"
Cohesion: 0.14
Nodes (14): loadAll(), plan(), startAll(), Cards, Edges and fades, Effects that are not backgrounds, Grounds, Motion (+6 more)

### Community 102 - "norm"
Cohesion: 0.15
Nodes (18): addressMod, areaMod, basicsMod, CDP, copyChecks(), copyTerms(), holds(), holdsAny() (+10 more)

### Community 103 - "runWidth"
Cohesion: 0.12
Nodes (21): auditFindings(), clusterLooks(), extrasFindings(), groupLike(), groupSame(), invertedLook(), isLocal(), lookName() (+13 more)

### Community 104 - "Objects and prints (`assets/objects`)"
Cohesion: 0.33
Nodes (5): GPU cost, Mount, Never, Objects and prints (`assets/objects`), When to use one

### Community 105 - "soft-light-bars/effect.js"
Cohesion: 0.24
Nodes (19): alpha(), banned(), blendsClean(), companion(), darkLight(), fallback(), guard(), hueGap() (+11 more)

### Community 106 - "photoGL"
Cohesion: 0.20
Nodes (18): mount(), params, makeTexture(), photoGL(), adapt(), bindTextures(), draw(), finish() (+10 more)

### Community 107 - "tube"
Cohesion: 0.24
Nodes (5): box(), cloth_cone(), new_scene(), reset(), doll()

### Community 108 - "film-light-leak/effect.js"
Cohesion: 0.50
Nodes (7): guard(), isWarm(), mount(), params, pickEdge(), tones(), uniforms()

### Community 109 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 110 - "clamp"
Cohesion: 0.21
Nodes (18): clamp(), cssHex(), filmicInv(), filmicJs(), fromOklab(), gam22(), groundPalette(), lightness() (+10 more)

### Community 111 - "still"
Cohesion: 0.21
Nodes (12): DATA, FULL, init(), MONTHS, TICKS, init(), PARAMS, accentPalette() (+4 more)

### Community 112 - "deal.mjs"
Cohesion: 0.15
Nodes (16): args, darkIds(), dealOnce(), draw(), fits(), HAS, here, hero (+8 more)

### Community 113 - "Copy registers"
Cohesion: 0.12
Nodes (15): 0. The model's default (the one to avoid), 10. Refusal and narrowness, 11. The product as the hero, 12. Hurried and conversational, 1. Facts only, 2. Technical and dry, with proof, 3. The founder's letter, 4. Self-aware and playful (+7 more)

### Community 114 - "reduced"
Cohesion: 0.22
Nodes (12): FILL, init(), init(), STILL, init(), PARAMS, init(), PARAMS (+4 more)

### Community 115 - "mountProduct"
Cohesion: 0.31
Nodes (15): mountProduct(), clearInner(), done(), layout(), measureStill(), mountLive(), palette(), renderStill() (+7 more)

### Community 116 - "shared.js"
Cohesion: 0.17
Nodes (16): init(), grab(), hoverable(), markPending(), mqHover, mqReduce, nextFrame(), pendingStills (+8 more)

### Community 117 - "product-render/auto.js"
Cohesion: 0.21
Nodes (14): apply(), ATTRS, cache, claimed, json(), mountAll(), optsOf(), placeOf() (+6 more)

### Community 118 - "engine.js"
Cohesion: 0.09
Nodes (25): FAMILIES, FAMILY_OF, familyFor(), familyName(), gradeColor(), lerp(), mixHex(), TILE (+17 more)

### Community 119 - "stage"
Cohesion: 0.33
Nodes (13): renderScale(), hasWebGL(), reducedMotion(), stage(), draw(), fallBack(), fit(), flatFrame() (+5 more)

### Community 120 - "4. Place"
Cohesion: 0.14
Nodes (13): 1. Plan in screens, 2. The deal, 3. The plans, 4. Place, 5. Visuals, Designed variety without effects, Look, Order by trade (+5 more)

### Community 121 - "System"
Cohesion: 0.14
Nodes (13): Access, Base, Cards, lists and forms, Colour, Footer, Forms, Head, Motion (+5 more)

### Community 122 - "block"
Cohesion: 0.21
Nodes (14): allow(), applyWaivers(), block(), errorReason(), guard, killTree(), readJson(), readLedger() (+6 more)

### Community 123 - "hide.mjs"
Cohesion: 0.07
Nodes (28): ./core/player.js, state(), DEPS, errors, g1, HERE, hf(), lf() (+20 more)

### Community 124 - "layout.js"
Cohesion: 0.37
Nodes (12): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+4 more)

### Community 125 - "registry.mjs"
Cohesion: 0.22
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 126 - "fx-feature-card/component.js"
Cohesion: 0.26
Nodes (11): demo(), grainGround(), groundPalette(), GROUNDS, init(), lum(), ok(), read() (+3 more)

### Community 127 - ".render"
Cohesion: 0.24
Nodes (7): clamp(), ease(), spread(), unease(), init(), done(), reset()

### Community 128 - "orb-sphere/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), fallback(), lc(), lin(), mount(), noLavender(), params, placeOrb() (+2 more)

### Community 129 - "product-turntable/object.js"
Cohesion: 0.21
Nodes (11): CAM, cross(), dot(), fitCamera(), FORMS, LABELS, NAMES, norm() (+3 more)

### Community 130 - "Copy moves"
Cohesion: 0.17
Nodes (11): About and story, Buttons and the close, Copy moves, Features and how it works, Microcopy: where a voice is most welcome, Numbers and humour, Prices, FAQ, booking: the plain zone, Proof (+3 more)

### Community 131 - "Effects beyond backgrounds"
Cohesion: 0.17
Nodes (11): A photograph with copy (`fx-photo`), Cost: light enough for a laptop's integrated GPU, Effects beyond backgrounds, Feature cards with inset panels (`fx-feature-card`), Objects in dither (`fx-dither-object`), Picking the effect, Street map of the place (`fx-map`), The techniques (`components/shared.js`) (+3 more)

### Community 132 - "addCrispBlock"
Cohesion: 0.05
Nodes (94): setDread(), dailyDate(), diffOf(), isDaily(), addCrispBlock(), addInstancedBlocks(), addShaderEdges(), lighting (+86 more)

### Community 133 - "murals.js"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 134 - "bag"
Cohesion: 0.17
Nodes (20): init(), PARAMS, DATA, init(), el(), init(), draw(), fallback() (+12 more)

### Community 135 - ".build"
Cohesion: 0.20
Nodes (5): axesOf(), geo(), kindOf(), Program(), s()

### Community 136 - "halftone-screen/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), f1(), fallback(), inks(), layout(), lin(), mount(), params (+2 more)

### Community 137 - "ruled-grounds/effect.js"
Cohesion: 0.38
Nodes (10): clean(), fallback(), geometry(), inBand(), lightAt(), mount(), params, step() (+2 more)

### Community 138 - "Motion"
Cohesion: 0.18
Nodes (10): Loops inside a card's visual (tech), Motion, Never, Reduced motion, no script, phones, Scroll, Tech budget, The hero's entrance (every kind), The hover layer (+2 more)

### Community 139 - "god-rays/effect.js"
Cohesion: 0.50
Nodes (7): aim(), fits(), mount(), params, tones(), uniforms(), warm()

### Community 140 - ".pause"
Cohesion: 0.11
Nodes (17): auto(), fallbackList(), mount(), presets(), Adding an effect, Commands, Effects, Mount (+9 more)

### Community 142 - "Layout: one section per screen, equal edges, heroes, type"
Cohesion: 0.20
Nodes (9): 1. What the good sites do, 2. One section per screen, 3. The hero, 4. Equal edges and the grid, 5. Type, 6. The check, Layout: one section per screen, equal edges, heroes, type, The eleven heroes (+1 more)

### Community 143 - "Photographs"
Cohesion: 0.20
Nodes (9): A product without photographs (PH-04), Credits and words (PH-38, CO-22), Live search (stand-ins for what the library lacks), Never, Photographs, Pick and fetch, Place them, Show them (+1 more)

### Community 144 - "tasteskill 2.5"
Cohesion: 0.20
Nodes (9): 1. The kind of business decides everything, 2. The page plan by kind, 3. What serves which page, 4. The run, 5. Checklist, 6. Never, House rules, References (+1 more)

### Community 145 - "fx-dither-object/component.js"
Cohesion: 0.33
Nodes (8): DRAW, drawing(), init(), objectEffect(), OBJECTS, SCHEMA, tones(), fx

### Community 146 - "painterly-landscape/effect.js"
Cohesion: 0.42
Nodes (8): at(), grainLayer(), L(), mount(), params, sat(), tones(), uniforms()

### Community 147 - "Objects (`assets/objects/print-*`)"
Cohesion: 0.22
Nodes (8): glslProblems(), A new object, Do and don't, It always shows a picture, Light on a laptop GPU, Objects (`assets/objects/print-*`), Posters, Put one on a page

### Community 148 - "init"
Cohesion: 0.22
Nodes (3): init(), init(), POINTER_SVG

### Community 149 - "Copy"
Cohesion: 0.22
Nodes (8): Banned, Contacts the brief does not give, Copy, Five rules, Headlines and text, Plain versions, The copy layer, What may be assumed

### Community 150 - "Copy voice"
Cohesion: 0.22
Nodes (8): 1. The fact sheet, from the brief, 2. The voice card, 3. Shape from the reader's questions, 4. Draft, 5. The device budget, per page, 6. Check, Copy voice, Why model copy reads as model copy

### Community 151 - "Effects usage"
Cohesion: 0.22
Nodes (8): Deal the effect, never by taste, Deal the moments and the scene, Effects usage, Never, Tech budget, The gate (house rule 8), What each kind gets, Where things sit

### Community 152 - "Features"
Cohesion: 0.22
Nodes (9): app-frame, bento, chapter, Features, features-2x2, product-statement, split-text-left, steps (+1 more)

### Community 153 - "Monster"
Cohesion: 0.11
Nodes (21): _basis(), ellipsoid(), frustum(), Monster, tube(), blind(), butler(), face() (+13 more)

### Community 154 - "furas.js"
Cohesion: 0.08
Nodes (45): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+37 more)

### Community 155 - "blender/README.md"
Cohesion: 0.50
Nodes (3): Modele awatara w Blenderze (skrypty), Potwory (modele GLB do gry), Rekwizyty (zestaw do poziomów)

### Community 156 - "workshop.js"
Cohesion: 0.12
Nodes (30): wrapText(), decodeMap(), emptyMap(), encodeMap(), fromB64u(), LIM, toB64u(), currentMap() (+22 more)

### Community 157 - "tutorial.mjs"
Cohesion: 0.09
Nodes (22): ./core/desktop.js, ./core/economy.js, ./core/pause.js, ./core/tutorial.js, ./core/tutoriallogic.js, DEPS, errors, errs (+14 more)

### Community 158 - "Photo prints"
Cohesion: 0.25
Nodes (7): Cost, Credit, Mount, Photo prints, The photograph, When it cannot draw, Where a print goes, and where not

### Community 159 - "_scenes/auto.js"
Cohesion: 0.36
Nodes (7): claimed, IDS, json(), LOOPING, mountAll(), scenes, srcOf()

### Community 160 - "Diagrams"
Cohesion: 0.25
Nodes (7): Diagrams, Icons: one resolver, run it last, Labels plain, Motion: one cycle of 2.5 to 4 s, Pick a layout and a preset, The builder page (the tool for building one fast), When a diagram, when a UI fragment

### Community 161 - "sections-library.md"
Cohesion: 0.25
Nodes (7): customer-proof-row, Heroes, logo-row, Proof, quote-stat, Section library, What every recipe assumes

### Community 162 - "Sections for a kind of content"
Cohesion: 0.25
Nodes (8): booking-form, calendar-frame, client-slots, integrations-grid, menu-in-type, Sections for a kind of content, timeline-rail, visit-map

### Community 163 - "Photographs, rooms, services and people"
Cohesion: 0.25
Nodes (8): line-up, peek-list, people-row, photo-band, photo-pair, Photographs, rooms, services and people, rooms-list, services-list

### Community 164 - "dismemberlogic.js"
Cohesion: 0.14
Nodes (17): catchOutcome(), cleanDismember(), dismemberText(), DM, DM_CODES, GRACE, MAX_ENTRIES, pickDismember() (+9 more)

### Community 165 - "bakeDraw"
Cohesion: 0.18
Nodes (16): bakeDpr(), bakeDraw(), bakeOne(), grounds(), groundSpec(), liveOn(), mountAt(), nextBake() (+8 more)

### Community 166 - "withLoop"
Cohesion: 0.20
Nodes (10): init(), init(), DATA, init(), PREV, isStill(), withLoop(), init() (+2 more)

### Community 167 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 169 - "Copy tells"
Cohesion: 0.29
Nodes (6): Copy tells, First generation: the old tells (mostly avoided now; still checked), Not tells (leave them alone), Over-correction: what the rules themselves produce, Second generation: the tells now, Why it happens

### Community 170 - "Icons"
Cohesion: 0.29
Nodes (6): Commands, How they sit, Icons, The violet rule (a judgement, stated), Where they come from, Which one

### Community 171 - "homelogic.js"
Cohesion: 0.25
Nodes (15): acceptVisit(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome(), fmtRecord(), IDS (+7 more)

### Community 172 - "_print-core/auto.js"
Cohesion: 0.47
Nodes (5): claimed, json(), mountAll(), placeOf(), prints

### Community 173 - "Scene objects (`assets/objects/<id>`, runtime in `_scenes`)"
Cohesion: 0.33
Nodes (5): Behaviour, Light on a laptop GPU, Put one on a page, Scene objects (`assets/objects/<id>`, runtime in `_scenes`), Where they go: software pages only

### Community 174 - "Backgrounds"
Cohesion: 0.33
Nodes (5): Backgrounds, Other kinds stay flat, Tech: code-drawn grounds, how they look, Tech: the CSS grounds, The three tokens (every kind)

### Community 175 - "The finish gate"
Cohesion: 0.33
Nodes (5): Arm it, As a hook, The finish gate, The manual gate, What it does

### Community 176 - "Page plans"
Cohesion: 0.33
Nodes (6): Gaming, Page plans, Place, Product, Service, Software

### Community 177 - "vrmenu.js"
Cohesion: 0.11
Nodes (29): account(), isReservedNick(), markNickVerified(), canKick(), connById(), myBanUntil(), networkTick(), noobCheck() (+21 more)

### Community 178 - "haunt.mjs"
Cohesion: 0.12
Nodes (16): ./core/graffiti.js, ./core/petmodel.js, ./core/registry.js, DEPS, errors, gh(), HERE, hh() (+8 more)

### Community 179 - "home.js"
Cohesion: 0.11
Nodes (20): HAUNT, FURNITURE, ROOM, SLOTS, box(), debugHomeHaunt(), furnitureNodes(), _hp (+12 more)

### Community 180 - "hunt.mjs"
Cohesion: 0.06
Nodes (31): DEPS, errors, errs, fresh(), HERE, hit(), MIME, ROOT (+23 more)

### Community 181 - "lobby-door.js"
Cohesion: 0.08
Nodes (25): buildHat(), placeArm(), poseHand(), ULTIMATE_SCALE, emoteState(), poseRemoteHands(), ARRIVAL, ARRIVAL_GAMES (+17 more)

### Community 183 - "Price and questions"
Cohesion: 0.40
Nodes (5): comparison-table, faq, Price and questions, pricing-three, pricing-two

### Community 184 - "Footers"
Cohesion: 0.40
Nodes (5): footer-columns, footer-dark, footer-statement, footer-visit, Footers

### Community 185 - "Navigation"
Cohesion: 0.40
Nodes (5): nav-cards, nav-centre, nav-mega, nav-split, Navigation

### Community 186 - "Performance budget"
Cohesion: 0.50
Nodes (3): Every visual renders, Performance budget, Usual fixes

### Community 187 - "Closes"
Cohesion: 0.50
Nodes (4): close-photo, close-type, close-word, Closes

### Community 188 - "props.py"
Cohesion: 0.21
Nodes (13): barrel(), bench(), bucket(), cart(), chair(), crate(), debris(), hexc() (+5 more)

### Community 189 - "pages.yml"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+18 more)

### Community 191 - "package.json"
Cohesion: 0.11
Nodes (19): dependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, description, devDependencies, vite@^8.3.8, cannon-es (+11 more)

### Community 192 - "sdf.py"
Cohesion: 0.18
Nodes (7): mirror_union(), capsule(), ell(), Grid, smax(), smin(), sub()

### Community 193 - "lobbylogic.js"
Cohesion: 0.17
Nodes (15): countVotes(), GATE, gateStep(), NIGHT, num(), padOf(), winnerOf(), drawHud() (+7 more)

### Community 202 - "visuals.js"
Cohesion: 0.17
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 212 - "presence.js"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 213 - "spectate.js"
Cohesion: 0.24
Nodes (13): boxes(), isSpectating(), spectateNext(), ST, stopSpectate(), updateSpectate(), CAM, cameraSpot() (+5 more)

### Community 214 - "terminal.js"
Cohesion: 0.08
Nodes (38): applyVolumes(), CATALOG, SAVE, close(), closeEmotePanel(), _d, doEmote(), mesh (+30 more)

### Community 215 - "glbmonster.js"
Cohesion: 0.12
Nodes (23): BOT_KINDS, candidateUrls(), FALLBACK, fitScale(), MAX_BYTES, MAX_TRIS, MONSTERS, pickClip() (+15 more)

### Community 216 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 217 - "shots.mjs"
Cohesion: 0.04
Nodes (55): errs, EXTRA, HERE, MIME, ROOT, server, views, blobs (+47 more)

### Community 218 - "heightlogic.js"
Cohesion: 0.27
Nodes (10): fbm(), HEIGHT, heightField(), noise(), normalsFromHeight(), sample(), smooth(), SURFACES (+2 more)

### Community 219 - "refsOf"
Cohesion: 0.22
Nodes (9): attrs(), cssRefs(), jsRefs(), kindOf(), local(), metas(), refsOf(), stripRef() (+1 more)

### Community 220 - "modmenu.js"
Cohesion: 0.19
Nodes (18): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+10 more)

### Community 221 - "monsterskins.js"
Cohesion: 0.32
Nodes (12): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+4 more)

### Community 222 - "core/ui.js"
Cohesion: 0.15
Nodes (14): isHiddenFrom(), nameOf(), nameOfPlayer(), otherPlayers(), sendRouted(), PRESENCE, board, drawScoreboard() (+6 more)

### Community 223 - "dotOf"
Cohesion: 0.47
Nodes (6): activeIn(), below(), dotOf(), findProject(), lastTouch(), unarmedPage()

### Community 224 - "applyFlags"
Cohesion: 0.40
Nodes (6): applyFlags(), fileAt(), findPage(), isUrl(), kindArg(), slash()

### Community 225 - "browserChecks"
Cohesion: 0.40
Nodes (6): browserChecks(), copyChecks(), errLine(), left(), parseJson(), rmProfile()

### Community 226 - "staticChecks"
Cohesion: 0.40
Nodes (6): codeOnly(), hashOf(), kitIndex(), kitTwin(), norm(), staticChecks()

### Community 227 - "opt"
Cohesion: 0.33
Nodes (6): freshProfile(), inProject(), opt(), profileBase(), roundsArg(), str()

### Community 228 - "dread.mjs"
Cohesion: 0.20
Nodes (8): ./core/botkit.js, ./core/levelkit.js, DEPS, errors, HERE, MIME, ROOT, server

### Community 229 - "props.js"
Cohesion: 0.29
Nodes (12): baseLevelId(), mulberry(), pickKind(), placeProps(), PROP_SETS, propCount(), PROPS, propsEnabled() (+4 more)

### Community 230 - "runSweep"
Cohesion: 0.67
Nodes (4): bySev(), clean(), lostFindings(), runSweep()

### Community 231 - "tickHunt"
Cohesion: 0.43
Nodes (7): botBoost(), fearLevel(), finalHunt(), HUNT, monsterBoost(), num(), pulseAt()

### Community 232 - "shaderLint"
Cohesion: 0.50
Nodes (4): glslIn(), isGLSL(), lintGLSL(), shaderLint()

### Community 233 - "homestore.js"
Cohesion: 0.33
Nodes (12): buy(), place(), achievementCount(), buyFurniture(), getHome(), placeFurniture(), build(), buy() (+4 more)

### Community 235 - "custom.js"
Cohesion: 0.17
Nodes (12): atFinish(), demoMap(), BOUNDS, build, debug, dispose, DOOR, info (+4 more)

### Community 236 - "music.js"
Cohesion: 0.23
Nodes (11): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+3 more)

### Community 237 - "staffhaunt.mjs"
Cohesion: 0.17
Nodes (10): ./core/terminal.js, ./levels/staff.js, DEPS, errors, HERE, inB, MIME, ROOT (+2 more)

### Community 238 - "prism-dispersion/effect.js"
Cohesion: 0.50
Nodes (7): hd(), layout(), mount(), params, spectrumCentre(), tones(), uniforms()

### Community 239 - "props.mjs"
Cohesion: 0.18
Nodes (10): ./core/props.js, DEPS, e2, errors, HERE, LEVELS, MIME, probe() (+2 more)

### Community 240 - "humanoid_clips"
Cohesion: 0.29
Nodes (8): humanoid_clips(), attack(), gait(), fn(), idle(), legs(), setx(), finish()

### Community 241 - "monster.mjs"
Cohesion: 0.15
Nodes (8): GEN, lobbyDef, monSrc, netSrc, ROOT, SEEDS, src, st

### Community 242 - "Nowe pomysły (burza mózgów)"
Cohesion: 0.18
Nodes (10): 1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy), 2. Run Roguelike (co-op przez Levels), 3. Wyzwanie Dnia i Duchy, 4. Potwór gracza (asymetryczny tryb 1 kontra ekipa), 5. Potwór słyszy głos, 6. Sezony i wydarzenia czasowe, 8. Kontrakty dnia, Nowe pomysły (burza mózgów) (+2 more)

### Community 244 - "silk-folds/effect.js"
Cohesion: 0.52
Nodes (6): cool(), mount(), params, sheenTurn(), tones(), uniforms()

### Community 245 - "terminal.js"
Cohesion: 0.08
Nodes (36): purr(), hatchBegin(), hatchPop(), posOf(), reactFeed(), reactPat(), bar(), doFeed() (+28 more)

### Community 246 - "Product render (`assets/objects/product-render`)"
Cohesion: 0.22
Nodes (8): Behaviour and limits, Materials, Motion, Parts, Product render (`assets/objects/product-render`), Scenes and props: the product loaded or in use, Stills and posters: run this after every change to a spec, The spec

### Community 248 - "dust.mjs"
Cohesion: 0.22
Nodes (6): DEPS, errors, HERE, MIME, ROOT, server

## Knowledge Gaps
- **32 isolated node(s):** `./core/desktop.js`, `./core/emotes.js`, `./core/gorillamachine.js`, `./core/highfive.js`, `./core/leveldata.js` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `logic.mjs`, `custom.js`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `registry.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.379) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/desktop.js`, `./core/emotes.js`, `./core/gorillamachine.js` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04446608244076598 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `custom.js` to `build.js`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `economy.js` be split into smaller, more focused modules?**
  _Cohesion score 0.046153846153846156 - nodes in this community are weakly interconnected._
- **Why does `sub()` connect `build.js` to `.render`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._