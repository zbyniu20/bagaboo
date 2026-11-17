# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 115 files · ~245,815 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2398 nodes · 7875 edges · 77 communities (76 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0707a9aa`
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
- createHead
- levelReward
- changed.mjs
- Role Tags & Lobby Door
- buildDoor
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
- workshop.js
- setPlayerPosition
- lava.js
- core_engine_three
- Mannequin
- swingrun.js
- Docs: Accounts & Rules
- Last Tile
- generator.mjs
- levels.js
- race.js
- toast
- potato.js
- events.js
- isOwned
- Murals
- Terminal
- maze.js
- hauntedui.js
- Dependencies
- Presence
- wardrobe.js
- goobyTexture
- rounds.mjs
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- debug.js
- monsterskins.js
- scene
- static.mjs
- lobby.mjs
- monster.js
- ambience.js

## God Nodes (most connected - your core abstractions)
1. `toast()` - 255 edges
2. `addCrispBlock()` - 109 edges
3. `buzz()` - 96 edges
4. `buildDoor()` - 85 edges
5. `mkRng()` - 84 edges
6. `makeCanvas()` - 81 edges
7. `setPlayerPosition()` - 72 edges
8. `levelReward()` - 71 edges
9. `toTex()` - 70 edges
10. `cameraPanel()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `pickBones()` --calls--> `mkRng()`  [EXTRACTED]
  levels/catacombs.js → core/textures.js
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js
- `build()` --calls--> `isInvitedToStaff()`  [EXTRACTED]
  levels/staff.js → core/network.js
- `build()` --calls--> `selfBan()`  [EXTRACTED]
  levels/staff.js → core/network.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (77 total, 1 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.05
Nodes (89): getAudioContext(), vouch(), isModMenuUser(), isReservedNick(), containBall(), animateFaces(), answerCall(), attachMic() (+81 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (79): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, addBones(), capped(), checkCounters(), claimLoginReward(), confirmGift() (+71 more)

### Community 2 - "textures.js"
Cohesion: 0.06
Nodes (76): buildBadge(), burntTexture(), eyeTexture(), faceTexture(), furTexture(), jacketTexture(), roleLabel(), sleeveMaterial() (+68 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (53): attachMic(), micLevel(), rewardActivity(), addDoorPortal(), sendLevelMsg(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE (+45 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.11
Nodes (39): ADMIN_NAMES, BANS_CLEARED, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName() (+31 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (46): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+38 more)

### Community 6 - "avatar.js"
Cohesion: 0.10
Nodes (23): ARM_GEO, BADGES, badgeTex, cosTex, createRealHand(), _dir, FINGER_DEFS, fingerSeg() (+15 more)

### Community 7 - "terminal.js"
Cohesion: 0.11
Nodes (17): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+9 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (41): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), playerRig (+33 more)

### Community 9 - "infection.js"
Cohesion: 0.20
Nodes (20): camera, _p, participants(), touching(), applyEvent(), bots, botsThink(), broadcast() (+12 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (31): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/network.js (+23 more)

### Community 11 - "audio.js"
Cohesion: 0.11
Nodes (38): ballHit(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f, goobyVoice() (+30 more)

### Community 12 - "well.js"
Cohesion: 0.12
Nodes (28): signTexture(), ARRIVAL_FROM_WELL, build(), buildGrate(), buildHatch(), buildHolds(), buildHud(), buildIntro() (+20 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (41): updateListener(), LIGHT_MODE, enableDesktop(), setDesktopFacing(), clearLevel(), accept(), acceptors, LEVEL_DATA (+33 more)

### Community 14 - "memory.js"
Cohesion: 0.12
Nodes (24): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), createGhost(), NOOP (+16 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (22): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+14 more)

### Community 16 - "Hotel Level"
Cohesion: 0.07
Nodes (53): heartbeat(), stinger(), setFlashHolder(), think(), botThink(), catchPlayer(), box(), build() (+45 more)

### Community 17 - "games.js"
Cohesion: 0.09
Nodes (31): topTimes(), drawEcg(), drawEye(), ensureAssets(), AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_INFECTION, ARRIVAL_FROM_KOTH (+23 more)

### Community 18 - "hideseek.js"
Cohesion: 0.13
Nodes (24): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), broadcast(), drawHud(), fmt(), fromNet() (+16 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (30): animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls(), buildWardens() (+22 more)

### Community 20 - "Hospital Level"
Cohesion: 0.08
Nodes (30): diffOf(), createEvents(), near(), animate(), bfsFrom(), build(), buildCards(), buildGate() (+22 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (26): createGridMaze(), ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate() (+18 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (28): addInstancedBlocks(), normalFor(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor() (+20 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.09
Nodes (40): addStaticBody(), detachGorillaMachine(), debugLobbyPlay(), disposeLobbyPlay(), lobbyDim(), triggerGooby(), buildTrainingDummy(), bullseye() (+32 more)

### Community 24 - "engine.js"
Cohesion: 0.10
Nodes (28): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addBlobAO(), addCollider(), blobAOMat, flashlight (+20 more)

### Community 25 - "createHead"
Cohesion: 0.21
Nodes (18): addRoleTag(), bakeShade(), buildGlasses(), buildHat(), buildMask(), createGorillaArm(), createGorillaTorso(), createHead() (+10 more)

### Community 26 - "levelReward"
Cohesion: 0.25
Nodes (16): checkCompletionist(), levelReward(), pruneDaily(), recordTime(), unlockAchievement(), finish(), finish(), finish() (+8 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (28): animateFace(), placeArm(), ULTIMATE_SCALE, onLookChange(), emoteState(), myBanUntil(), myVoice(), networkTick() (+20 more)

### Community 30 - "buildDoor"
Cohesion: 0.14
Nodes (31): buildDoor(), cameraPanel(), createJumpscare(), buildMannequin(), onLevelMsg(), build(), dispose(), build() (+23 more)

### Community 31 - "Banana Mode"
Cohesion: 0.12
Nodes (27): hostState(), BASES, botThink(), broadcast(), buildArena(), buildBanana(), carrying(), drawHud() (+19 more)

### Community 32 - "blindtag.js"
Cohesion: 0.15
Nodes (21): stepBot(), L, headOf(), BOT, botThink(), dispose(), drawHud(), fmt() (+13 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.07
Nodes (37): bumpStat(), CATALOG, checkStatAchievements(), close(), closeEmotePanel(), _d, doEmote(), mesh (+29 more)

### Community 34 - "treasure.js"
Cohesion: 0.18
Nodes (22): drawInstructions(), introSeen(), panelBg(), validIndex(), ARRIVAL_FROM_TREASURE, update(), BOXES, broadcast() (+14 more)

### Community 35 - "Dodgeball"
Cohesion: 0.18
Nodes (22): handsOf(), aliveIn(), BALL_X, botsThink(), buildArena(), checkEnd(), checkHits(), drawHud() (+14 more)

### Community 36 - "pause.js"
Cohesion: 0.19
Nodes (17): applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause(), _p (+9 more)

### Community 37 - "vrmenu.js"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.07
Nodes (51): addCrispBlock(), addShaderEdges(), buildArena(), addPortal(), animateMonster(), bag(), build(), buildCeiling() (+43 more)

### Community 39 - "generator.js"
Cohesion: 0.06
Nodes (81): applyLighting(), A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen(), GENS (+73 more)

### Community 40 - "Statues Level"
Cohesion: 0.19
Nodes (20): setMusicMute(), broadcast(), checkEnd(), dispose(), drawHud(), endRound(), fmt(), HUES (+12 more)

### Community 41 - "Mod Menu"
Cohesion: 0.10
Nodes (30): _a, _b, cool, HF, bPressed(), buildXray(), closeMenu(), _d (+22 more)

### Community 42 - "core_engine_three"
Cohesion: 0.18
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 44 - "workshop.js"
Cohesion: 0.07
Nodes (60): atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap(), demoMap() (+52 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.22
Nodes (18): fromNet(), applyEvent(), bots, botThink(), broadcast(), drawHud(), endRound(), fmt() (+10 more)

### Community 46 - "lava.js"
Cohesion: 0.18
Nodes (16): makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c (+8 more)

### Community 48 - "core_engine_three"
Cohesion: 0.14
Nodes (10): makeOozeMaterial(), ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE (+2 more)

### Community 49 - "Mannequin"
Cohesion: 0.25
Nodes (18): place(), seg(), V3(), buildArm(), buildLeg(), jit(), buildArm(), buildLeg() (+10 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, buildBall(), ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope() (+11 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.18
Nodes (21): recordScore(), isAuthority(), toNet(), broadcast(), broadcast(), ARRIVAL_FROM_LASTTILE, broadcast(), build() (+13 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "levels.js"
Cohesion: 0.11
Nodes (26): dailyOn(), setDailyMode(), setDiff(), AMBD, drawCard(), drawGlass(), mmss(), sp() (+18 more)

### Community 55 - "race.js"
Cohesion: 0.05
Nodes (91): clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), safeName(), TOL, validHead() (+83 more)

### Community 56 - "toast"
Cohesion: 0.08
Nodes (58): beep(), bell(), fuse(), buzz(), takeRespawn(), releaseAll(), setPlayerPosition(), toast() (+50 more)

### Community 57 - "potato.js"
Cohesion: 0.12
Nodes (36): botsNeeded(), clamp(), decodeBots(), encodeBots(), FILL, fleePoint(), humansIn(), isBotId() (+28 more)

### Community 58 - "events.js"
Cohesion: 0.13
Nodes (17): lighting, renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), KINDS, _p, hands (+9 more)

### Community 60 - "isOwned"
Cohesion: 0.41
Nodes (12): buyItem(), giftable(), isEquipped(), isFeatured(), isLocked(), isOwned(), lockText(), priceOf() (+4 more)

### Community 61 - "Murals"
Cohesion: 0.27
Nodes (15): GFX, bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon() (+7 more)

### Community 64 - "maze.js"
Cohesion: 0.12
Nodes (32): scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+24 more)

### Community 65 - "hauntedui.js"
Cohesion: 0.14
Nodes (14): IS_QUEST, addComputers(), AMB, BEAT, BLOOD, BONE, ITAL, makeDread() (+6 more)

### Community 67 - "Dependencies"
Cohesion: 0.10
Nodes (22): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.160.0 (+14 more)

### Community 68 - "Presence"
Cohesion: 0.16
Nodes (20): sendRouted(), apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE (+12 more)

### Community 69 - "wardrobe.js"
Cohesion: 0.17
Nodes (18): createAvatar(), lookKey(), LOBBY_MOVE_SCALE, emotePose(), updateRemote(), ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose() (+10 more)

### Community 70 - "goobyTexture"
Cohesion: 0.14
Nodes (15): buildHammer(), hammerTextures(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp() (+7 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.11
Nodes (16): defs, HERE, num(), range(), ROOT, check(), done(), evil() (+8 more)

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
Cohesion: 0.12
Nodes (10): BND, bots, ROOT, src, achievements, bad, ids, listed (+2 more)

### Community 78 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 79 - "monsterskins.js"
Cohesion: 0.40
Nodes (10): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+2 more)

### Community 80 - "scene"
Cohesion: 0.29
Nodes (6): scene, _c, ensurePool(), _p, registerLevelLights(), sources

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.20
Nodes (3): IN, lob, ROOT

### Community 83 - "monster.js"
Cohesion: 0.12
Nodes (30): buildMonsterSkin(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, broadcast(), catchPlayer(), dispose(), drawHud(), duct() (+22 more)

### Community 87 - "ambience.js"
Cohesion: 0.11
Nodes (31): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+23 more)

## Knowledge Gaps
- **27 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 694 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `network.js`, `Economy & Achievements`, `textures.js`, `silence.js`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `hideseek.js`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `engine.js`, `levelReward`, `Role Tags & Lobby Door`, `buildDoor`, `Banana Mode`, `blindtag.js`, `emotepanel.js`, `treasure.js`, `Dodgeball`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `workshop.js`, `setPlayerPosition`, `lava.js`, `core_engine_three`, `Last Tile`, `levels.js`, `race.js`, `potato.js`, `isOwned`, `maze.js`, `Presence`, `wardrobe.js`, `goobyTexture`, `monster.js`, `ambience.js`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04565656565656566 - nodes in this community are weakly interconnected._
- **Why does `three` connect `engine.js` to `maze.js`, `textures.js`, `silence.js`, `Dependencies`, `Furas Bot`, `avatar.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Should `textures.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06426484907497566 - nodes in this community are weakly interconnected._