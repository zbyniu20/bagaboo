# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 91 files · ~221,577 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2091 nodes · 7136 edges · 73 communities (71 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b903dea6`
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
- markAllDirty
- Banana Mode
- Hide and Seek
- ui.js
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
- Race Mode
- koth.js
- monsterskins.js
- Physics & Swing Run
- Training Dummy
- Mannequin
- infection.js
- Docs: Accounts & Rules
- Last Tile
- Red Light
- Lava Level
- Terminal Pointers
- handleGuest
- hostState
- xrperf.js
- core_engine_three
- isOwned
- Murals
- hammer.js
- getAudioContext
- Cosmetics
- buildCourse
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- debug.js
- Memory Tests

## God Nodes (most connected - your core abstractions)
1. `toast()` - 247 edges
2. `addCrispBlock()` - 106 edges
3. `buzz()` - 94 edges
4. `mkRng()` - 85 edges
5. `makeCanvas()` - 84 edges
6. `buildDoor()` - 83 edges
7. `setPlayerPosition()` - 70 edges
8. `toTex()` - 69 edges
9. `levelReward()` - 69 edges
10. `cameraPanel()` - 59 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `build()` --calls--> `isInvitedToStaff()`  [EXTRACTED]
  levels/staff.js → core/network.js
- `pickBones()` --calls--> `mkRng()`  [EXTRACTED]
  levels/catacombs.js → core/textures.js
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

## Communities (73 total, 2 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (49): animateFace(), lookKey(), poseHand(), BANS_CLEARED, isModMenuUser(), isReservedNick(), emotePose(), emoteState() (+41 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (49): ACHIEVEMENTS, ACTIVITY, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS, DIFF_ORDER (+41 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.07
Nodes (73): rustDoorTexture(), lavaTex(), ANISO(), crackWalk(), createBandageTexture(), _createBloodPoolTexture(), createBloodPoolTexture, createCamoTexture() (+65 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (52): attachMic(), micLevel(), rewardActivity(), near(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE, avoidObstacles() (+44 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (34): ADMIN_NAMES, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName(), isOwnerName() (+26 more)

### Community 5 - "Furas Bot"
Cohesion: 0.08
Nodes (42): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+34 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.07
Nodes (52): addRoleTag(), ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer() (+44 more)

### Community 7 - "wardrobe.js"
Cohesion: 0.19
Nodes (15): LOBBY_MOVE_SCALE, BAD_COL, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), cycleEmote(), info, ownedEmotes() (+7 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (36): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), capMul() (+28 more)

### Community 9 - "levelReward"
Cohesion: 0.16
Nodes (25): checkCompletionist(), dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), levelReward(), pruneDaily() (+17 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.05
Nodes (34): ./core/audio.js, ./core/avatar.js, ./core/config.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js (+26 more)

### Community 11 - "audio.js"
Cohesion: 0.06
Nodes (72): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+64 more)

### Community 12 - "Well Level & Level Messages"
Cohesion: 0.10
Nodes (38): scaleBoxUVs(), signTexture(), makeOozeMaterial(), broadcast(), build(), buildGrate(), buildHatch(), buildHolds() (+30 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (39): updateListener(), errorText(), enableDesktop(), setDesktopFacing(), hasSave(), markNickVerified(), onLookChange(), applyLighting() (+31 more)

### Community 14 - "memory.js"
Cohesion: 0.12
Nodes (22): diffOf(), lighting, createEvents(), KINDS, _p, createJumpscare(), makeLavaMaterial(), build() (+14 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (23): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+15 more)

### Community 16 - "Hotel Level"
Cohesion: 0.08
Nodes (39): stepBot(), addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe() (+31 more)

### Community 17 - "games.js"
Cohesion: 0.08
Nodes (33): drawEcg(), drawEye(), makeDread(), visitorsHere(), AR, ARRIVAL_FROM_KOTH, ARRIVAL_FROM_MONSTER, ARRIVAL_FROM_POTATO (+25 more)

### Community 18 - "Maze Level"
Cohesion: 0.12
Nodes (32): LIGHT_PRESETS, addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+24 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (26): createGridMaze(), addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+18 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (25): ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+17 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (28): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+20 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.11
Nodes (35): addBlobAO(), addStaticBody(), attachGorillaMachine(), detachGorillaMachine(), triggerGooby(), buildTrainingDummy(), bullseye(), hitDummy() (+27 more)

### Community 24 - "levelkit.js"
Cohesion: 0.20
Nodes (19): camera, addDoorPortal(), panelBg(), seenIntros, isGrounded(), createRaceMode(), broadcast(), build() (+11 more)

### Community 25 - "emotepanel.js"
Cohesion: 0.09
Nodes (30): bumpStat(), checkStatAchievements(), close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel() (+22 more)

### Community 26 - "monster.js"
Cohesion: 0.13
Nodes (25): buildMonsterSkin(), setAvatarHidden(), broadcast(), catchPlayer(), dispose(), drawHud(), fmt(), fromNet() (+17 more)

### Community 27 - "levels.js"
Cohesion: 0.10
Nodes (29): dailyOn(), topTimes(), drawCard(), drawGlass(), ensureAssets(), mmss(), sp(), stepDread() (+21 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.11
Nodes (20): buildHat(), ULTIMATE_SCALE, GFX, ARRIVAL, ARRIVAL_GAMES, ARRIVAL_LAUNDRY, ARRIVAL_LEVELS, ARRIVAL_SILENCE (+12 more)

### Community 29 - "startJoin"
Cohesion: 0.18
Nodes (24): giftsLeft(), answerCall(), callPeer(), electNewHost(), hostStatus(), kickPlayer(), leaveNetwork(), meshVoice() (+16 more)

### Community 30 - "markAllDirty"
Cohesion: 0.15
Nodes (26): addBones(), capped(), checkCounters(), claimLoginReward(), confirmGift(), ensureDaily(), equipItem(), findItem() (+18 more)

### Community 31 - "Banana Mode"
Cohesion: 0.12
Nodes (30): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+22 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.13
Nodes (25): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), drawHud(), fmt() (+17 more)

### Community 33 - "ui.js"
Cohesion: 0.13
Nodes (20): basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem(), STAFF_HINTS (+12 more)

### Community 34 - "Round Kit"
Cohesion: 0.26
Nodes (15): BOXES, broadcast(), build(), buildArena(), drawHud(), endRound(), fmt(), info (+7 more)

### Community 35 - "Dodgeball"
Cohesion: 0.17
Nodes (24): aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall(), checkEnd() (+16 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.16
Nodes (19): applyVolumes(), CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh (+11 more)

### Community 37 - "range.js"
Cohesion: 0.14
Nodes (25): ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), clearTargets(), _d, drawBoard(), drawHud() (+17 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.08
Nodes (43): addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildGlimpse(), buildGrid(), buildHall() (+35 more)

### Community 39 - "toast"
Cohesion: 0.06
Nodes (89): bell(), fuse(), heartbeat(), roar(), scare(), stinger(), buzz(), cameraPanel() (+81 more)

### Community 40 - "Statues Level"
Cohesion: 0.09
Nodes (38): setMusicMute(), onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+30 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "Liquids & Visuals"
Cohesion: 0.18
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 43 - "Blind Tag"
Cohesion: 0.11
Nodes (26): sendLevelMsg(), toNet(), BOT, botThink(), broadcast(), catchPlayer(), drawHud(), fmt() (+18 more)

### Community 44 - "Race Mode"
Cohesion: 0.23
Nodes (18): myId(), broadcast(), build(), drawHud(), fmt(), fromNet(), handleFinish(), info (+10 more)

### Community 45 - "koth.js"
Cohesion: 0.12
Nodes (32): step(), drawInstructions(), introSeen(), takeRespawn(), hostState(), isAuthority(), think(), update() (+24 more)

### Community 46 - "monsterskins.js"
Cohesion: 0.40
Nodes (10): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+2 more)

### Community 47 - "Physics & Swing Run"
Cohesion: 0.07
Nodes (34): addBody(), addConstraint(), addShaderEdges(), blobAOMat, flashlight, GROUP, headLamp, hemi (+26 more)

### Community 48 - "Training Dummy"
Cohesion: 0.17
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.16
Nodes (26): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+18 more)

### Community 50 - "infection.js"
Cohesion: 0.10
Nodes (47): createBot(), fromNet(), handsOf(), headOf(), _p, participants(), touching(), think() (+39 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.24
Nodes (16): recordScore(), ARRIVAL_FROM_LASTTILE, build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound() (+8 more)

### Community 53 - "Red Light"
Cohesion: 0.26
Nodes (17): broadcast(), build(), drawHud(), fmt(), fromNet(), handleFinish(), info, isAuth() (+9 more)

### Community 54 - "Lava Level"
Cohesion: 0.15
Nodes (21): addCrispBlock(), buildDoor(), buildDividers(), buildGate(), buildRoom(), ARRIVAL_FROM_LAVA, buildGate(), build() (+13 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 56 - "handleGuest"
Cohesion: 0.23
Nodes (13): randomNonce(), banList(), bannedNamesList(), checkIntruder(), cleanRouted(), handleGuest(), isBannedName(), kickConn() (+5 more)

### Community 57 - "hostState"
Cohesion: 0.24
Nodes (11): canPunish(), updateHammer(), canKick(), connById(), isHiddenFrom(), isHostId(), otherPlayers(), performMod() (+3 more)

### Community 58 - "xrperf.js"
Cohesion: 0.18
Nodes (13): renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), SETTINGS, apply(), GOV, govern() (+5 more)

### Community 59 - "core_engine_three"
Cohesion: 0.12
Nodes (19): boxAt(), buildComputerDesk(), buildMachineTerminal(), IS_QUEST, L, tex, addComputers(), AMB (+11 more)

### Community 60 - "isOwned"
Cohesion: 0.28
Nodes (16): activeRoleTags(), buyItem(), giftable(), hiddenRoleTags(), isEquipped(), isFeatured(), isLocked(), isOwned() (+8 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "hammer.js"
Cohesion: 0.14
Nodes (12): SAVE, scene, head, hp, prev, q, _c, ensurePool() (+4 more)

### Community 63 - "getAudioContext"
Cohesion: 0.24
Nodes (9): getAudioContext(), attachMic(), getHub(), resumeVoiceAc(), startVoiceWatch(), tryPlay(), unlockVoices(), voiceDebug() (+1 more)

### Community 64 - "Cosmetics"
Cohesion: 0.25
Nodes (13): LP, at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat() (+5 more)

### Community 65 - "buildCourse"
Cohesion: 0.67
Nodes (4): buildCourse(), checkpoint(), clamp(), slab()

### Community 66 - "VR Menu"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 67 - "Dependencies"
Cohesion: 0.18
Nodes (13): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.160.0 (+5 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 70 - "Gooby"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 72 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

## Knowledge Gaps
- **30 isolated node(s):** `./core/audio.js`, `./core/avatar.js`, `./core/config.js`, `./core/device.js`, `./core/economy.js` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 567 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `wardrobe.js`, `levelReward`, `audio.js`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `levelkit.js`, `emotepanel.js`, `monster.js`, `levels.js`, `Role Tags & Lobby Door`, `startJoin`, `markAllDirty`, `Banana Mode`, `Hide and Seek`, `ui.js`, `Round Kit`, `Dodgeball`, `range.js`, `addCrispBlock`, `Statues Level`, `Mod Menu`, `Blind Tag`, `Race Mode`, `koth.js`, `Training Dummy`, `infection.js`, `Last Tile`, `Red Light`, `Lava Level`, `Terminal Pointers`, `hostState`, `isOwned`, `hammer.js`, `buildCourse`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `./core/audio.js`, `./core/avatar.js`, `./core/config.js` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05012531328320802 - nodes in this community are weakly interconnected._
- **Why does `three` connect `Cemetery Level` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Dependencies`, `Furas Bot`, `Avatar & Badges`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Physics & Swing Run`, `Mannequin`, `Maze Level`, `Lobby & Physics Bodies`, `levelkit.js`, `core_engine_three`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.054901960784313725 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.06801093643198906 - nodes in this community are weakly interconnected._