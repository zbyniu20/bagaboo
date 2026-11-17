# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 99 files · ~226,621 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2177 nodes · 7269 edges · 79 communities (77 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `065ce3e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Network & Host Identity
- Economy & Achievements
- Procedural Textures & Jumpscares
- Mic, Rewards & Rope
- Config & Staff Names
- Furas Bot
- Avatar & Badges
- wardrobe.js
- Desktop Mode
- infection.js
- Tests & Module Imports
- audio.js
- well.js
- Graphics & Lighting
- memory.js
- Auth Client
- Hotel Level
- games.js
- Maze Level
- Catacombs Level
- Hospital Level
- Nursery Level
- Cemetery Level
- Lobby & Physics Bodies
- levelkit.js
- highfive.js
- race.js
- changed.mjs
- Role Tags & Lobby Door
- startJoin
- onLevelMsg
- Banana Mode
- Hide and Seek
- addCollider
- Round Kit
- Dodgeball
- Mod State & Volumes
- range.js
- addCrispBlock
- toast
- Statues Level
- Mod Menu
- core_engine_three
- blindtag.js
- engine.js
- setPlayerPosition
- monsterskins.js
- buildDoor
- Training Dummy
- Mannequin
- swingrun.js
- Docs: Accounts & Rules
- Last Tile
- generator.mjs
- addCrispBlock
- Terminal Pointers
- createEvents
- potato.js
- xrperf.js
- bag
- isOwned
- Murals
- hammer.js
- ambience.js
- buildHatch
- toast
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- buzz
- createGhost
- logic.mjs
- music.js
- registry.mjs
- static.mjs
- monster.js
- node-setup.mjs

## God Nodes (most connected - your core abstractions)
1. `toast()` - 247 edges
2. `addCrispBlock()` - 106 edges
3. `buzz()` - 94 edges
4. `makeCanvas()` - 88 edges
5. `mkRng()` - 87 edges
6. `buildDoor()` - 83 edges
7. `toTex()` - 73 edges
8. `setPlayerPosition()` - 70 edges
9. `levelReward()` - 69 edges
10. `cameraPanel()` - 59 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `FIGURE` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `WEEPER` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js
- `dispose()` --calls--> `onLevelMsg()`  [EXTRACTED]
  levels/generator.js → core/network.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (79 total, 2 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (50): getAudioContext(), animateFace(), isModMenuUser(), animateFaces(), answerCall(), attachMic(), audioEls, bannedNames (+42 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (65): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, addBones(), capped(), checkCounters(), claimLoginReward(), confirmGift() (+57 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.08
Nodes (66): burntTexture(), faceTexture(), jacketTexture(), rustDoorTexture(), createMural(), crackWalk(), createBandageTexture(), _createBloodPoolTexture() (+58 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (52): attachMic(), micLevel(), rewardActivity(), addDoorPortal(), sendLevelMsg(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE (+44 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.12
Nodes (37): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+29 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (45): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+37 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.07
Nodes (61): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer(), buildHat() (+53 more)

### Community 7 - "wardrobe.js"
Cohesion: 0.09
Nodes (30): LOBBY_MOVE_SCALE, _e, EMOTE, emotePose(), EMOTES, _pq, _q, basePose() (+22 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (44): poseHand(), cross, DESKTOP, help, keys, _o, _q, updateDesktop() (+36 more)

### Community 9 - "infection.js"
Cohesion: 0.25
Nodes (17): participants(), applyEvent(), bots, botsThink(), broadcast(), drawHud(), endRound(), fmt() (+9 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (29): ./core/audio.js, ./core/avatar.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js (+21 more)

### Community 11 - "audio.js"
Cohesion: 0.12
Nodes (30): ballHit(), beep(), distortionCurve(), ensureReverb(), env(), _f, goobyVoice(), hb (+22 more)

### Community 12 - "well.js"
Cohesion: 0.06
Nodes (53): world, LIQUID_TIME, makeOozeMaterial(), hostState(), addDetail(), addHalos(), buildEnvironment(), buildFlashBeam() (+45 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.05
Nodes (57): updateListener(), errorText(), LIGHT_MODE, box, c, errors, mesh, origError (+49 more)

### Community 14 - "memory.js"
Cohesion: 0.14
Nodes (19): step(), ARRIVAL_FROM_MEMORY, buildBurnFx(), buildCave(), buildTrack(), _c, COL_X, colorize() (+11 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (23): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+15 more)

### Community 16 - "Hotel Level"
Cohesion: 0.09
Nodes (25): setFlashHolder(), dispose(), drawHud(), FIGURE, fmt(), _fq, HUBS, info (+17 more)

### Community 17 - "games.js"
Cohesion: 0.05
Nodes (71): buildMachineTerminal(), IS_QUEST, dailyOn(), setDailyMode(), setDiff(), addComputers(), AMB, AMBD (+63 more)

### Community 18 - "Maze Level"
Cohesion: 0.12
Nodes (32): scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+24 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (32): addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls() (+24 more)

### Community 20 - "Hospital Level"
Cohesion: 0.10
Nodes (28): animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms(), buildShell() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (29): ARRIVAL_FROM_NURSERY, animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys(), buildStations() (+21 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.10
Nodes (26): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildGate() (+18 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.10
Nodes (37): addBlobAO(), addStaticBody(), attachGorillaMachine(), detachGorillaMachine(), triggerGooby(), buildTrainingDummy(), hitDummy(), setSign() (+29 more)

### Community 24 - "levelkit.js"
Cohesion: 0.33
Nodes (13): createRaceMode(), broadcast(), build(), drawHud(), handleFinish(), onNet(), roundOver(), startedCountdown() (+5 more)

### Community 25 - "highfive.js"
Cohesion: 0.22
Nodes (9): _a, _b, cool, HF, updateHighFive(), nameOf(), nameOfPlayer(), playersState (+1 more)

### Community 26 - "race.js"
Cohesion: 0.17
Nodes (22): ARRIVAL_FROM_RACE, broadcast(), build(), buildHall(), checkpoint(), clamp(), drawHud(), fmt() (+14 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (25): addRoleTag(), placeArm(), roleLabel(), ULTIMATE_SCALE, emoteState(), ARRIVAL, ARRIVAL_GAMES, ARRIVAL_LAUNDRY (+17 more)

### Community 29 - "startJoin"
Cohesion: 0.12
Nodes (36): randomNonce(), giftsLeft(), banList(), bannedNamesList(), canKick(), checkIntruder(), cleanRouted(), connById() (+28 more)

### Community 30 - "onLevelMsg"
Cohesion: 0.13
Nodes (15): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+7 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (28): BASES, botThink(), broadcast(), buildArena(), buildBanana(), carrying(), drawHud(), endRound() (+20 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.12
Nodes (27): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), broadcast(), drawHud(), fmt(), fromNet() (+19 more)

### Community 33 - "addCollider"
Cohesion: 0.29
Nodes (12): addCollider(), box(), buildRoom(), buildWardrobe(), dropRoom(), ensureRooms(), hubSideWall(), makeKey() (+4 more)

### Community 34 - "Round Kit"
Cohesion: 0.24
Nodes (16): ARRIVAL_FROM_TREASURE, BOXES, broadcast(), build(), buildArena(), drawHud(), endRound(), fmt() (+8 more)

### Community 35 - "Dodgeball"
Cohesion: 0.18
Nodes (22): introSeen(), aliveIn(), BALL_X, botsThink(), buildArena(), checkEnd(), checkHits(), drawHud() (+14 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.08
Nodes (40): applyVolumes(), bumpStat(), checkStatAchievements(), close(), closeEmotePanel(), _d, doEmote(), mesh (+32 more)

### Community 37 - "range.js"
Cohesion: 0.09
Nodes (43): myId(), ARRIVAL_FROM_RANGE, ARRIVAL_FROM_REDLIGHT, BOOTHS, build(), buildGun(), clearTargets(), _d (+35 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.12
Nodes (21): animateMonster(), canSee(), caught(), cellOf(), COLORS, drawHud(), findPath(), fmt() (+13 more)

### Community 39 - "toast"
Cohesion: 0.16
Nodes (20): isAuthority(), toNet(), broadcast(), broadcast(), addNoise(), broadcast(), dispose(), drawHud() (+12 more)

### Community 40 - "Statues Level"
Cohesion: 0.15
Nodes (25): setMusicMute(), dispose(), ARRIVAL_FROM_STATUES, broadcast(), build(), buildHall(), checkEnd(), dispose() (+17 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "core_engine_three"
Cohesion: 0.38
Nodes (3): camera, tex, seenIntros

### Community 43 - "blindtag.js"
Cohesion: 0.16
Nodes (20): drawInstructions(), fromNet(), BOT, botThink(), catchPlayer(), drawHud(), fmt(), info (+12 more)

### Community 44 - "engine.js"
Cohesion: 0.09
Nodes (26): boxAt(), buildComputerDesk(), LP, addShaderEdges(), blobAOMat, flashlight, headLamp, hemi (+18 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.19
Nodes (20): createBot(), stepBot(), L, applyEvent(), bots, botThink(), broadcast(), drawHud() (+12 more)

### Community 46 - "monsterskins.js"
Cohesion: 0.20
Nodes (17): makeLavaMaterial(), ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex() (+9 more)

### Community 47 - "buildDoor"
Cohesion: 0.12
Nodes (30): buildDoor(), cameraPanel(), createJumpscare(), buildMannequin(), build(), build(), buildArena(), buildDiggers() (+22 more)

### Community 48 - "Training Dummy"
Cohesion: 0.17
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.24
Nodes (18): place(), seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildLeg() (+10 more)

### Community 50 - "swingrun.js"
Cohesion: 0.09
Nodes (29): addBody(), addConstraint(), GROUP, physicsMat, buildBall(), ARRIVAL_FROM_LAVA, ARRIVAL_FROM_SWINGRUN, buildCourse() (+21 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.21
Nodes (20): panelBg(), setPlayerPosition(), ARRIVAL_FROM_LASTTILE, broadcast(), build(), buildHall(), buildTiles(), checkEnd() (+12 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (9): A, GATE_Z, GENS, n(), REPAIR, REPAIR_R, RESCUE, ROUND (+1 more)

### Community 54 - "addCrispBlock"
Cohesion: 0.16
Nodes (17): addCrispBlock(), createGridMaze(), buildArena(), build(), buildDryer(), buildGate(), buildGlimpse(), buildGrid() (+9 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 56 - "createEvents"
Cohesion: 0.28
Nodes (8): diffOf(), createEvents(), near(), startEvent(), build(), buildFlashlight(), lenOf(), makeMats()

### Community 57 - "potato.js"
Cohesion: 0.20
Nodes (21): handsOf(), headOf(), _p, touching(), applyEvent(), bots, botsThink(), broadcast() (+13 more)

### Community 58 - "xrperf.js"
Cohesion: 0.13
Nodes (17): lighting, renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), KINDS, _p, hands (+9 more)

### Community 59 - "bag"
Cohesion: 0.38
Nodes (7): bag(), buildCeiling(), buildMachines(), instBlock(), instPart(), machine(), openDrum()

### Community 60 - "isOwned"
Cohesion: 0.27
Nodes (17): buyItem(), giftable(), isEquipped(), isFeatured(), isLocked(), isOwned(), lockText(), mdVal() (+9 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): GFX, bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "hammer.js"
Cohesion: 0.22
Nodes (9): canPunish(), SAVE, head, hp, prev, q, updateHammer(), requestMod() (+1 more)

### Community 63 - "ambience.js"
Cohesion: 0.17
Nodes (20): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+12 more)

### Community 64 - "buildHatch"
Cohesion: 0.67
Nodes (3): signTexture(), buildHatch(), makeLever()

### Community 65 - "toast"
Cohesion: 0.08
Nodes (58): bell(), creak(), fuse(), checkCompletionist(), levelReward(), pruneDaily(), recordScore(), recordTime() (+50 more)

### Community 66 - "VR Menu"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 67 - "Dependencies"
Cohesion: 0.11
Nodes (20): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, name (+12 more)

### Community 68 - "Presence"
Cohesion: 0.18
Nodes (19): sendRouted(), apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE (+11 more)

### Community 70 - "Gooby"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 71 - "buzz"
Cohesion: 0.17
Nodes (26): bumpThreat(), duckDrone(), growl(), heartbeat(), roar(), screech(), stinger(), buzz() (+18 more)

### Community 73 - "createGhost"
Cohesion: 0.27
Nodes (11): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), createGhost() (+3 more)

### Community 74 - "logic.mjs"
Cohesion: 0.12
Nodes (15): check(), done(), b64u(), bad, forge(), ids, keys, lines (+7 more)

### Community 75 - "music.js"
Cohesion: 0.17
Nodes (15): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+7 more)

### Community 76 - "registry.mjs"
Cohesion: 0.13
Nodes (11): defs, HERE, num(), range(), ROOT, achievements, bad, ids (+3 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 83 - "monster.js"
Cohesion: 0.13
Nodes (29): buildMonsterSkin(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, broadcast(), catchPlayer(), dispose(), drawHud(), fmt() (+21 more)

## Knowledge Gaps
- **26 isolated node(s):** `./core/device.js`, `./main.js`, `./core/engine.js`, `./core/economy.js`, `./core/emotes.js` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 629 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `wardrobe.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `levelkit.js`, `highfive.js`, `race.js`, `Role Tags & Lobby Door`, `startJoin`, `Banana Mode`, `Hide and Seek`, `addCollider`, `Round Kit`, `Dodgeball`, `Mod State & Volumes`, `range.js`, `addCrispBlock`, `toast`, `Statues Level`, `Mod Menu`, `core_engine_three`, `blindtag.js`, `setPlayerPosition`, `monsterskins.js`, `buildDoor`, `Training Dummy`, `swingrun.js`, `Last Tile`, `addCrispBlock`, `Terminal Pointers`, `createEvents`, `potato.js`, `isOwned`, `hammer.js`, `ambience.js`, `Presence`, `buzz`, `createGhost`, `monster.js`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `./core/device.js`, `./main.js`, `./core/engine.js` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05480225988700565 - nodes in this community are weakly interconnected._
- **Why does `three` connect `engine.js` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Dependencies`, `Furas Bot`, `Avatar & Badges`, `core_engine_three`, `well.js`, `Graphics & Lighting`, `memory.js`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.055178652193577565 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.07885763000852515 - nodes in this community are weakly interconnected._