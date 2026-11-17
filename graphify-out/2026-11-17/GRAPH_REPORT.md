# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 113 files · ~243,940 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2373 nodes · 7826 edges · 89 communities (88 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7c4bc8e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Network & Host Identity
- Economy & Achievements
- textures.js
- silence.js
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
- hideseek.js
- Catacombs Level
- Hospital Level
- Nursery Level
- Cemetery Level
- Lobby & Physics Bodies
- createRaceMode
- emotes.js
- levelReward
- changed.mjs
- Role Tags & Lobby Door
- handleGuest
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
- redlight.js
- workshop.js
- setPlayerPosition
- lava.js
- range.js
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
- engine.js
- ui.js
- isOwned
- Murals
- startJoin
- Terminal
- maze.js
- hauntedui.js
- gorillamachine.js
- Dependencies
- Presence
- wardrobe.js
- trainingdummy.js
- drawGames
- rounds.mjs
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- sendLevelMsg
- debug.js
- monsterskins.js
- scene
- static.mjs
- lobby.mjs
- monster.js
- tx
- stepDread
- hostState
- update
- registry.js

## God Nodes (most connected - your core abstractions)
1. `toast()` - 255 edges
2. `addCrispBlock()` - 109 edges
3. `buzz()` - 96 edges
4. `mkRng()` - 86 edges
5. `buildDoor()` - 85 edges
6. `makeCanvas()` - 82 edges
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
- `FIGURE` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `WEEPER` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (89 total, 1 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (46): getAudioContext(), animateFace(), emoteState(), animateFaces(), attachMic(), audioEls, bannedNames, bodyState() (+38 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (48): ACHIEVEMENTS, ACTIVITY, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS, fmtDuration() (+40 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (71): plateTexture(), rustDoorTexture(), lavaTex(), ANISO(), crackWalk(), createBandageTexture(), _createBloodPoolTexture(), createBloodPoolTexture (+63 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (50): attachMic(), micLevel(), rewardActivity(), addDoorPortal(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE, avoidObstacles() (+42 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.09
Nodes (49): ADMIN_NAMES, BANS_CLEARED, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName() (+41 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (45): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+37 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.08
Nodes (50): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer(), buildHat() (+42 more)

### Community 7 - "terminal.js"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (41): poseHand(), cross, help, keys, _o, _q, updateDesktop(), track() (+33 more)

### Community 9 - "infection.js"
Cohesion: 0.19
Nodes (22): handsOf(), isAuthority(), _p, participants(), touching(), applyEvent(), bots, botsThink() (+14 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (31): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/network.js (+23 more)

### Community 11 - "audio.js"
Cohesion: 0.07
Nodes (60): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+52 more)

### Community 12 - "well.js"
Cohesion: 0.10
Nodes (31): world, signTexture(), makeOozeMaterial(), ARRIVAL_FROM_WELL, broadcast(), build(), buildGrate(), buildHatch() (+23 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.08
Nodes (34): updateListener(), LIGHT_MODE, enableDesktop(), setDesktopFacing(), clearLevel(), updateLightPool(), setLevelMusic(), buildHands() (+26 more)

### Community 14 - "memory.js"
Cohesion: 0.12
Nodes (25): dailyDate(), dailyKey(), diffOf(), getDiff(), isDaily(), recordKey(), makeLavaMaterial(), createGhost() (+17 more)

### Community 15 - "Auth Client"
Cohesion: 0.13
Nodes (24): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+16 more)

### Community 16 - "Hotel Level"
Cohesion: 0.07
Nodes (54): heartbeat(), stinger(), addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom() (+46 more)

### Community 17 - "games.js"
Cohesion: 0.09
Nodes (24): addComputers(), ensureAssets(), makeDread(), AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_GENERATOR, ARRIVAL_FROM_INFECTION, ARRIVAL_FROM_KOTH (+16 more)

### Community 18 - "hideseek.js"
Cohesion: 0.11
Nodes (31): step(), TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), catchPlayer() (+23 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (31): addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys(), buildWalls() (+23 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (27): createGridMaze(), addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+19 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (29): addInstancedBlocks(), createEvents(), near(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts() (+21 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.08
Nodes (39): buildMachineTerminal(), LOBBY_MOVE_SCALE, addBlobAO(), flashlight, PIPE_CYL, UNIT_CYL, attachGorillaMachine(), detachGorillaMachine() (+31 more)

### Community 24 - "createRaceMode"
Cohesion: 0.26
Nodes (13): elapsedSince(), createRaceMode(), build(), drawHud(), guestFinish(), handleFinish(), onNet(), roundOver() (+5 more)

### Community 25 - "emotes.js"
Cohesion: 0.29
Nodes (5): _e, EMOTE, EMOTES, _pq, _q

### Community 26 - "levelReward"
Cohesion: 0.13
Nodes (35): addBones(), bumpStat(), capped(), checkCompletionist(), checkCounters(), checkStatAchievements(), claimLoginReward(), confirmGift() (+27 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.10
Nodes (25): addRoleTag(), roleLabel(), ULTIMATE_SCALE, onLookChange(), addStaticBody(), buildDoor(), ARRIVAL, ARRIVAL_GAMES (+17 more)

### Community 29 - "handleGuest"
Cohesion: 0.20
Nodes (17): banList(), bannedNamesList(), canKick(), checkIntruder(), cleanRouted(), connById(), handleGuest(), isBannedName() (+9 more)

### Community 30 - "buildDoor"
Cohesion: 0.13
Nodes (15): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+7 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (26): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+18 more)

### Community 32 - "blindtag.js"
Cohesion: 0.17
Nodes (19): BOT, botThink(), catchPlayer(), drawHud(), fmt(), info, localCaught(), onNet() (+11 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.20
Nodes (15): SAVE, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel(), owned() (+7 more)

### Community 34 - "treasure.js"
Cohesion: 0.17
Nodes (23): clampScore(), nearTarget(), num(), pastFinishLine(), TOL, validHead(), validIndex(), ARRIVAL_FROM_TREASURE (+15 more)

### Community 35 - "Dodgeball"
Cohesion: 0.17
Nodes (23): aliveIn(), BALL_X, botsThink(), build(), buildArena(), buildBall(), checkEnd(), checkHits() (+15 more)

### Community 36 - "pause.js"
Cohesion: 0.16
Nodes (19): CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause() (+11 more)

### Community 37 - "vrmenu.js"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.08
Nodes (42): DESKTOP, addCrispBlock(), addShaderEdges(), addPortal(), animateMonster(), bag(), build(), buildCeiling() (+34 more)

### Community 39 - "generator.js"
Cohesion: 0.06
Nodes (80): applyLighting(), A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen(), GENS (+72 more)

### Community 40 - "Statues Level"
Cohesion: 0.15
Nodes (23): setMusicMute(), fromNet(), dispose(), ARRIVAL_FROM_STATUES, build(), buildHall(), checkEnd(), dispose() (+15 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "core_engine_three"
Cohesion: 0.19
Nodes (17): addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam, disposeFx() (+9 more)

### Community 43 - "redlight.js"
Cohesion: 0.26
Nodes (16): myId(), broadcast(), drawHud(), fmt(), fromNet(), guestFinish(), handleFinish(), info (+8 more)

### Community 44 - "workshop.js"
Cohesion: 0.06
Nodes (69): accept(), acceptors, LEVEL_DATA, MAX_BYTES, payload(), providers, register(), size() (+61 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.19
Nodes (20): createBot(), stepBot(), applyEvent(), bots, botThink(), build(), buildArena(), drawHud() (+12 more)

### Community 46 - "lava.js"
Cohesion: 0.13
Nodes (23): tex, createJumpscare(), seenIntros, buildMannequin(), ARRIVAL_FROM_LAVA, build(), build(), buildArena() (+15 more)

### Community 47 - "range.js"
Cohesion: 0.13
Nodes (27): updateVrMenu(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d (+19 more)

### Community 48 - "core_engine_three"
Cohesion: 0.09
Nodes (20): boxAt(), buildComputerDesk(), L, captureEnvironment(), cubeLuminance(), referenceLuminance(), head, hp (+12 more)

### Community 49 - "Mannequin"
Cohesion: 0.16
Nodes (25): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+17 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (18): addBody(), addConstraint(), GROUP, physicsMat, ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope(), buildBalls() (+10 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.22
Nodes (18): recordScore(), cameraPanel(), panelBg(), ARRIVAL_FROM_LASTTILE, build(), buildHall(), buildTiles(), checkEnd() (+10 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "levels.js"
Cohesion: 0.11
Nodes (16): DIFF_ORDER, DIFFS, visitorsHere(), CARDS, AR, ARRIVAL_FROM_HOTEL, ARRIVAL_FROM_LAUNDRY, ARRIVAL_FROM_MAZE (+8 more)

### Community 55 - "race.js"
Cohesion: 0.15
Nodes (29): isGrounded(), outcomeReward(), raceOutcome(), registerFinish(), stepPhase(), ARRIVAL_FROM_RACE, broadcast(), build() (+21 more)

### Community 56 - "toast"
Cohesion: 0.09
Nodes (60): bell(), fuse(), buzz(), updateHighFive(), drawInstructions(), introSeen(), takeRespawn(), knockMe() (+52 more)

### Community 57 - "potato.js"
Cohesion: 0.23
Nodes (19): headOf(), applyEvent(), bots, botsThink(), build(), buildArena(), drawBomb(), drawHud() (+11 more)

### Community 58 - "engine.js"
Cohesion: 0.08
Nodes (31): GFX, blobAOMat, camera, headLamp, hemi, lighting, playerRig, renderer (+23 more)

### Community 59 - "ui.js"
Cohesion: 0.22
Nodes (10): sendRouted(), PRESENCE, GOLD, OK_COL, board, drawScoreboard(), fmtTime(), modeName() (+2 more)

### Community 60 - "isOwned"
Cohesion: 0.28
Nodes (16): activeRoleTags(), buyItem(), giftable(), hiddenRoleTags(), isEquipped(), isFeatured(), isLocked(), isOwned() (+8 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "startJoin"
Cohesion: 0.18
Nodes (24): giftsLeft(), answerCall(), callPeer(), electNewHost(), hostStatus(), kickPlayer(), leaveNetwork(), meshVoice() (+16 more)

### Community 64 - "maze.js"
Cohesion: 0.12
Nodes (32): scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+24 more)

### Community 65 - "hauntedui.js"
Cohesion: 0.15
Nodes (12): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, MONO (+4 more)

### Community 66 - "gorillamachine.js"
Cohesion: 0.21
Nodes (12): basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem(), STAFF_HINTS (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.10
Nodes (23): cannon-es, peerjs, playwright, three, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0 (+15 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 69 - "wardrobe.js"
Cohesion: 0.20
Nodes (16): emotePose(), ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), build(), cycleEmote(), info, ownedEmotes() (+8 more)

### Community 70 - "trainingdummy.js"
Cohesion: 0.22
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

### Community 71 - "drawGames"
Cohesion: 0.24
Nodes (10): topTimes(), drawEcg(), drawEye(), curMode(), drawGames(), modesOf(), pickCat(), pickMode() (+2 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.14
Nodes (11): check(), done(), evil(), goodMap(), mainJs, rm, ROOT, BAD (+3 more)

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
Cohesion: 0.13
Nodes (11): defs, HERE, num(), range(), ROOT, achievements, bad, ids (+3 more)

### Community 77 - "sendLevelMsg"
Cohesion: 0.29
Nodes (12): sendLevelMsg(), broadcast(), toNet(), broadcast(), broadcast(), broadcast(), broadcast(), broadcast() (+4 more)

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
Nodes (27): buildMonsterSkin(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, broadcast(), catchPlayer(), dispose(), drawHud(), duct() (+19 more)

### Community 84 - "tx"
Cohesion: 0.33
Nodes (9): dailyOn(), drawCard(), drawGlass(), mmss(), sp(), tx(), drawScreen(), drawWall() (+1 more)

### Community 85 - "stepDread"
Cohesion: 0.67
Nodes (3): stepDread(), update(), update()

### Community 86 - "hostState"
Cohesion: 0.25
Nodes (8): isModMenuUser(), hostState(), isHiddenFrom(), isHostId(), otherPlayers(), isAuthority(), isAuthority(), isAuth()

### Community 87 - "update"
Cohesion: 0.47
Nodes (6): caught(), faceScare(), isAuthority(), localPull(), randomScare(), update()

### Community 88 - "registry.js"
Cohesion: 0.50
Nodes (3): DIFF_LEVEL_IDS, LEVEL_BY_ID, RECORD_DEFS

## Knowledge Gaps
- **27 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 686 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05137844611528822 - nodes in this community are weakly interconnected._
- **Why does `three` connect `Dependencies` to `maze.js`, `textures.js`, `silence.js`, `Furas Bot`, `Avatar & Badges`, `well.js`, `Graphics & Lighting`, `lava.js`, `memory.js`, `core_engine_three`, `Mannequin`, `Cemetery Level`, `Lobby & Physics Bodies`, `engine.js`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.05505279034690799 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `textures.js`, `silence.js`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `hideseek.js`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `createRaceMode`, `levelReward`, `Role Tags & Lobby Door`, `Banana Mode`, `blindtag.js`, `emotepanel.js`, `treasure.js`, `Dodgeball`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `redlight.js`, `workshop.js`, `setPlayerPosition`, `lava.js`, `range.js`, `core_engine_three`, `Last Tile`, `levels.js`, `race.js`, `potato.js`, `engine.js`, `ui.js`, `isOwned`, `startJoin`, `maze.js`, `gorillamachine.js`, `wardrobe.js`, `trainingdummy.js`, `drawGames`, `monster.js`, `update`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `textures.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07182524990744169 - nodes in this community are weakly interconnected._