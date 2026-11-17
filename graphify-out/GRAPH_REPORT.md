# Graph Report - bagaboo  (2026-11-17)

## Corpus Check
- 107 files · ~236,445 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 2287 nodes · 7644 edges · 86 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90c0f483`
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
- drawInstructions
- highfive.js
- levelReward
- changed.mjs
- Role Tags & Lobby Door
- handleGuest
- buildDoor
- Banana Mode
- blindtag.js
- emotepanel.js
- core_engine_three
- Dodgeball
- pause.js
- Terminal
- addCrispBlock
- generator.js
- Statues Level
- Mod Menu
- core_engine_three
- redlight.js
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
- ensureDaily
- toast
- potato.js
- xrperf.js
- ui.js
- isOwned
- Murals
- startJoin
- ambience.js
- stinger
- hauntedui.js
- gorillamachine.js
- Dependencies
- Presence
- wardrobe.js
- Gooby
- drawGames
- rounds.mjs
- cosmetics.js
- logic.mjs
- music.js
- registry.mjs
- sendLevelMsg
- debug.js
- createGhost
- scene
- static.mjs
- hammer.js
- monster.js
- tx
- stepDread

## God Nodes (most connected - your core abstractions)
1. `toast()` - 252 edges
2. `addCrispBlock()` - 106 edges
3. `buzz()` - 96 edges
4. `mkRng()` - 86 edges
5. `makeCanvas()` - 85 edges
6. `buildDoor()` - 83 edges
7. `toTex()` - 73 edges
8. `setPlayerPosition()` - 72 edges
9. `levelReward()` - 71 edges
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

## Communities (86 total, 0 thin omitted)

### Community 0 - "Network & Host Identity"
Cohesion: 0.05
Nodes (39): animateFace(), containBall(), animateFaces(), audioEls, bannedNames, bodyState(), callAt, clientConnections (+31 more)

### Community 1 - "Economy & Achievements"
Cohesion: 0.05
Nodes (52): ACHIEVEMENTS, activeRoleTags(), ACTIVITY, CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS (+44 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (77): addComputers(), ensureAssets(), plateTexture(), rustDoorTexture(), lavaTex(), ANISO(), crackWalk(), createBandageTexture() (+69 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (50): attachMic(), micLevel(), rewardActivity(), isOnRope(), releaseRope(), avoidObstacles(), BALLS, broadcast() (+42 more)

### Community 4 - "Config & Staff Names"
Cohesion: 0.13
Nodes (36): ADMIN_NAMES, BANS_CLEARED, COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+28 more)

### Community 5 - "Furas Bot"
Cohesion: 0.07
Nodes (41): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+33 more)

### Community 6 - "Avatar & Badges"
Cohesion: 0.08
Nodes (46): ARM_GEO, BADGES, badgeTex, bakeShade(), buildBadge(), buildGlasses(), buildHat(), buildMask() (+38 more)

### Community 7 - "terminal.js"
Cohesion: 0.11
Nodes (16): ctrls, cursors, hits, initPointers(), lasers, _m, raycaster, redrawTerminals() (+8 more)

### Community 8 - "Desktop Mode"
Cohesion: 0.06
Nodes (37): cross, DESKTOP, help, keys, _o, _q, updateDesktop(), capMul() (+29 more)

### Community 9 - "infection.js"
Cohesion: 0.21
Nodes (20): participants(), applyEvent(), bots, botsThink(), broadcast(), build(), buildArena(), drawHud() (+12 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (30): ./core/audio.js, ./core/avatar.js, ./core/economy.js, ./core/emotes.js, ./core/engine.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/network.js (+22 more)

### Community 11 - "audio.js"
Cohesion: 0.09
Nodes (43): ballHit(), beep(), bumpThreat(), distortionCurve(), duckDrone(), ensureReverb(), env(), _f (+35 more)

### Community 12 - "well.js"
Cohesion: 0.10
Nodes (33): scaleBoxUVs(), signTexture(), makeOozeMaterial(), build(), buildGrate(), buildHatch(), buildHolds(), buildHud() (+25 more)

### Community 13 - "Graphics & Lighting"
Cohesion: 0.07
Nodes (39): updateListener(), errorText(), LIGHT_MODE, enableDesktop(), setDesktopFacing(), hasSave(), markNickVerified(), clearLevel() (+31 more)

### Community 14 - "memory.js"
Cohesion: 0.13
Nodes (20): makeLavaMaterial(), build(), buildBeast(), buildBurnFx(), buildCave(), buildDecor(), buildLava(), buildTrack() (+12 more)

### Community 15 - "Auth Client"
Cohesion: 0.13
Nodes (25): account(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login() (+17 more)

### Community 16 - "Hotel Level"
Cohesion: 0.05
Nodes (63): addCollider(), setFlashHolder(), box(), build(), buildFlashlight(), buildRoom(), buildWardrobe(), dispose() (+55 more)

### Community 17 - "games.js"
Cohesion: 0.07
Nodes (24): CARDS, AR, ARRIVAL_FROM_BLINDTAG, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_GENERATOR, ARRIVAL_FROM_HIDESEEK, ARRIVAL_FROM_INFECTION, ARRIVAL_FROM_KOTH (+16 more)

### Community 18 - "hideseek.js"
Cohesion: 0.14
Nodes (25): BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud(), fmt(), fromNet() (+17 more)

### Community 19 - "Catacombs Level"
Cohesion: 0.09
Nodes (26): createGridMaze(), addWarden(), animate(), BONES, build(), buildDecor(), buildGate(), buildKeys() (+18 more)

### Community 20 - "Hospital Level"
Cohesion: 0.07
Nodes (37): diffOf(), lighting, createEvents(), near(), KINDS, _p, build(), buildDividers() (+29 more)

### Community 21 - "Nursery Level"
Cohesion: 0.09
Nodes (25): ARRIVAL_FROM_NURSERY, addDoll(), animate(), build(), buildDecor(), buildDolls(), buildGate(), buildKeys() (+17 more)

### Community 22 - "Cemetery Level"
Cohesion: 0.09
Nodes (27): addInstancedBlocks(), AISLES_X, AISLES_Z, animate(), build(), buildCrypts(), buildDecor(), buildDiggers() (+19 more)

### Community 23 - "Lobby & Physics Bodies"
Cohesion: 0.12
Nodes (32): addBlobAO(), addStaticBody(), attachGorillaMachine(), detachGorillaMachine(), debugLobbyPlay(), lobbyDim(), buildTrainingDummy(), updateTrainingDummy() (+24 more)

### Community 24 - "drawInstructions"
Cohesion: 0.14
Nodes (31): step(), drawInstructions(), introSeen(), hostState(), isHostId(), isGrounded(), outcomeReward(), raceOutcome() (+23 more)

### Community 25 - "highfive.js"
Cohesion: 0.15
Nodes (11): _e, EMOTE, EMOTES, _pq, _q, _a, _b, cool (+3 more)

### Community 26 - "levelReward"
Cohesion: 0.18
Nodes (23): checkCompletionist(), checkCounters(), claimLoginReward(), confirmGift(), findItem(), levelReward(), pruneDaily(), receiveGift() (+15 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "Role Tags & Lobby Door"
Cohesion: 0.09
Nodes (27): addRoleTag(), placeArm(), poseHand(), roleLabel(), ULTIMATE_SCALE, onLookChange(), emoteState(), poseRemoteHands() (+19 more)

### Community 29 - "handleGuest"
Cohesion: 0.25
Nodes (15): isModMenuUser(), banList(), bannedNamesList(), checkIntruder(), connById(), handleGuest(), isBannedName(), isHiddenFrom() (+7 more)

### Community 30 - "buildDoor"
Cohesion: 0.12
Nodes (16): onLevelMsg(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose(), dispose() (+8 more)

### Community 31 - "Banana Mode"
Cohesion: 0.13
Nodes (27): BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying(), drawHud() (+19 more)

### Community 32 - "blindtag.js"
Cohesion: 0.13
Nodes (25): camera, handsOf(), isAuthority(), _p, toNet(), BOT, botThink(), broadcast() (+17 more)

### Community 33 - "emotepanel.js"
Cohesion: 0.16
Nodes (18): bumpStat(), checkStatAchievements(), close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel() (+10 more)

### Community 34 - "core_engine_three"
Cohesion: 0.06
Nodes (64): tex, seenIntros, clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL (+56 more)

### Community 35 - "Dodgeball"
Cohesion: 0.18
Nodes (22): aliveIn(), BALL_X, botsThink(), broadcast(), build(), buildArena(), buildBall(), checkEnd() (+14 more)

### Community 36 - "pause.js"
Cohesion: 0.16
Nodes (19): CATALOG, applyBrightness(), bDownAt, changed(), closePause(), _d, mesh, openPause() (+11 more)

### Community 37 - "Terminal"
Cohesion: 0.12
Nodes (14): Terminal, COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn() (+6 more)

### Community 38 - "addCrispBlock"
Cohesion: 0.09
Nodes (39): addCrispBlock(), addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildGate(), buildGlimpse() (+31 more)

### Community 39 - "generator.js"
Cohesion: 0.06
Nodes (82): applyLighting(), A, canCatch(), clamp01(), doneCount(), GATE_Z, gateOpen(), GENS (+74 more)

### Community 40 - "Statues Level"
Cohesion: 0.16
Nodes (18): setMusicMute(), fromNet(), dispose(), ARRIVAL_FROM_STATUES, checkEnd(), dispose(), drawHud(), endRound() (+10 more)

### Community 41 - "Mod Menu"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "core_engine_three"
Cohesion: 0.17
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 43 - "redlight.js"
Cohesion: 0.25
Nodes (18): myId(), broadcast(), drawHud(), fmt(), fromNet(), guestFinish(), handleFinish(), info (+10 more)

### Community 44 - "engine.js"
Cohesion: 0.10
Nodes (21): boxAt(), buildComputerDesk(), buildMachineTerminal(), LP, addShaderEdges(), blobAOMat, flashlight, headLamp (+13 more)

### Community 45 - "setPlayerPosition"
Cohesion: 0.18
Nodes (22): createBot(), stepBot(), L, applyEvent(), bots, botThink(), broadcast(), build() (+14 more)

### Community 46 - "lava.js"
Cohesion: 0.20
Nodes (15): build(), buildCourse(), buildHall(), buildLava(), buildMannequins(), _c, checkpoint(), drawHud() (+7 more)

### Community 47 - "buildDoor"
Cohesion: 0.18
Nodes (17): addDoorPortal(), buildDoor(), cameraPanel(), createJumpscare(), build(), build(), build(), build() (+9 more)

### Community 48 - "Training Dummy"
Cohesion: 0.12
Nodes (12): triggerGooby(), hitDummy(), setSign(), signTexture(), ARRIVAL_FROM_TOWERCLIMB, build, debug, dispose (+4 more)

### Community 49 - "Mannequin"
Cohesion: 0.15
Nodes (27): place(), seg(), UNIT_BOX, UNIT_SPHERE, V3(), ARM_POSES, buildArm(), buildLeg() (+19 more)

### Community 50 - "swingrun.js"
Cohesion: 0.13
Nodes (18): addBody(), addConstraint(), GROUP, physicsMat, ARRIVAL_FROM_SWINGRUN, addGutsRope(), createEyeball(), buildBalls() (+10 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "Last Tile"
Cohesion: 0.23
Nodes (17): recordScore(), panelBg(), ARRIVAL_FROM_LASTTILE, build(), buildHall(), buildTiles(), checkEnd(), drawHud() (+9 more)

### Community 53 - "generator.mjs"
Cohesion: 0.18
Nodes (4): bot, r, ROOT, src

### Community 54 - "levels.js"
Cohesion: 0.10
Nodes (21): dailyOn(), DIFF_ORDER, DIFFS, setDailyMode(), setDiff(), mmss(), AR, ARRIVAL_FROM_HOTEL (+13 more)

### Community 55 - "ensureDaily"
Cohesion: 0.30
Nodes (12): addBones(), capped(), ensureDaily(), flushStats(), msToMidnight(), questDef(), questProgress(), tick() (+4 more)

### Community 56 - "toast"
Cohesion: 0.10
Nodes (52): bell(), fuse(), buzz(), takeRespawn(), releaseAll(), setPlayerPosition(), toast(), applyEvent() (+44 more)

### Community 57 - "potato.js"
Cohesion: 0.21
Nodes (20): headOf(), touching(), applyEvent(), bots, botsThink(), broadcast(), build(), buildArena() (+12 more)

### Community 58 - "xrperf.js"
Cohesion: 0.16
Nodes (14): renderer, captureEnvironment(), cubeLuminance(), referenceLuminance(), hands, SETTINGS, apply(), GOV (+6 more)

### Community 59 - "ui.js"
Cohesion: 0.16
Nodes (13): nameOf(), nameOfPlayer(), otherPlayers(), sendRouted(), PRESENCE, board, drawScoreboard(), fmtTime() (+5 more)

### Community 60 - "isOwned"
Cohesion: 0.28
Nodes (17): buyItem(), equipItem(), isEquipped(), isFeatured(), isLocked(), isOwned(), lockText(), mdVal() (+9 more)

### Community 61 - "Murals"
Cohesion: 0.30
Nodes (14): bezPt(), bloodText(), createMural(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch() (+6 more)

### Community 62 - "startJoin"
Cohesion: 0.11
Nodes (35): getAudioContext(), lookKey(), giftsLeft(), answerCall(), attachMic(), callPeer(), canKick(), cleanRouted() (+27 more)

### Community 63 - "ambience.js"
Cohesion: 0.18
Nodes (18): aroundPlayer(), DEFS, last, loops, oneShot(), _p, _q, rnd() (+10 more)

### Community 64 - "stinger"
Cohesion: 0.13
Nodes (30): bang(), creak(), heartbeat(), stinger(), whisper(), startEvent(), think(), caught() (+22 more)

### Community 65 - "hauntedui.js"
Cohesion: 0.14
Nodes (13): IS_QUEST, AMB, AMBD, BEAT, BLOOD, BONE, ITAL, makeDread() (+5 more)

### Community 66 - "gorillamachine.js"
Cohesion: 0.22
Nodes (12): emotePose(), basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem() (+4 more)

### Community 67 - "Dependencies"
Cohesion: 0.10
Nodes (21): cannon-es, peerjs, playwright, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, name (+13 more)

### Community 68 - "Presence"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 69 - "wardrobe.js"
Cohesion: 0.18
Nodes (16): LOBBY_MOVE_SCALE, GOLD, ARRIVAL_WARDROBE, applyBlue(), baseAvatarPose(), build(), cycleEmote(), info (+8 more)

### Community 70 - "Gooby"
Cohesion: 0.24
Nodes (9): buildHammer(), hammerTextures(), CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp() (+1 more)

### Community 71 - "drawGames"
Cohesion: 0.24
Nodes (10): drawEcg(), drawEye(), visitorsHere(), curMode(), drawGames(), modesOf(), pickCat(), pickMode() (+2 more)

### Community 72 - "rounds.mjs"
Cohesion: 0.11
Nodes (9): check(), done(), IN, lob, ROOT, BAD, O, ROOT (+1 more)

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
Cohesion: 0.13
Nodes (11): defs, HERE, num(), range(), ROOT, achievements, bad, ids (+3 more)

### Community 77 - "sendLevelMsg"
Cohesion: 0.27
Nodes (10): sendLevelMsg(), goOut(), broadcast(), goOut(), broadcast(), broadcast(), drawIntro(), isAuthority() (+2 more)

### Community 78 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 79 - "createGhost"
Cohesion: 0.27
Nodes (11): dailyDate(), dailyKey(), fmtDuration(), getDiff(), isDaily(), recordKey(), topTimes(), createGhost() (+3 more)

### Community 80 - "scene"
Cohesion: 0.25
Nodes (7): GFX, scene, _c, ensurePool(), _p, registerLevelLights(), sources

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (18): code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph, importedBy (+10 more)

### Community 82 - "hammer.js"
Cohesion: 0.29
Nodes (7): canPunish(), SAVE, head, hp, prev, q, updateHammer()

### Community 83 - "monster.js"
Cohesion: 0.10
Nodes (39): ball(), blind(), box(), buildMonsterSkin(), cyl(), glowEye(), lavaBeast(), mannequin() (+31 more)

### Community 84 - "tx"
Cohesion: 0.47
Nodes (6): drawCard(), drawGlass(), sp(), tx(), wrapText(), drawWall()

### Community 85 - "stepDread"
Cohesion: 0.67
Nodes (3): stepDread(), update(), update()

## Knowledge Gaps
- **26 isolated node(s):** `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js`, `./core/gorillamachine.js`, `./core/network.js` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 655 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `engine.js` to `core_engine_three`, `textures.js`, `silence.js`, `Furas Bot`, `Avatar & Badges`, `Dependencies`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `Mannequin`, `Cemetery Level`, `Lobby & Physics Bodies`, `Role Tags & Lobby Door`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **What connects `./core/economy.js`, `./core/emotes.js`, `./core/avatar.js` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Network & Host Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.05187074829931973 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `Dependencies` to `Tests & Module Imports`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Should `Economy & Achievements` be split into smaller, more focused modules?**
  _Cohesion score 0.04983164983164983 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `toast` to `Network & Host Identity`, `Economy & Achievements`, `textures.js`, `silence.js`, `Config & Staff Names`, `Furas Bot`, `terminal.js`, `infection.js`, `audio.js`, `well.js`, `Graphics & Lighting`, `memory.js`, `Hotel Level`, `games.js`, `hideseek.js`, `Catacombs Level`, `Hospital Level`, `Nursery Level`, `Cemetery Level`, `drawInstructions`, `highfive.js`, `levelReward`, `Role Tags & Lobby Door`, `Banana Mode`, `blindtag.js`, `emotepanel.js`, `core_engine_three`, `Dodgeball`, `addCrispBlock`, `generator.js`, `Statues Level`, `Mod Menu`, `redlight.js`, `setPlayerPosition`, `lava.js`, `buildDoor`, `Training Dummy`, `Last Tile`, `levels.js`, `ensureDaily`, `potato.js`, `ui.js`, `isOwned`, `startJoin`, `stinger`, `gorillamachine.js`, `wardrobe.js`, `drawGames`, `sendLevelMsg`, `createGhost`, `hammer.js`, `monster.js`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `textures.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06613924050632912 - nodes in this community are weakly interconnected._