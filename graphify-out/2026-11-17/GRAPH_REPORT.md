# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 92 files · ~215,468 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2054 nodes · 6992 edges · 77 communities (75 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Network & Host Identity
- Economy & Achievements
- Procedural Textures & Jumpscares
- Mic, Rewards & Rope
- Config & Staff Names
- Furas Bot
- Avatar & Badges
- Gorilla Machine & Punish
- Desktop Mode
- Stats & Achievement Checks
- Tests & Module Imports
- Audio Engine
- Well Level & Level Messages
- Graphics & Lighting
- Monster Skins
- Auth Client
- Hotel Level
- Level Cards & Games Salon
- Maze Level
- Catacombs Level
- Hospital Level
- Nursery Level
- Cemetery Level
- Lobby & Physics Bodies
- Level Kit & Intros
- Emote Panel
- Range Level
- Ambience
- Role Tags & Lobby Door
- Computer Desk & Engine
- Monster Level
- Banana Mode
- Hide and Seek
- Daily Mode & Difficulty
- Round Kit
- Dodgeball
- Mod State & Volumes
- Bot Kit & Potato
- Laundry Level
- Horror Sound Cues
- Statues Level
- Mod Menu
- Liquids & Visuals
- Blind Tag
- Race Mode
- King of the Hill
- Texture Library
- Physics & Swing Run
- Training Dummy
- Mannequin
- Infection Mode
- Docs: Accounts & Rules
- Last Tile
- Red Light
- Lava Level
- Terminal Pointers
- Music
- Race Mode Host
- Environment Capture
- Device & Haunted UI
- Events & XR Perf
- Murals
- Level Message Dispose
- Laundry Props
- Cosmetics
- Records & Daily Keys
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- Net Helpers
- Debug Overlay
- Card Drawing
- Door & Flashlight Builders
- Machines
- Memory Tests

## God Nodes (most connected - your core abstractions)
1. `toast()` - 237 edges
2. `addCrispBlock()` - 104 edges
3. `buzz()` - 92 edges
4. `makeCanvas()` - 87 edges
5. `mkRng()` - 84 edges
6. `buildDoor()` - 82 edges
7. `toTex()` - 72 edges
8. `levelReward()` - 67 edges
9. `setPlayerPosition()` - 67 edges
10. `cameraPanel()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `WEEPER` --calls--> `stepBot()`  [EXTRACTED]
  levels/hotel.js → core/botkit.js
- `slab()` --calls--> `addCrispBlock()`  [EXTRACTED]
  levels/swingrun.js → core/engine.js
- `dispose()` --calls--> `onLevelMsg()`  [EXTRACTED]
  levels/treasure.js → core/network.js
- `SCREECH` --calls--> `toast()`  [EXTRACTED]
  levels/hotel.js → core/terminal.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]

## Communities (77 total, 2 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (90): getAudioContext(), randomNonce(), vouch(), animateFace(), lookKey(), isModMenuUser(), emotePose(), emoteState() (+82 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (67): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, buyItem(), CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave() (+59 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.09
Nodes (58): addComputers(), ensureAssets(), plateTexture(), createJumpscare(), rustDoorTexture(), lavaTex(), crackWalk(), createBandageTexture() (+50 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (55): attachMic(), micLevel(), rewardActivity(), near(), cameraPanel(), isOnRope(), releaseRope(), avoidObstacles() (+47 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.09
Nodes (48): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+40 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (47): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+39 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.08
Nodes (47): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildMask(), burntTexture() (+39 more)

### Community 7 - "Gorilla Machine & Punish"
Cohesion: 0.08
Nodes (41): canPunish(), LOBBY_MOVE_SCALE, attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh() (+33 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (37): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), playerRig (+29 more)

### Community 9 - "Stats & Achievement Checks"
Cohesion: 0.13
Nodes (41): addBones(), bumpStat(), capped(), checkCompletionist(), checkCounters(), checkStatAchievements(), claimLoginReward(), confirmGift() (+33 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.05
Nodes (34): ./core/audio.js, ./core/avatar.js, ./core/config.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js (+26 more)

### Community 11 - "Audio Engine"
Cohesion: 0.11
Nodes (37): ballHit(), beep(), bumpThreat(), duckDrone(), ensureReverb(), env(), _f, goobyVoice() (+29 more)

### Community 12 - "Well Level & Level Messages"
Cohesion: 0.11
Nodes (38): signTexture(), makeOozeMaterial(), sendLevelMsg(), applyPull(), broadcast(), build(), buildGrate(), buildHatch() (+30 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.08
Nodes (35): updateListener(), GFX, LIGHT_MODE, enableDesktop(), setDesktopFacing(), applyLighting(), clearLevel(), _c (+27 more)

### Community 14 - "Monster Skins"
Cohesion: 0.10
Nodes (33): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+25 more)

### Community 15 - "Auth Client"
Cohesion: 0.10
Nodes (32): account(), API_URL, b64uToBytes(), call(), errorText(), finish(), isLoggedIn(), listeners (+24 more)

### Community 16 - "Hotel Level"
Cohesion: 0.10
Nodes (30): addCollider(), setFlashHolder(), box(), buildRoom(), buildWardrobe(), dispose(), drawHud(), dropRoom() (+22 more)

### Community 17 - "Level Cards & Games Salon"
Cohesion: 0.08
Nodes (29): drawEcg(), drawEye(), CARDS, AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_INFECTION, ARRIVAL_FROM_KOTH (+21 more)

### Community 18 - "Maze Level"
Cohesion: 0.13
Nodes (30): scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+22 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (28): diffOf(), createEvents(), addWarden(), animate(), BONES, build(), buildDecor(), buildKeys() (+20 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (29): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+21 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (28): ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+20 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (28): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+20 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.13
Nodes (29): addStaticBody(), place(), detachGorillaMachine(), updateTrainingDummy(), addScaryStep(), ARM_POSES, build(), buildBoneGrips() (+21 more)

### Community 24 - "Level Kit & Intros"
Cohesion: 0.14
Nodes (27): fuse(), addDoorPortal(), drawInstructions(), introSeen(), seenIntros, takeRespawn(), setPlayerPosition(), update() (+19 more)

### Community 25 - "Emote Panel"
Cohesion: 0.09
Nodes (25): CATALOG, close(), closeEmotePanel(), _d, mesh, openPanel(), owned(), _p (+17 more)

### Community 26 - "Range Level"
Cohesion: 0.13
Nodes (27): updateVrMenu(), ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d (+19 more)

### Community 27 - "Ambience"
Cohesion: 0.12
Nodes (27): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+19 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.10
Nodes (24): addRoleTag(), buildHat(), roleLabel(), ULTIMATE_SCALE, onLookChange(), ARRIVAL, ARRIVAL_GAMES, ARRIVAL_LAUNDRY (+16 more)

### Community 29 - "Computer Desk & Engine"
Cohesion: 0.10
Nodes (23): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addBlobAO(), addShaderEdges(), blobAOMat, flashlight (+15 more)

### Community 30 - "Monster Level"
Cohesion: 0.14
Nodes (25): buildMonsterSkin(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, catchPlayer(), dispose(), drawHud(), duct(), fmt() (+17 more)

### Community 31 - "Banana Mode"
Cohesion: 0.14
Nodes (25): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+17 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.14
Nodes (24): TAGS, ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), catchPlayer(), drawHud(), fmt() (+16 more)

### Community 33 - "Daily Mode & Difficulty"
Cohesion: 0.10
Nodes (22): dailyOn(), DIFF_ORDER, DIFFS, setDailyMode(), setDiff(), mmss(), visitorsHere(), AR (+14 more)

### Community 34 - "Round Kit"
Cohesion: 0.15
Nodes (23): camera, L, fromNet(), isAuthority(), _p, toNet(), ARRIVAL_FROM_TREASURE, BOXES (+15 more)

### Community 35 - "Dodgeball"
Cohesion: 0.17
Nodes (24): handsOf(), aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall() (+16 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.13
Nodes (22): applyVolumes(), applyBrightness(), BOOST_MULT, FLY_SPEED, MOD, bDownAt, changed(), closePause() (+14 more)

### Community 37 - "Bot Kit & Potato"
Cohesion: 0.19
Nodes (22): createBot(), stepBot(), headOf(), applyEvent(), bots, botsThink(), broadcast(), build() (+14 more)

### Community 38 - "Laundry Level"
Cohesion: 0.10
Nodes (22): addPortal(), animateMonster(), canSee(), cellOf(), COLORS, drawHud(), findPath(), fmt() (+14 more)

### Community 39 - "Horror Sound Cues"
Cohesion: 0.17
Nodes (23): bell(), heartbeat(), roar(), stinger(), buzz(), applyEvent(), crunchBones(), makeNoise() (+15 more)

### Community 40 - "Statues Level"
Cohesion: 0.17
Nodes (21): panelBg(), setMusicMute(), build(), buildHall(), checkEnd(), dispose(), drawHud(), endRound() (+13 more)

### Community 41 - "Mod Menu"
Cohesion: 0.15
Nodes (22): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+14 more)

### Community 42 - "Liquids & Visuals"
Cohesion: 0.16
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 43 - "Blind Tag"
Cohesion: 0.16
Nodes (20): BOT, botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), info, localCaught() (+12 more)

### Community 44 - "Race Mode"
Cohesion: 0.20
Nodes (21): broadcast(), build(), buildCourse(), checkpoint(), clamp(), drawHud(), fmt(), fromNet() (+13 more)

### Community 45 - "King of the Hill"
Cohesion: 0.20
Nodes (20): touching(), applyEvent(), bots, botThink(), broadcast(), build(), buildArena(), drawHud() (+12 more)

### Community 46 - "Texture Library"
Cohesion: 0.10
Nodes (19): ANISO(), createBloodPoolTexture, createCloudLayerTexture, createCobwebTexture, createEyeballTexture(), createFloorRoughTexture(), _createHazardTexture(), createHazardTexture (+11 more)

### Community 47 - "Physics & Swing Run"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope(), createEyeball() (+11 more)

### Community 48 - "Training Dummy"
Cohesion: 0.13
Nodes (14): triggerGooby(), buildTrainingDummy(), bullseye(), hitDummy(), setSign(), signTexture(), ARRIVAL_FROM_TOWERCLIMB, build (+6 more)

### Community 49 - "Mannequin"
Cohesion: 0.19
Nodes (19): seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg(), buildMannequin() (+11 more)

### Community 50 - "Infection Mode"
Cohesion: 0.22
Nodes (19): participants(), applyEvent(), bots, botsThink(), broadcast(), build(), buildArena(), drawHud() (+11 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.23
Nodes (18): recordScore(), broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound() (+10 more)

### Community 53 - "Red Light"
Cohesion: 0.25
Nodes (18): broadcast(), build(), buildHall(), drawHud(), fmt(), fromNet(), handleFinish(), info (+10 more)

### Community 54 - "Lava Level"
Cohesion: 0.18
Nodes (16): makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c (+8 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 56 - "Music"
Cohesion: 0.17
Nodes (15): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+7 more)

### Community 57 - "Race Mode Host"
Cohesion: 0.23
Nodes (17): hostState(), isGrounded(), createRaceMode(), broadcast(), build(), drawHud(), handleFinish(), onNet() (+9 more)

### Community 58 - "Environment Capture"
Cohesion: 0.17
Nodes (11): SAVE, scene, captureEnvironment(), cubeLuminance(), referenceLuminance(), head, hp, prev (+3 more)

### Community 59 - "Device & Haunted UI"
Cohesion: 0.14
Nodes (13): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, makeDread() (+5 more)

### Community 60 - "Events & XR Perf"
Cohesion: 0.19
Nodes (12): lighting, renderer, KINDS, _p, apply(), GOV, govern(), resizeShadow() (+4 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "Level Message Dispose"
Cohesion: 0.13
Nodes (15): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+7 more)

### Community 63 - "Laundry Props"
Cohesion: 0.23
Nodes (14): addCrispBlock(), build(), buildCeiling(), buildDryer(), buildGate(), buildGlimpse(), buildGrid(), buildHall() (+6 more)

### Community 64 - "Cosmetics"
Cohesion: 0.28
Nodes (12): at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat(), extraHat() (+4 more)

### Community 65 - "Records & Daily Keys"
Cohesion: 0.29
Nodes (10): dailyDate(), dailyKey(), fmtDuration(), getDiff(), recordKey(), topTimes(), createGhost(), NOOP (+2 more)

### Community 66 - "VR Menu"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.19
Nodes (12): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, name (+4 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 70 - "Gooby"
Cohesion: 0.24
Nodes (9): buildHammer(), hammerTextures(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp() (+1 more)

### Community 71 - "Net Helpers"
Cohesion: 0.20
Nodes (10): myId(), fromNet(), onNet(), startedPlay(), broadcast(), fromNet(), toNet(), broadcast() (+2 more)

### Community 72 - "Debug Overlay"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 73 - "Card Drawing"
Cohesion: 0.28
Nodes (9): drawCard(), drawGlass(), sp(), stepDread(), tx(), wrapText(), update(), drawWall() (+1 more)

### Community 74 - "Door & Flashlight Builders"
Cohesion: 0.25
Nodes (9): buildDoor(), buildGate(), buildDoors(), build(), buildAlcove(), buildFlashlight(), makeMats(), toggleFlash() (+1 more)

### Community 75 - "Machines"
Cohesion: 0.47
Nodes (6): bag(), buildMachines(), instBlock(), instPart(), machine(), openDrum()

## Knowledge Gaps
- **30 isolated node(s):** `./core/device.js`, `./main.js`, `./core/engine.js`, `./core/economy.js`, `./core/emotes.js` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 562 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Stats & Achievement Checks` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `Gorilla Machine & Punish`, `Audio Engine`, `Well Level & Level Messages`, `Graphics & Lighting`, `Monster Skins`, `Hotel Level`, `Level Cards & Games Salon`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Level Kit & Intros`, `Emote Panel`, `Range Level`, `Ambience`, `Role Tags & Lobby Door`, `Monster Level`, `Banana Mode`, `Hide and Seek`, `Daily Mode & Difficulty`, `Round Kit`, `Dodgeball`, `Bot Kit & Potato`, `Laundry Level`, `Horror Sound Cues`, `Statues Level`, `Mod Menu`, `Blind Tag`, `Race Mode`, `King of the Hill`, `Training Dummy`, `Infection Mode`, `Last Tile`, `Red Light`, `Lava Level`, `Terminal Pointers`, `Race Mode Host`, `Environment Capture`, `Laundry Props`, `Records & Daily Keys`, `Net Helpers`, `Door & Flashlight Builders`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `./core/device.js`, `./main.js`, `./core/engine.js` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.04707070707070707 - nodes in this community are weakly interconnected._
- **Why does `addCrispBlock()` connect `Laundry Props` to `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `Avatar & Badges`, `Gorilla Machine & Punish`, `Well Level & Level Messages`, `Monster Skins`, `Level Cards & Games Salon`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Level Kit & Intros`, `Range Level`, `Computer Desk & Engine`, `Monster Level`, `Banana Mode`, `Hide and Seek`, `Daily Mode & Difficulty`, `Round Kit`, `Dodgeball`, `Bot Kit & Potato`, `Laundry Level`, `Statues Level`, `Blind Tag`, `Race Mode`, `King of the Hill`, `Physics & Swing Run`, `Training Dummy`, `Infection Mode`, `Last Tile`, `Red Light`, `Lava Level`, `Door & Flashlight Builders`, `Machines`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.05285592497868713 - nodes in this community are weakly interconnected._
- **Why does `three` connect `Computer Desk & Engine` to `Mic, Rewards & Rope`, `Dependencies`, `Furas Bot`, `Avatar & Badges`, `Well Level & Level Messages`, `Graphics & Lighting`, `Texture Library`, `Monster Skins`, `Mannequin`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Level Kit & Intros`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.09234365867913501 - nodes in this community are weakly interconnected._