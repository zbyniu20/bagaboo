# Graph Report - bagaboo  (2026-11-22)

## Corpus Check
- 457 files · ~1,262,093 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 87 file(s) not represented in the graph (top: .css 84, (none) 3)

## Summary
- 5524 nodes · 14190 edges · 230 communities (208 shown, 22 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 451 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `378578fc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- toast
- textures.js
- silence.js
- lobby-door.js
- addCrispBlock
- pet.js
- banana.js
- player.js
- lib
- Tests & Module Imports
- handleGuest
- monster.js
- main.js
- hospital.js
- auth.js
- well.js
- room000.js
- config.js
- audio.js
- nursery.js
- monsterskins.js
- common.py
- addStaticBody
- graffiti.js
- redlight.js
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- range.js
- dotted-globe/effect.js
- room000map.js
- icons.mjs
- print3d.js
- games.js
- petstore.js
- hotel.js
- dodgeball.js
- lobby-door.js
- hideseek.js
- applyDismember
- build.js
- camera
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- lobby.js
- catacombs.js
- Docs: Accounts & Rules
- petnest.js
- lobbyplay.js
- visuals.js
- maze.js
- gate.mjs
- homelogic.js
- bake.mjs
- staff.js
- moments.mjs
- lobbygames.js
- duotone-grade/effect.js
- gore.mjs
- steps
- loop
- ui/ui.js
- three
- bag
- shader
- xrperf.js
- perf.mjs
- ref_url
- gradient-mesh/effect.js
- logic.mjs
- cemetery.js
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- pick.mjs
- diagram.js
- static.mjs
- lobby.mjs
- monstermaps.js
- terminal.js
- moments/lib.js
- _demo/shoot.mjs
- film-light-leak/effect.js
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- workshop.js
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
- cosmetics.js
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
- pause.js
- stage
- 4. Place
- System
- block
- pick.js
- layout.js
- modmenu.js
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
- tone
- painterly-landscape/effect.js
- Objects (`assets/objects/print-*`)
- init
- Copy
- Copy voice
- Effects usage
- Features
- engine.js
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
- ref_path
- pElbow
- withLoop
- compilerOptions
- definePrint
- Copy tells
- Icons
- onNet
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- lava.js
- emotepanel.js
- music.js
- isOwned
- haptics.js
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- account
- pages.yml
- photo-chapters/moment.js
- package.json
- silk-folds/effect.js
- room000.mjs
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- applyLayout
- shots.mjs
- vrmenu.js
- dismemberlogic.js
- smoke-dist.mjs
- shots.mjs
- dread.mjs
- monster.mjs
- refsOf
- highfive.js
- dotOf
- applyFlags
- browserChecks
- staticChecks
- opt
- startNow
- runSweep
- shaderLint

## God Nodes (most connected - your core abstractions)
1. `toast()` - 227 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 93 edges
4. `buzz()` - 80 edges
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

## Communities (230 total, 22 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.05
Nodes (49): getAudioContext(), answerCall(), attachMic(), audioEls, bannedNames, blood, callAt, callPeer() (+41 more)

### Community 1 - "toast"
Cohesion: 0.05
Nodes (94): ACTIVITY, addBones(), bumpStat(), capped(), checkCompletionist(), checkCounters(), checkStatAchievements(), claimLoginReward() (+86 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (74): buildBadge(), burntTexture(), eyeTexture(), faceTexture(), furTexture(), hammerTextures(), jacketTexture(), roleLabel() (+66 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (49): attachMic(), micLevel(), rewardActivity(), isOnRope(), releaseRope(), avoidObstacles(), BALLS, broadcast() (+41 more)

### Community 4 - "lobby-door.js"
Cohesion: 0.09
Nodes (24): animateFace(), buildHat(), placeArm(), ULTIMATE_SCALE, GFX, onLookChange(), emoteState(), ARRIVAL (+16 more)

### Community 5 - "addCrispBlock"
Cohesion: 0.07
Nodes (52): buildDoor(), buildDoors(), addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildDryer() (+44 more)

### Community 6 - "pet.js"
Cohesion: 0.12
Nodes (31): squeak(), buildPet(), carryStep(), _dir, disposePet(), _f, flatForward(), _fq (+23 more)

### Community 7 - "banana.js"
Cohesion: 0.13
Nodes (30): applyEvent(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+22 more)

### Community 8 - "player.js"
Cohesion: 0.07
Nodes (38): poseHand(), track(), containBall(), BOOST_MULT, capMul(), FLY_SPEED, MOD, PERSONAL (+30 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.07
Nodes (25): ./core/audio.js, ./core/economy.js, ./core/emotes.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js, ./core/registry.js, ./core/terminal.js (+17 more)

### Community 11 - "handleGuest"
Cohesion: 0.13
Nodes (34): randomNonce(), giftsLeft(), banList(), bannedNamesList(), canKick(), checkIntruder(), cleanRouted(), electNewHost() (+26 more)

### Community 12 - "monster.js"
Cohesion: 0.11
Nodes (34): world, GATE, gateStep(), pickOptions(), buildMonsterSkin(), setAvatarHidden(), broadcast(), catchPlayer() (+26 more)

### Community 13 - "main.js"
Cohesion: 0.06
Nodes (45): setAmbience(), stopLoops(), updateListener(), isReservedNick(), enableDesktop(), setDesktopFacing(), clearLevel(), accept() (+37 more)

### Community 14 - "hospital.js"
Cohesion: 0.07
Nodes (42): dreadScared(), addDoorPortal(), addStoryProps(), buildMaw(), createJumpscare(), noobTexture(), rustDoorTexture(), seenIntros (+34 more)

### Community 15 - "auth.js"
Cohesion: 0.14
Nodes (21): API_URL, b64uToBytes(), call(), finish(), listeners, login(), logout(), NICK_RE (+13 more)

### Community 16 - "well.js"
Cohesion: 0.09
Nodes (35): scaleBoxUVs(), signTexture(), makeOozeMaterial(), hostState(), broadcast(), buildGrate(), buildHatch(), buildHolds() (+27 more)

### Community 17 - "room000.js"
Cohesion: 0.07
Nodes (49): addMarks(), animate(), blotTexture(), build(), buildDecor(), buildDecoys(), buildGate(), buildGhost() (+41 more)

### Community 18 - "config.js"
Cohesion: 0.13
Nodes (36): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+28 more)

### Community 19 - "audio.js"
Cohesion: 0.05
Nodes (101): _af, _ap, app, aroundPlayer(), DEFS, _dp, DREAD, dreadAppear() (+93 more)

### Community 20 - "nursery.js"
Cohesion: 0.09
Nodes (30): addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys(), buildStations() (+22 more)

### Community 21 - "monsterskins.js"
Cohesion: 0.35
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+3 more)

### Community 22 - "common.py"
Cohesion: 0.06
Nodes (14): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts(), mirror_union() (+6 more)

### Community 23 - "addStaticBody"
Cohesion: 0.16
Nodes (26): buildHatRaw(), place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, bloodMat (+18 more)

### Community 24 - "graffiti.js"
Cohesion: 0.05
Nodes (83): isMouseDown(), addPoster(), apply(), AREA, buildGraffiti(), canClear(), castVote(), clearWall() (+75 more)

### Community 25 - "redlight.js"
Cohesion: 0.11
Nodes (47): drawInstructions(), introSeen(), panelBg(), clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine() (+39 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.07
Nodes (54): addRoleTag(), addScaryFace(), ARM_GEO, BADGES, badgeTex, bakeShade(), BONE(), buildBunnyEars() (+46 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (56): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+48 more)

### Community 31 - "range.js"
Cohesion: 0.13
Nodes (26): safeName(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), clearTargets(), _d, drawBoard() (+18 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "room000map.js"
Cohesion: 0.10
Nodes (32): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), clearLine() (+24 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.07
Nodes (32): EFFECT_LABEL, PAPERS, atlas, CELL, colMajor(), COMMON_PARAMS, config, cross() (+24 more)

### Community 36 - "games.js"
Cohesion: 0.05
Nodes (75): IS_QUEST, dailyOn(), DIFF_ORDER, DIFFS, addComputers(), AMB, AMBD, BEAT (+67 more)

### Community 37 - "petstore.js"
Cohesion: 0.11
Nodes (53): spendBones(), petPage(), canFeed(), canHatch(), canPat(), CARRY, clamp(), colorChoices() (+45 more)

### Community 38 - "hotel.js"
Cohesion: 0.08
Nodes (47): stepBot(), addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe() (+39 more)

### Community 39 - "dodgeball.js"
Cohesion: 0.08
Nodes (52): savePoster(), saveWork(), sendContest(), broadcast(), onMsg(), sendLevelMsg(), broadcast(), fromNet() (+44 more)

### Community 40 - "lobby-door.js"
Cohesion: 0.07
Nodes (44): LOBBY_MOVE_SCALE, _e, EMOTE, emotePose(), EMOTES, playEmote(), _pq, _q (+36 more)

### Community 41 - "hideseek.js"
Cohesion: 0.07
Nodes (45): TAGS, cameraPanel(), myId(), onLevelMsg(), dispose(), dispose(), dispose(), ARRIVAL_FROM_HIDESEEK (+37 more)

### Community 42 - "applyDismember"
Cohesion: 0.21
Nodes (18): lostHead(), lostLeft(), lostRight(), animateFaces(), applyDismember(), bloodBurst(), clearDebris(), clearDismember() (+10 more)

### Community 43 - "build.js"
Cohesion: 0.08
Nodes (51): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+43 more)

### Community 44 - "camera"
Cohesion: 0.12
Nodes (14): box, c, errors, mesh, origError, tx, updateDebug(), camera (+6 more)

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

### Community 49 - "lobby.js"
Cohesion: 0.11
Nodes (34): addBlobAO(), addStaticBody(), detachGorillaMachine(), debugLobbyPlay(), lobbyDim(), disposePetNest(), updatePetNest(), addScaryStep() (+26 more)

### Community 50 - "catacombs.js"
Cohesion: 0.10
Nodes (27): addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls() (+19 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "petnest.js"
Cohesion: 0.21
Nodes (17): hatchBegin(), hatchPop(), posOf(), reactFeed(), reactPat(), bar(), buildPetNest(), doFeed() (+9 more)

### Community 53 - "lobbyplay.js"
Cohesion: 0.07
Nodes (42): createBot(), applyLighting(), L, A, canCatch(), clamp01(), GATE_Z, gateOpen() (+34 more)

### Community 54 - "visuals.js"
Cohesion: 0.16
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 55 - "maze.js"
Cohesion: 0.05
Nodes (73): appFigure(), setDread(), dailyDate(), dailyKey(), diffOf(), fmtDuration(), getDiff(), isDaily() (+65 more)

### Community 56 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 57 - "homelogic.js"
Cohesion: 0.08
Nodes (48): ACHIEVEMENTS, acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome() (+40 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "staff.js"
Cohesion: 0.12
Nodes (26): buildHammer(), markCheater(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp() (+18 more)

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "lobbygames.js"
Cohesion: 0.17
Nodes (21): acceptLobbyGames(), BOARD, buildLobbyGames(), drawBoard(), lobbyGamesNet(), updateLobbyGames(), addHoop(), addTarget() (+13 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "gore.mjs"
Cohesion: 0.09
Nodes (24): ./core/avatar.js, ./core/engine.js, ./core/network.js, ./core/player.js, DEPS, errors, HERE, MIME (+16 more)

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
Cohesion: 0.27
Nodes (15): init(), PARAMS, init(), ease(), init(), PARAMS, init(), init() (+7 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "xrperf.js"
Cohesion: 0.18
Nodes (17): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), clampFrame(), DESKTOP_STEPS, desktopRatio() (+9 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_url"
Cohesion: 0.06
Nodes (21): defs, HERE, num(), range(), ROOT, check(), done(), bot (+13 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "cemetery.js"
Cohesion: 0.10
Nodes (29): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+21 more)

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

### Community 83 - "monstermaps.js"
Cohesion: 0.18
Nodes (23): aisles(), box(), free(), gbox(), GEN, HEDGE, hedge(), LOBBY (+15 more)

### Community 84 - "terminal.js"
Cohesion: 0.06
Nodes (28): cross, DESKTOP, help, keyHooks, keys, _o, onDesktopKey(), _q (+20 more)

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
Cohesion: 0.09
Nodes (48): acquire(), clamp(), ease(), filmicInv(), filmicJs(), finishProgram(), fromOklab(), gam22() (+40 more)

### Community 92 - "effects.mjs"
Cohesion: 0.10
Nodes (26): args, buildIndex(), checkFilters(), commands, ENUMS, FX, gallery(), INDEX (+18 more)

### Community 93 - "workshop.js"
Cohesion: 0.07
Nodes (60): wrapText(), atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap() (+52 more)

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

### Community 107 - "cosmetics.js"
Cohesion: 0.16
Nodes (21): LP, at(), BLOOD(), BLOOD_DARK, cache, CUTE, dark(), EXTRA_BADGES (+13 more)

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
Cohesion: 0.25
Nodes (13): FILL, init(), init(), STILL, init(), PARAMS, init(), PARAMS (+5 more)

### Community 115 - "mountProduct"
Cohesion: 0.24
Nodes (20): cssHex(), groundPalette(), lightness(), normalizePalette(), readPalette(), mountProduct(), clearInner(), done() (+12 more)

### Community 116 - "shared.js"
Cohesion: 0.16
Nodes (17): init(), grab(), hoverable(), inkPalette(), mqHover, mqReduce, nextFrame(), pendingStills (+9 more)

### Community 117 - "product-render/auto.js"
Cohesion: 0.21
Nodes (14): apply(), ATTRS, cache, claimed, json(), mountAll(), optsOf(), placeOf() (+6 more)

### Community 118 - "pause.js"
Cohesion: 0.17
Nodes (19): applyVolumes(), equipItem(), applyBrightness(), bDownAt, changed(), closePause(), _d, mesh (+11 more)

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

### Community 125 - "modmenu.js"
Cohesion: 0.17
Nodes (20): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+12 more)

### Community 126 - "fx-feature-card/component.js"
Cohesion: 0.23
Nodes (12): demo(), grainGround(), groundPalette(), GROUNDS, init(), lum(), ok(), read() (+4 more)

### Community 127 - ".render"
Cohesion: 0.32
Nodes (4): clamp(), ease(), spread(), unease()

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
Cohesion: 0.15
Nodes (12): A photograph with copy (`fx-photo`), Colour, Cost: light enough for a laptop's integrated GPU, Effects beyond backgrounds, Feature cards with inset panels (`fx-feature-card`), Objects in dither (`fx-dither-object`), Picking the effect, Street map of the place (`fx-map`) (+4 more)

### Community 132 - "die"
Cohesion: 0.27
Nodes (9): CDP, die(), findChrome(), inProject(), launch(), perf(), serve(), shot() (+1 more)

### Community 133 - "murals.js"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 134 - "tone"
Cohesion: 0.28
Nodes (8): el(), init(), draw(), fallback(), LAYERS, NICE, PARAMS, readData()

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

### Community 145 - "tone"
Cohesion: 0.18
Nodes (14): init(), PARAMS, DATA, init(), DRAW, drawing(), init(), objectEffect() (+6 more)

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

### Community 153 - "engine.js"
Cohesion: 0.10
Nodes (17): boxAt(), buildComputerDesk(), buildMachineTerminal(), addShaderEdges(), blobAOMat, flashlight, headLamp, hemi (+9 more)

### Community 154 - "furas.js"
Cohesion: 0.07
Nodes (49): releaseAll(), addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers() (+41 more)

### Community 156 - "petmodel.js"
Cohesion: 0.23
Nodes (9): tex, PET, createPetModel(), stepParts(), update(), drawFace(), drawScaryFace(), EYES (+1 more)

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

### Community 164 - "ref_path"
Cohesion: 0.12
Nodes (11): evil(), goodMap(), mainJs, rm, ROOT, achievements, bad, ids (+3 more)

### Community 165 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

### Community 166 - "withLoop"
Cohesion: 0.20
Nodes (10): init(), init(), DATA, init(), PREV, isStill(), withLoop(), init() (+2 more)

### Community 167 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 168 - "definePrint"
Cohesion: 0.15
Nodes (5): definePrint(), formShader(), sources(), LAKES, LAND

### Community 169 - "Copy tells"
Cohesion: 0.29
Nodes (6): Copy tells, First generation: the old tells (mostly avoided now; still checked), Not tells (leave them alone), Over-correction: what the rules themselves produce, Second generation: the tells now, Why it happens

### Community 170 - "Icons"
Cohesion: 0.29
Nodes (6): Commands, How they sit, Icons, The violet rule (a judgement, stated), Where they come from, Which one

### Community 171 - "onNet"
Cohesion: 0.22
Nodes (9): cleanMapPick(), cleanOptions(), cleanVotes(), generateMap(), pickMap(), applyMap(), launchVoted(), localCaught() (+1 more)

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

### Community 177 - "lava.js"
Cohesion: 0.12
Nodes (25): addBody(), addConstraint(), GROUP, physicsMat, makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse() (+17 more)

### Community 178 - "emotepanel.js"
Cohesion: 0.18
Nodes (15): CATALOG, close(), closeEmotePanel(), _d, mesh, openPanel(), owned(), _p (+7 more)

### Community 179 - "music.js"
Cohesion: 0.15
Nodes (16): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+8 more)

### Community 180 - "isOwned"
Cohesion: 0.21
Nodes (21): activeRoleTags(), buyItem(), giftable(), hiddenRoleTags(), isEquipped(), isFeatured(), isLocked(), isOwned() (+13 more)

### Community 181 - "haptics.js"
Cohesion: 0.15
Nodes (14): canPunish(), SAVE, scene, captureEnvironment(), cubeLuminance(), referenceLuminance(), head, hp (+6 more)

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

### Community 188 - "account"
Cohesion: 0.17
Nodes (16): account(), isLoggedIn(), isModMenuUser(), bodyState(), connById(), isHiddenFrom(), isHostId(), myBanUntil() (+8 more)

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

### Community 212 - "applyLayout"
Cohesion: 0.22
Nodes (9): applyLayout(), applyLobby(), buildGenerated(), buildPads(), buildStation(), clearMap(), duct(), placeBoard() (+1 more)

### Community 213 - "shots.mjs"
Cohesion: 0.20
Nodes (9): DEPS, DIRS, HERE, LEVELS, MIME, ROOT, server, VERSIONS (+1 more)

### Community 214 - "vrmenu.js"
Cohesion: 0.21
Nodes (14): renderer, COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn() (+6 more)

### Community 215 - "dismemberlogic.js"
Cohesion: 0.29
Nodes (6): cleanDismember(), dismemberText(), DM, DM_CODES, MAX_ENTRIES, pickDismember()

### Community 216 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 217 - "shots.mjs"
Cohesion: 0.06
Nodes (33): playwright, errs, EXTRA, HERE, MIME, ROOT, server, views (+25 more)

### Community 218 - "dread.mjs"
Cohesion: 0.17
Nodes (10): ./core/ambience.js, ./core/botkit.js, ./core/levelkit.js, ./core/settings.js, DEPS, errors, HERE, MIME (+2 more)

### Community 219 - "monster.mjs"
Cohesion: 0.18
Nodes (7): GEN, monSrc, netSrc, ROOT, SEEDS, src, st

### Community 220 - "refsOf"
Cohesion: 0.22
Nodes (9): attrs(), cssRefs(), jsRefs(), kindOf(), local(), metas(), refsOf(), stripRef() (+1 more)

### Community 221 - "highfive.js"
Cohesion: 0.22
Nodes (8): _a, _b, cool, HF, nameOf(), nameOfPlayer(), playersState, remoteAvatars

### Community 222 - "dotOf"
Cohesion: 0.47
Nodes (6): activeIn(), below(), dotOf(), findProject(), lastTouch(), unarmedPage()

### Community 223 - "applyFlags"
Cohesion: 0.40
Nodes (6): applyFlags(), fileAt(), findPage(), isUrl(), kindArg(), slash()

### Community 224 - "browserChecks"
Cohesion: 0.40
Nodes (6): browserChecks(), copyChecks(), errLine(), left(), parseJson(), rmProfile()

### Community 225 - "staticChecks"
Cohesion: 0.40
Nodes (6): codeOnly(), hashOf(), kitIndex(), kitTwin(), norm(), staticChecks()

### Community 226 - "opt"
Cohesion: 0.33
Nodes (6): freshProfile(), inProject(), opt(), profileBase(), roundsArg(), str()

### Community 227 - "startNow"
Cohesion: 0.50
Nodes (5): winnerOf(), inLobby(), isAuth(), mapBoard, startNow()

### Community 228 - "runSweep"
Cohesion: 0.67
Nodes (4): bySev(), clean(), lostFindings(), runSweep()

### Community 229 - "shaderLint"
Cohesion: 0.50
Nodes (4): glslIn(), isGLSL(), lintGLSL(), shaderLint()

## Knowledge Gaps
- **27 isolated node(s):** `./core/ambience.js`, `./core/botkit.js`, `./core/levelkit.js`, `./core/audio.js`, `./core/economy.js` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1879 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `ref_path`, `logic.mjs`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `workshop.js`, `ref_node_fs`?**
  _High betweenness centrality (0.440) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/ambience.js`, `./core/botkit.js`, `./core/levelkit.js` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.048633879781420766 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `workshop.js` to `build.js`?**
  _High betweenness centrality (0.401) - this node is a cross-community bridge._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.04789518900343643 - nodes in this community are weakly interconnected._
- **Why does `L` connect `lobbyplay.js` to `network.js`, `silence.js`, `lobby-door.js`, `addCrispBlock`, `pet.js`, `banana.js`, `player.js`, `monster.js`, `main.js`, `hospital.js`, `well.js`, `room000.js`, `audio.js`, `nursery.js`, `graffiti.js`, `engine.js`, `redlight.js`, `furas.js`, `range.js`, `games.js`, `hotel.js`, `dodgeball.js`, `lobby-door.js`, `hideseek.js`, `lava.js`, `catacombs.js`, `lobby.js`, `petnest.js`, `haptics.js`, `visuals.js`, `maze.js`, `homelogic.js`, `staff.js`, `lobbygames.js`, `cemetery.js`, `terminal.js`, `workshop.js`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._