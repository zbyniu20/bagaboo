# Graph Report - bagaboo  (2026-11-22)

## Corpus Check
- 450 files · ~1,248,307 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 87 file(s) not represented in the graph (top: .css 84, (none) 3)

## Summary
- 5415 nodes · 14029 edges · 220 communities (195 shown, 25 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 450 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e345d242`
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
- engine.js
- lib
- Tests & Module Imports
- cemetery.js
- maze.js
- main.js
- hospital.js
- auth.js
- toast
- room000.js
- petnest.js
- hotel.js
- lobby-door.js
- monsterskins.js
- common.py
- engine.js
- graffiti.js
- toast
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
- levels.js
- dodgeball.js
- core/ui.js
- well.js
- lava.js
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
- place
- workshoplogic.js
- nursery.js
- gate.mjs
- homelogic.js
- bake.mjs
- trainingdummy.js
- moments.mjs
- cosmetics.js
- duotone-grade/effect.js
- .redraw
- steps
- loop
- ui/ui.js
- three
- bag
- shader
- custom.js
- perf.mjs
- ref_path
- gradient-mesh/effect.js
- logic.mjs
- petlogic.js
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- xrperf.js
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
- hauntedui.js
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
- graffitiround.js
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
- think
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
- Nowe pomysły (burza mózgów)
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- build
- .pause
- updateGraffiti
- onGraffitiMsg
- drawGames
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- gorillamachine.js
- pages.yml
- photo-chapters/moment.js
- package.json
- silk-folds/effect.js
- room000.mjs
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- scripts
- sendLevelMsg
- vrmenu.js
- home.mjs
- smoke-dist.mjs
- shots.mjs
- Terminal
- drawGallery

## God Nodes (most connected - your core abstractions)
1. `toast()` - 225 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 93 edges
4. `makeCanvas()` - 91 edges
5. `mkRng()` - 84 edges
6. `buzz()` - 79 edges
7. `toTex()` - 76 edges
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
- `It always shows a picture` --references--> `glslProblems()`  [INFERRED]
  .claude/skills/taste-skill/assets/objects/_print-core/README.md → .claude/skills/taste-skill/assets/objects/_print-core/print3d.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (220 total, 25 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (99): getAudioContext(), animateFace(), lookKey(), poseHand(), BANS_CLEARED, isModMenuUser(), emotePose(), emoteState() (+91 more)

### Community 1 - "toast"
Cohesion: 0.05
Nodes (72): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, buyItem(), CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave() (+64 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (72): buildBadge(), burntTexture(), eyeTexture(), faceTexture(), hammerTextures(), jacketTexture(), roleLabel(), noobTexture() (+64 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (49): attachMic(), micLevel(), rewardActivity(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE, avoidObstacles(), BALLS (+41 more)

### Community 4 - "config.js"
Cohesion: 0.09
Nodes (54): ADMIN_NAMES, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+46 more)

### Community 5 - "addCrispBlock"
Cohesion: 0.08
Nodes (46): addCrispBlock(), addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildDryer(), buildGate() (+38 more)

### Community 6 - "pet.js"
Cohesion: 0.11
Nodes (32): squeak(), buildPet(), carryStep(), _dir, disposePet(), _f, flatForward(), _fq (+24 more)

### Community 7 - "banana.js"
Cohesion: 0.13
Nodes (29): applyEvent(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+21 more)

### Community 8 - "engine.js"
Cohesion: 0.03
Nodes (107): box, c, errors, mesh, origError, tx, updateDebug(), cross (+99 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (31): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js (+23 more)

### Community 11 - "cemetery.js"
Cohesion: 0.06
Nodes (53): createJumpscare(), buildMannequin(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor() (+45 more)

### Community 12 - "maze.js"
Cohesion: 0.05
Nodes (68): dailyDate(), dailyKey(), diffOf(), fmtDuration(), getDiff(), isDaily(), recordKey(), addCollider() (+60 more)

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (64): hooks, threatLevel(), updateListener(), errorText(), LIGHT_MODE, setDesktopFacing(), hasSave(), markNickVerified() (+56 more)

### Community 14 - "hospital.js"
Cohesion: 0.09
Nodes (30): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+22 more)

### Community 15 - "auth.js"
Cohesion: 0.13
Nodes (24): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+16 more)

### Community 16 - "toast"
Cohesion: 0.05
Nodes (106): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+98 more)

### Community 17 - "room000.js"
Cohesion: 0.09
Nodes (28): ARRIVAL_FROM_ROOM000, addMarks(), animate(), buildDecor(), buildHangers(), DOORS, drawHud(), fmt() (+20 more)

### Community 18 - "petnest.js"
Cohesion: 0.20
Nodes (18): hatchBegin(), hatchPop(), posOf(), reactFeed(), reactPat(), bar(), buildPetNest(), doFeed() (+10 more)

### Community 19 - "hotel.js"
Cohesion: 0.08
Nodes (45): stepBot(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe(), dispose() (+37 more)

### Community 20 - "lobby-door.js"
Cohesion: 0.06
Nodes (48): buildHat(), boxAt(), buildComputerDesk(), LP, onLookChange(), tex, UNIT_BOX, UNIT_SPHERE (+40 more)

### Community 21 - "monsterskins.js"
Cohesion: 0.32
Nodes (12): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+4 more)

### Community 22 - "common.py"
Cohesion: 0.06
Nodes (14): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts(), mirror_union() (+6 more)

### Community 23 - "engine.js"
Cohesion: 0.10
Nodes (37): LOBBY_MOVE_SCALE, addBlobAO(), addStaticBody(), flashlight, PIPE_CYL, UNIT_CYL, detachGorillaMachine(), debugLobbyPlay() (+29 more)

### Community 24 - "graffiti.js"
Cohesion: 0.14
Nodes (29): apply(), AREA, canClear(), clearWall(), draw(), drawColumns(), GPOS, guestContest() (+21 more)

### Community 25 - "toast"
Cohesion: 0.06
Nodes (85): enableDesktop(), addBones(), bumpStat(), capped(), checkCompletionist(), checkCounters(), checkStatAchievements(), claimLoginReward() (+77 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.07
Nodes (58): addRoleTag(), addScaryFace(), ARM_GEO, BADGES, badgeTex, bakeShade(), BONE(), buildBunnyEars() (+50 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (62): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+54 more)

### Community 31 - "range.js"
Cohesion: 0.14
Nodes (25): safeName(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d (+17 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "catacombs.js"
Cohesion: 0.09
Nodes (28): addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls() (+20 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.05
Nodes (42): EFFECT_LABEL, PAPERS, acquire(), atlas, CELL, colMajor(), COMMON_PARAMS, config (+34 more)

### Community 36 - "games.js"
Cohesion: 0.08
Nodes (26): topTimes(), makeDread(), stepDread(), AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_HIDESEEK, ARRIVAL_FROM_LAVA, ARRIVAL_FROM_REDLIGHT (+18 more)

### Community 37 - "modmenu.js"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 38 - "levels.js"
Cohesion: 0.11
Nodes (24): dailyOn(), setDailyMode(), setDiff(), ensureAssets(), mmss(), visitorsHere(), CARDS, AR (+16 more)

### Community 39 - "dodgeball.js"
Cohesion: 0.06
Nodes (67): recordScore(), GROUP, physicsMat, drawInstructions(), introSeen(), panelBg(), takeRespawn(), broadcast() (+59 more)

### Community 40 - "core/ui.js"
Cohesion: 0.10
Nodes (21): _e, EMOTE, EMOTES, playEmote(), _pq, _q, _a, _b (+13 more)

### Community 41 - "well.js"
Cohesion: 0.11
Nodes (31): cameraPanel(), makeOozeMaterial(), build(), buildGrate(), buildHatch(), buildHolds(), buildHud(), buildIntro() (+23 more)

### Community 42 - "lava.js"
Cohesion: 0.14
Nodes (22): addBody(), addConstraint(), makeLavaMaterial(), build(), buildCourse(), buildHall(), buildLava(), buildMannequins() (+14 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (52): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+44 more)

### Community 44 - "workshop.js"
Cohesion: 0.14
Nodes (25): decodeMap(), emptyMap(), LIM, currentMap(), load(), mapIn(), persist(), saveMap() (+17 more)

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
Cohesion: 0.15
Nodes (20): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), corners() (+12 more)

### Community 50 - "petstore.js"
Cohesion: 0.16
Nodes (30): equipItem(), saveGame(), spendBones(), petPage(), canHatch(), canPat(), colorChoices(), cycleColor() (+22 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "pause.js"
Cohesion: 0.09
Nodes (37): applyVolumes(), CATALOG, SAVE, close(), closeEmotePanel(), _d, mesh, openPanel() (+29 more)

### Community 53 - "place"
Cohesion: 0.21
Nodes (20): buildHatRaw(), place(), seg(), V3(), buildArm(), buildLeg(), jit(), buildArm() (+12 more)

### Community 54 - "workshoplogic.js"
Cohesion: 0.19
Nodes (23): blockError(), canGo(), centre(), copy(), covers(), encodeMap(), eraseAt(), fromB64u() (+15 more)

### Community 55 - "nursery.js"
Cohesion: 0.09
Nodes (30): ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+22 more)

### Community 56 - "gate.mjs"
Cohesion: 0.04
Nodes (70): applyFlags(), args, attrs(), base, browserChecks(), children, codeOnly(), copyChecks() (+62 more)

### Community 57 - "homelogic.js"
Cohesion: 0.12
Nodes (36): acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome(), fmtRecord() (+28 more)

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
Cohesion: 0.17
Nodes (20): at(), BLOOD(), BLOOD_DARK, cache, CUTE, dark(), EXTRA_BADGES, EXTRA_SKINS (+12 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

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
Cohesion: 0.21
Nodes (12): typescript, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, typescript@^5.9.3, cannon-es, peerjs (+4 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "custom.js"
Cohesion: 0.12
Nodes (17): acceptors, LEVEL_DATA, MAX_BYTES, providers, register(), atFinish(), demoMap(), BOUNDS (+9 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_path"
Cohesion: 0.08
Nodes (21): defs, HERE, num(), range(), ROOT, check(), done(), GEN (+13 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "petlogic.js"
Cohesion: 0.20
Nodes (23): canFeed(), clamp(), dayOf(), feed(), feedsLeft(), hatch(), hatIndex(), hours() (+15 more)

### Community 76 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "xrperf.js"
Cohesion: 0.18
Nodes (17): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), clampFrame(), DESKTOP_STEPS, desktopRatio() (+9 more)

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.20
Nodes (5): IN, lob, p3(), ROOT, wallBall()

### Community 83 - "monster.js"
Cohesion: 0.05
Nodes (84): countVotes(), GATE, gateStep(), NIGHT, num(), padOf(), winnerOf(), aisles() (+76 more)

### Community 84 - "lobbyplay.js"
Cohesion: 0.05
Nodes (63): createBot(), applyLighting(), L, A, canCatch(), clamp01(), GATE_Z, gateOpen() (+55 more)

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

### Community 93 - "hauntedui.js"
Cohesion: 0.13
Nodes (16): buildMachineTerminal(), IS_QUEST, addComputers(), AMB, AMBD, BEAT, BLOOD, BONE (+8 more)

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

### Community 125 - "graffitiround.js"
Cohesion: 0.18
Nodes (16): contestHost(), newContest(), restoreWall(), WALL, assignSlots(), contestStep(), countVotes(), extractSlot() (+8 more)

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

### Community 153 - "think"
Cohesion: 0.21
Nodes (16): clearLine(), decoySpot(), distField(), doorSpots(), isOpen(), isOpenCell(), placeOnWall(), stepToward() (+8 more)

### Community 154 - "furas.js"
Cohesion: 0.07
Nodes (49): releaseAll(), addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers() (+41 more)

### Community 156 - "petmodel.js"
Cohesion: 0.21
Nodes (12): PET, scaleOf(), createPetModel(), emit(), stepParts(), update(), drawFace(), drawScaryFace() (+4 more)

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
Cohesion: 0.20
Nodes (6): achievements, bad, ids, listed, ROOT, themes

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

### Community 171 - "Nowe pomysły (burza mózgów)"
Cohesion: 0.17
Nodes (11): 1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy), 2. Run Roguelike (co-op przez Levels), 3. Wyzwanie Dnia i Duchy, 4. Potwór gracza (asymetryczny tryb 1 kontra ekipa), 5. Potwór słyszy głos, 6. Sezony i wydarzenia czasowe, 7. Wspólny pokój ekipy, 8. Kontrakty dnia (+3 more)

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

### Community 177 - "build"
Cohesion: 0.21
Nodes (12): lightSpots(), wallBlocks(), build(), buildDecoys(), buildGate(), buildGhost(), buildItems(), buildLights() (+4 more)

### Community 178 - ".pause"
Cohesion: 0.22
Nodes (7): Adding an effect, Commands, Effects, Mount, Random pick, The list, Mount

### Community 179 - "updateGraffiti"
Cohesion: 0.19
Nodes (14): isMouseDown(), buildGraffiti(), buildPads(), disposeGraffiti(), mount(), save(), saveGallery(), savePrivate() (+6 more)

### Community 180 - "onGraffitiMsg"
Cohesion: 0.25
Nodes (13): load(), loadPrivate(), onGraffitiMsg(), cleanCells(), decodeRle(), decodeWall(), makeBucket(), near() (+5 more)

### Community 181 - "drawGames"
Cohesion: 0.24
Nodes (13): drawCard(), drawEcg(), drawEye(), drawGlass(), sp(), tx(), curMode(), drawGames() (+5 more)

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

### Community 188 - "gorillamachine.js"
Cohesion: 0.23
Nodes (11): attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem() (+3 more)

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

### Community 212 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, changed, check, fast, levelpack, logic, registry, rounds (+4 more)

### Community 213 - "sendLevelMsg"
Cohesion: 0.24
Nodes (10): addPoster(), flush(), savePoster(), sendContest(), sendSnapshot(), encodeRle(), encodeWall(), gallerySubmit() (+2 more)

### Community 214 - "vrmenu.js"
Cohesion: 0.20
Nodes (14): isReservedNick(), COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn() (+6 more)

### Community 215 - "home.mjs"
Cohesion: 0.20
Nodes (6): door, eco, lvl, main, ROOT, store

### Community 216 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 217 - "shots.mjs"
Cohesion: 0.07
Nodes (26): playwright, errs, EXTRA, HERE, MIME, ROOT, server, views (+18 more)

### Community 219 - "drawGallery"
Cohesion: 0.38
Nodes (6): castVote(), drawGallery(), nameOf(), voteFor(), galleryRank(), galleryVote()

## Knowledge Gaps
- **28 isolated node(s):** `./core/audio.js`, `./core/avatar.js`, `./core/economy.js`, `./core/emotes.js`, `./core/gorillamachine.js` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1811 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `ref_url`, `custom.js`, `logic.mjs`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.449) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/audio.js`, `./core/avatar.js`, `./core/economy.js` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.043035863219349456 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `custom.js` to `build.js`?**
  _High betweenness centrality (0.409) - this node is a cross-community bridge._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.048130322102924845 - nodes in this community are weakly interconnected._
- **Why does `lib()` connect `lib` to `consistency.mjs`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._