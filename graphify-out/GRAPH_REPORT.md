# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 101 files · ~227,969 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2209 nodes · 7332 edges · 86 communities (84 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f60c03b`
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
- terminal.js
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
- handleGuest
- onLevelMsg
- Banana Mode
- Hide and Seek
- emotepanel.js
- Round Kit
- Dodgeball
- pause.js
- range.js
- addCrispBlock
- generator.js
- Statues Level
- Mod Menu
- core_engine_three
- blindtag.js
- engine.js
- setPlayerPosition
- lava.js
- buildDoor
- Training Dummy
- Mannequin
- swingrun.js
- Docs: Accounts & Rules
- Last Tile
- generator.mjs
- levels.js
- markAllDirty
- toast
- potato.js
- xrperf.js
- startJoin
- isOwned
- Murals
- getAudioContext
- ambience.js
- sendLevelMsg
- levelReward
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- buzz
- hauntedui.js
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- drawScreen
- debug.js
- getLook
- build
- static.mjs
- step
- monster.js
- node-setup.mjs
- stepDread

## God Nodes (most connected - your core abstractions)
1. `toast()` - 247 edges
2. `addCrispBlock()` - 106 edges
3. `buzz()` - 94 edges
4. `makeCanvas()` - 87 edges
5. `mkRng()` - 85 edges
6. `buildDoor()` - 83 edges
7. `toTex()` - 72 edges
8. `setPlayerPosition()` - 70 edges
9. `levelReward()` - 69 edges
10. `cameraPanel()` - 59 edges

## Surprising Connections (you probably didn't know these)
- `update()` --indirect_call--> `S()`  [INFERRED]
  levels/generator.js → tests/modes/generator.mjs
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `pickBones()` --calls--> `mkRng()`  [EXTRACTED]
  levels/catacombs.js → core/textures.js
- `dispose()` --calls--> `onLevelMsg()`  [EXTRACTED]
  levels/treasure.js → core/network.js
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (86 total, 2 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (46): animateFace(), poseHand(), isModMenuUser(), emotePose(), emoteState(), containBall(), animateFaces(), audioEls (+38 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (38): ACHIEVEMENTS, ACTIVITY, CURRENCY, DAILY_LEVELS, defaultSave(), DIFF_LEVELS, GIFT_LIMIT, GIFT_SLOTS (+30 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.08
Nodes (65): burntTexture(), faceTexture(), jacketTexture(), rustDoorTexture(), lavaTex(), createMural(), ANISO(), crackWalk() (+57 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (53): attachMic(), micLevel(), rewardActivity(), near(), addDoorPortal(), isOnRope(), releaseRope(), avoidObstacles() (+45 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.11
Nodes (40): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+32 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (44): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildDividers(), buildFish(), buildFuras() (+36 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.08
Nodes (46): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer(), buildHat() (+38 more)

### Community 7 - "terminal.js"
Cohesion: 0.05
Nodes (51): LOBBY_MOVE_SCALE, basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem() (+43 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (38): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), playerRig (+30 more)

### Community 9 - "infection.js"
Cohesion: 0.21
Nodes (19): participants(), ARRIVAL_FROM_INFECTION, applyEvent(), bots, botsThink(), buildArena(), drawHud(), endRound() (+11 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (33): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/network.js (+25 more)

### Community 11 - "audio.js"
Cohesion: 0.11
Nodes (42): oneShot(), ballHit(), bang(), beep(), bumpThreat(), creak(), distortionCurve(), duckDrone() (+34 more)

### Community 12 - "well.js"
Cohesion: 0.11
Nodes (31): signTexture(), makeOozeMaterial(), build(), buildGrate(), buildHatch(), buildHolds(), buildHud(), buildIntro() (+23 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.06
Nodes (51): updateListener(), errorText(), GFX, LIGHT_MODE, enableDesktop(), setDesktopFacing(), dailySeed(), hasSave() (+43 more)

### Community 14 - "memory.js"
Cohesion: 0.11
Nodes (29): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), makeLavaMaterial() (+21 more)

### Community 15 - "Auth Client"
Cohesion: 0.15
Nodes (22): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+14 more)

### Community 16 - "Hotel Level"
Cohesion: 0.07
Nodes (47): heartbeat(), thump(), stepBot(), setFlashHolder(), box(), buildFlashlight(), buildRoom(), buildWardrobe() (+39 more)

### Community 17 - "games.js"
Cohesion: 0.08
Nodes (29): drawEcg(), drawEye(), AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_GENERATOR, ARRIVAL_FROM_KOTH, ARRIVAL_FROM_LASTTILE (+21 more)

### Community 18 - "Maze Level"
Cohesion: 0.12
Nodes (32): scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+24 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (31): tex, createGridMaze(), addWarden(), animate(), BONES, buildDecor(), buildKeys(), buildWalls() (+23 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (32): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+24 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (27): addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys(), buildStations() (+19 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.10
Nodes (23): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+15 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.13
Nodes (30): addBlobAO(), addStaticBody(), attachGorillaMachine(), detachGorillaMachine(), buildTrainingDummy(), updateTrainingDummy(), addScaryStep(), ARM_POSES (+22 more)

### Community 24 - "levelkit.js"
Cohesion: 0.32
Nodes (14): panelBg(), isGrounded(), setPlayerPosition(), createRaceMode(), drawHud(), handleFinish(), onNet(), roundOver() (+6 more)

### Community 25 - "highfive.js"
Cohesion: 0.22
Nodes (9): _a, _b, cool, HF, updateHighFive(), nameOf(), nameOfPlayer(), playersState (+1 more)

### Community 26 - "race.js"
Cohesion: 0.19
Nodes (21): ARRIVAL_FROM_RACE, broadcast(), buildCourse(), checkpoint(), clamp(), drawHud(), fmt(), fromNet() (+13 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (23): addRoleTag(), createGorillaArm(), roleLabel(), ULTIMATE_SCALE, onLookChange(), ARRIVAL, ARRIVAL_GAMES, ARRIVAL_LAUNDRY (+15 more)

### Community 29 - "handleGuest"
Cohesion: 0.15
Nodes (21): randomNonce(), canPunish(), updateHammer(), banList(), bannedNamesList(), canKick(), checkIntruder(), cleanRouted() (+13 more)

### Community 30 - "onLevelMsg"
Cohesion: 0.13
Nodes (15): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+7 more)

### Community 31 - "Banana Mode"
Cohesion: 0.14
Nodes (25): BASES, botThink(), broadcast(), buildArena(), buildBanana(), carrying(), drawHud(), endRound() (+17 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.12
Nodes (29): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud() (+21 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.12
Nodes (21): CATALOG, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel(), owned() (+13 more)

### Community 34 - "Round Kit"
Cohesion: 0.15
Nodes (26): drawInstructions(), introSeen(), seenIntros, takeRespawn(), isAuthority(), update(), update(), update() (+18 more)

### Community 35 - "Dodgeball"
Cohesion: 0.19
Nodes (21): createBot(), L, aliveIn(), BALL_X, botsThink(), checkEnd(), checkHits(), drawHud() (+13 more)

### Community 36 - "pause.js"
Cohesion: 0.18
Nodes (17): applyVolumes(), applyBrightness(), bDownAt, changed(), _d, mesh, openPause(), _p (+9 more)

### Community 37 - "range.js"
Cohesion: 0.09
Nodes (43): myId(), ARRIVAL_FROM_REDLIGHT, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d (+35 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.09
Nodes (40): addCrispBlock(), animateMonster(), bag(), build(), buildCeiling(), buildDryer(), buildGate(), buildGlimpse() (+32 more)

### Community 39 - "generator.js"
Cohesion: 0.10
Nodes (45): A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen(), GENS, hearRadius() (+37 more)

### Community 40 - "Statues Level"
Cohesion: 0.18
Nodes (22): setMusicMute(), build(), buildHall(), checkEnd(), dispose(), drawHud(), endRound(), fmt() (+14 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "core_engine_three"
Cohesion: 0.16
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 43 - "blindtag.js"
Cohesion: 0.17
Nodes (18): BOT, botThink(), catchPlayer(), drawHud(), fmt(), info, localCaught(), onNet() (+10 more)

### Community 44 - "engine.js"
Cohesion: 0.09
Nodes (27): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addCollider(), addShaderEdges(), blobAOMat, flashlight (+19 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.19
Nodes (20): camera, fromNet(), handsOf(), _p, touching(), applyEvent(), bots, botThink() (+12 more)

### Community 46 - "lava.js"
Cohesion: 0.21
Nodes (14): build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c, checkpoint(), drawHud() (+6 more)

### Community 47 - "buildDoor"
Cohesion: 0.14
Nodes (30): diffOf(), createEvents(), buildDoor(), cameraPanel(), createJumpscare(), buildMannequin(), build(), build() (+22 more)

### Community 48 - "Training Dummy"
Cohesion: 0.12
Nodes (13): triggerGooby(), bullseye(), hitDummy(), setSign(), signTexture(), ARRIVAL_FROM_TOWERCLIMB, build, debug (+5 more)

### Community 49 - "Mannequin"
Cohesion: 0.21
Nodes (20): place(), seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildChains() (+12 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, buildBall(), ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope() (+11 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.25
Nodes (17): recordScore(), build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound(), fmt() (+9 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (5): bot, r, ROOT, S(), src

### Community 54 - "levels.js"
Cohesion: 0.09
Nodes (19): DIFF_ORDER, DIFFS, visitorsHere(), CARDS, AR, ARRIVAL_FROM_CATACOMBS, ARRIVAL_FROM_FURAS, ARRIVAL_FROM_HOTEL (+11 more)

### Community 55 - "markAllDirty"
Cohesion: 0.21
Nodes (20): addBones(), capped(), checkCounters(), claimLoginReward(), confirmGift(), ensureDaily(), findItem(), flushStats() (+12 more)

### Community 56 - "toast"
Cohesion: 0.20
Nodes (19): bell(), fuse(), toast(), applyEvent(), build(), onNet(), roundOver(), startedPlay() (+11 more)

### Community 57 - "potato.js"
Cohesion: 0.25
Nodes (17): headOf(), applyEvent(), bots, botsThink(), drawBomb(), drawHud(), endRound(), fmt() (+9 more)

### Community 58 - "xrperf.js"
Cohesion: 0.10
Nodes (23): SAVE, lighting, renderer, scene, captureEnvironment(), cubeLuminance(), referenceLuminance(), KINDS (+15 more)

### Community 59 - "startJoin"
Cohesion: 0.23
Nodes (19): answerCall(), electNewHost(), hostStatus(), kickPlayer(), leaveNetwork(), migrateHost(), removeAudio(), removeRemote() (+11 more)

### Community 60 - "isOwned"
Cohesion: 0.25
Nodes (18): buyItem(), equipItem(), giftable(), isEquipped(), isFeatured(), isLocked(), isOwned(), lockText() (+10 more)

### Community 61 - "Murals"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 62 - "getAudioContext"
Cohesion: 0.17
Nodes (14): getAudioContext(), attachMic(), callPeer(), getHub(), meshVoice(), outStream(), playAudioStream(), resumeVoiceAc() (+6 more)

### Community 63 - "ambience.js"
Cohesion: 0.16
Nodes (18): aroundPlayer(), DEFS, last, loops, _p, _q, rnd(), setAmbience() (+10 more)

### Community 64 - "sendLevelMsg"
Cohesion: 0.22
Nodes (16): sendLevelMsg(), broadcast(), toNet(), broadcast(), broadcast(), broadcast(), broadcast(), broadcast() (+8 more)

### Community 65 - "levelReward"
Cohesion: 0.20
Nodes (19): bumpStat(), checkCompletionist(), checkStatAchievements(), levelReward(), pruneDaily(), recordTime(), unlockAchievement(), unlockItem() (+11 more)

### Community 66 - "VR Menu"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 67 - "Dependencies"
Cohesion: 0.11
Nodes (20): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, name (+12 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 70 - "Gooby"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 71 - "buzz"
Cohesion: 0.18
Nodes (22): roar(), stinger(), buzz(), releaseAll(), caught(), nearestAisle(), pickPatrol(), sees() (+14 more)

### Community 72 - "hauntedui.js"
Cohesion: 0.14
Nodes (13): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, makeDread() (+5 more)

### Community 73 - "cosmetics.js"
Cohesion: 0.30
Nodes (11): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraHat(), extraMask() (+3 more)

### Community 74 - "logic.mjs"
Cohesion: 0.10
Nodes (16): check(), done(), b64u(), bad, forge(), html, ids, keys (+8 more)

### Community 75 - "music.js"
Cohesion: 0.17
Nodes (15): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+7 more)

### Community 76 - "registry.mjs"
Cohesion: 0.13
Nodes (11): defs, HERE, num(), range(), ROOT, achievements, bad, ids (+3 more)

### Community 77 - "drawScreen"
Cohesion: 0.29
Nodes (10): dailyOn(), drawCard(), drawGlass(), mmss(), sp(), tx(), wrapText(), drawScreen() (+2 more)

### Community 78 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 79 - "getLook"
Cohesion: 0.32
Nodes (8): activeRoleTags(), getLook(), hiddenRoleTags(), notifyLook(), roleTagOptions(), setHideTag(), setProfile(), toggleRoleTag()

### Community 80 - "build"
Cohesion: 0.29
Nodes (8): addComputers(), ensureAssets(), plateTexture(), build(), buildCategories(), buildDecor(), build(), buildWallScreens()

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "step"
Cohesion: 0.33
Nodes (6): step(), caught(), thinkMonster(), think(), waypoint(), animateMonster()

### Community 83 - "monster.js"
Cohesion: 0.09
Nodes (41): ball(), blind(), box(), buildMonsterSkin(), cyl(), glowEye(), lavaBeast(), mannequin() (+33 more)

### Community 85 - "stepDread"
Cohesion: 0.67
Nodes (3): stepDread(), update(), update()

## Knowledge Gaps
- **25 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 634 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `levelkit.js`, `highfive.js`, `race.js`, `Role Tags & Lobby Door`, `handleGuest`, `Banana Mode`, `Hide and Seek`, `emotepanel.js`, `Round Kit`, `Dodgeball`, `range.js`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `blindtag.js`, `setPlayerPosition`, `lava.js`, `buildDoor`, `Training Dummy`, `Last Tile`, `levels.js`, `markAllDirty`, `potato.js`, `xrperf.js`, `startJoin`, `isOwned`, `sendLevelMsg`, `levelReward`, `buzz`, `build`, `step`, `monster.js`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05450733752620545 - nodes in this community are weakly interconnected._
- **Why does `three` connect `engine.js` to `Round Kit`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Furas Bot`, `Avatar & Badges`, `Dependencies`, `well.js`, `Graphics & Lighting`, `memory.js`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.06025641025641026 - nodes in this community are weakly interconnected._
- **Why does `update()` connect `generator.js` to `levelkit.js`, `Round Kit`, `toast`, `generator.mjs`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._