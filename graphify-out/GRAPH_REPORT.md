# Graph Report - bagaboo  (2026-11-22)

## Corpus Check
- 452 files · ~1,251,309 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 87 file(s) not represented in the graph (top: .css 84, (none) 3)

## Summary
- 5433 nodes · 13877 edges · 216 communities (193 shown, 23 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 450 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5afed4ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- toast
- textures.js
- silence.js
- config.js
- addCrispBlock
- pet.js
- banana.js
- player.js
- lib
- Tests & Module Imports
- maze.js
- well.js
- main.js
- hospital.js
- auth.js
- audio.js
- room000.js
- petnest.js
- hotel.js
- engine.js
- monsterskins.js
- common.py
- lobby.js
- graffiti.js
- redlight.js
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- range.js
- dotted-globe/effect.js
- catacombs.js
- icons.mjs
- print3d.js
- games.js
- modmenu.js
- update
- dodgeball.js
- terminal.js
- hideseek.js
- lobby-door.js
- build.js
- workshop.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- room000map.js
- petstore.js
- Docs: Accounts & Rules
- pause.js
- monstermaps.js
- visuals.js
- nursery.js
- gate.mjs
- homelogic.js
- bake.mjs
- trainingdummy.js
- moments.mjs
- cosmetics.js
- duotone-grade/effect.js
- music.js
- steps
- loop
- ui/ui.js
- three
- bag
- shader
- ambience.js
- perf.mjs
- ref_path
- gradient-mesh/effect.js
- logic.mjs
- lobbygames.js
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- pick.mjs
- diagram.js
- static.mjs
- lobby.mjs
- monster.js
- lobbyplay.js
- moments/lib.js
- _demo/shoot.mjs
- film-light-leak/effect.js
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- xrperf.js
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
- clamp
- stage
- 4. Place
- System
- block
- pick.js
- layout.js
- place
- fx-feature-card/component.js
- .render
- orb-sphere/effect.js
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
- god-rays/effect.js
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
- buzz
- furas.js
- blender/README.md
- petmodel.js
- prism-dispersion/effect.js
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- ref_url
- pElbow
- withLoop
- compilerOptions
- print-globe/object.js
- Copy tells
- Icons
- stepBot
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- buildRoom
- .pause
- lobbylogic.js
- update
- shots.mjs
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- setFlashHolder
- pages.yml
- photo-chapters/moment.js
- package.json
- silk-folds/effect.js
- room000.mjs
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- vrmenu.js
- home.mjs
- smoke-dist.mjs
- shots.mjs

## God Nodes (most connected - your core abstractions)
1. `toast()` - 225 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 93 edges
4. `buzz()` - 79 edges
5. `buildDoor()` - 73 edges
6. `makeCanvas()` - 71 edges
7. `toTex()` - 60 edges
8. `levelReward()` - 60 edges
9. `shader()` - 60 edges
10. `setPlayerPosition()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)` --references--> `decodeMap()`  [INFERRED]
  docs/POMYSLY.md → core/workshoplogic.js
- `7. Wspólny pokój ekipy` --references--> `normalizeHome()`  [INFERRED]
  docs/POMYSLY.md → core/homelogic.js
- `The eleven heroes` --references--> `collage()`  [INFERRED]
  .claude/skills/taste-skill/references/layout-v4.md → .claude/skills/taste-skill/assets/layout/layout.js
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `SCREECH` --calls--> `toast()`  [EXTRACTED]
  levels/hotel.js → core/terminal.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (216 total, 23 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (95): getAudioContext(), randomNonce(), animateFace(), canPunish(), isModMenuUser(), animateFaces(), answerCall(), attachMic() (+87 more)

### Community 1 - "toast"
Cohesion: 0.04
Nodes (83): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, CATALOG, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave() (+75 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (67): buildBadge(), burntTexture(), eyeTexture(), faceTexture(), hammerTextures(), jacketTexture(), roleLabel(), buildPads() (+59 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (49): rewardActivity(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE, animateMonster(), avoidObstacles(), BALLS, broadcast() (+41 more)

### Community 4 - "config.js"
Cohesion: 0.11
Nodes (41): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+33 more)

### Community 5 - "addCrispBlock"
Cohesion: 0.08
Nodes (51): addCrispBlock(), buildDividers(), buildRoom(), addPortal(), animateMonster(), bag(), build(), buildCeiling() (+43 more)

### Community 6 - "pet.js"
Cohesion: 0.11
Nodes (35): squeak(), buildPet(), carryStep(), _dir, disposePet(), _f, flatForward(), _fq (+27 more)

### Community 7 - "banana.js"
Cohesion: 0.13
Nodes (28): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+20 more)

### Community 8 - "player.js"
Cohesion: 0.05
Nodes (52): cross, DESKTOP, enableDesktop(), help, keyHooks, keys, _o, onDesktopKey() (+44 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (31): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js (+23 more)

### Community 11 - "maze.js"
Cohesion: 0.11
Nodes (39): createBot(), scaleBoxUVs(), addMonsterFace(), buildMannequin(), buildDiggers(), makeBlind(), addLamp(), bfs() (+31 more)

### Community 12 - "well.js"
Cohesion: 0.11
Nodes (29): world, signTexture(), makeOozeMaterial(), ARRIVAL_FROM_WELL, broadcast(), build(), buildGrate(), buildHatch() (+21 more)

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (63): updateListener(), errorText(), box, c, errors, mesh, origError, tx (+55 more)

### Community 14 - "hospital.js"
Cohesion: 0.09
Nodes (31): takeRespawn(), addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid() (+23 more)

### Community 15 - "auth.js"
Cohesion: 0.14
Nodes (23): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+15 more)

### Community 16 - "audio.js"
Cohesion: 0.10
Nodes (43): ballHit(), bang(), beep(), bell(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb() (+35 more)

### Community 17 - "room000.js"
Cohesion: 0.07
Nodes (49): ARRIVAL_FROM_ROOM000, addMarks(), animate(), blotTexture(), buildDecor(), buildDecoys(), buildGhost(), buildHangers() (+41 more)

### Community 18 - "petnest.js"
Cohesion: 0.24
Nodes (15): hatchBegin(), reactFeed(), reactPat(), bar(), buildPetNest(), doFeed(), doHatch(), doPat() (+7 more)

### Community 19 - "hotel.js"
Cohesion: 0.10
Nodes (24): build(), buildFlashlight(), drawHud(), faceTexture(), fmt(), _fq, HUBS, info (+16 more)

### Community 20 - "engine.js"
Cohesion: 0.04
Nodes (72): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addCollider(), addConstraint(), addShaderEdges(), blobAOMat (+64 more)

### Community 21 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

### Community 22 - "common.py"
Cohesion: 0.06
Nodes (14): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts(), mirror_union() (+6 more)

### Community 23 - "lobby.js"
Cohesion: 0.08
Nodes (44): addBlobAO(), addBody(), addStaticBody(), flashlight, PIPE_CYL, UNIT_CYL, attachGorillaMachine(), basePose() (+36 more)

### Community 24 - "graffiti.js"
Cohesion: 0.05
Nodes (91): isMouseDown(), addPoster(), apply(), AREA, buildGraffiti(), canClear(), castVote(), clearWall() (+83 more)

### Community 25 - "redlight.js"
Cohesion: 0.06
Nodes (89): checkCompletionist(), dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), levelReward(), pruneDaily() (+81 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.07
Nodes (57): addRoleTag(), addScaryFace(), ARM_GEO, BADGES, badgeTex, bakeShade(), BONE(), buildBunnyEars() (+49 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (62): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+54 more)

### Community 31 - "range.js"
Cohesion: 0.13
Nodes (26): safeName(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), clearTargets(), _d, drawBoard() (+18 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "catacombs.js"
Cohesion: 0.05
Nodes (70): diffOf(), addInstancedBlocks(), createEvents(), addDoorPortal(), buildDoor(), buildMaw(), cameraPanel(), createJumpscare() (+62 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.05
Nodes (42): EFFECT_LABEL, PAPERS, acquire(), atlas, CELL, colMajor(), COMMON_PARAMS, config (+34 more)

### Community 36 - "games.js"
Cohesion: 0.05
Nodes (72): IS_QUEST, dailyOn(), setDailyMode(), setDiff(), addComputers(), AMB, AMBD, BEAT (+64 more)

### Community 37 - "modmenu.js"
Cohesion: 0.12
Nodes (26): EMOTE, _a, _b, cool, HF, bPressed(), buildXray(), closeMenu() (+18 more)

### Community 38 - "update"
Cohesion: 0.23
Nodes (13): creak(), enter(), applyPull(), caught(), checkAllOut(), faceScare(), isAuthority(), localPull() (+5 more)

### Community 39 - "dodgeball.js"
Cohesion: 0.07
Nodes (55): recordScore(), camera, onLevelMsg(), dispose(), fromNet(), handsOf(), headOf(), isAuthority() (+47 more)

### Community 40 - "terminal.js"
Cohesion: 0.03
Nodes (102): LIGHT_PRESETS, LOBBY_MOVE_SCALE, addBones(), bumpStat(), buyItem(), capped(), checkCounters(), checkStatAchievements() (+94 more)

### Community 41 - "hideseek.js"
Cohesion: 0.12
Nodes (29): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud() (+21 more)

### Community 42 - "lobby-door.js"
Cohesion: 0.08
Nodes (31): placeArm(), poseHand(), ULTIMATE_SCALE, getLook(), onLookChange(), unlockItem(), emoteState(), poseRemoteHands() (+23 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (52): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+44 more)

### Community 44 - "workshop.js"
Cohesion: 0.07
Nodes (54): atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap(), demoMap() (+46 more)

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

### Community 49 - "room000map.js"
Cohesion: 0.10
Nodes (32): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), clearLine() (+24 more)

### Community 50 - "petstore.js"
Cohesion: 0.13
Nodes (42): spendBones(), canFeed(), canHatch(), canPat(), clamp(), cycleSpecies(), dayOf(), feed() (+34 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "pause.js"
Cohesion: 0.13
Nodes (26): applyVolumes(), applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause() (+18 more)

### Community 53 - "monstermaps.js"
Cohesion: 0.18
Nodes (23): aisles(), box(), free(), gbox(), GEN, HEDGE, hedge(), LOBBY (+15 more)

### Community 54 - "visuals.js"
Cohesion: 0.17
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 55 - "nursery.js"
Cohesion: 0.08
Nodes (30): tex, createGridMaze(), ARRIVAL_FROM_NURSERY, animate(), buildDecor(), buildDolls(), buildKeys(), buildStations() (+22 more)

### Community 56 - "gate.mjs"
Cohesion: 0.04
Nodes (70): applyFlags(), args, attrs(), base, browserChecks(), children, codeOnly(), copyChecks() (+62 more)

### Community 57 - "homelogic.js"
Cohesion: 0.10
Nodes (36): acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), emptyHome(), fmtRecord(), FURNITURE (+28 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "trainingdummy.js"
Cohesion: 0.24
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "cosmetics.js"
Cohesion: 0.16
Nodes (21): skinMaterialRaw(), at(), BLOOD(), BLOOD_DARK, cache, CUTE, dark(), EXTRA_BADGES (+13 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "music.js"
Cohesion: 0.17
Nodes (14): hooks, step(), threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES (+6 more)

### Community 64 - "steps"
Cohesion: 0.12
Nodes (22): runs-on, steps, runs-on, steps, jobs, build, fast, types (+14 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.09
Nodes (37): addPause(), AGAIN, bakeDpr(), bakeDraw(), bakeOne(), bakeQueue, BASE, boxes (+29 more)

### Community 67 - "three"
Cohesion: 0.09
Nodes (24): typescript, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, typescript@^5.9.3, cannon-es, peerjs (+16 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "ambience.js"
Cohesion: 0.19
Nodes (17): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+9 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_path"
Cohesion: 0.09
Nodes (16): check(), done(), GEN, ROOT, SEEDS, src, st, evil() (+8 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "lobbygames.js"
Cohesion: 0.17
Nodes (21): acceptLobbyGames(), BOARD, buildLobbyGames(), drawBoard(), lobbyGamesNet(), updateLobbyGames(), addHoop(), addTarget() (+13 more)

### Community 76 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "pick.mjs"
Cohesion: 0.19
Nodes (11): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+3 more)

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.18
Nodes (6): IN, lob, N(), p3(), ROOT, wallBall()

### Community 83 - "monster.js"
Cohesion: 0.10
Nodes (38): cleanMapPick(), cleanOptions(), cleanVotes(), generateMap(), pickMap(), pickOptions(), ARRIVAL_FROM_MONSTER, applyLayout() (+30 more)

### Community 84 - "lobbyplay.js"
Cohesion: 0.07
Nodes (40): applyLighting(), A, canCatch(), clamp01(), GATE_Z, gateOpen(), GENS, hearRadius() (+32 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "film-light-leak/effect.js"
Cohesion: 0.50
Nodes (7): guard(), isWarm(), mount(), params, pickEdge(), tones(), uniforms()

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
Cohesion: 0.19
Nodes (25): isDarkPaper(), mountPrint(), adapt(), advance(), applyNarrow(), ensureGlyphs(), fit(), frameEmpty() (+17 more)

### Community 92 - "effects.mjs"
Cohesion: 0.10
Nodes (26): args, buildIndex(), checkFilters(), commands, ENUMS, FX, gallery(), INDEX (+18 more)

### Community 93 - "xrperf.js"
Cohesion: 0.18
Nodes (17): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), clampFrame(), DESKTOP_STEPS, desktopRatio() (+9 more)

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
Cohesion: 0.11
Nodes (20): fetchText(), link(), load(), loadAll(), plan(), script(), start(), startAll() (+12 more)

### Community 102 - "norm"
Cohesion: 0.15
Nodes (18): addressMod, areaMod, basicsMod, CDP, copyChecks(), copyTerms(), holds(), holdsAny() (+10 more)

### Community 103 - "runWidth"
Cohesion: 0.12
Nodes (23): auditFindings(), bySev(), clean(), clusterLooks(), extrasFindings(), groupLike(), groupSame(), invertedLook() (+15 more)

### Community 104 - ".pause"
Cohesion: 0.18
Nodes (10): GPU cost, Limits, Mount, Never, Objects and prints (`assets/objects`), Posters, Product renders, The spec (+2 more)

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

### Community 118 - "clamp"
Cohesion: 0.19
Nodes (20): clamp(), cssHex(), filmicInv(), filmicJs(), fromOklab(), gam22(), groundPalette(), hexRgb() (+12 more)

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
Cohesion: 0.15
Nodes (20): activeIn(), allow(), applyWaivers(), below(), block(), dotOf(), errorReason(), findProject() (+12 more)

### Community 123 - "pick.js"
Cohesion: 0.28
Nodes (12): clashes(), dealable(), filterEffects(), fitsKind(), kindOf(), KINDS, parseSlot(), pick() (+4 more)

### Community 124 - "layout.js"
Cohesion: 0.37
Nodes (12): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+4 more)

### Community 125 - "place"
Cohesion: 0.21
Nodes (20): place(), seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildLeg() (+12 more)

### Community 126 - "fx-feature-card/component.js"
Cohesion: 0.26
Nodes (10): demo(), grainGround(), groundPalette(), GROUNDS, init(), lum(), ok(), read() (+2 more)

### Community 127 - ".render"
Cohesion: 0.28
Nodes (5): clamp(), ease(), spread(), unease(), restFrame()

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

### Community 132 - "die"
Cohesion: 0.27
Nodes (9): CDP, die(), findChrome(), inProject(), launch(), perf(), serve(), shot() (+1 more)

### Community 133 - "murals.js"
Cohesion: 0.30
Nodes (14): GFX, bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

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

### Community 139 - "god-rays/effect.js"
Cohesion: 0.50
Nodes (7): aim(), fits(), mount(), params, tones(), uniforms(), warm()

### Community 140 - "Product render (`assets/objects/product-render`)"
Cohesion: 0.20
Nodes (9): Behaviour and limits, Materials, Motion, Mount: the product at anchor scale, Parts, Product render (`assets/objects/product-render`), Scenes and props: the product loaded or in use, Stills and posters: run this after every change to a spec (+1 more)

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

### Community 153 - "buzz"
Cohesion: 0.23
Nodes (16): heartbeat(), thump(), buzz(), releaseAll(), caught(), caught(), caught(), caught() (+8 more)

### Community 154 - "furas.js"
Cohesion: 0.08
Nodes (44): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+36 more)

### Community 156 - "petmodel.js"
Cohesion: 0.20
Nodes (12): PET, createPetModel(), emit(), stepParts(), update(), drawFace(), drawScaryFace(), EYES (+4 more)

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

### Community 164 - "ref_url"
Cohesion: 0.13
Nodes (11): defs, HERE, num(), range(), ROOT, achievements, bad, ids (+3 more)

### Community 165 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

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

### Community 171 - "stepBot"
Cohesion: 0.24
Nodes (13): stepBot(), caught(), FIGURE, figure(), hurt(), pickKey(), roomOf(), rush() (+5 more)

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

### Community 177 - "buildRoom"
Cohesion: 0.23
Nodes (13): box(), buildRoom(), buildWardrobe(), doors(), dropRoom(), ensureRooms(), hubSideWall(), makeKey() (+5 more)

### Community 178 - ".pause"
Cohesion: 0.22
Nodes (7): Adding an effect, Commands, Effects, Mount, Random pick, The list, Mount

### Community 179 - "lobbylogic.js"
Cohesion: 0.24
Nodes (11): countVotes(), GATE, gateStep(), num(), padOf(), winnerOf(), inLobby(), isAuth() (+3 more)

### Community 180 - "update"
Cohesion: 0.20
Nodes (11): buildMonsterSkin(), setAvatarHidden(), broadcast(), dispose(), drawPadLabels(), isAuthority(), randomScares(), setTint() (+3 more)

### Community 181 - "shots.mjs"
Cohesion: 0.18
Nodes (10): ./main.js, DEPS, DIRS, HERE, LEVELS, MIME, ROOT, server (+2 more)

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

### Community 188 - "setFlashHolder"
Cohesion: 0.50
Nodes (4): setFlashHolder(), dispose(), restoreFlashlight(), updateFlashlight()

### Community 189 - "pages.yml"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+18 more)

### Community 191 - "package.json"
Cohesion: 0.11
Nodes (19): dependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, description, devDependencies, vite@^8.3.8, cannon-es (+11 more)

### Community 192 - "silk-folds/effect.js"
Cohesion: 0.52
Nodes (6): cool(), mount(), params, sheenTurn(), tones(), uniforms()

### Community 193 - "room000.mjs"
Cohesion: 0.12
Nodes (14): blocks, cellOf(), cover, diags, dist, doors, grid, plan (+6 more)

### Community 214 - "vrmenu.js"
Cohesion: 0.22
Nodes (14): isReservedNick(), COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn() (+6 more)

### Community 215 - "home.mjs"
Cohesion: 0.20
Nodes (6): door, eco, lvl, main, ROOT, store

### Community 216 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 217 - "shots.mjs"
Cohesion: 0.07
Nodes (27): playwright, errs, EXTRA, HERE, MIME, ROOT, server, views (+19 more)

## Knowledge Gaps
- **28 isolated node(s):** `./core/audio.js`, `./core/avatar.js`, `./core/economy.js`, `./core/emotes.js`, `./core/gorillamachine.js` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1830 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `ref_url`, `logic.mjs`, `workshop.js`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.462) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/audio.js`, `./core/avatar.js`, `./core/economy.js` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04294699011680144 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `workshop.js` to `build.js`?**
  _High betweenness centrality (0.414) - this node is a cross-community bridge._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.04213406292749658 - nodes in this community are weakly interconnected._
- **Why does `L` connect `engine.js` to `network.js`, `silence.js`, `addCrispBlock`, `pet.js`, `banana.js`, `player.js`, `maze.js`, `well.js`, `main.js`, `hospital.js`, `room000.js`, `petnest.js`, `hotel.js`, `lobby.js`, `graffiti.js`, `redlight.js`, `furas.js`, `range.js`, `catacombs.js`, `games.js`, `dodgeball.js`, `terminal.js`, `hideseek.js`, `lobby-door.js`, `workshop.js`, `visuals.js`, `nursery.js`, `trainingdummy.js`, `lobbygames.js`, `monster.js`, `lobbyplay.js`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._