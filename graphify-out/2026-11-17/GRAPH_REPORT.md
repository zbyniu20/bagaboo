# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 92 files · ~221,753 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2095 nodes · 7162 edges · 84 communities (83 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de55249d`
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
- levelReward
- Tests & Module Imports
- audio.js
- Well Level & Level Messages
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
- emotepanel.js
- monster.js
- levels.js
- Role Tags & Lobby Door
- startJoin
- buildDoor
- Banana Mode
- Hide and Seek
- gorillamachine.js
- Round Kit
- Dodgeball
- Mod State & Volumes
- range.js
- addCrispBlock
- toast
- Statues Level
- Mod Menu
- Liquids & Visuals
- Blind Tag
- engine.js
- setPlayerPosition
- monsterskins.js
- lava.js
- Training Dummy
- Mannequin
- infection.js
- Docs: Accounts & Rules
- Last Tile
- Red Light
- addCrispBlock
- Terminal Pointers
- handleGuest
- potato.js
- xrperf.js
- core_engine_three
- isOwned
- Murals
- hammer.js
- ambience.js
- Cosmetics
- creak
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- buzz
- debug.js
- createGhost
- desktop.js
- music.js
- registry.mjs
- ui.js
- tx
- drawGames
- goToLevel
- emotes.js
- registry.js
- scripts

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
  levels/range.js → core/network.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (84 total, 1 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (52): getAudioContext(), animateFace(), animateFaces(), answerCall(), attachMic(), audioEls, bannedNames, bodyState() (+44 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (64): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, addBones(), capped(), checkCounters(), claimLoginReward(), confirmGift() (+56 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.07
Nodes (69): addComputers(), ensureAssets(), plateTexture(), rustDoorTexture(), ANISO(), crackWalk(), createBandageTexture(), _createBloodPoolTexture() (+61 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (52): attachMic(), rewardActivity(), near(), addDoorPortal(), isOnRope(), releaseRope(), avoidObstacles(), BALLS (+44 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (36): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+28 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (45): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+37 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.07
Nodes (51): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHat(), buildMask() (+43 more)

### Community 7 - "wardrobe.js"
Cohesion: 0.19
Nodes (15): LOBBY_MOVE_SCALE, AMBER, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), cycleEmote(), info, ownedEmotes() (+7 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.09
Nodes (32): poseHand(), track(), containBall(), capMul(), poseRemoteHands(), sendObjectMove(), anchorVel, anchorWall (+24 more)

### Community 9 - "levelReward"
Cohesion: 0.19
Nodes (20): bumpStat(), checkCompletionist(), checkStatAchievements(), levelReward(), pruneDaily(), recordTime(), unlockAchievement(), unlockItem() (+12 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (29): ./core/audio.js, ./core/avatar.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js (+21 more)

### Community 11 - "audio.js"
Cohesion: 0.12
Nodes (38): ballHit(), beep(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f (+30 more)

### Community 12 - "Well Level & Level Messages"
Cohesion: 0.11
Nodes (31): scaleBoxUVs(), signTexture(), makeOozeMaterial(), build(), buildGrate(), buildHatch(), buildHolds(), buildHud() (+23 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (39): updateListener(), errorText(), GFX, LIGHT_MODE, setDesktopFacing(), hasSave(), markNickVerified(), applyLighting() (+31 more)

### Community 14 - "memory.js"
Cohesion: 0.13
Nodes (17): diffOf(), createEvents(), ARRIVAL_FROM_MEMORY, build(), buildBurnFx(), buildCave(), buildTrack(), _c (+9 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (23): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+15 more)

### Community 16 - "Hotel Level"
Cohesion: 0.08
Nodes (44): addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe(), dispose() (+36 more)

### Community 17 - "games.js"
Cohesion: 0.08
Nodes (22): AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_GENERATOR, ARRIVAL_FROM_HIDESEEK, ARRIVAL_FROM_KOTH, ARRIVAL_FROM_MONSTER (+14 more)

### Community 18 - "Maze Level"
Cohesion: 0.13
Nodes (25): ARRIVAL_FROM_MAZE, addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+17 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (27): tex, createGridMaze(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+19 more)

### Community 20 - "Hospital Level"
Cohesion: 0.10
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (30): animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys(), buildStations(), caught() (+22 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.10
Nodes (24): addInstancedBlocks(), takeRespawn(), AISLES_X, AISLES_Z, animate(), buildDecor(), buildRelics(), CRYPTS (+16 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.09
Nodes (42): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addBlobAO(), addStaticBody(), flashlight, PIPE_CYL (+34 more)

### Community 24 - "levelkit.js"
Cohesion: 0.25
Nodes (18): drawInstructions(), introSeen(), panelBg(), isGrounded(), createRaceMode(), broadcast(), build(), drawHud() (+10 more)

### Community 25 - "emotepanel.js"
Cohesion: 0.18
Nodes (16): CATALOG, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel(), owned() (+8 more)

### Community 26 - "monster.js"
Cohesion: 0.07
Nodes (54): buildMonsterSkin(), myId(), setAvatarHidden(), broadcast(), buildArena(), catchPlayer(), dispose(), drawHud() (+46 more)

### Community 27 - "levels.js"
Cohesion: 0.09
Nodes (19): DIFF_ORDER, DIFFS, visitorsHere(), CARDS, AR, ARRIVAL_FROM_CATACOMBS, ARRIVAL_FROM_FURAS, ARRIVAL_FROM_HOSPITAL (+11 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (26): addRoleTag(), placeArm(), roleLabel(), ULTIMATE_SCALE, onLookChange(), emoteState(), ARRIVAL, ARRIVAL_GAMES (+18 more)

### Community 29 - "startJoin"
Cohesion: 0.18
Nodes (24): randomNonce(), giftsLeft(), cleanRouted(), electNewHost(), handleGuest(), hostStatus(), kickConn(), kickPlayer() (+16 more)

### Community 30 - "buildDoor"
Cohesion: 0.10
Nodes (35): createBot(), buildDoor(), cameraPanel(), createJumpscare(), seenIntros, buildMannequin(), onLevelMsg(), dispose() (+27 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (30): applyEvent(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+22 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.14
Nodes (27): BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), fromNet() (+19 more)

### Community 33 - "gorillamachine.js"
Cohesion: 0.20
Nodes (13): emotePose(), attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh(), resetTry() (+5 more)

### Community 34 - "Round Kit"
Cohesion: 0.17
Nodes (20): sendLevelMsg(), toNet(), ARRIVAL_FROM_TREASURE, broadcast(), broadcast(), BOXES, broadcast(), build() (+12 more)

### Community 35 - "Dodgeball"
Cohesion: 0.17
Nodes (24): handsOf(), aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall() (+16 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.16
Nodes (19): applyVolumes(), applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause() (+11 more)

### Community 37 - "range.js"
Cohesion: 0.12
Nodes (28): updateVrMenu(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d (+20 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.11
Nodes (26): addPortal(), animateMonster(), canSee(), caught(), cellOf(), COLORS, drawHud(), findPath() (+18 more)

### Community 39 - "toast"
Cohesion: 0.11
Nodes (39): bell(), fuse(), micLevel(), toast(), takeKey(), wakeWarden(), takeRelic(), wakeDigger() (+31 more)

### Community 40 - "Statues Level"
Cohesion: 0.17
Nodes (23): setMusicMute(), broadcast(), build(), buildHall(), checkEnd(), dispose(), drawHud(), endRound() (+15 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): isModMenuUser(), bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture() (+17 more)

### Community 42 - "Liquids & Visuals"
Cohesion: 0.16
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 43 - "Blind Tag"
Cohesion: 0.14
Nodes (23): hands, isAuthority(), _p, BOT, botThink(), broadcast(), catchPlayer(), drawHud() (+15 more)

### Community 44 - "engine.js"
Cohesion: 0.11
Nodes (20): addShaderEdges(), blobAOMat, headLamp, hemi, playerRig, renderer, scene, sun (+12 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.24
Nodes (17): setPlayerPosition(), fromNet(), applyEvent(), bots, botThink(), drawHud(), endRound(), fmt() (+9 more)

### Community 46 - "monsterskins.js"
Cohesion: 0.32
Nodes (12): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+4 more)

### Community 47 - "lava.js"
Cohesion: 0.09
Nodes (34): addBody(), addConstraint(), GROUP, physicsMat, makeLavaMaterial(), ARRIVAL_FROM_LAVA, ARRIVAL_FROM_SWINGRUN, build() (+26 more)

### Community 48 - "Training Dummy"
Cohesion: 0.17
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.15
Nodes (26): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+18 more)

### Community 50 - "infection.js"
Cohesion: 0.19
Nodes (22): participants(), touching(), ARRIVAL_FROM_INFECTION, applyEvent(), bots, botsThink(), broadcast(), build() (+14 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.22
Nodes (19): recordScore(), ARRIVAL_FROM_LASTTILE, broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud() (+11 more)

### Community 53 - "Red Light"
Cohesion: 0.23
Nodes (19): ARRIVAL_FROM_REDLIGHT, broadcast(), build(), buildHall(), drawHud(), fmt(), fromNet(), handleFinish() (+11 more)

### Community 54 - "addCrispBlock"
Cohesion: 0.13
Nodes (23): addCrispBlock(), buildCrypts(), buildYard(), buildArena(), bag(), build(), buildCeiling(), buildDryer() (+15 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (17): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+9 more)

### Community 56 - "handleGuest"
Cohesion: 0.21
Nodes (13): banList(), bannedNamesList(), canKick(), checkIntruder(), connById(), isBannedName(), nameOf(), nameOfPlayer() (+5 more)

### Community 57 - "potato.js"
Cohesion: 0.20
Nodes (20): stepBot(), L, headOf(), applyEvent(), bots, botsThink(), broadcast(), drawBomb() (+12 more)

### Community 58 - "xrperf.js"
Cohesion: 0.27
Nodes (9): lighting, apply(), GOV, govern(), resizeShadow(), st, startXrPerf(), stopXrPerf() (+1 more)

### Community 59 - "core_engine_three"
Cohesion: 0.14
Nodes (13): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, makeDread() (+5 more)

### Community 60 - "isOwned"
Cohesion: 0.20
Nodes (21): buyItem(), equipItem(), giftable(), isEquipped(), isFeatured(), isLocked(), isOwned(), lockText() (+13 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "hammer.js"
Cohesion: 0.22
Nodes (9): canPunish(), SAVE, head, hp, prev, q, updateHammer(), requestMod() (+1 more)

### Community 63 - "ambience.js"
Cohesion: 0.16
Nodes (20): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+12 more)

### Community 64 - "Cosmetics"
Cohesion: 0.28
Nodes (12): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat(), extraHat() (+4 more)

### Community 65 - "creak"
Cohesion: 0.14
Nodes (21): bang(), creak(), startEvent(), crunchBones(), makeNoise(), setWardrobe(), enter(), knock() (+13 more)

### Community 66 - "VR Menu"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.21
Nodes (12): cannon-es, peerjs, playwright, three, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0 (+4 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 70 - "Gooby"
Cohesion: 0.24
Nodes (9): buildHammer(), hammerTextures(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp() (+1 more)

### Community 71 - "buzz"
Cohesion: 0.19
Nodes (19): heartbeat(), buzz(), updateHighFive(), releaseAll(), caught(), caught(), caught(), caught() (+11 more)

### Community 72 - "debug.js"
Cohesion: 0.12
Nodes (14): box, c, errors, mesh, origError, tx, updateDebug(), camera (+6 more)

### Community 73 - "createGhost"
Cohesion: 0.25
Nodes (13): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), mmss() (+5 more)

### Community 74 - "desktop.js"
Cohesion: 0.15
Nodes (11): cross, DESKTOP, enableDesktop(), help, keys, _o, _q, updateDesktop() (+3 more)

### Community 75 - "music.js"
Cohesion: 0.26
Nodes (11): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+3 more)

### Community 76 - "registry.mjs"
Cohesion: 0.17
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 77 - "ui.js"
Cohesion: 0.24
Nodes (9): sendRouted(), PRESENCE, BAD_COL, board, drawScoreboard(), fmtTime(), modeName(), shopUi (+1 more)

### Community 78 - "tx"
Cohesion: 0.28
Nodes (9): drawCard(), drawGlass(), sp(), stepDread(), tx(), wrapText(), update(), drawWall() (+1 more)

### Community 79 - "drawGames"
Cohesion: 0.32
Nodes (8): drawEcg(), drawEye(), curMode(), drawGames(), modesOf(), pickCat(), pickMode(), play()

### Community 80 - "goToLevel"
Cohesion: 0.33
Nodes (7): dailyOn(), dailySeed(), setRunSeed(), sendFollow(), goToLevel(), nextFrames(), showLoading()

### Community 81 - "emotes.js"
Cohesion: 0.29
Nodes (5): _e, EMOTE, EMOTES, _pq, _q

### Community 82 - "registry.js"
Cohesion: 0.50
Nodes (3): DIFF_LEVEL_IDS, LEVEL_BY_ID, RECORD_DEFS

### Community 83 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, registry, smoke, test

## Knowledge Gaps
- **26 isolated node(s):** `./core/device.js`, `./main.js`, `./core/engine.js`, `./core/economy.js`, `./core/emotes.js` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 566 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `wardrobe.js`, `levelReward`, `audio.js`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `levelkit.js`, `emotepanel.js`, `monster.js`, `levels.js`, `Role Tags & Lobby Door`, `startJoin`, `buildDoor`, `Banana Mode`, `Hide and Seek`, `gorillamachine.js`, `Round Kit`, `Dodgeball`, `range.js`, `addCrispBlock`, `Statues Level`, `Mod Menu`, `Blind Tag`, `setPlayerPosition`, `lava.js`, `Training Dummy`, `infection.js`, `Last Tile`, `Red Light`, `addCrispBlock`, `Terminal Pointers`, `potato.js`, `isOwned`, `hammer.js`, `creak`, `buzz`, `debug.js`, `createGhost`, `ui.js`, `drawGames`, `goToLevel`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `./core/device.js`, `./main.js`, `./core/engine.js` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Why does `addCrispBlock()` connect `addCrispBlock` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `Avatar & Badges`, `wardrobe.js`, `Well Level & Level Messages`, `memory.js`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `levelkit.js`, `monster.js`, `levels.js`, `buildDoor`, `Banana Mode`, `Hide and Seek`, `Round Kit`, `Dodgeball`, `range.js`, `addCrispBlock`, `toast`, `Statues Level`, `Blind Tag`, `engine.js`, `setPlayerPosition`, `lava.js`, `Training Dummy`, `Mannequin`, `infection.js`, `Last Tile`, `Red Light`, `potato.js`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.05780885780885781 - nodes in this community are weakly interconnected._
- **Why does `three` connect `Dependencies` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Furas Bot`, `Avatar & Badges`, `engine.js`, `Well Level & Level Messages`, `memory.js`, `Graphics & Lighting`, `Mannequin`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`, `buildDoor`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.07394366197183098 - nodes in this community are weakly interconnected._