# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 96 files · ~224,706 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2141 nodes · 7221 edges · 87 communities (84 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fc43600`
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
- textures.js
- Round Kit
- Dodgeball
- Mod State & Volumes
- range.js
- addCrispBlock
- toast
- Statues Level
- Mod Menu
- Liquids & Visuals
- blindtag.js
- engine.js
- setPlayerPosition
- monsterskins.js
- lava.js
- Training Dummy
- Mannequin
- swingrun.js
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
- toast
- VR Menu
- Dependencies
- Presence
- Terminal Widget
- Gooby
- buzz
- debug.js
- createGhost
- logic.mjs
- music.js
- registry.mjs
- ui.js
- stepDread
- drawGames
- markAllDirty
- static.mjs
- shop
- hostState
- node-setup.mjs
- build
- build

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

## Communities (87 total, 3 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (49): getAudioContext(), animateFace(), isReservedNick(), containBall(), animateFaces(), attachMic(), audioEls, bannedNames (+41 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.06
Nodes (36): ACHIEVEMENTS, ACTIVITY, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS, GIFT_LIMIT (+28 more)

### Community 2 - "Procedural Textures & Jumpscares"
Cohesion: 0.10
Nodes (50): burntTexture(), faceTexture(), jacketTexture(), ensureAssets(), rustDoorTexture(), lavaTex(), createMural(), createBandageTexture() (+42 more)

### Community 3 - "Mic, Rewards & Rope"
Cohesion: 0.08
Nodes (51): attachMic(), rewardActivity(), near(), addDoorPortal(), isOnRope(), releaseRope(), avoidObstacles(), BALLS (+43 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (35): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+27 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (44): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+36 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.08
Nodes (47): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHammer(), buildHat() (+39 more)

### Community 7 - "wardrobe.js"
Cohesion: 0.21
Nodes (14): LOBBY_MOVE_SCALE, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), cycleEmote(), info, ownedEmotes(), panel (+6 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (41): poseHand(), cross, DESKTOP, help, keys, _o, _q, updateDesktop() (+33 more)

### Community 9 - "levelReward"
Cohesion: 0.19
Nodes (21): bumpStat(), checkCompletionist(), checkCounters(), checkStatAchievements(), levelReward(), pruneDaily(), recordTime(), unlockAchievement() (+13 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (29): ./core/audio.js, ./core/avatar.js, ./core/device.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js (+21 more)

### Community 11 - "audio.js"
Cohesion: 0.09
Nodes (41): distortionCurve(), duckDrone(), ensureReverb(), env(), _f, goobyVoice(), growl(), hb (+33 more)

### Community 12 - "Well Level & Level Messages"
Cohesion: 0.11
Nodes (30): scaleBoxUVs(), signTexture(), makeOozeMaterial(), build(), buildGrate(), buildHatch(), buildHolds(), buildHud() (+22 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (38): updateListener(), errorText(), LIGHT_MODE, enableDesktop(), setDesktopFacing(), hasSave(), markNickVerified(), applyLighting() (+30 more)

### Community 14 - "memory.js"
Cohesion: 0.13
Nodes (19): diffOf(), lighting, createEvents(), KINDS, _p, ARRIVAL_FROM_MEMORY, build(), buildBeast() (+11 more)

### Community 15 - "Auth Client"
Cohesion: 0.14
Nodes (23): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+15 more)

### Community 16 - "Hotel Level"
Cohesion: 0.08
Nodes (45): setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe(), dispose(), drawHud() (+37 more)

### Community 17 - "games.js"
Cohesion: 0.08
Nodes (23): CARDS, AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_INFECTION, ARRIVAL_FROM_KOTH, ARRIVAL_FROM_LASTTILE (+15 more)

### Community 18 - "Maze Level"
Cohesion: 0.13
Nodes (24): ARRIVAL_FROM_MAZE, addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor(), buildHintsAndLights() (+16 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (33): createGridMaze(), addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+25 more)

### Community 20 - "Hospital Level"
Cohesion: 0.09
Nodes (28): addStatue(), animate(), bfsFrom(), build(), buildCards(), buildGate(), buildGrid(), buildRooms() (+20 more)

### Community 21 - "Nursery Level"
Cohesion: 0.08
Nodes (32): beep(), addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+24 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.10
Nodes (28): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+20 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.12
Nodes (30): addBlobAO(), addStaticBody(), detachGorillaMachine(), updateTrainingDummy(), addScaryStep(), ARM_POSES, build(), buildBoneGrips() (+22 more)

### Community 24 - "levelkit.js"
Cohesion: 0.29
Nodes (16): drawInstructions(), panelBg(), setPlayerPosition(), createRaceMode(), broadcast(), build(), drawHud(), handleFinish() (+8 more)

### Community 25 - "emotepanel.js"
Cohesion: 0.09
Nodes (27): CATALOG, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel(), owned() (+19 more)

### Community 26 - "monster.js"
Cohesion: 0.08
Nodes (45): buildMonsterSkin(), myId(), setAvatarHidden(), ARRIVAL_FROM_MONSTER, broadcast(), buildArena(), dispose(), drawHud() (+37 more)

### Community 27 - "levels.js"
Cohesion: 0.10
Nodes (20): dailyOn(), DIFF_ORDER, DIFFS, mmss(), visitorsHere(), AR, ARRIVAL_FROM_FURAS, ARRIVAL_FROM_HOTEL (+12 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (27): addRoleTag(), placeArm(), roleLabel(), ULTIMATE_SCALE, GFX, onLookChange(), emoteState(), ARRIVAL (+19 more)

### Community 29 - "startJoin"
Cohesion: 0.17
Nodes (28): randomNonce(), giftsLeft(), answerCall(), callPeer(), canKick(), cleanRouted(), handleGuest(), hostStatus() (+20 more)

### Community 30 - "buildDoor"
Cohesion: 0.12
Nodes (30): buildDoor(), cameraPanel(), createJumpscare(), seenIntros, buildMannequin(), onLevelMsg(), dispose(), dispose() (+22 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (29): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+21 more)

### Community 32 - "Hide and Seek"
Cohesion: 0.13
Nodes (26): TAGS, introSeen(), ARRIVAL_FROM_HIDESEEK, BOT, botSees(), broadcast(), drawHud(), fmt() (+18 more)

### Community 33 - "textures.js"
Cohesion: 0.11
Nodes (26): ANISO(), crackWalk(), createBloodPoolTexture, createCloudLayerTexture, createCobwebTexture, createDotTexture(), createEyeballTexture(), createFloorRoughTexture() (+18 more)

### Community 34 - "Round Kit"
Cohesion: 0.18
Nodes (20): L, sendLevelMsg(), ARRIVAL_FROM_TREASURE, broadcast(), BOXES, broadcast(), build(), buildArena() (+12 more)

### Community 35 - "Dodgeball"
Cohesion: 0.18
Nodes (23): aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall(), checkEnd() (+15 more)

### Community 36 - "Mod State & Volumes"
Cohesion: 0.09
Nodes (32): applyVolumes(), emotePose(), applyBrightness(), attachGorillaMachine(), basePose(), CATS, M, machineLook() (+24 more)

### Community 37 - "range.js"
Cohesion: 0.14
Nodes (25): ARRIVAL_FROM_RANGE, BOOTHS, build(), buildGun(), buildRoom(), clearTargets(), _d, dispose() (+17 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.10
Nodes (27): addPortal(), animateMonster(), bag(), buildCeiling(), buildMachines(), canSee(), cellOf(), COLORS (+19 more)

### Community 39 - "toast"
Cohesion: 0.16
Nodes (23): micLevel(), toNet(), ARRIVAL_FROM_GENERATOR, addNoise(), broadcast(), drawHud(), fmt(), genDone() (+15 more)

### Community 40 - "Statues Level"
Cohesion: 0.14
Nodes (26): recordScore(), camera, setMusicMute(), dispose(), roundOver(), broadcast(), buildHall(), checkEnd() (+18 more)

### Community 41 - "Mod Menu"
Cohesion: 0.14
Nodes (24): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+16 more)

### Community 42 - "Liquids & Visuals"
Cohesion: 0.16
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 43 - "blindtag.js"
Cohesion: 0.10
Nodes (46): createBot(), stepBot(), tex, handsOf(), headOf(), _p, participants(), touching() (+38 more)

### Community 44 - "engine.js"
Cohesion: 0.12
Nodes (19): boxAt(), buildComputerDesk(), buildMachineTerminal(), addCollider(), addShaderEdges(), blobAOMat, flashlight, headLamp (+11 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.23
Nodes (15): fromNet(), applyEvent(), bots, broadcast(), drawHud(), endRound(), fmt(), info (+7 more)

### Community 46 - "monsterskins.js"
Cohesion: 0.40
Nodes (10): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), mannequin(), MONSTER_SKINS (+2 more)

### Community 47 - "lava.js"
Cohesion: 0.17
Nodes (17): makeLavaMaterial(), ARRIVAL_FROM_LAVA, build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c (+9 more)

### Community 48 - "Training Dummy"
Cohesion: 0.13
Nodes (14): triggerGooby(), buildTrainingDummy(), bullseye(), hitDummy(), setSign(), signTexture(), ARRIVAL_FROM_TOWERCLIMB, build (+6 more)

### Community 49 - "Mannequin"
Cohesion: 0.17
Nodes (23): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+15 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (19): addBody(), addConstraint(), GROUP, physicsMat, ARRIVAL_FROM_SWINGRUN, rope(), addGutsRope(), createEyeball() (+11 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.23
Nodes (18): isAuthority(), broadcast(), build(), buildHall(), buildTiles(), checkEnd(), drawHud(), endRound() (+10 more)

### Community 53 - "Red Light"
Cohesion: 0.28
Nodes (16): broadcast(), drawHud(), fmt(), fromNet(), handleFinish(), info, isAuth(), onNet() (+8 more)

### Community 54 - "addCrispBlock"
Cohesion: 0.18
Nodes (15): addCrispBlock(), buildArena(), buildArena(), build(), buildDryer(), buildGate(), buildGlimpse(), buildGrid() (+7 more)

### Community 55 - "Terminal Pointers"
Cohesion: 0.11
Nodes (17): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+9 more)

### Community 56 - "handleGuest"
Cohesion: 0.21
Nodes (14): canPunish(), updateHammer(), banList(), bannedNamesList(), checkIntruder(), connById(), isBannedName(), performMod() (+6 more)

### Community 57 - "potato.js"
Cohesion: 0.24
Nodes (17): applyEvent(), bots, botsThink(), broadcast(), drawBomb(), drawHud(), endRound(), fmt() (+9 more)

### Community 58 - "xrperf.js"
Cohesion: 0.18
Nodes (13): renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), SETTINGS, apply(), GOV, govern() (+5 more)

### Community 59 - "core_engine_three"
Cohesion: 0.13
Nodes (15): IS_QUEST, addComputers(), AMB, AMBD, BEAT, BLOOD, BONE, ITAL (+7 more)

### Community 60 - "isOwned"
Cohesion: 0.26
Nodes (17): activeRoleTags(), buyItem(), equipItem(), giftable(), hiddenRoleTags(), isEquipped(), isFeatured(), isLocked() (+9 more)

### Community 61 - "Murals"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 62 - "hammer.js"
Cohesion: 0.13
Nodes (13): SAVE, scene, head, hp, prev, q, _c, ensurePool() (+5 more)

### Community 63 - "ambience.js"
Cohesion: 0.18
Nodes (18): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+10 more)

### Community 64 - "Cosmetics"
Cohesion: 0.25
Nodes (13): LP, at(), cache, dark(), EXTRA_BADGES, EXTRA_SKINS, extraGlasses(), extraGloveMat() (+5 more)

### Community 65 - "toast"
Cohesion: 0.11
Nodes (40): ballHit(), bang(), bell(), creak(), fuse(), startEvent(), takeRespawn(), toast() (+32 more)

### Community 66 - "VR Menu"
Cohesion: 0.26
Nodes (12): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.13
Nodes (17): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, name (+9 more)

### Community 68 - "Presence"
Cohesion: 0.33
Nodes (12): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE, retry() (+4 more)

### Community 70 - "Gooby"
Cohesion: 0.38
Nodes (6): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp()

### Community 71 - "buzz"
Cohesion: 0.12
Nodes (36): bumpThreat(), heartbeat(), roar(), scare(), step(), stinger(), buzz(), releaseAll() (+28 more)

### Community 72 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 73 - "createGhost"
Cohesion: 0.27
Nodes (11): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), createGhost() (+3 more)

### Community 74 - "logic.mjs"
Cohesion: 0.12
Nodes (15): check(), done(), b64u(), bad, forge(), ids, keys, lines (+7 more)

### Community 75 - "music.js"
Cohesion: 0.17
Nodes (14): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+6 more)

### Community 76 - "registry.mjs"
Cohesion: 0.17
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 77 - "ui.js"
Cohesion: 0.20
Nodes (11): nameOf(), nameOfPlayer(), sendRouted(), AMBER, BAD_COL, board, drawScoreboard(), fmtTime() (+3 more)

### Community 78 - "stepDread"
Cohesion: 0.67
Nodes (3): stepDread(), update(), update()

### Community 79 - "drawGames"
Cohesion: 0.22
Nodes (14): drawCard(), drawEcg(), drawEye(), drawGlass(), sp(), tx(), wrapText(), curMode() (+6 more)

### Community 80 - "markAllDirty"
Cohesion: 0.22
Nodes (19): addBones(), capped(), confirmGift(), ensureDaily(), findItem(), flushStats(), markCheater(), notifyLook() (+11 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "shop"
Cohesion: 0.23
Nodes (12): claimLoginReward(), loginRewardAmount(), loginStatus(), mdVal(), msToMidnight(), nextStreak(), questDef(), seasonActive() (+4 more)

### Community 83 - "hostState"
Cohesion: 0.29
Nodes (7): isModMenuUser(), hostState(), isHiddenFrom(), isHostId(), otherPlayers(), isAuthority(), tv

### Community 85 - "build"
Cohesion: 0.67
Nodes (3): isInvitedToStaff(), selfBan(), build()

## Knowledge Gaps
- **26 isolated node(s):** `./core/device.js`, `./main.js`, `./core/engine.js`, `./core/economy.js`, `./core/emotes.js` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 599 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `Procedural Textures & Jumpscares`, `Mic, Rewards & Rope`, `Config & Staff Names`, `Furas Bot`, `wardrobe.js`, `levelReward`, `audio.js`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `Maze Level`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `levelkit.js`, `emotepanel.js`, `monster.js`, `levels.js`, `Role Tags & Lobby Door`, `startJoin`, `buildDoor`, `Banana Mode`, `Hide and Seek`, `Round Kit`, `Dodgeball`, `Mod State & Volumes`, `range.js`, `addCrispBlock`, `toast`, `Statues Level`, `Mod Menu`, `blindtag.js`, `setPlayerPosition`, `lava.js`, `Training Dummy`, `Last Tile`, `Red Light`, `addCrispBlock`, `Terminal Pointers`, `handleGuest`, `potato.js`, `isOwned`, `hammer.js`, `buzz`, `createGhost`, `ui.js`, `drawGames`, `markAllDirty`, `hostState`, `build`, `build`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `./core/device.js`, `./main.js`, `./core/engine.js` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.049094097019286964 - nodes in this community are weakly interconnected._
- **Why does `three` connect `engine.js` to `textures.js`, `Mic, Rewards & Rope`, `Dependencies`, `Furas Bot`, `Avatar & Badges`, `Well Level & Level Messages`, `Graphics & Lighting`, `memory.js`, `Mannequin`, `Maze Level`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`, `buildDoor`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.06401137980085349 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Procedural Textures & Jumpscares` be split into smaller, more focused modules?**
  _Cohesion score 0.0996078431372549 - nodes in this community are weakly interconnected._