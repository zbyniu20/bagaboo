# Graph Report - bagaboo  (2026-11-21)

## Corpus Check
- 432 files · ~1,229,366 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 87 file(s) not represented in the graph (top: .css 84, (none) 3)

## Summary
- 5166 nodes · 13479 edges · 210 communities (187 shown, 23 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 449 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de6847d8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- toast
- textures.js
- silence.js
- config.js
- laundry.js
- pet.js
- hideseek.js
- player.js
- lib
- Tests & Module Imports
- catacombs.js
- pause.js
- main.js
- nursery.js
- auth.js
- hotel.js
- terminal.js
- petnest.js
- toast
- dodgeball.js
- engine.js
- room000map.js
- engine.js
- graffiti.js
- setPlayerPosition
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- Banana Mode
- dotted-globe/effect.js
- hospital.js
- icons.mjs
- print3d.js
- games.js
- modmenu.js
- lobby-door.js
- cemetery.js
- hotel.js
- well.js
- maze.js
- build.js
- workshop.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- room000.js
- range.js
- Docs: Accounts & Rules
- levels.js
- hauntedui.js
- poolCap
- petmodel.js
- gate.mjs
- satiety
- bake.mjs
- home.mjs
- moments.mjs
- scripts
- duotone-grade/effect.js
- home.js
- petstore.js
- loop
- ui/ui.js
- package.json
- bag
- shader
- Terminal
- perf.mjs
- rounds.mjs
- num
- logic.mjs
- generatorlogic.js
- wrapText
- split-reveal/object.js
- kit.js
- film-light-leak/effect.js
- diagram.js
- static.mjs
- lobby.mjs
- monster.js
- orb-sphere/effect.js
- moments/lib.js
- _demo/shoot.mjs
- trainingdummy.js
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- visuals.js
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
- generatorlogic.mjs
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
- monsterskins.js
- stage
- 4. Place
- System
- block
- pick.js
- layout.js
- music.js
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
- visitorsHere
- Product render (`assets/objects/product-render`)
- s
- Layout: one section per screen, equal edges, heroes, type
- Photographs
- tasteskill 2.5
- fx-dither-object/component.js
- frag
- Objects (`assets/objects/print-*`)
- init
- Copy
- Copy voice
- Effects usage
- Features
- refsOf
- furas.js
- edge-glow/effect.js
- god-rays/effect.js
- prism-dispersion/effect.js
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- registry.mjs
- pElbow
- withLoop
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
- room000.mjs
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- cosmetics.js
- _print-core/demo.js

## God Nodes (most connected - your core abstractions)
1. `toast()` - 222 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 93 edges
4. `buzz()` - 79 edges
5. `buildDoor()` - 73 edges
6. `makeCanvas()` - 69 edges
7. `mkRng()` - 69 edges
8. `levelReward()` - 60 edges
9. `toTex()` - 60 edges
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
- `buildShell()` --calls--> `wallBlocks()`  [EXTRACTED]
  levels/room000.js → core/room000map.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (210 total, 23 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (96): getAudioContext(), randomNonce(), vouch(), animateFace(), BANS_CLEARED, isModMenuUser(), emoteState(), animateFaces() (+88 more)

### Community 1 - "toast"
Cohesion: 0.05
Nodes (80): activeRoleTags(), ACTIVITY, addBones(), buyItem(), capped(), checkCounters(), claimLoginReward(), confirmGift() (+72 more)

### Community 2 - "textures.js"
Cohesion: 0.08
Nodes (59): eyeTexture(), hammerTextures(), roleLabel(), createMural(), ANISO(), crackWalk(), createBandageTexture(), _createBloodPoolTexture() (+51 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (55): attachMic(), micLevel(), rewardActivity(), addDoorPortal(), cameraPanel(), isOnRope(), releaseRope(), avoidObstacles() (+47 more)

### Community 4 - "config.js"
Cohesion: 0.09
Nodes (51): buildHammer(), ADMIN_NAMES, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName() (+43 more)

### Community 5 - "laundry.js"
Cohesion: 0.07
Nodes (51): addCrispBlock(), buildDoor(), buildGate(), buildGate(), buildGate(), buildGate(), addPortal(), animateMonster() (+43 more)

### Community 6 - "pet.js"
Cohesion: 0.12
Nodes (33): buildPet(), carryStep(), _dir, disposePet(), _f, flatForward(), _fq, lookFor() (+25 more)

### Community 7 - "hideseek.js"
Cohesion: 0.13
Nodes (26): hostState(), isAuthority(), BOT, botSees(), broadcast(), drawHud(), fmt(), fromNet() (+18 more)

### Community 8 - "player.js"
Cohesion: 0.06
Nodes (42): cross, DESKTOP, help, keyHooks, keys, _o, onDesktopKey(), _q (+34 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (32): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js (+24 more)

### Community 11 - "catacombs.js"
Cohesion: 0.10
Nodes (26): createGridMaze(), addWarden(), animate(), BONES, build(), buildDecor(), buildKeys(), buildWalls() (+18 more)

### Community 12 - "pause.js"
Cohesion: 0.09
Nodes (30): GFX, CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh (+22 more)

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (75): updateListener(), isReservedNick(), LIGHT_MODE, box, c, errors, mesh, origError (+67 more)

### Community 14 - "nursery.js"
Cohesion: 0.09
Nodes (27): addDoll(), animate(), build(), buildDecor(), buildDolls(), buildKeys(), buildStations(), caught() (+19 more)

### Community 15 - "auth.js"
Cohesion: 0.15
Nodes (21): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+13 more)

### Community 16 - "hotel.js"
Cohesion: 0.05
Nodes (108): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+100 more)

### Community 17 - "terminal.js"
Cohesion: 0.04
Nodes (82): createAvatar(), lookKey(), LOBBY_MOVE_SCALE, bumpStat(), checkStatAchievements(), close(), closeEmotePanel(), _d (+74 more)

### Community 18 - "petnest.js"
Cohesion: 0.18
Nodes (20): hatchBegin(), hatchPop(), posOf(), reactFeed(), reactPat(), bar(), buildPetNest(), doFeed() (+12 more)

### Community 19 - "toast"
Cohesion: 0.09
Nodes (49): checkCompletionist(), dailyDate(), dailyKey(), getDiff(), isDaily(), levelReward(), pruneDaily(), recordKey() (+41 more)

### Community 20 - "dodgeball.js"
Cohesion: 0.05
Nodes (86): createBot(), LIGHT_PRESETS, recordScore(), applyLighting(), camera, L, canCatch(), gateOpen() (+78 more)

### Community 21 - "engine.js"
Cohesion: 0.06
Nodes (46): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addBlobAO(), addShaderEdges(), blobAOMat, GROUP (+38 more)

### Community 22 - "room000map.js"
Cohesion: 0.07
Nodes (54): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), clearLine() (+46 more)

### Community 23 - "engine.js"
Cohesion: 0.07
Nodes (59): addBody(), addConstraint(), addStaticBody(), flashlight, PIPE_CYL, place(), seg(), UNIT_CYL (+51 more)

### Community 24 - "graffiti.js"
Cohesion: 0.06
Nodes (85): isMouseDown(), addPoster(), apply(), AREA, buildGraffiti(), buildPads(), canClear(), castVote() (+77 more)

### Community 25 - "setPlayerPosition"
Cohesion: 0.11
Nodes (48): drawInstructions(), panelBg(), clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL (+40 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.08
Nodes (47): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHat(), buildMask() (+39 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (56): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+48 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (26): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+18 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.08
Nodes (54): CITIES, earthSampler(), easeInOut(), easeOut(), fib(), hueIn(), LAKES, LAND (+46 more)

### Community 33 - "hospital.js"
Cohesion: 0.10
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGrid(), buildRooms(), buildShell() (+20 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.07
Nodes (50): atlas, CELL, clamp(), colMajor(), COMMON_PARAMS, config, cross(), cssHex() (+42 more)

### Community 36 - "games.js"
Cohesion: 0.09
Nodes (31): topTimes(), drawEcg(), drawEye(), makeDread(), AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_HIDESEEK (+23 more)

### Community 37 - "modmenu.js"
Cohesion: 0.14
Nodes (24): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+16 more)

### Community 38 - "lobby-door.js"
Cohesion: 0.09
Nodes (29): addRoleTag(), createGorillaArm(), placeArm(), poseHand(), ULTIMATE_SCALE, getLook(), onLookChange(), unlockItem() (+21 more)

### Community 39 - "cemetery.js"
Cohesion: 0.10
Nodes (26): introSeen(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDiggers(), buildRelics() (+18 more)

### Community 40 - "hotel.js"
Cohesion: 0.07
Nodes (43): stepBot(), addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe() (+35 more)

### Community 41 - "well.js"
Cohesion: 0.08
Nodes (44): diffOf(), lighting, createEvents(), near(), KINDS, _p, signTexture(), makeOozeMaterial() (+36 more)

### Community 42 - "maze.js"
Cohesion: 0.11
Nodes (37): scaleBoxUVs(), createJumpscare(), buildMannequin(), build(), buildArena(), addLamp(), bfs(), build() (+29 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (52): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+44 more)

### Community 44 - "workshop.js"
Cohesion: 0.07
Nodes (61): register(), atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap() (+53 more)

### Community 45 - "fx.js"
Cohesion: 0.07
Nodes (46): BASE_UNIFORMS, CALM_SPOTS, clamp(), compose(), cssToHex(), DEFAULT_PALETTE, enforceBudget(), FOCAL (+38 more)

### Community 46 - "start.mjs"
Cohesion: 0.05
Nodes (45): ALIAS, allTypes, args, axisOrder(), axisVal(), block(), buttonInk(), dealTypes() (+37 more)

### Community 47 - "copy-lint.mjs"
Cohesion: 0.07
Nodes (47): APART, args, attrOf(), BLOCK, brandsOf(), CAST, CAST_CO, clip() (+39 more)

### Community 48 - "photo.js"
Cohesion: 0.06
Nodes (43): FLAT, inks(), mount(), params, analyse(), analyses, BASE, bestSrc() (+35 more)

### Community 49 - "room000.js"
Cohesion: 0.10
Nodes (31): addInstancedBlocks(), buildDecor(), animate(), build(), buildDecoys(), buildGhost(), buildItems(), buildLights() (+23 more)

### Community 50 - "range.js"
Cohesion: 0.14
Nodes (25): safeName(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), clearTargets(), _d, drawBoard() (+17 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "levels.js"
Cohesion: 0.09
Nodes (29): dailyOn(), setDailyMode(), setDiff(), ensureAssets(), CARDS, AR, ARRIVAL_FROM_CATACOMBS, ARRIVAL_FROM_CEMETERY (+21 more)

### Community 53 - "hauntedui.js"
Cohesion: 0.13
Nodes (16): IS_QUEST, fmtDuration(), addComputers(), AMB, AMBD, BEAT, BLOOD, BONE (+8 more)

### Community 54 - "poolCap"
Cohesion: 0.24
Nodes (7): acquire(), LiveSet, poolCap(), tpAdd(), tpHeld(), tpMax(), unwait()

### Community 55 - "petmodel.js"
Cohesion: 0.23
Nodes (10): PET, createPetModel(), emit(), stepParts(), update(), drawFace(), EYES, geo() (+2 more)

### Community 56 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 57 - "satiety"
Cohesion: 0.27
Nodes (11): canFeed(), dayOf(), feed(), feedsLeft(), hours(), isHungry(), moodBase(), moodOf() (+3 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "home.mjs"
Cohesion: 0.20
Nodes (6): door, eco, lvl, main, ROOT, store

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, changed, check, fast, levelpack, logic, registry, rounds (+3 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "home.js"
Cohesion: 0.07
Nodes (50): ACHIEVEMENTS, SAVE, acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor() (+42 more)

### Community 64 - "petstore.js"
Cohesion: 0.16
Nodes (30): saveGame(), spendBones(), petPage(), canHatch(), canPat(), colorChoices(), cycleColor(), cycleSpecies() (+22 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.08
Nodes (42): addPause(), AGAIN, bakeDpr(), bakeDraw(), bakeOne(), bakeQueue, BASE, boxes (+34 more)

### Community 67 - "package.json"
Cohesion: 0.21
Nodes (11): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.160.0 (+3 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.06
Nodes (55): mount(), params, tones(), uniforms(), violet(), fallback(), mount(), params (+47 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.09
Nodes (21): defs, HERE, num(), range(), ROOT, check(), done(), GEN (+13 more)

### Community 73 - "num"
Cohesion: 0.31
Nodes (10): clamp(), hatch(), intIn(), normalizePet(), num(), past(), pickColor(), restSpot() (+2 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "generatorlogic.js"
Cohesion: 0.10
Nodes (14): A, clamp01(), GATE_Z, GENS, hearRadius(), MIC, micNoise(), MON (+6 more)

### Community 76 - "wrapText"
Cohesion: 0.28
Nodes (9): drawCard(), drawGlass(), sp(), stepDread(), tx(), wrapText(), update(), drawWall() (+1 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "film-light-leak/effect.js"
Cohesion: 0.50
Nodes (7): guard(), isWarm(), mount(), params, pickEdge(), tones(), uniforms()

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.20
Nodes (4): IN, lob, N(), ROOT

### Community 83 - "monster.js"
Cohesion: 0.05
Nodes (83): countVotes(), GATE, gateStep(), nextNightIn(), NIGHT, nightStep(), num(), padOf() (+75 more)

### Community 84 - "orb-sphere/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), fallback(), lc(), lin(), mount(), noLavender(), params, placeOrb() (+2 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "trainingdummy.js"
Cohesion: 0.24
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

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

### Community 93 - "visuals.js"
Cohesion: 0.18
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 94 - "system.js"
Cohesion: 0.14
Nodes (26): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+18 more)

### Community 95 - "ref_node_fs"
Cohesion: 0.06
Nodes (25): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+17 more)

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

### Community 107 - "generatorlogic.mjs"
Cohesion: 0.18
Nodes (4): bot, lp, r, ROOT

### Community 108 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 109 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 110 - "presence.js"
Cohesion: 0.33
Nodes (12): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE, retry() (+4 more)

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

### Community 118 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

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

### Community 125 - "music.js"
Cohesion: 0.21
Nodes (12): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+4 more)

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

### Community 146 - "frag"
Cohesion: 0.17
Nodes (19): at(), L(), mount(), params, tones(), uniforms(), mount(), params (+11 more)

### Community 147 - "Objects (`assets/objects/print-*`)"
Cohesion: 0.22
Nodes (8): glslProblems(), A new object, Do and don't, It always shows a picture, Light on a laptop GPU, Objects (`assets/objects/print-*`), Posters, Put one on a page

### Community 148 - "init"
Cohesion: 0.18
Nodes (5): init(), init(), done(), init(), POINTER_SVG

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
Cohesion: 0.07
Nodes (46): takeRespawn(), addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers() (+38 more)

### Community 155 - "edge-glow/effect.js"
Cohesion: 0.46
Nodes (7): clearOfViolet(), crossesViolet(), mount(), neighbour(), params, tones(), uniforms()

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

### Community 164 - "registry.mjs"
Cohesion: 0.22
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 165 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

### Community 166 - "withLoop"
Cohesion: 0.20
Nodes (10): init(), init(), DATA, init(), PREV, isStill(), withLoop(), init() (+2 more)

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

### Community 193 - "room000.mjs"
Cohesion: 0.12
Nodes (14): blocks, cellOf(), cover, diags, dist, doors, grid, plan (+6 more)

### Community 212 - "cosmetics.js"
Cohesion: 0.38
Nodes (9): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraHat(), extraMask() (+1 more)

### Community 215 - "_print-core/demo.js"
Cohesion: 0.40
Nodes (3): EFFECT_LABEL, PAPERS, EFFECTS

## Knowledge Gaps
- **29 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1696 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `registry.mjs`, `logic.mjs`, `workshop.js`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.460) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04355492858402398 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `workshop.js` to `build.js`?**
  _High betweenness centrality (0.426) - this node is a cross-community bridge._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.050200803212851405 - nodes in this community are weakly interconnected._
- **Why does `lib()` connect `lib` to `consistency.mjs`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._