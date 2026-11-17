# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 119 files · ~250,573 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2453 nodes · 8049 edges · 78 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1d7201f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- Economy & Achievements
- textures.js
- silence.js
- Config & Staff Names
- Furas Bot
- avatar.js
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
- hideseek.js
- Catacombs Level
- Hospital Level
- Nursery Level
- Cemetery Level
- Lobby & Physics Bodies
- engine.js
- redlight.js
- levelReward
- changed.mjs
- Role Tags & Lobby Door
- race.js
- onLevelMsg
- Banana Mode
- blindtag.js
- emotepanel.js
- treasure.js
- Dodgeball
- pause.js
- vrmenu.js
- addCrispBlock
- generator.js
- Statues Level
- Mod Menu
- core_engine_three
- createRaceMode
- workshop.js
- setPlayerPosition
- lava.js
- racemode.js
- core_engine_three
- Mannequin
- swingrun.js
- Docs: Accounts & Rules
- Last Tile
- generator.mjs
- levels.js
- range.js
- bell
- potato.js
- events.js
- home.mjs
- Murals
- home.js
- maze.js
- Dependencies
- Presence
- wardrobe.js
- trainingdummy.js
- rounds.mjs
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- monsterskins.js
- scene
- static.mjs
- lobby.mjs
- monster.js
- ambience.js

## God Nodes (most connected - your core abstractions)
1. `toast()` - 258 edges
2. `addCrispBlock()` - 111 edges
3. `buzz()` - 96 edges
4. `buildDoor()` - 87 edges
5. `mkRng()` - 83 edges
6. `makeCanvas()` - 79 edges
7. `setPlayerPosition()` - 72 edges
8. `levelReward()` - 71 edges
9. `toTex()` - 70 edges
10. `cameraPanel()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `pickBones()` --calls--> `mkRng()`  [EXTRACTED]
  levels/catacombs.js → core/textures.js
- `FIGURE` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `WEEPER` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (78 total, 0 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (97): getAudioContext(), vouch(), animateFace(), createAvatar(), lookKey(), placeArm(), poseHand(), BANS_CLEARED (+89 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (91): activeRoleTags(), ACTIVITY, addBones(), buyItem(), capped(), checkCounters(), claimLoginReward(), confirmGift() (+83 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (76): addComputers(), plateTexture(), createJumpscare(), rustDoorTexture(), lavaTex(), ANISO(), crackWalk(), createBandageTexture() (+68 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (53): attachMic(), rewardActivity(), isOnRope(), releaseRope(), avoidObstacles(), BALLS, broadcast(), build() (+45 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.08
Nodes (52): account(), ADMIN_NAMES, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName() (+44 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (46): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+38 more)

### Community 6 - "avatar.js"
Cohesion: 0.07
Nodes (49): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer(), buildHat() (+41 more)

### Community 7 - "terminal.js"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (38): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), playerRig (+30 more)

### Community 9 - "infection.js"
Cohesion: 0.19
Nodes (22): camera, handsOf(), isAuthority(), _p, participants(), touching(), applyEvent(), bots (+14 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (32): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js (+24 more)

### Community 11 - "audio.js"
Cohesion: 0.08
Nodes (59): ballHit(), bumpThreat(), creak(), distortionCurve(), duckDrone(), env(), _f, goobyVoice() (+51 more)

### Community 12 - "well.js"
Cohesion: 0.09
Nodes (41): addInstancedBlocks(), scaleBoxUVs(), world, makeOozeMaterial(), sendLevelMsg(), buildDecor(), ARRIVAL_FROM_WELL, broadcast() (+33 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (42): updateListener(), LIGHT_MODE, enableDesktop(), setDesktopFacing(), dailyOn(), markNickVerified(), clearLevel(), accept() (+34 more)

### Community 14 - "memory.js"
Cohesion: 0.12
Nodes (25): dailyDate(), dailyKey(), getDiff(), isDaily(), recordKey(), topTimes(), createGhost(), NOOP (+17 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (21): API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login(), logout() (+13 more)

### Community 16 - "Hotel Level"
Cohesion: 0.07
Nodes (53): stinger(), whisper(), addCollider(), startEvent(), setFlashHolder(), box(), build(), buildFlashlight() (+45 more)

### Community 17 - "games.js"
Cohesion: 0.07
Nodes (37): drawEcg(), drawEye(), ensureAssets(), makeDread(), CARDS, AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_BLINDTAG (+29 more)

### Community 18 - "hideseek.js"
Cohesion: 0.13
Nodes (26): TAGS, introSeen(), ARRIVAL_FROM_HIDESEEK, BOT, botSees(), broadcast(), drawHud(), fmt() (+18 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (33): takeRespawn(), addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+25 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (33): beep(), ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate() (+25 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (27): diffOf(), createEvents(), near(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts() (+19 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.11
Nodes (37): buildMachineTerminal(), addBlobAO(), addStaticBody(), place(), detachGorillaMachine(), debugLobbyPlay(), lobbyDim(), updateTrainingDummy() (+29 more)

### Community 24 - "engine.js"
Cohesion: 0.09
Nodes (26): boxAt(), buildComputerDesk(), LP, addShaderEdges(), blobAOMat, flashlight, headLamp, hemi (+18 more)

### Community 25 - "redlight.js"
Cohesion: 0.19
Nodes (23): myId(), outcomeReward(), raceOutcome(), registerFinish(), stepPhase(), ARRIVAL_FROM_REDLIGHT, broadcast(), drawHud() (+15 more)

### Community 26 - "levelReward"
Cohesion: 0.16
Nodes (31): checkCompletionist(), levelReward(), pruneDaily(), recordTime(), unlockAchievement(), unlockItem(), setPlayerPosition(), toast() (+23 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.10
Nodes (23): addRoleTag(), roleLabel(), ULTIMATE_SCALE, onLookChange(), ARRIVAL, ARRIVAL_GAMES, ARRIVAL_LAUNDRY, ARRIVAL_LEVELS (+15 more)

### Community 29 - "race.js"
Cohesion: 0.19
Nodes (21): broadcast(), build(), buildCourse(), checkpoint(), clamp(), drawHud(), fmt(), fromNet() (+13 more)

### Community 30 - "onLevelMsg"
Cohesion: 0.14
Nodes (14): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+6 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (29): applyEvent(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+21 more)

### Community 32 - "blindtag.js"
Cohesion: 0.17
Nodes (21): headOf(), BOT, botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), info (+13 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.06
Nodes (51): bumpStat(), checkStatAchievements(), close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel() (+43 more)

### Community 34 - "treasure.js"
Cohesion: 0.20
Nodes (19): validIndex(), fromNet(), ARRIVAL_FROM_TREASURE, BOXES, broadcast(), build(), buildArena(), drawHud() (+11 more)

### Community 35 - "Dodgeball"
Cohesion: 0.18
Nodes (23): aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall(), checkEnd() (+15 more)

### Community 36 - "pause.js"
Cohesion: 0.16
Nodes (19): CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause() (+11 more)

### Community 37 - "vrmenu.js"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.08
Nodes (44): addCrispBlock(), buildGate(), buildYard(), buildArena(), buildArena(), addPortal(), animateMonster(), bag() (+36 more)

### Community 39 - "generator.js"
Cohesion: 0.06
Nodes (83): micLevel(), SESSION, applyLighting(), A, canCatch(), clamp01(), doneCount(), GATE_Z (+75 more)

### Community 40 - "Statues Level"
Cohesion: 0.16
Nodes (23): L, setMusicMute(), dispose(), broadcast(), checkEnd(), dispose(), drawHud(), endRound() (+15 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "core_engine_three"
Cohesion: 0.10
Nodes (25): box, c, errors, mesh, origError, tx, updateDebug(), LIQUID_TIME (+17 more)

### Community 43 - "createRaceMode"
Cohesion: 0.29
Nodes (14): isGrounded(), createRaceMode(), broadcast(), build(), drawHud(), guestFinish(), handleFinish(), onNet() (+6 more)

### Community 44 - "workshop.js"
Cohesion: 0.07
Nodes (61): wrapText(), atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap() (+53 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.25
Nodes (15): drawInstructions(), panelBg(), toNet(), bots, botThink(), broadcast(), drawHud(), endRound() (+7 more)

### Community 46 - "lava.js"
Cohesion: 0.12
Nodes (29): addDoorPortal(), buildDoor(), cameraPanel(), seenIntros, signTexture(), makeLavaMaterial(), buildMannequin(), ARRIVAL_FROM_LAVA (+21 more)

### Community 47 - "racemode.js"
Cohesion: 0.40
Nodes (9): clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL, validHead(), fmt() (+1 more)

### Community 48 - "core_engine_three"
Cohesion: 0.18
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.40
Nodes (10): seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildLeg(), buildMannequin() (+2 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (18): addBody(), addConstraint(), GROUP, physicsMat, ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope(), createEyeball() (+10 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.23
Nodes (18): recordScore(), broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound() (+10 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "levels.js"
Cohesion: 0.08
Nodes (37): IS_QUEST, DIFF_ORDER, DIFFS, AMB, AMBD, BEAT, BLOOD, BONE (+29 more)

### Community 55 - "range.js"
Cohesion: 0.12
Nodes (29): safeName(), updateVrMenu(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets() (+21 more)

### Community 56 - "bell"
Cohesion: 0.24
Nodes (11): bell(), fuse(), takeRelic(), wakeDigger(), takeFish(), takeCard(), wakeStatue(), pickKey() (+3 more)

### Community 57 - "potato.js"
Cohesion: 0.11
Nodes (37): botsNeeded(), clamp(), decodeBots(), encodeBots(), FILL, fleePoint(), humansIn(), isBotId() (+29 more)

### Community 58 - "events.js"
Cohesion: 0.13
Nodes (17): lighting, renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), KINDS, _p, hands (+9 more)

### Community 59 - "home.mjs"
Cohesion: 0.20
Nodes (6): door, eco, lvl, main, ROOT, store

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 63 - "home.js"
Cohesion: 0.08
Nodes (41): ACHIEVEMENTS, spendBones(), acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor() (+33 more)

### Community 64 - "maze.js"
Cohesion: 0.13
Nodes (30): ARRIVAL_FROM_MAZE, addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+22 more)

### Community 67 - "Dependencies"
Cohesion: 0.10
Nodes (22): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.160.0 (+14 more)

### Community 68 - "Presence"
Cohesion: 0.33
Nodes (12): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE, retry() (+4 more)

### Community 69 - "wardrobe.js"
Cohesion: 0.20
Nodes (15): LOBBY_MOVE_SCALE, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), cycleEmote(), info, ownedEmotes(), panel (+7 more)

### Community 70 - "trainingdummy.js"
Cohesion: 0.22
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.14
Nodes (11): check(), done(), evil(), goodMap(), mainJs, rm, ROOT, BAD (+3 more)

### Community 73 - "cosmetics.js"
Cohesion: 0.28
Nodes (12): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat(), extraHat() (+4 more)

### Community 74 - "logic.mjs"
Cohesion: 0.09
Nodes (16): b64u(), bad, forge(), html, ids, keys, lines, locked (+8 more)

### Community 75 - "music.js"
Cohesion: 0.23
Nodes (12): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+4 more)

### Community 76 - "registry.mjs"
Cohesion: 0.10
Nodes (15): defs, HERE, num(), range(), ROOT, BND, bots, ROOT (+7 more)

### Community 79 - "monsterskins.js"
Cohesion: 0.40
Nodes (10): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+2 more)

### Community 80 - "scene"
Cohesion: 0.25
Nodes (7): GFX, scene, _c, ensurePool(), _p, registerLevelLights(), sources

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.20
Nodes (3): IN, lob, ROOT

### Community 83 - "monster.js"
Cohesion: 0.13
Nodes (29): buildMonsterSkin(), setAvatarHidden(), broadcast(), catchPlayer(), dispose(), drawHud(), fmt(), fromNet() (+21 more)

### Community 87 - "ambience.js"
Cohesion: 0.12
Nodes (25): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+17 more)

## Knowledge Gaps
- **28 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 707 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `engine.js` to `maze.js`, `textures.js`, `silence.js`, `Dependencies`, `Furas Bot`, `avatar.js`, `well.js`, `Graphics & Lighting`, `lava.js`, `memory.js`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04240221529941156 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `levelReward` to `network.js`, `Economy & Achievements`, `textures.js`, `silence.js`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `hideseek.js`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `redlight.js`, `Role Tags & Lobby Door`, `race.js`, `Banana Mode`, `blindtag.js`, `emotepanel.js`, `treasure.js`, `Dodgeball`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `createRaceMode`, `workshop.js`, `setPlayerPosition`, `lava.js`, `racemode.js`, `core_engine_three`, `Last Tile`, `levels.js`, `range.js`, `bell`, `potato.js`, `home.js`, `maze.js`, `wardrobe.js`, `trainingdummy.js`, `monster.js`, `ambience.js`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.048959048272706474 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `textures.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06718597857838364 - nodes in this community are weakly interconnected._