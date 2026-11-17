# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 104 files · ~230,305 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2239 nodes · 7462 edges · 89 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fba45481`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Network & Host Identity
- Economy & Achievements
- textures.js
- update
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
- setPlayerPosition
- highfive.js
- race.js
- changed.mjs
- Role Tags & Lobby Door
- handleGuest
- buildDoor
- Banana Mode
- blindtag.js
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
- silence.js
- computerdesk.js
- setPlayerPosition
- lava.js
- buildMannequin
- Training Dummy
- Mannequin
- swingrun.js
- Docs: Accounts & Rules
- Last Tile
- generator.mjs
- levels.js
- ensureDaily
- toast
- potato.js
- xrperf.js
- ui.js
- isOwned
- Murals
- getAudioContext
- ambience.js
- creak
- markAllDirty
- VR Menu
- Dependencies
- Presence
- wardrobe.js
- Gooby
- mkRng
- rounds.mjs
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- createHead
- debug.js
- createGhost
- makeCanvas
- static.mjs
- shop
- monster.js
- monsterskins.js
- build
- trainingdummy.js
- createEvents
- buildCourse

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
- `SCREECH` --calls--> `toast()`  [EXTRACTED]
  levels/hotel.js → core/terminal.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (89 total, 0 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (42): BANS_CLEARED, isModMenuUser(), emoteState(), containBall(), animateFaces(), audioEls, bannedNames, bodyState() (+34 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (41): ACHIEVEMENTS, ACTIVITY, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS, GIFT_LIMIT (+33 more)

### Community 2 - "textures.js"
Cohesion: 0.08
Nodes (23): ANISO(), createBloodPoolTexture, createCamoTexture(), createCloudLayerTexture, _createCobwebTexture(), createCobwebTexture, createEyeballTexture(), createFloorRoughTexture() (+15 more)

### Community 3 - "update"
Cohesion: 0.15
Nodes (23): rewardActivity(), releaseRope(), avoidObstacles(), broadcast(), catchPlayer(), collectFuse(), drawIntro(), emitNoise() (+15 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (35): ADMIN_NAMES, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName(), isOwnerName() (+27 more)

### Community 5 - "Furas Bot"
Cohesion: 0.08
Nodes (46): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+38 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.10
Nodes (24): ARM_GEO, BADGES, badgeTex, buildHammer(), cosTex, createRealHand(), _dir, FINGER_DEFS (+16 more)

### Community 7 - "terminal.js"
Cohesion: 0.07
Nodes (32): attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem() (+24 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (38): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), playerRig (+30 more)

### Community 9 - "infection.js"
Cohesion: 0.17
Nodes (23): camera, hostState(), isAuthority(), _p, participants(), touching(), isAuthority(), applyEvent() (+15 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (33): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/network.js (+25 more)

### Community 11 - "audio.js"
Cohesion: 0.11
Nodes (36): bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f, goobyVoice(), growl() (+28 more)

### Community 12 - "well.js"
Cohesion: 0.11
Nodes (30): world, signTexture(), makeOozeMaterial(), ARRIVAL_FROM_WELL, build(), buildGrate(), buildHatch(), buildHolds() (+22 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.06
Nodes (46): updateListener(), errorText(), GFX, LIGHT_MODE, enableDesktop(), setDesktopFacing(), markNickVerified(), applyLighting() (+38 more)

### Community 14 - "memory.js"
Cohesion: 0.13
Nodes (22): step(), build(), buildBeast(), buildBurnFx(), buildCave(), buildTrack(), _c, COL_X (+14 more)

### Community 15 - "Auth Client"
Cohesion: 0.13
Nodes (24): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+16 more)

### Community 16 - "Hotel Level"
Cohesion: 0.07
Nodes (55): beep(), heartbeat(), stinger(), whisper(), startEvent(), setFlashHolder(), box(), build() (+47 more)

### Community 17 - "games.js"
Cohesion: 0.07
Nodes (31): drawEcg(), drawEye(), mmss(), CARDS, AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_GENERATOR (+23 more)

### Community 18 - "Maze Level"
Cohesion: 0.13
Nodes (28): scaleBoxUVs(), ARRIVAL_FROM_MAZE, addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor() (+20 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (31): addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls() (+23 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (26): createGridMaze(), ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate() (+18 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.10
Nodes (28): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+20 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.12
Nodes (31): addBlobAO(), addStaticBody(), detachGorillaMachine(), updateTrainingDummy(), addScaryStep(), ARM_POSES, build(), buildBoneGrips() (+23 more)

### Community 24 - "setPlayerPosition"
Cohesion: 0.12
Nodes (42): clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL, validHead(), isGrounded() (+34 more)

### Community 25 - "highfive.js"
Cohesion: 0.13
Nodes (13): _e, EMOTE, EMOTES, _pq, _q, _a, _b, cool (+5 more)

### Community 26 - "race.js"
Cohesion: 0.16
Nodes (25): levelReward(), pruneDaily(), recordTime(), myId(), finish(), finish(), finish(), finish() (+17 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (26): addRoleTag(), animateFace(), createGorillaArm(), placeArm(), poseHand(), roleLabel(), ULTIMATE_SCALE, onLookChange() (+18 more)

### Community 29 - "handleGuest"
Cohesion: 0.20
Nodes (22): banList(), bannedNamesList(), checkIntruder(), connById(), electNewHost(), handleGuest(), hostStatus(), isBannedName() (+14 more)

### Community 30 - "buildDoor"
Cohesion: 0.09
Nodes (30): buildDoor(), cameraPanel(), onLevelMsg(), build(), dispose(), dispose(), build(), buildArena() (+22 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (29): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+21 more)

### Community 32 - "blindtag.js"
Cohesion: 0.07
Nodes (42): TAGS, tex, drawInstructions(), introSeen(), panelBg(), seenIntros, BOT, botThink() (+34 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.13
Nodes (21): SAVE, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel(), owned() (+13 more)

### Community 34 - "Round Kit"
Cohesion: 0.17
Nodes (22): validIndex(), sendLevelMsg(), toNet(), broadcast(), ARRIVAL_FROM_TREASURE, BOXES, broadcast(), build() (+14 more)

### Community 35 - "Dodgeball"
Cohesion: 0.19
Nodes (21): handsOf(), aliveIn(), BALL_X, botsThink(), broadcast(), checkEnd(), checkHits(), drawHud() (+13 more)

### Community 36 - "pause.js"
Cohesion: 0.15
Nodes (20): applyVolumes(), CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh (+12 more)

### Community 37 - "range.js"
Cohesion: 0.09
Nodes (28): safeName(), Terminal, updateVrMenu(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom() (+20 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.09
Nodes (41): addCrispBlock(), buildArena(), buildArena(), addPortal(), animateMonster(), bag(), build(), buildCeiling() (+33 more)

### Community 39 - "generator.js"
Cohesion: 0.10
Nodes (46): micLevel(), A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen(), GENS (+38 more)

### Community 40 - "Statues Level"
Cohesion: 0.16
Nodes (23): setMusicMute(), ARRIVAL_FROM_STATUES, broadcast(), build(), buildHall(), checkEnd(), dispose(), drawHud() (+15 more)

### Community 41 - "Mod Menu"
Cohesion: 0.14
Nodes (24): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+16 more)

### Community 42 - "core_engine_three"
Cohesion: 0.16
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 43 - "silence.js"
Cohesion: 0.12
Nodes (21): addDoorPortal(), isOnRope(), BALLS, buildClockBoard(), buildScare(), _c, drawBoard(), drawHud() (+13 more)

### Community 44 - "computerdesk.js"
Cohesion: 0.70
Nodes (4): boxAt(), buildComputerDesk(), buildMachineTerminal(), addCollider()

### Community 45 - "setPlayerPosition"
Cohesion: 0.19
Nodes (20): createBot(), stepBot(), L, applyEvent(), bots, botThink(), broadcast(), drawHud() (+12 more)

### Community 46 - "lava.js"
Cohesion: 0.16
Nodes (18): makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c (+10 more)

### Community 47 - "buildMannequin"
Cohesion: 0.27
Nodes (11): createJumpscare(), buildMannequin(), build(), buildArena(), build(), buildArena(), build(), buildArena() (+3 more)

### Community 48 - "Training Dummy"
Cohesion: 0.17
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.19
Nodes (21): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+13 more)

### Community 50 - "swingrun.js"
Cohesion: 0.08
Nodes (27): addConstraint(), addShaderEdges(), blobAOMat, flashlight, GROUP, headLamp, hemi, physicsMat (+19 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.22
Nodes (19): recordScore(), fromNet(), broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud() (+11 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "levels.js"
Cohesion: 0.08
Nodes (41): IS_QUEST, dailyOn(), DIFF_ORDER, DIFFS, AMB, AMBD, BEAT, BLOOD (+33 more)

### Community 55 - "ensureDaily"
Cohesion: 0.46
Nodes (8): addBones(), capped(), ensureDaily(), flushStats(), questProgress(), tick(), todayKey(), track()

### Community 56 - "toast"
Cohesion: 0.10
Nodes (50): ballHit(), bell(), fuse(), roar(), buzz(), takeRespawn(), releaseAll(), startedRace() (+42 more)

### Community 57 - "potato.js"
Cohesion: 0.24
Nodes (18): headOf(), applyEvent(), bots, botsThink(), broadcast(), drawBomb(), drawHud(), endRound() (+10 more)

### Community 58 - "xrperf.js"
Cohesion: 0.16
Nodes (14): lighting, renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), SETTINGS, apply(), GOV (+6 more)

### Community 59 - "ui.js"
Cohesion: 0.13
Nodes (21): canPunish(), giftsLeft(), updateHammer(), canKick(), isHiddenFrom(), isHostId(), otherPlayers(), requestMod() (+13 more)

### Community 60 - "isOwned"
Cohesion: 0.28
Nodes (16): activeRoleTags(), buyItem(), giftable(), hiddenRoleTags(), isEquipped(), isFeatured(), isLocked(), isOwned() (+8 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "getAudioContext"
Cohesion: 0.21
Nodes (17): getAudioContext(), answerCall(), attachMic(), callPeer(), cleanRouted(), getHub(), meshVoice(), outStream() (+9 more)

### Community 63 - "ambience.js"
Cohesion: 0.18
Nodes (18): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+10 more)

### Community 64 - "creak"
Cohesion: 0.13
Nodes (21): bang(), creak(), caught(), lampsUpdate(), thinkMonster(), update(), enter(), knock() (+13 more)

### Community 65 - "markAllDirty"
Cohesion: 0.16
Nodes (20): bumpStat(), checkCompletionist(), checkStatAchievements(), confirmGift(), equipItem(), findItem(), markCheater(), notifyLook() (+12 more)

### Community 66 - "VR Menu"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.10
Nodes (23): cannon-es, peerjs, playwright, three, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0 (+15 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 69 - "wardrobe.js"
Cohesion: 0.17
Nodes (19): createAvatar(), lookKey(), LOBBY_MOVE_SCALE, emotePose(), updateRemote(), ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose() (+11 more)

### Community 70 - "Gooby"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 71 - "mkRng"
Cohesion: 0.19
Nodes (20): rustDoorTexture(), crackWalk(), createBandageTexture(), _createCloudLayerTexture(), createFloorTexture(), _createMistTexture(), _createPaperTexture(), createPlasterTexture() (+12 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.14
Nodes (11): defs, HERE, num(), range(), ROOT, check(), done(), BAD (+3 more)

### Community 73 - "cosmetics.js"
Cohesion: 0.25
Nodes (13): LP, at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat() (+5 more)

### Community 74 - "logic.mjs"
Cohesion: 0.09
Nodes (16): b64u(), bad, forge(), html, ids, keys, lines, locked (+8 more)

### Community 75 - "music.js"
Cohesion: 0.26
Nodes (11): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+3 more)

### Community 76 - "registry.mjs"
Cohesion: 0.20
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 77 - "createHead"
Cohesion: 0.20
Nodes (18): bakeShade(), buildBadge(), buildGlasses(), buildHat(), buildMask(), createGorillaTorso(), createHead(), createNameSprite() (+10 more)

### Community 78 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 79 - "createGhost"
Cohesion: 0.27
Nodes (11): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), createGhost() (+3 more)

### Community 80 - "makeCanvas"
Cohesion: 0.11
Nodes (36): burntTexture(), faceTexture(), jacketTexture(), addComputers(), ensureAssets(), plateTexture(), _createBloodPoolTexture(), createDotTexture() (+28 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "shop"
Cohesion: 0.21
Nodes (13): checkCounters(), claimLoginReward(), loginRewardAmount(), loginStatus(), mdVal(), msToMidnight(), nextStreak(), questDef() (+5 more)

### Community 83 - "monster.js"
Cohesion: 0.12
Nodes (31): buildMonsterSkin(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, broadcast(), catchPlayer(), dispose(), drawHud(), duct() (+23 more)

### Community 84 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

### Community 85 - "build"
Cohesion: 0.25
Nodes (9): attachMic(), addBody(), build(), buildBalls(), buildFuses(), buildNest(), buildRoom(), buildRopes() (+1 more)

### Community 86 - "trainingdummy.js"
Cohesion: 0.43
Nodes (6): triggerGooby(), buildTrainingDummy(), bullseye(), hitDummy(), setSign(), signTexture()

### Community 87 - "createEvents"
Cohesion: 0.33
Nodes (5): diffOf(), createEvents(), near(), KINDS, _p

### Community 88 - "buildCourse"
Cohesion: 0.67
Nodes (4): buildCourse(), checkpoint(), clamp(), slab()

## Knowledge Gaps
- **25 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 643 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.048265460030165915 - nodes in this community are weakly interconnected._
- **Why does `three` connect `Dependencies` to `blindtag.js`, `textures.js`, `Furas Bot`, `Avatar & Badges`, `silence.js`, `computerdesk.js`, `well.js`, `memory.js`, `Graphics & Lighting`, `Mannequin`, `swingrun.js`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.056025369978858354 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `update`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `setPlayerPosition`, `highfive.js`, `race.js`, `Role Tags & Lobby Door`, `handleGuest`, `buildDoor`, `Banana Mode`, `blindtag.js`, `emotepanel.js`, `Round Kit`, `Dodgeball`, `range.js`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `silence.js`, `setPlayerPosition`, `lava.js`, `buildMannequin`, `Training Dummy`, `Last Tile`, `levels.js`, `ensureDaily`, `potato.js`, `ui.js`, `isOwned`, `getAudioContext`, `creak`, `markAllDirty`, `wardrobe.js`, `mkRng`, `createGhost`, `makeCanvas`, `monster.js`, `build`, `trainingdummy.js`, `buildCourse`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `textures.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._