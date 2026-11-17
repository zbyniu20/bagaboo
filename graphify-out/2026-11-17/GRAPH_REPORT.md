# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 90 files · ~217,866 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2066 nodes · 7028 edges · 73 communities (71 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03e26fd0`
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
- Stats & Achievement Checks
- Tests & Module Imports
- Audio Engine
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
- setPlayerPosition
- emotepanel.js
- monster.js
- Ambience
- Role Tags & Lobby Door
- startJoin
- createHead
- Banana Mode
- Hide and Seek
- gorillamachine.js
- Round Kit
- Dodgeball
- Mod State & Volumes
- Bot Kit & Potato
- addCrispBlock
- buzz
- Statues Level
- Mod Menu
- Liquids & Visuals
- Blind Tag
- Race Mode
- King of the Hill
- monsterskins.js
- Physics & Swing Run
- Training Dummy
- Mannequin
- Infection Mode
- Docs: Accounts & Rules
- Last Tile
- Red Light
- Lava Level
- Terminal Pointers
- handleGuest
- hostState
- engine.js
- ui.js
- emotes.js
- Murals
- buildDoor
- highfive.js
- Cosmetics
- Records & Daily Keys
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- camera
- Memory Tests

## God Nodes (most connected - your core abstractions)
1. `toast()` - 237 edges
2. `addCrispBlock()` - 104 edges
3. `buzz()` - 92 edges
4. `makeCanvas()` - 87 edges
5. `mkRng()` - 85 edges
6. `buildDoor()` - 81 edges
7. `toTex()` - 72 edges
8. `levelReward()` - 67 edges
9. `setPlayerPosition()` - 67 edges
10. `cameraPanel()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js
- `build()` --calls--> `isInvitedToStaff()`  [EXTRACTED]
  levels/staff.js → core/network.js
- `SCREECH` --calls--> `toast()`  [EXTRACTED]
  levels/hotel.js → core/terminal.js
- `pickBones()` --calls--> `mkRng()`  [EXTRACTED]
  levels/catacombs.js → core/textures.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (73 total, 2 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (49): getAudioContext(), SESSION, emoteState(), containBall(), animateFaces(), attachMic(), audioEls, bannedNames (+41 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (87): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, addBones(), buyItem(), capped(), checkCounters(), claimLoginReward() (+79 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.07
Nodes (69): burntTexture(), faceTexture(), jacketTexture(), rustDoorTexture(), createMural(), ANISO(), crackWalk(), createBandageTexture() (+61 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (52): attachMic(), micLevel(), rewardActivity(), near(), addDoorPortal(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE (+44 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (35): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+27 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (45): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+37 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.09
Nodes (29): ARM_GEO, BADGES, badgeTex, cosTex, createAvatar(), createGorillaArm(), createRealHand(), _dir (+21 more)

### Community 7 - "wardrobe.js"
Cohesion: 0.21
Nodes (14): LOBBY_MOVE_SCALE, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), cycleEmote(), info, ownedEmotes(), panel (+6 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (41): cross, DESKTOP, enableDesktop(), help, keys, _o, _q, updateDesktop() (+33 more)

### Community 9 - "Stats & Achievement Checks"
Cohesion: 0.12
Nodes (38): bumpStat(), checkCompletionist(), checkStatAchievements(), levelReward(), pruneDaily(), recordTime(), unlockAchievement(), doEmote() (+30 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.05
Nodes (34): ./core/audio.js, ./core/avatar.js, ./core/config.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js (+26 more)

### Community 11 - "Audio Engine"
Cohesion: 0.12
Nodes (39): ballHit(), beep(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f (+31 more)

### Community 12 - "Well Level & Level Messages"
Cohesion: 0.10
Nodes (38): signTexture(), makeOozeMaterial(), sendLevelMsg(), ARRIVAL_FROM_WELL, broadcast(), build(), buildGrate(), buildHatch() (+30 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.08
Nodes (31): setAmbience(), stopLoops(), updateListener(), LIGHT_MODE, setDesktopFacing(), hasSave(), applyLighting(), clearLevel() (+23 more)

### Community 14 - "memory.js"
Cohesion: 0.14
Nodes (19): diffOf(), createEvents(), ARRIVAL_FROM_MEMORY, build(), buildBeast(), buildBurnFx(), buildCave(), buildDecor() (+11 more)

### Community 15 - "Auth Client"
Cohesion: 0.09
Nodes (34): account(), API_URL, b64uToBytes(), call(), errorText(), finish(), isLoggedIn(), listeners (+26 more)

### Community 16 - "Hotel Level"
Cohesion: 0.08
Nodes (37): setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe(), dispose(), drawHud() (+29 more)

### Community 17 - "games.js"
Cohesion: 0.05
Nodes (76): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, IS_QUEST, dailyOn(), setDailyMode(), setDiff() (+68 more)

### Community 18 - "Maze Level"
Cohesion: 0.11
Nodes (35): addCollider(), addInstancedBlocks(), scaleBoxUVs(), ARRIVAL_FROM_MAZE, addLamp(), bfs(), build(), buildCage() (+27 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (26): createGridMaze(), addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+18 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (27): animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms(), buildShell() (+19 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (25): ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+17 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (25): AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers(), buildGate() (+17 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.10
Nodes (38): addBlobAO(), addStaticBody(), flashlight, PIPE_CYL, UNIT_CYL, detachGorillaMachine(), triggerGooby(), buildTrainingDummy() (+30 more)

### Community 24 - "setPlayerPosition"
Cohesion: 0.12
Nodes (40): bell(), fuse(), drawInstructions(), introSeen(), takeRespawn(), isGrounded(), setPlayerPosition(), createRaceMode() (+32 more)

### Community 25 - "emotepanel.js"
Cohesion: 0.18
Nodes (15): close(), closeEmotePanel(), _d, mesh, openPanel(), owned(), _p, panel (+7 more)

### Community 26 - "monster.js"
Cohesion: 0.07
Nodes (57): buildMonsterSkin(), myId(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, ARRIVAL_FROM_RANGE, broadcast(), catchPlayer(), dispose() (+49 more)

### Community 27 - "Ambience"
Cohesion: 0.11
Nodes (28): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+20 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (26): addRoleTag(), animateFace(), placeArm(), poseHand(), roleLabel(), ULTIMATE_SCALE, onLookChange(), ARRIVAL (+18 more)

### Community 29 - "startJoin"
Cohesion: 0.18
Nodes (24): giftsLeft(), answerCall(), callPeer(), electNewHost(), hostStatus(), kickPlayer(), leaveNetwork(), meshVoice() (+16 more)

### Community 30 - "createHead"
Cohesion: 0.23
Nodes (15): bakeShade(), buildBadge(), buildGlasses(), buildHat(), buildMask(), createGorillaTorso(), createHead(), createNameSprite() (+7 more)

### Community 31 - "Banana Mode"
Cohesion: 0.14
Nodes (25): BASES, botThink(), broadcast(), buildArena(), buildBanana(), carrying(), drawHud(), endRound() (+17 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.13
Nodes (28): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud() (+20 more)

### Community 33 - "gorillamachine.js"
Cohesion: 0.20
Nodes (13): emotePose(), attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh(), resetTry() (+5 more)

### Community 34 - "Round Kit"
Cohesion: 0.24
Nodes (16): ARRIVAL_FROM_TREASURE, BOXES, broadcast(), build(), buildArena(), drawHud(), endRound(), fmt() (+8 more)

### Community 35 - "Dodgeball"
Cohesion: 0.17
Nodes (23): handsOf(), aliveIn(), BALL_X, botsThink(), broadcast(), buildArena(), checkEnd(), checkHits() (+15 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.11
Nodes (27): applyVolumes(), CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh (+19 more)

### Community 37 - "Bot Kit & Potato"
Cohesion: 0.20
Nodes (20): createBot(), headOf(), ARRIVAL_FROM_POTATO, applyEvent(), bots, botsThink(), broadcast(), drawBomb() (+12 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.08
Nodes (46): addCrispBlock(), animateMonster(), bag(), build(), buildCeiling(), buildDryer(), buildGate(), buildGlimpse() (+38 more)

### Community 39 - "buzz"
Cohesion: 0.14
Nodes (28): heartbeat(), stepBot(), buzz(), releaseAll(), caught(), think(), caught(), think() (+20 more)

### Community 40 - "Statues Level"
Cohesion: 0.10
Nodes (35): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+27 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): isModMenuUser(), bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture() (+17 more)

### Community 42 - "Liquids & Visuals"
Cohesion: 0.16
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 43 - "Blind Tag"
Cohesion: 0.15
Nodes (22): panelBg(), BOT, botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), info (+14 more)

### Community 44 - "Race Mode"
Cohesion: 0.17
Nodes (22): ARRIVAL_FROM_RACE, broadcast(), build(), buildCourse(), buildHall(), checkpoint(), clamp(), drawHud() (+14 more)

### Community 45 - "King of the Hill"
Cohesion: 0.18
Nodes (21): isAuthority(), toNet(), ARRIVAL_FROM_KOTH, applyEvent(), bots, botThink(), broadcast(), buildArena() (+13 more)

### Community 46 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

### Community 47 - "Physics & Swing Run"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, buildBall(), ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope() (+11 more)

### Community 48 - "Training Dummy"
Cohesion: 0.17
Nodes (8): ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose, info, mode, OOZE, update

### Community 49 - "Mannequin"
Cohesion: 0.15
Nodes (26): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+18 more)

### Community 50 - "Infection Mode"
Cohesion: 0.19
Nodes (21): fromNet(), _p, participants(), touching(), ARRIVAL_FROM_INFECTION, applyEvent(), bots, botsThink() (+13 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.22
Nodes (19): recordScore(), ARRIVAL_FROM_LASTTILE, broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud() (+11 more)

### Community 53 - "Red Light"
Cohesion: 0.25
Nodes (17): ARRIVAL_FROM_REDLIGHT, broadcast(), drawHud(), fmt(), fromNet(), handleFinish(), info, isAuth() (+9 more)

### Community 54 - "Lava Level"
Cohesion: 0.18
Nodes (16): makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c (+8 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (17): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+9 more)

### Community 56 - "handleGuest"
Cohesion: 0.26
Nodes (12): banList(), bannedNamesList(), checkIntruder(), cleanRouted(), handleGuest(), isBannedName(), kickConn(), readMap() (+4 more)

### Community 57 - "hostState"
Cohesion: 0.19
Nodes (13): canPunish(), updateHammer(), canKick(), connById(), hostState(), isHiddenFrom(), isHostId(), otherPlayers() (+5 more)

### Community 58 - "engine.js"
Cohesion: 0.09
Nodes (25): SAVE, addShaderEdges(), blobAOMat, headLamp, hemi, lighting, renderer, scene (+17 more)

### Community 59 - "ui.js"
Cohesion: 0.24
Nodes (9): sendRouted(), PRESENCE, AMBER_DIM, board, drawScoreboard(), fmtTime(), modeName(), shopUi (+1 more)

### Community 60 - "emotes.js"
Cohesion: 0.25
Nodes (6): _e, EMOTE, EMOTES, playEmote(), _pq, _q

### Community 61 - "Murals"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 62 - "buildDoor"
Cohesion: 0.12
Nodes (32): buildDoor(), cameraPanel(), createJumpscare(), buildMannequin(), onLevelMsg(), dispose(), build(), dispose() (+24 more)

### Community 63 - "highfive.js"
Cohesion: 0.29
Nodes (6): _a, _b, cool, HF, playersState, remoteAvatars

### Community 64 - "Cosmetics"
Cohesion: 0.28
Nodes (12): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat(), extraHat() (+4 more)

### Community 65 - "Records & Daily Keys"
Cohesion: 0.32
Nodes (9): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), createGhost(), NOOP (+1 more)

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
Cohesion: 0.28
Nodes (8): buildHammer(), hammerTextures(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 72 - "camera"
Cohesion: 0.12
Nodes (14): GFX, box, c, errors, mesh, origError, tx, updateDebug() (+6 more)

## Knowledge Gaps
- **30 isolated node(s):** `./core/device.js`, `./main.js`, `./core/engine.js`, `./core/economy.js`, `./core/emotes.js` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 562 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Stats & Achievement Checks` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `wardrobe.js`, `Audio Engine`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `setPlayerPosition`, `emotepanel.js`, `monster.js`, `Ambience`, `Role Tags & Lobby Door`, `startJoin`, `Banana Mode`, `Hide and Seek`, `gorillamachine.js`, `Round Kit`, `Dodgeball`, `Bot Kit & Potato`, `addCrispBlock`, `buzz`, `Statues Level`, `Mod Menu`, `Blind Tag`, `Race Mode`, `King of the Hill`, `Training Dummy`, `Infection Mode`, `Last Tile`, `Red Light`, `Lava Level`, `Terminal Pointers`, `hostState`, `engine.js`, `ui.js`, `buildDoor`, `highfive.js`, `Records & Daily Keys`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `./core/device.js`, `./main.js`, `./core/engine.js` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.04850964348334307 - nodes in this community are weakly interconnected._
- **Why does `three` connect `games.js` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Dependencies`, `Furas Bot`, `Avatar & Badges`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Mannequin`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `engine.js`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.05286006128702758 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.0700152207001522 - nodes in this community are weakly interconnected._