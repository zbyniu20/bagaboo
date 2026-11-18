# Graph Report - bagaboo  (2026-11-18)

## Corpus Check
- 439 files · ~1,224,150 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 87 file(s) not represented in the graph (top: .css 84, (none) 3)

## Summary
- 5192 nodes · 14016 edges · 212 communities (191 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 440 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8ebb7110`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- toast
- textures.js
- silence.js
- Config & Staff Names
- addCrispBlock
- levels.js
- terminal.js
- player.js
- lib
- Tests & Module Imports
- audio.js
- buildDecor
- main.js
- monsterskins.js
- Auth Client
- hotel.js
- games.js
- pet.js
- buzz
- lasttile.js
- nursery.js
- statues.js
- lobby.js
- graffiti.js
- setPlayerPosition
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- Banana Mode
- dotted-globe/effect.js
- pause.js
- icons.mjs
- print3d.js
- mannequin.js
- vrmenu.js
- addCrispBlock
- generator.js
- blindtag.js
- Mod Menu
- core_engine_three
- build.js
- workshop.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- releaseAll
- swingrun.js
- Docs: Accounts & Rules
- hideseek.js
- generator.mjs
- treasure.js
- range.js
- gate.mjs
- bakeDraw
- bake.mjs
- home.mjs
- moments.mjs
- cosmetics.js
- duotone-grade/effect.js
- home.js
- update
- loop
- ui/ui.js
- package.json
- bag
- shader
- lobby-door.js
- perf.mjs
- rounds.mjs
- poolCap
- logic.mjs
- music.js
- registry.mjs
- split-reveal/object.js
- kit.js
- scripts
- diagram.js
- static.mjs
- lobby.mjs
- monster.js
- orb-sphere/effect.js
- moments/lib.js
- _demo/shoot.mjs
- well.js
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- engine.js
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
- .pause
- soft-light-bars/effect.js
- photoGL
- film-light-leak/effect.js
- make-posters.mjs
- sleep
- presence.js
- still
- deal.mjs
- Copy registers
- reduced
- mountProduct
- shared.js
- product-render/auto.js
- pick.mjs
- stage
- 4. Place
- System
- block
- pick.js
- layout.js
- ambience.js
- fx-feature-card/component.js
- .render
- line-engraving/effect.js
- product-turntable/object.js
- Copy moves
- Effects beyond backgrounds
- die
- murals.js
- tone
- .build
- halftone-screen/effect.js
- ruled-grounds/effect.js
- Motion
- buildMonster
- Product render (`assets/objects/product-render`)
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
- refsOf
- furas.js
- _print-core/demo.js
- god-rays/effect.js
- prism-dispersion/effect.js
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- gradient-mesh/effect.js
- pElbow
- silk-folds/effect.js
- definePrint
- Copy tells
- Icons
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- dotOf
- applyFlags
- browserChecks
- staticChecks
- opt
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- runSweep
- shaderLint
- photo-chapters/moment.js
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- hauntedui.js
- withLoop
- goobyTexture
- drawScreen
- drawGames

## God Nodes (most connected - your core abstractions)
1. `toast()` - 264 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 111 edges
4. `buzz()` - 96 edges
5. `buildDoor()` - 87 edges
6. `mkRng()` - 83 edges
7. `makeCanvas()` - 79 edges
8. `levelReward()` - 74 edges
9. `setPlayerPosition()` - 72 edges
10. `toTex()` - 70 edges

## Surprising Connections (you probably didn't know these)
- `3. Wyzwanie Dnia i Duchy` --references--> `decodeBots()`  [INFERRED]
  docs/POMYSLY.md → core/botcrew.js
- `1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)` --references--> `decodeMap()`  [INFERRED]
  docs/POMYSLY.md → core/workshoplogic.js
- `7. Wspólny pokój ekipy` --references--> `normalizeHome()`  [INFERRED]
  docs/POMYSLY.md → core/homelogic.js
- `The eleven heroes` --references--> `collage()`  [INFERRED]
  .claude/skills/taste-skill/references/layout-v4.md → .claude/skills/taste-skill/assets/layout/layout.js
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (212 total, 21 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.05
Nodes (84): getAudioContext(), animateFace(), animateFaces(), answerCall(), attachMic(), audioEls, banList(), bannedNames (+76 more)

### Community 1 - "toast"
Cohesion: 0.04
Nodes (124): activeRoleTags(), ACTIVITY, addBones(), bumpStat(), buyItem(), capped(), checkCompletionist(), checkCounters() (+116 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (71): burntTexture(), faceTexture(), jacketTexture(), addComputers(), plateTexture(), rustDoorTexture(), createMural(), ANISO() (+63 more)

### Community 3 - "silence.js"
Cohesion: 0.09
Nodes (44): attachMic(), micLevel(), isOnRope(), releaseRope(), avoidObstacles(), BALLS, build(), buildBalls() (+36 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.14
Nodes (35): ADMIN_NAMES, BANS_CLEARED, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName() (+27 more)

### Community 5 - "addCrispBlock"
Cohesion: 0.07
Nodes (50): creak(), addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildDryer(), buildGate() (+42 more)

### Community 6 - "levels.js"
Cohesion: 0.09
Nodes (22): DIFF_ORDER, DIFFS, stepDread(), visitorsHere(), CARDS, update(), AR, ARRIVAL_FROM_CEMETERY (+14 more)

### Community 7 - "terminal.js"
Cohesion: 0.03
Nodes (112): LIGHT_PRESETS, ACHIEVEMENTS, CATALOG, markCheater(), close(), closeEmotePanel(), _d, mesh (+104 more)

### Community 8 - "player.js"
Cohesion: 0.06
Nodes (44): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), containBall() (+36 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (32): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js (+24 more)

### Community 11 - "audio.js"
Cohesion: 0.11
Nodes (43): ballHit(), bang(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f (+35 more)

### Community 12 - "buildDecor"
Cohesion: 0.67
Nodes (3): buildDecor(), colorize(), skullGeometry()

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (67): updateListener(), box, c, errors, mesh, origError, tx, updateDebug() (+59 more)

### Community 14 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

### Community 15 - "Auth Client"
Cohesion: 0.13
Nodes (23): API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login(), logout() (+15 more)

### Community 16 - "hotel.js"
Cohesion: 0.08
Nodes (48): heartbeat(), buildMachineTerminal(), addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom() (+40 more)

### Community 17 - "games.js"
Cohesion: 0.06
Nodes (28): LOBBY_MOVE_SCALE, LEVEL_BY_ID, AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_GENERATOR, ARRIVAL_FROM_HIDESEEK, ARRIVAL_FROM_INFECTION (+20 more)

### Community 18 - "pet.js"
Cohesion: 0.12
Nodes (44): spendBones(), canFeed(), canHatch(), canPat(), clamp(), dayOf(), feed(), feedsLeft() (+36 more)

### Community 19 - "buzz"
Cohesion: 0.09
Nodes (34): beep(), bell(), fuse(), buzz(), updateHighFive(), applyEvent(), crunchBones(), makeNoise() (+26 more)

### Community 20 - "lasttile.js"
Cohesion: 0.25
Nodes (17): broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound(), fmt() (+9 more)

### Community 21 - "nursery.js"
Cohesion: 0.03
Nodes (77): createGridMaze(), drawInstructions(), introSeen(), panelBg(), takeRespawn(), addWarden(), animate(), BONES (+69 more)

### Community 22 - "statues.js"
Cohesion: 0.09
Nodes (38): setMusicMute(), onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+30 more)

### Community 23 - "lobby.js"
Cohesion: 0.08
Nodes (44): boxAt(), buildComputerDesk(), addBlobAO(), addStaticBody(), flashlight, PIPE_CYL, place(), UNIT_CYL (+36 more)

### Community 24 - "graffiti.js"
Cohesion: 0.06
Nodes (73): isMouseDown(), apply(), AREA, buildGraffiti(), buildPads(), canClear(), clearWall(), contestHost() (+65 more)

### Community 25 - "setPlayerPosition"
Cohesion: 0.07
Nodes (63): clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL, validHead(), myId() (+55 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.08
Nodes (51): addRoleTag(), ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer() (+43 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (56): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+48 more)

### Community 31 - "Banana Mode"
Cohesion: 0.12
Nodes (30): hostState(), isHostId(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana() (+22 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "pause.js"
Cohesion: 0.11
Nodes (27): applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause(), _p (+19 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.07
Nodes (50): atlas, CELL, clamp(), colMajor(), COMMON_PARAMS, config, cross(), cssHex() (+42 more)

### Community 36 - "mannequin.js"
Cohesion: 0.32
Nodes (12): seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildLeg(), buildMannequin() (+4 more)

### Community 37 - "vrmenu.js"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.04
Nodes (102): dailyDate(), dailyKey(), diffOf(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes() (+94 more)

### Community 39 - "generator.js"
Cohesion: 0.06
Nodes (82): SESSION, applyLighting(), A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen() (+74 more)

### Community 40 - "blindtag.js"
Cohesion: 0.04
Nodes (121): botsNeeded(), clamp(), decodeBots(), encodeBots(), FILL, fleePoint(), humansIn(), isBotId() (+113 more)

### Community 41 - "Mod Menu"
Cohesion: 0.10
Nodes (32): account(), isModMenuUser(), EMOTE, _a, _b, cool, HF, bPressed() (+24 more)

### Community 42 - "core_engine_three"
Cohesion: 0.18
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (54): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+46 more)

### Community 44 - "workshop.js"
Cohesion: 0.07
Nodes (62): atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap(), demoMap() (+54 more)

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

### Community 49 - "releaseAll"
Cohesion: 0.13
Nodes (20): releaseAll(), caught(), caught(), nearestAisle(), pickPatrol(), sees(), think(), caught() (+12 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, buildBall(), ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope() (+11 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "hideseek.js"
Cohesion: 0.16
Nodes (18): TAGS, BOT, broadcast(), drawHud(), fmt(), handsOf(), headOf(), HIDER_SPAWNS (+10 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "treasure.js"
Cohesion: 0.23
Nodes (17): validIndex(), BOXES, broadcast(), build(), buildArena(), drawHud(), endRound(), fmt() (+9 more)

### Community 55 - "range.js"
Cohesion: 0.13
Nodes (27): safeName(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), clearTargets(), _d, drawBoard() (+19 more)

### Community 56 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 57 - "bakeDraw"
Cohesion: 0.18
Nodes (16): bakeDpr(), bakeDraw(), bakeOne(), grounds(), groundSpec(), liveOn(), mountAt(), nextBake() (+8 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "home.mjs"
Cohesion: 0.20
Nodes (6): door, eco, lvl, main, ROOT, store

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "cosmetics.js"
Cohesion: 0.28
Nodes (12): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat(), extraHat() (+4 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "home.js"
Cohesion: 0.09
Nodes (38): acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome(), fmtRecord() (+30 more)

### Community 64 - "update"
Cohesion: 0.31
Nodes (11): bfs(), chase(), freeze(), jumpscare(), neighbors(), nodeAt(), openDir(), spawnTwin() (+3 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.10
Nodes (27): addPause(), AGAIN, bakeQueue, BASE, boxes, boxOf(), cache, css (+19 more)

### Community 67 - "package.json"
Cohesion: 0.21
Nodes (11): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.160.0 (+3 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "lobby-door.js"
Cohesion: 0.08
Nodes (24): placeArm(), poseHand(), ULTIMATE_SCALE, GFX, emoteState(), poseRemoteHands(), ARRIVAL, ARRIVAL_GAMES (+16 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.09
Nodes (20): defs, HERE, num(), range(), ROOT, check(), done(), BND (+12 more)

### Community 73 - "poolCap"
Cohesion: 0.24
Nodes (7): acquire(), LiveSet, poolCap(), tpAdd(), tpHeld(), tpMax(), unwait()

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "music.js"
Cohesion: 0.23
Nodes (12): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+4 more)

### Community 76 - "registry.mjs"
Cohesion: 0.22
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, changed, check, fast, levelpack, logic, registry, rounds (+3 more)

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.20
Nodes (3): IN, lob, ROOT

### Community 83 - "monster.js"
Cohesion: 0.12
Nodes (30): buildMonsterSkin(), setAvatarHidden(), broadcast(), catchPlayer(), dispose(), drawHud(), duct(), fmt() (+22 more)

### Community 84 - "orb-sphere/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), fallback(), lc(), lin(), mount(), noLavender(), params, placeOrb() (+2 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "well.js"
Cohesion: 0.10
Nodes (34): world, signTexture(), makeOozeMaterial(), sendLevelMsg(), broadcast(), buildGrate(), buildHatch(), buildHolds() (+26 more)

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
Cohesion: 0.18
Nodes (26): isDarkPaper(), mountPrint(), adapt(), advance(), applyNarrow(), ensureGlyphs(), fit(), frameEmpty() (+18 more)

### Community 92 - "effects.mjs"
Cohesion: 0.10
Nodes (26): args, buildIndex(), checkFilters(), commands, ENUMS, FX, gallery(), INDEX (+18 more)

### Community 93 - "engine.js"
Cohesion: 0.04
Nodes (63): LP, SAVE, addShaderEdges(), blobAOMat, camera, headLamp, hemi, L (+55 more)

### Community 94 - "system.js"
Cohesion: 0.14
Nodes (26): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+18 more)

### Community 95 - "ref_node_fs"
Cohesion: 0.09
Nodes (14): files, here, files, here, MUST_CATCH, MUST_PASS, OBJECTS, fragments (+6 more)

### Community 96 - "color"
Cohesion: 0.19
Nodes (22): makeLayer(), mount(), calmAt(), colours(), count(), draw(), drawGrid(), drawPulse() (+14 more)

### Community 97 - "Diagram"
Cohesion: 0.17
Nodes (3): Diagram, kindOther(), normalise()

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

### Community 104 - ".pause"
Cohesion: 0.17
Nodes (11): GPU cost, Limits, Mount, Mount, Never, Objects and prints (`assets/objects`), Posters, Product renders (+3 more)

### Community 105 - "soft-light-bars/effect.js"
Cohesion: 0.24
Nodes (19): alpha(), banned(), blendsClean(), companion(), darkLight(), fallback(), guard(), hueGap() (+11 more)

### Community 106 - "photoGL"
Cohesion: 0.20
Nodes (18): mount(), params, makeTexture(), photoGL(), adapt(), bindTextures(), draw(), finish() (+10 more)

### Community 107 - "film-light-leak/effect.js"
Cohesion: 0.50
Nodes (7): guard(), isWarm(), mount(), params, pickEdge(), tones(), uniforms()

### Community 108 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 109 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 110 - "presence.js"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 111 - "still"
Cohesion: 0.20
Nodes (14): DATA, FULL, init(), MONTHS, TICKS, init(), PARAMS, init() (+6 more)

### Community 112 - "deal.mjs"
Cohesion: 0.15
Nodes (16): args, darkIds(), dealOnce(), draw(), fits(), HAS, here, hero (+8 more)

### Community 113 - "Copy registers"
Cohesion: 0.12
Nodes (15): 0. The model's default (the one to avoid), 10. Refusal and narrowness, 11. The product as the hero, 12. Hurried and conversational, 1. Facts only, 2. Technical and dry, with proof, 3. The founder's letter, 4. Self-aware and playful (+7 more)

### Community 114 - "reduced"
Cohesion: 0.24
Nodes (12): init(), STILL, init(), PARAMS, draw(), init(), PARAMS, fill() (+4 more)

### Community 115 - "mountProduct"
Cohesion: 0.33
Nodes (15): el(), mountProduct(), clearInner(), done(), layout(), measureStill(), mountLive(), palette() (+7 more)

### Community 116 - "shared.js"
Cohesion: 0.16
Nodes (14): grab(), inkPalette(), mqHover, mqReduce, nextFrame(), pendingStills, roundRect(), safe() (+6 more)

### Community 117 - "product-render/auto.js"
Cohesion: 0.21
Nodes (14): apply(), ATTRS, cache, claimed, json(), mountAll(), optsOf(), placeOf() (+6 more)

### Community 118 - "pick.mjs"
Cohesion: 0.19
Nodes (11): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+3 more)

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

### Community 123 - "pick.js"
Cohesion: 0.28
Nodes (12): clashes(), dealable(), filterEffects(), fitsKind(), kindOf(), KINDS, parseSlot(), pick() (+4 more)

### Community 124 - "layout.js"
Cohesion: 0.37
Nodes (12): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+4 more)

### Community 125 - "ambience.js"
Cohesion: 0.15
Nodes (20): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+12 more)

### Community 126 - "fx-feature-card/component.js"
Cohesion: 0.26
Nodes (10): demo(), grainGround(), groundPalette(), GROUNDS, init(), lum(), ok(), read() (+2 more)

### Community 127 - ".render"
Cohesion: 0.32
Nodes (4): clamp(), ease(), spread(), unease()

### Community 128 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 129 - "product-turntable/object.js"
Cohesion: 0.21
Nodes (11): CAM, cross(), dot(), fitCamera(), FORMS, LABELS, NAMES, norm() (+3 more)

### Community 130 - "Copy moves"
Cohesion: 0.17
Nodes (11): About and story, Buttons and the close, Copy moves, Features and how it works, Microcopy: where a voice is most welcome, Numbers and humour, Prices, FAQ, booking: the plain zone, Proof (+3 more)

### Community 131 - "Effects beyond backgrounds"
Cohesion: 0.17
Nodes (11): A photograph with copy (`fx-photo`), Cost: light enough for a laptop's integrated GPU, Effects beyond backgrounds, Feature cards with inset panels (`fx-feature-card`), Objects in dither (`fx-dither-object`), Picking the effect, Street map of the place (`fx-map`), The techniques (`components/shared.js`) (+3 more)

### Community 132 - "die"
Cohesion: 0.27
Nodes (9): CDP, die(), findChrome(), inProject(), launch(), perf(), serve(), shot() (+1 more)

### Community 133 - "murals.js"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 134 - "tone"
Cohesion: 0.25
Nodes (9): init(), PARAMS, init(), fallback(), LAYERS, NICE, PARAMS, readData() (+1 more)

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

### Community 139 - "buildMonster"
Cohesion: 0.47
Nodes (6): buildHead(), buildMonster(), buildScare(), chain(), meshOf(), monsterMats()

### Community 140 - "Product render (`assets/objects/product-render`)"
Cohesion: 0.11
Nodes (15): Adding an effect, Commands, Effects, Mount, Random pick, The list, Behaviour and limits, Materials (+7 more)

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

### Community 153 - "refsOf"
Cohesion: 0.22
Nodes (9): attrs(), cssRefs(), jsRefs(), kindOf(), local(), metas(), refsOf(), stripRef() (+1 more)

### Community 154 - "furas.js"
Cohesion: 0.08
Nodes (40): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+32 more)

### Community 155 - "_print-core/demo.js"
Cohesion: 0.40
Nodes (3): EFFECT_LABEL, PAPERS, EFFECTS

### Community 156 - "god-rays/effect.js"
Cohesion: 0.50
Nodes (7): aim(), fits(), mount(), params, tones(), uniforms(), warm()

### Community 157 - "prism-dispersion/effect.js"
Cohesion: 0.50
Nodes (7): hd(), layout(), mount(), params, spectrumCentre(), tones(), uniforms()

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

### Community 164 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 165 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

### Community 167 - "silk-folds/effect.js"
Cohesion: 0.52
Nodes (6): cool(), mount(), params, sheenTurn(), tones(), uniforms()

### Community 168 - "definePrint"
Cohesion: 0.16
Nodes (4): definePrint(), formShader(), LAKES, LAND

### Community 169 - "Copy tells"
Cohesion: 0.29
Nodes (6): Copy tells, First generation: the old tells (mostly avoided now; still checked), Not tells (leave them alone), Over-correction: what the rules themselves produce, Second generation: the tells now, Why it happens

### Community 170 - "Icons"
Cohesion: 0.29
Nodes (6): Commands, How they sit, Icons, The violet rule (a judgement, stated), Where they come from, Which one

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

### Community 177 - "dotOf"
Cohesion: 0.47
Nodes (6): activeIn(), below(), dotOf(), findProject(), lastTouch(), unarmedPage()

### Community 178 - "applyFlags"
Cohesion: 0.40
Nodes (6): applyFlags(), fileAt(), findPage(), isUrl(), kindArg(), slash()

### Community 179 - "browserChecks"
Cohesion: 0.40
Nodes (6): browserChecks(), copyChecks(), errLine(), left(), parseJson(), rmProfile()

### Community 180 - "staticChecks"
Cohesion: 0.40
Nodes (6): codeOnly(), hashOf(), kitIndex(), kitTwin(), norm(), staticChecks()

### Community 181 - "opt"
Cohesion: 0.33
Nodes (6): freshProfile(), inProject(), opt(), profileBase(), roundsArg(), str()

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

### Community 188 - "runSweep"
Cohesion: 0.67
Nodes (4): bySev(), clean(), lostFindings(), runSweep()

### Community 189 - "shaderLint"
Cohesion: 0.50
Nodes (4): glslIn(), isGLSL(), lintGLSL(), shaderLint()

### Community 212 - "hauntedui.js"
Cohesion: 0.15
Nodes (12): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, MONO (+4 more)

### Community 214 - "withLoop"
Cohesion: 0.20
Nodes (10): init(), init(), DATA, init(), PREV, isStill(), withLoop(), init() (+2 more)

### Community 216 - "goobyTexture"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 217 - "drawScreen"
Cohesion: 0.33
Nodes (9): dailyOn(), drawCard(), drawGlass(), mmss(), sp(), tx(), drawScreen(), drawWall() (+1 more)

### Community 218 - "drawGames"
Cohesion: 0.19
Nodes (13): drawEcg(), drawEye(), ensureAssets(), makeDread(), build(), buildCategories(), buildDecor(), curMode() (+5 more)

## Knowledge Gaps
- **29 isolated node(s):** `./core/audio.js`, `./core/avatar.js`, `./core/economy.js`, `./core/emotes.js`, `./core/gorillamachine.js` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1682 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `gate.mjs`, `logic.mjs`, `copy-lint.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.434) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/audio.js`, `./core/avatar.js`, `./core/economy.js` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.048272706474490966 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `package.json` to `Tests & Module Imports`?**
  _High betweenness centrality (0.432) - this node is a cross-community bridge._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.0406003937007874 - nodes in this community are weakly interconnected._
- **Why does `three` connect `engine.js` to `textures.js`, `silence.js`, `package.json`, `lobby-door.js`, `addCrispBlock`, `main.js`, `nursery.js`, `well.js`, `lobby.js`, `furas.js`, `avatar.js`?**
  _High betweenness centrality (0.374) - this node is a cross-community bridge._