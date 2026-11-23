# Graph Report - bagaboo  (2026-11-23)

## Corpus Check
- 484 files · ~1,305,904 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 98 file(s) not represented in the graph (top: .css 84, .glb 11, (none) 3)

## Summary
- 5971 nodes · 15417 edges · 247 communities (220 shown, 27 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 515 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90e9ec66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- economy.js
- textures.js
- silence.js
- lobby-door.js
- laundry.js
- pet.js
- banana.js
- dodgeball.js
- lib
- Tests & Module Imports
- games.js
- monster.js
- main.js
- catacombs.js
- auth.js
- gfx.mjs
- room000.js
- config.js
- audio.js
- nursery.js
- build
- common.py
- ambience.js
- graffiti.js
- redlight.js
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- range.js
- dotted-globe/effect.js
- room000map.js
- icons.mjs
- print3d.js
- levels.js
- visuals.js
- toast
- acoustics.js
- terminal.js
- modmenu.js
- monsters.py
- build.js
- lobbygames.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- engine.js
- petstore.js
- Docs: Accounts & Rules
- cosmetics.js
- make-posters.mjs
- hospital.js
- handleGuest
- gate.mjs
- emotepanel.js
- bake.mjs
- trainingdummy.js
- moments.mjs
- maze.js
- duotone-grade/effect.js
- gore.mjs
- steps
- loop
- ui/ui.js
- three
- bag
- shader
- pause.js
- perf.mjs
- ref_url
- gradient-mesh/effect.js
- logic.mjs
- hauntedui.js
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- lobbyplay.js
- diagram.js
- static.mjs
- lobby.mjs
- monstermaps.js
- player.js
- moments/lib.js
- _demo/shoot.mjs
- drawGames
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- onGraffitiMsg
- system.js
- ref_node_fs
- color
- Diagram
- mount
- layout/check.mjs
- motion.js
- Cards
- norm
- runWidth
- Objects and prints (`assets/objects`)
- soft-light-bars/effect.js
- photoGL
- dread.mjs
- startJoin
- sleep
- presence.js
- still
- deal.mjs
- Copy registers
- reduced
- mountProduct
- shared.js
- product-render/auto.js
- tickHunt
- stage
- 4. Place
- System
- block
- hide.mjs
- layout.js
- hauntlogic.js
- fx-feature-card/component.js
- .render
- orb-sphere/effect.js
- product-turntable/object.js
- Copy moves
- Effects beyond backgrounds
- generatorlogic.js
- murals.js
- tone
- .build
- halftone-screen/effect.js
- ruled-grounds/effect.js
- Motion
- frag
- .pause
- s
- Layout: one section per screen, equal edges, heroes, type
- Photographs
- tasteskill 2.5
- fx-dither-object/component.js
- painterly-landscape/effect.js
- Objects (`assets/objects/print-*`)
- init
- Copy
- Copy voice
- Effects usage
- Features
- Monster
- furas.js
- blender/README.md
- workshop.js
- acoustics.js
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- applyDismember
- xrperf.js
- withLoop
- compilerOptions
- print-globe/object.js
- Copy tells
- Icons
- vrmenu.js
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- petnest.js
- haunt.mjs
- home.js
- hunt.mjs
- well.js
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- getAudioContext
- pages.yml
- photo-chapters/moment.js
- package.json
- sdf.py
- room000.mjs
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- settings.js
- spectate.js
- wardrobe.js
- glbmonster.js
- smoke-dist.mjs
- shots.mjs
- graffitiround.js
- refsOf
- audio3d.mjs
- monsterskins.js
- registry.mjs
- dotOf
- applyFlags
- browserChecks
- staticChecks
- opt
- runSweep
- shaderLint
- Terminal
- dismemberlogic.js
- contour-lines/effect.js
- edge-glow/effect.js
- monsters/README.md
- petmodel.js
- scripts
- tpAdd
- prism-dispersion/effect.js
- debug.js
- humanoid_clips
- pElbow
- aurora-curtains/effect.js
- .skin
- silk-folds/effect.js
- _print-core/demo.js
- buildGraffiti

## God Nodes (most connected - your core abstractions)
1. `toast()` - 233 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 96 edges
4. `makeCanvas()` - 94 edges
5. `buzz()` - 83 edges
6. `mkRng()` - 73 edges
7. `toTex()` - 73 edges
8. `buildDoor()` - 73 edges
9. `levelReward()` - 60 edges
10. `shader()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `7. Wspólny pokój ekipy` --references--> `normalizeHome()`  [INFERRED]
  docs/POMYSLY.md → core/homelogic.js
- `1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)` --references--> `decodeMap()`  [INFERRED]
  docs/POMYSLY.md → core/workshoplogic.js
- `The eleven heroes` --references--> `collage()`  [INFERRED]
  .claude/skills/taste-skill/references/layout-v4.md → .claude/skills/taste-skill/assets/layout/layout.js
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md
- `It always shows a picture` --references--> `glslProblems()`  [INFERRED]
  .claude/skills/taste-skill/assets/objects/_print-core/README.md → .claude/skills/taste-skill/assets/objects/_print-core/print3d.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (247 total, 27 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (44): TAGS, BANS_CLEARED, isModMenuUser(), emoteState(), audioEls, bannedNames, blood, bodyState() (+36 more)

### Community 1 - "economy.js"
Cohesion: 0.05
Nodes (72): activeRoleTags(), ACTIVITY, buyItem(), CURRENCY, DAILY_LEVELS, dailySeed(), defaultSave(), DIFF_LEVELS (+64 more)

### Community 2 - "textures.js"
Cohesion: 0.07
Nodes (80): buildBadge(), burntTexture(), eyeTexture(), faceTexture(), furTexture(), hairTexture(), hammerTextures(), jacketTexture() (+72 more)

### Community 3 - "silence.js"
Cohesion: 0.08
Nodes (53): attachMic(), rewardActivity(), addDoorPortal(), isOnRope(), releaseRope(), ARRIVAL_FROM_SILENCE, avoidObstacles(), BALLS (+45 more)

### Community 4 - "lobby-door.js"
Cohesion: 0.09
Nodes (26): buildHat(), placeArm(), poseHand(), ULTIMATE_SCALE, getLook(), onLookChange(), ARRIVAL, ARRIVAL_GAMES (+18 more)

### Community 5 - "laundry.js"
Cohesion: 0.08
Nodes (44): addCrispBlock(), addPortal(), animateMonster(), bag(), build(), buildCeiling(), buildDryer(), buildGate() (+36 more)

### Community 6 - "pet.js"
Cohesion: 0.11
Nodes (34): squeak(), hideSpot(), petFear(), buildPet(), carryStep(), _dir, disposePet(), _f (+26 more)

### Community 7 - "banana.js"
Cohesion: 0.13
Nodes (29): myId(), BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+21 more)

### Community 8 - "dodgeball.js"
Cohesion: 0.07
Nodes (57): camera, onLevelMsg(), hands, dispose(), fromNet(), isAuthority(), _p, participants() (+49 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.06
Nodes (32): ./core/economy.js, ./core/emotes.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js, ./core/terminal.js, ./core/ui.js, ./core/voicehub.js (+24 more)

### Community 11 - "games.js"
Cohesion: 0.08
Nodes (24): makeDread(), CARDS, AR, ARRIVAL_FROM_BANANA, ARRIVAL_FROM_DODGEBALL, ARRIVAL_FROM_HIDESEEK, ARRIVAL_FROM_LASTTILE, ARRIVAL_FROM_LAVA (+16 more)

### Community 12 - "monster.js"
Cohesion: 0.08
Nodes (40): GATE, gateStep(), winnerOf(), pickMap(), buildMonsterSkin(), isSpectating(), ARRIVAL_FROM_MONSTER, broadcast() (+32 more)

### Community 13 - "main.js"
Cohesion: 0.04
Nodes (63): updateListener(), GFX, LIGHT_MODE, cross, DESKTOP, enableDesktop(), help, keyHooks (+55 more)

### Community 14 - "catacombs.js"
Cohesion: 0.05
Nodes (61): heardVoice(), setDread(), stepBot(), addInstancedBlocks(), L, scaleBoxUVs(), addStoryProps(), animate() (+53 more)

### Community 15 - "auth.js"
Cohesion: 0.13
Nodes (22): API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners, login(), logout() (+14 more)

### Community 16 - "gfx.mjs"
Cohesion: 0.07
Nodes (28): DEPS, errors, HERE, LEVELS, MIME, ROOT, run(), server (+20 more)

### Community 17 - "room000.js"
Cohesion: 0.08
Nodes (40): clearLine(), decoySpot(), ARRIVAL_FROM_ROOM000, addMarks(), animate(), buildDecor(), buildDecoys(), buildGhost() (+32 more)

### Community 18 - "config.js"
Cohesion: 0.14
Nodes (34): ADMIN_NAMES, canPunish(), COADMIN_NAMES, FURAS_NAMES, isAdminName(), isCoAdminName(), isFurasName(), isModName() (+26 more)

### Community 19 - "audio.js"
Cohesion: 0.10
Nodes (48): AC, dreadUpdate(), oneShot(), ballHit(), bang(), beep(), bell(), breath() (+40 more)

### Community 20 - "nursery.js"
Cohesion: 0.08
Nodes (28): tex, createGridMaze(), ARRIVAL_FROM_NURSERY, animate(), build(), buildDecor(), buildDolls(), buildGate() (+20 more)

### Community 21 - "build"
Cohesion: 0.13
Nodes (18): cleanMapPick(), cleanOptions(), cleanVotes(), generateMap(), pickOptions(), applyLayout(), applyLobby(), applyMap() (+10 more)

### Community 22 - "common.py"
Cohesion: 0.08
Nodes (11): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts(), _basis() (+3 more)

### Community 23 - "ambience.js"
Cohesion: 0.10
Nodes (28): _af, _ap, app, appFigure(), aroundPlayer(), DEFS, _dp, DREAD (+20 more)

### Community 24 - "graffiti.js"
Cohesion: 0.09
Nodes (46): isMouseDown(), addPoster(), apply(), AREA, canClear(), clearWall(), debugGrafHaunt(), disposeGraffiti() (+38 more)

### Community 25 - "redlight.js"
Cohesion: 0.10
Nodes (49): panelBg(), clampScore(), elapsedSince(), nearTarget(), num(), pastFinishLine(), TOL, validHead() (+41 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.05
Nodes (82): addFurShells(), addRoleTag(), addScaryFace(), addWound(), animateFace(), applyGrime(), ARM_GEO, BADGES (+74 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (56): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+48 more)

### Community 31 - "range.js"
Cohesion: 0.11
Nodes (30): safeName(), nameOfPlayer(), sendLevelMsg(), BOOTHS, build(), buildGun(), buildRoom(), clearTargets() (+22 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.08
Nodes (55): CITIES, earthSampler(), easeInOut(), easeOut(), fib(), hueIn(), LAKES, LAND (+47 more)

### Community 33 - "room000map.js"
Cohesion: 0.10
Nodes (37): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), corners() (+29 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.06
Nodes (57): acquire(), atlas, CELL, clamp(), colMajor(), COMMON_PARAMS, config, cross() (+49 more)

### Community 36 - "levels.js"
Cohesion: 0.11
Nodes (28): dailyOn(), setDailyMode(), setDiff(), drawCard(), drawGlass(), ensureAssets(), sp(), stepDread() (+20 more)

### Community 37 - "visuals.js"
Cohesion: 0.18
Nodes (18): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+10 more)

### Community 38 - "toast"
Cohesion: 0.04
Nodes (134): heartbeat(), roar(), scare(), step(), addCollider(), buzz(), updateHighFive(), drawInstructions() (+126 more)

### Community 39 - "acoustics.js"
Cohesion: 0.15
Nodes (22): FAMILIES, FAMILY_OF, familyFor(), familyName(), gradeColor(), lerp(), mixHex(), BAKE (+14 more)

### Community 40 - "terminal.js"
Cohesion: 0.06
Nodes (39): attachGorillaMachine(), basePose(), CATS, M, machineLook(), refresh(), resetTry(), selectItem() (+31 more)

### Community 41 - "modmenu.js"
Cohesion: 0.13
Nodes (25): bPressed(), buildXray(), closeMenu(), _d, draw(), ensureMenu(), nameTexture(), openMenu() (+17 more)

### Community 42 - "monsters.py"
Cohesion: 0.18
Nodes (19): box(), cloth_cone(), ellipsoid(), blind(), doll(), face(), finish(), ghost() (+11 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (51): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+43 more)

### Community 44 - "lobbygames.js"
Cohesion: 0.18
Nodes (20): BOARD, buildLobbyGames(), drawBoard(), lobbyGamesNet(), updateLobbyGames(), addHoop(), addTarget(), BALL_COOLDOWN (+12 more)

### Community 45 - "fx.js"
Cohesion: 0.07
Nodes (46): BASE_UNIFORMS, CALM_SPOTS, clamp(), compose(), cssToHex(), DEFAULT_PALETTE, enforceBudget(), FOCAL (+38 more)

### Community 46 - "start.mjs"
Cohesion: 0.05
Nodes (45): ALIAS, allTypes, args, axisOrder(), axisVal(), block(), buttonInk(), dealTypes() (+37 more)

### Community 47 - "copy-lint.mjs"
Cohesion: 0.07
Nodes (47): APART, args, attrOf(), BLOCK, brandsOf(), CAST, CAST_CO, clip() (+39 more)

### Community 48 - "photo.js"
Cohesion: 0.06
Nodes (43): FLAT, inks(), mount(), params, analyse(), analyses, BASE, bestSrc() (+35 more)

### Community 49 - "engine.js"
Cohesion: 0.05
Nodes (88): buildHatRaw(), boxAt(), buildComputerDesk(), LP, addBlobAO(), addBody(), addConstraint(), addShaderEdges() (+80 more)

### Community 50 - "petstore.js"
Cohesion: 0.11
Nodes (52): equipItem(), spendBones(), petPage(), canFeed(), canHatch(), canPat(), CARRY, clamp() (+44 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "cosmetics.js"
Cohesion: 0.15
Nodes (22): buildGlasses(), buildGlassesRaw(), buildMask(), buildMaskRaw(), mat(), at(), BLOOD(), BLOOD_DARK (+14 more)

### Community 53 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 54 - "hospital.js"
Cohesion: 0.05
Nodes (68): dailyDate(), dailyKey(), diffOf(), fmtDuration(), getDiff(), isDaily(), pruneDaily(), recordKey() (+60 more)

### Community 55 - "handleGuest"
Cohesion: 0.14
Nodes (23): account(), randomNonce(), banList(), bannedNamesList(), canKick(), checkIntruder(), cleanRouted(), connById() (+15 more)

### Community 56 - "gate.mjs"
Cohesion: 0.05
Nodes (37): args, base, children, dot, FAMILY, files, fp, gateDir (+29 more)

### Community 57 - "emotepanel.js"
Cohesion: 0.16
Nodes (18): CATALOG, SAVE, close(), closeEmotePanel(), _d, doEmote(), mesh, openPanel() (+10 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "trainingdummy.js"
Cohesion: 0.24
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "maze.js"
Cohesion: 0.11
Nodes (40): createBot(), swapModel(), addMonsterFace(), buildMannequin(), addWarden(), buildDiggers(), addStatue(), makeBlind() (+32 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "gore.mjs"
Cohesion: 0.11
Nodes (17): DEPS, errors, HERE, MIME, ROOT, server, ./core/avatar.js, ./core/network.js (+9 more)

### Community 64 - "steps"
Cohesion: 0.12
Nodes (22): runs-on, steps, runs-on, steps, jobs, build, fast, types (+14 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.09
Nodes (31): addPause(), AGAIN, bakeQueue, BASE, boxes, boxOf(), cache, css (+23 more)

### Community 67 - "three"
Cohesion: 0.10
Nodes (23): playwright, typescript, devDependencies, cannon-es@0.20.0, peerjs@1.5.2, playwright@^1.45.0, three@0.187.0, typescript@^5.9.3 (+15 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.12
Nodes (28): mount(), params, tones(), uniforms(), violet(), guard(), isWarm(), mount() (+20 more)

### Community 70 - "pause.js"
Cohesion: 0.09
Nodes (28): applyVolumes(), applyBrightness(), scene, captureEnvironment(), cubeLuminance(), referenceLuminance(), head, hp (+20 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_url"
Cohesion: 0.05
Nodes (33): defs, HERE, num(), range(), ROOT, check(), done(), bot (+25 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "hauntedui.js"
Cohesion: 0.14
Nodes (15): buildMachineTerminal(), IS_QUEST, addComputers(), AMB, AMBD, BEAT, BLOOD, BONE (+7 more)

### Community 76 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.18
Nodes (29): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+21 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (28): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+20 more)

### Community 79 - "lobbyplay.js"
Cohesion: 0.12
Nodes (32): LIGHT_PRESETS, applyLighting(), canCatch(), gateOpen(), helpersAt(), moveNoise(), noiseAt(), repairStep() (+24 more)

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "static.mjs"
Cohesion: 0.12
Nodes (19): avSrc, code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph (+11 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.07
Nodes (20): AMB, CAT, CEM, FUR, GRF, HOM, HTL, IN (+12 more)

### Community 83 - "monstermaps.js"
Cohesion: 0.18
Nodes (23): aisles(), box(), free(), gbox(), GEN, HEDGE, hedge(), LOBBY (+15 more)

### Community 84 - "player.js"
Cohesion: 0.05
Nodes (72): addBones(), bumpStat(), capped(), checkCompletionist(), checkCounters(), checkStatAchievements(), claimLoginReward(), confirmGift() (+64 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "drawGames"
Cohesion: 0.18
Nodes (13): topTimes(), drawEcg(), drawEye(), mmss(), visitorsHere(), curMode(), drawGames(), modesOf() (+5 more)

### Community 88 - "rng"
Cohesion: 0.13
Nodes (26): BAYER4, fallbackCSS(), hash2(), makeNoise(), mountAscii(), buildAtlas(), draw(), layout() (+18 more)

### Community 89 - "scripts/shoot.mjs"
Cohesion: 0.09
Nodes (22): tilesMod, args, call(), child, defaultProfile(), guard, HEIGHTS, jumpTo() (+14 more)

### Community 90 - "backgrounds/check.mjs"
Cohesion: 0.08
Nodes (21): allIds, args, boxIds, by, child, defaultProfile(), fails, guard (+13 more)

### Community 91 - "mountPrint"
Cohesion: 0.18
Nodes (26): isDarkPaper(), mountPrint(), adapt(), advance(), applyNarrow(), ensureGlyphs(), fit(), frameEmpty() (+18 more)

### Community 92 - "effects.mjs"
Cohesion: 0.07
Nodes (47): clashes(), dealable(), filterEffects(), fitsKind(), kindOf(), KINDS, parseSlot(), pick() (+39 more)

### Community 93 - "onGraffitiMsg"
Cohesion: 0.21
Nodes (15): load(), loadPrivate(), onGraffitiMsg(), brushCells(), cleanCells(), decodeRle(), decodeWall(), makeBucket() (+7 more)

### Community 94 - "system.js"
Cohesion: 0.14
Nodes (26): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+18 more)

### Community 95 - "ref_node_fs"
Cohesion: 0.06
Nodes (25): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+17 more)

### Community 96 - "color"
Cohesion: 0.18
Nodes (23): color, makeLayer(), mount(), calmAt(), colours(), count(), draw(), drawGrid() (+15 more)

### Community 97 - "Diagram"
Cohesion: 0.17
Nodes (3): Diagram, kindOther(), normalise()

### Community 98 - "mount"
Cohesion: 0.15
Nodes (21): config, lifecycle(), loop(), sync(), makeGL(), makeNoise(), mount(), applyMask() (+13 more)

### Community 99 - "layout/check.mjs"
Cohesion: 0.09
Nodes (19): args, child, chrome, defaultProfile(), guard, here, { heroes }, kill() (+11 more)

### Community 100 - "motion.js"
Cohesion: 0.19
Nodes (19): boxOf(), counts(), enter(), enterSteps(), fontsIn(), hostOf(), init(), jump() (+11 more)

### Community 101 - "Cards"
Cohesion: 0.17
Nodes (11): Cards, Edges and fades, Effects that are not backgrounds, Grounds, Light on a laptop GPU, Never, The card, The fragment on it (+3 more)

### Community 102 - "norm"
Cohesion: 0.15
Nodes (18): addressMod, areaMod, basicsMod, CDP, copyChecks(), copyTerms(), holds(), holdsAny() (+10 more)

### Community 103 - "runWidth"
Cohesion: 0.12
Nodes (21): auditFindings(), clusterLooks(), extrasFindings(), groupLike(), groupSame(), invertedLook(), isLocal(), lookName() (+13 more)

### Community 104 - "Objects and prints (`assets/objects`)"
Cohesion: 0.17
Nodes (11): GPU cost, Limits, Mount, Mount, Never, Objects and prints (`assets/objects`), Posters, Product renders (+3 more)

### Community 105 - "soft-light-bars/effect.js"
Cohesion: 0.24
Nodes (19): alpha(), banned(), blendsClean(), companion(), darkLight(), fallback(), guard(), hueGap() (+11 more)

### Community 106 - "photoGL"
Cohesion: 0.20
Nodes (18): mount(), params, makeTexture(), photoGL(), adapt(), bindTextures(), draw(), finish() (+10 more)

### Community 107 - "dread.mjs"
Cohesion: 0.20
Nodes (8): ./core/botkit.js, ./core/levelkit.js, DEPS, errors, HERE, MIME, ROOT, server

### Community 108 - "startJoin"
Cohesion: 0.17
Nodes (25): giftsLeft(), answerCall(), callPeer(), electNewHost(), hostStatus(), kickPlayer(), leaveNetwork(), meshVoice() (+17 more)

### Community 109 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 110 - "presence.js"
Cohesion: 0.38
Nodes (11): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), retry(), sendHello() (+3 more)

### Community 111 - "still"
Cohesion: 0.20
Nodes (14): DATA, FULL, init(), MONTHS, TICKS, init(), PARAMS, init() (+6 more)

### Community 112 - "deal.mjs"
Cohesion: 0.15
Nodes (16): args, darkIds(), dealOnce(), draw(), fits(), HAS, here, hero (+8 more)

### Community 113 - "Copy registers"
Cohesion: 0.12
Nodes (15): 0. The model's default (the one to avoid), 10. Refusal and narrowness, 11. The product as the hero, 12. Hurried and conversational, 1. Facts only, 2. Technical and dry, with proof, 3. The founder's letter, 4. Self-aware and playful (+7 more)

### Community 114 - "reduced"
Cohesion: 0.24
Nodes (12): init(), STILL, init(), PARAMS, draw(), init(), PARAMS, fill() (+4 more)

### Community 115 - "mountProduct"
Cohesion: 0.33
Nodes (15): el(), mountProduct(), clearInner(), done(), layout(), measureStill(), mountLive(), palette() (+7 more)

### Community 116 - "shared.js"
Cohesion: 0.16
Nodes (14): grab(), inkPalette(), mqHover, mqReduce, nextFrame(), pendingStills, roundRect(), safe() (+6 more)

### Community 117 - "product-render/auto.js"
Cohesion: 0.19
Nodes (15): apply(), ATTRS, cache, claimed, json(), mountAll(), optsOf(), placeOf() (+7 more)

### Community 118 - "tickHunt"
Cohesion: 0.36
Nodes (9): botBoost(), fearLevel(), finalHunt(), HUNT, monsterBoost(), num(), pulseAt(), survivorsAlive() (+1 more)

### Community 119 - "stage"
Cohesion: 0.33
Nodes (13): renderScale(), hasWebGL(), reducedMotion(), stage(), draw(), fallBack(), fit(), flatFrame() (+5 more)

### Community 120 - "4. Place"
Cohesion: 0.14
Nodes (13): 1. Plan in screens, 2. The deal, 3. The plans, 4. Place, 5. Visuals, Designed variety without effects, Look, Order by trade (+5 more)

### Community 121 - "System"
Cohesion: 0.14
Nodes (13): Access, Base, Cards, lists and forms, Colour, Footer, Forms, Head, Motion (+5 more)

### Community 122 - "block"
Cohesion: 0.21
Nodes (14): allow(), applyWaivers(), block(), errorReason(), guard, killTree(), readJson(), readLedger() (+6 more)

### Community 123 - "hide.mjs"
Cohesion: 0.09
Nodes (21): ./core/player.js, state(), DEPS, errors, g1, HERE, hf(), lf() (+13 more)

### Community 124 - "layout.js"
Cohesion: 0.37
Nodes (12): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+4 more)

### Community 125 - "hauntlogic.js"
Cohesion: 0.09
Nodes (46): markCheater(), tickHaunt(), eyesDistance(), grafAlpha(), HAUNT, manStep(), nextIn(), num() (+38 more)

### Community 126 - "fx-feature-card/component.js"
Cohesion: 0.26
Nodes (10): demo(), grainGround(), groundPalette(), GROUNDS, init(), lum(), ok(), read() (+2 more)

### Community 127 - ".render"
Cohesion: 0.32
Nodes (4): clamp(), ease(), spread(), unease()

### Community 128 - "orb-sphere/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), fallback(), lc(), lin(), mount(), noLavender(), params, placeOrb() (+2 more)

### Community 129 - "product-turntable/object.js"
Cohesion: 0.21
Nodes (11): CAM, cross(), dot(), fitCamera(), FORMS, LABELS, NAMES, norm() (+3 more)

### Community 130 - "Copy moves"
Cohesion: 0.17
Nodes (11): About and story, Buttons and the close, Copy moves, Features and how it works, Microcopy: where a voice is most welcome, Numbers and humour, Prices, FAQ, booking: the plain zone, Proof (+3 more)

### Community 131 - "Effects beyond backgrounds"
Cohesion: 0.17
Nodes (11): A photograph with copy (`fx-photo`), Cost: light enough for a laptop's integrated GPU, Effects beyond backgrounds, Feature cards with inset panels (`fx-feature-card`), Objects in dither (`fx-dither-object`), Picking the effect, Street map of the place (`fx-map`), The techniques (`components/shared.js`) (+3 more)

### Community 132 - "generatorlogic.js"
Cohesion: 0.10
Nodes (14): A, clamp01(), GATE_Z, GENS, hearRadius(), MIC, micNoise(), MON (+6 more)

### Community 133 - "murals.js"
Cohesion: 0.33
Nodes (13): bezPt(), bloodText(), drawShadowPerson(), glowEye(), monsterCrowd(), monsterDemon(), monsterEldritch(), monsterScream() (+5 more)

### Community 134 - "tone"
Cohesion: 0.25
Nodes (9): init(), PARAMS, init(), fallback(), LAYERS, NICE, PARAMS, readData() (+1 more)

### Community 135 - ".build"
Cohesion: 0.20
Nodes (5): axesOf(), geo(), kindOf(), Program(), s()

### Community 136 - "halftone-screen/effect.js"
Cohesion: 0.38
Nodes (10): clamp(), f1(), fallback(), inks(), layout(), lin(), mount(), params (+2 more)

### Community 137 - "ruled-grounds/effect.js"
Cohesion: 0.38
Nodes (10): clean(), fallback(), geometry(), inBand(), lightAt(), mount(), params, step() (+2 more)

### Community 138 - "Motion"
Cohesion: 0.18
Nodes (10): Loops inside a card's visual (tech), Motion, Never, Reduced motion, no script, phones, Scroll, Tech budget, The hero's entrance (every kind), The hover layer (+2 more)

### Community 139 - "frag"
Cohesion: 0.14
Nodes (20): lit(), mount(), params, tones(), uniforms(), fallbackCSS(), aim(), fits() (+12 more)

### Community 140 - ".pause"
Cohesion: 0.11
Nodes (15): Adding an effect, Commands, Effects, Mount, Random pick, The list, Behaviour and limits, Materials (+7 more)

### Community 142 - "Layout: one section per screen, equal edges, heroes, type"
Cohesion: 0.20
Nodes (9): 1. What the good sites do, 2. One section per screen, 3. The hero, 4. Equal edges and the grid, 5. Type, 6. The check, Layout: one section per screen, equal edges, heroes, type, The eleven heroes (+1 more)

### Community 143 - "Photographs"
Cohesion: 0.20
Nodes (9): A product without photographs (PH-04), Credits and words (PH-38, CO-22), Live search (stand-ins for what the library lacks), Never, Photographs, Pick and fetch, Place them, Show them (+1 more)

### Community 144 - "tasteskill 2.5"
Cohesion: 0.20
Nodes (9): 1. The kind of business decides everything, 2. The page plan by kind, 3. What serves which page, 4. The run, 5. Checklist, 6. Never, House rules, References (+1 more)

### Community 145 - "fx-dither-object/component.js"
Cohesion: 0.33
Nodes (8): DRAW, drawing(), init(), objectEffect(), OBJECTS, SCHEMA, tones(), fx

### Community 146 - "painterly-landscape/effect.js"
Cohesion: 0.42
Nodes (8): at(), grainLayer(), L(), mount(), params, sat(), tones(), uniforms()

### Community 147 - "Objects (`assets/objects/print-*`)"
Cohesion: 0.22
Nodes (8): glslProblems(), A new object, Do and don't, It always shows a picture, Light on a laptop GPU, Objects (`assets/objects/print-*`), Posters, Put one on a page

### Community 148 - "init"
Cohesion: 0.18
Nodes (5): init(), init(), done(), init(), POINTER_SVG

### Community 149 - "Copy"
Cohesion: 0.22
Nodes (8): Banned, Contacts the brief does not give, Copy, Five rules, Headlines and text, Plain versions, The copy layer, What may be assumed

### Community 150 - "Copy voice"
Cohesion: 0.22
Nodes (8): 1. The fact sheet, from the brief, 2. The voice card, 3. Shape from the reader's questions, 4. Draft, 5. The device budget, per page, 6. Check, Copy voice, Why model copy reads as model copy

### Community 151 - "Effects usage"
Cohesion: 0.11
Nodes (23): bakeDpr(), bakeDraw(), bakeOne(), grounds(), groundSpec(), liveOn(), mountAt(), nextBake() (+15 more)

### Community 152 - "Features"
Cohesion: 0.22
Nodes (9): app-frame, bento, chapter, Features, features-2x2, product-statement, split-text-left, steps (+1 more)

### Community 153 - "Monster"
Cohesion: 0.13
Nodes (7): frustum(), Monster, tube(), butler(), furas(), mannequin(), threadman()

### Community 154 - "furas.js"
Cohesion: 0.07
Nodes (47): addBot(), ADJ, animateFuras(), blob(), build(), buildDecor(), buildDividers(), buildFish() (+39 more)

### Community 156 - "workshop.js"
Cohesion: 0.05
Nodes (71): atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap(), demoMap() (+63 more)

### Community 157 - "acoustics.js"
Cohesion: 0.16
Nodes (23): blendRoom(), blockCount(), DIRS, freeDistances(), occludedFilter(), occludedGain(), occlusionFor(), rayBox() (+15 more)

### Community 158 - "Photo prints"
Cohesion: 0.25
Nodes (7): Cost, Credit, Mount, Photo prints, The photograph, When it cannot draw, Where a print goes, and where not

### Community 159 - "_scenes/auto.js"
Cohesion: 0.36
Nodes (7): claimed, IDS, json(), LOOPING, mountAll(), scenes, srcOf()

### Community 160 - "Diagrams"
Cohesion: 0.25
Nodes (7): Diagrams, Icons: one resolver, run it last, Labels plain, Motion: one cycle of 2.5 to 4 s, Pick a layout and a preset, The builder page (the tool for building one fast), When a diagram, when a UI fragment

### Community 161 - "sections-library.md"
Cohesion: 0.25
Nodes (7): customer-proof-row, Heroes, logo-row, Proof, quote-stat, Section library, What every recipe assumes

### Community 162 - "Sections for a kind of content"
Cohesion: 0.25
Nodes (8): booking-form, calendar-frame, client-slots, integrations-grid, menu-in-type, Sections for a kind of content, timeline-rail, visit-map

### Community 163 - "Photographs, rooms, services and people"
Cohesion: 0.25
Nodes (8): line-up, peek-list, people-row, photo-band, photo-pair, Photographs, rooms, services and people, rooms-list, services-list

### Community 164 - "applyDismember"
Cohesion: 0.19
Nodes (19): clearWounds(), lostHead(), lostLeft(), lostRight(), animateFaces(), applyDismember(), bloodBurst(), clearDebris() (+11 more)

### Community 165 - "xrperf.js"
Cohesion: 0.17
Nodes (18): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), renderer, clampFrame(), DESKTOP_STEPS (+10 more)

### Community 166 - "withLoop"
Cohesion: 0.20
Nodes (10): init(), init(), DATA, init(), PREV, isStill(), withLoop(), init() (+2 more)

### Community 167 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 169 - "Copy tells"
Cohesion: 0.29
Nodes (6): Copy tells, First generation: the old tells (mostly avoided now; still checked), Not tells (leave them alone), Over-correction: what the rules themselves produce, Second generation: the tells now, Why it happens

### Community 170 - "Icons"
Cohesion: 0.29
Nodes (6): Commands, How they sit, Icons, The violet rule (a judgement, stated), Where they come from, Which one

### Community 171 - "vrmenu.js"
Cohesion: 0.24
Nodes (13): isReservedNick(), COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn() (+5 more)

### Community 172 - "_print-core/auto.js"
Cohesion: 0.47
Nodes (5): claimed, json(), mountAll(), placeOf(), prints

### Community 173 - "Scene objects (`assets/objects/<id>`, runtime in `_scenes`)"
Cohesion: 0.33
Nodes (5): Behaviour, Light on a laptop GPU, Put one on a page, Scene objects (`assets/objects/<id>`, runtime in `_scenes`), Where they go: software pages only

### Community 174 - "Backgrounds"
Cohesion: 0.33
Nodes (5): Backgrounds, Other kinds stay flat, Tech: code-drawn grounds, how they look, Tech: the CSS grounds, The three tokens (every kind)

### Community 175 - "The finish gate"
Cohesion: 0.33
Nodes (5): Arm it, As a hook, The finish gate, The manual gate, What it does

### Community 176 - "Page plans"
Cohesion: 0.33
Nodes (6): Gaming, Page plans, Place, Product, Service, Software

### Community 177 - "petnest.js"
Cohesion: 0.20
Nodes (18): purr(), hatchBegin(), hatchPop(), posOf(), reactFeed(), reactPat(), bar(), buildPetNest() (+10 more)

### Community 178 - "haunt.mjs"
Cohesion: 0.12
Nodes (16): ./core/graffiti.js, ./core/petmodel.js, ./core/registry.js, DEPS, errors, gh(), HERE, hh() (+8 more)

### Community 179 - "home.js"
Cohesion: 0.09
Nodes (46): ACHIEVEMENTS, acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome() (+38 more)

### Community 180 - "hunt.mjs"
Cohesion: 0.09
Nodes (22): ./core/ambience.js, ./core/glblogic.js, ./core/glbmonster.js, DEPS, errors, HERE, makeGlb(), MIME (+14 more)

### Community 181 - "well.js"
Cohesion: 0.08
Nodes (45): world, buildMaw(), cameraPanel(), createJumpscare(), seenIntros, signTexture(), STORY_PHRASES, VARIANTS (+37 more)

### Community 183 - "Price and questions"
Cohesion: 0.40
Nodes (5): comparison-table, faq, Price and questions, pricing-three, pricing-two

### Community 184 - "Footers"
Cohesion: 0.40
Nodes (5): footer-columns, footer-dark, footer-statement, footer-visit, Footers

### Community 185 - "Navigation"
Cohesion: 0.40
Nodes (5): nav-cards, nav-centre, nav-mega, nav-split, Navigation

### Community 186 - "Performance budget"
Cohesion: 0.50
Nodes (3): Every visual renders, Performance budget, Usual fixes

### Community 187 - "Closes"
Cohesion: 0.50
Nodes (4): close-photo, close-type, close-word, Closes

### Community 188 - "getAudioContext"
Cohesion: 0.24
Nodes (9): getAudioContext(), attachMic(), getHub(), resumeVoiceAc(), startVoiceWatch(), tryPlay(), unlockVoices(), voiceDebug() (+1 more)

### Community 189 - "pages.yml"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+18 more)

### Community 191 - "package.json"
Cohesion: 0.11
Nodes (19): dependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, description, devDependencies, vite@^8.3.8, cannon-es (+11 more)

### Community 192 - "sdf.py"
Cohesion: 0.17
Nodes (7): mirror_union(), capsule(), ell(), Grid, smax(), smin(), sub()

### Community 193 - "room000.mjs"
Cohesion: 0.12
Nodes (14): blocks, cellOf(), cover, diags, dist, doors, grid, plan (+6 more)

### Community 212 - "settings.js"
Cohesion: 0.16
Nodes (15): hooks, threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES, scheduleStep() (+7 more)

### Community 213 - "spectate.js"
Cohesion: 0.18
Nodes (17): boxes(), spectateNext(), ST, startSpectate(), stopSpectate(), updateSpectate(), CAM, cameraSpot() (+9 more)

### Community 214 - "wardrobe.js"
Cohesion: 0.10
Nodes (26): _e, EMOTE, emotePose(), EMOTES, _pq, _q, _a, _b (+18 more)

### Community 215 - "glbmonster.js"
Cohesion: 0.16
Nodes (18): BOT_KINDS, candidateUrls(), FALLBACK, fitScale(), MAX_BYTES, MAX_TRIS, MONSTERS, pickClip() (+10 more)

### Community 216 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 217 - "shots.mjs"
Cohesion: 0.05
Nodes (39): errs, EXTRA, HERE, MIME, ROOT, server, views, blobs (+31 more)

### Community 218 - "graffitiround.js"
Cohesion: 0.14
Nodes (21): castVote(), contestHost(), drawGallery(), nameOf(), newContest(), restoreWall(), voteFor(), assignSlots() (+13 more)

### Community 219 - "refsOf"
Cohesion: 0.22
Nodes (9): attrs(), cssRefs(), jsRefs(), kindOf(), local(), metas(), refsOf(), stripRef() (+1 more)

### Community 220 - "audio3d.mjs"
Cohesion: 0.17
Nodes (10): d, DEPS, errors, HERE, MIME, ROOT, server, st() (+2 more)

### Community 221 - "monsterskins.js"
Cohesion: 0.32
Nodes (12): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+4 more)

### Community 222 - "registry.mjs"
Cohesion: 0.22
Nodes (6): achievements, bad, ids, listed, ROOT, themes

### Community 223 - "dotOf"
Cohesion: 0.47
Nodes (6): activeIn(), below(), dotOf(), findProject(), lastTouch(), unarmedPage()

### Community 224 - "applyFlags"
Cohesion: 0.40
Nodes (6): applyFlags(), fileAt(), findPage(), isUrl(), kindArg(), slash()

### Community 225 - "browserChecks"
Cohesion: 0.40
Nodes (6): browserChecks(), copyChecks(), errLine(), left(), parseJson(), rmProfile()

### Community 226 - "staticChecks"
Cohesion: 0.40
Nodes (6): codeOnly(), hashOf(), kitIndex(), kitTwin(), norm(), staticChecks()

### Community 227 - "opt"
Cohesion: 0.33
Nodes (6): freshProfile(), inProject(), opt(), profileBase(), roundsArg(), str()

### Community 228 - "runSweep"
Cohesion: 0.67
Nodes (4): bySev(), clean(), lostFindings(), runSweep()

### Community 229 - "shaderLint"
Cohesion: 0.50
Nodes (4): glslIn(), isGLSL(), lintGLSL(), shaderLint()

### Community 231 - "dismemberlogic.js"
Cohesion: 0.29
Nodes (6): cleanDismember(), dismemberText(), DM, DM_CODES, MAX_ENTRIES, pickDismember()

### Community 232 - "contour-lines/effect.js"
Cohesion: 0.60
Nodes (5): fallback(), mount(), params, tones(), uniforms()

### Community 233 - "edge-glow/effect.js"
Cohesion: 0.46
Nodes (7): clearOfViolet(), crossesViolet(), mount(), neighbour(), params, tones(), uniforms()

### Community 235 - "petmodel.js"
Cohesion: 0.24
Nodes (9): PET, scaleOf(), createPetModel(), stepParts(), update(), drawFace(), drawScaryFace(), EYES (+1 more)

### Community 236 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, changed, check, fast, levelpack, logic, registry, rounds (+4 more)

### Community 238 - "prism-dispersion/effect.js"
Cohesion: 0.50
Nodes (7): hd(), layout(), mount(), params, spectrumCentre(), tones(), uniforms()

### Community 239 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 240 - "humanoid_clips"
Cohesion: 0.33
Nodes (7): humanoid_clips(), attack(), gait(), fn(), idle(), legs(), setx()

### Community 241 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

### Community 242 - "aurora-curtains/effect.js"
Cohesion: 0.52
Nodes (6): at(), L(), mount(), params, tones(), uniforms()

### Community 244 - "silk-folds/effect.js"
Cohesion: 0.52
Nodes (6): cool(), mount(), params, sheenTurn(), tones(), uniforms()

### Community 245 - "_print-core/demo.js"
Cohesion: 0.40
Nodes (3): EFFECT_LABEL, PAPERS, EFFECTS

### Community 246 - "buildGraffiti"
Cohesion: 0.33
Nodes (7): buildGraffiti(), buildHaunt(), buildPads(), mount(), dayKey(), emptyWall(), weekKey()

## Knowledge Gaps
- **28 isolated node(s):** `./core/emotes.js`, `./core/gorillamachine.js`, `./core/highfive.js`, `./core/leveldata.js`, `./core/ui.js` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2060 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `logic.mjs`, `copy-lint.mjs`, `static.mjs`, `gate.mjs`, `changed.mjs`, `workshop.js`, `registry.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.428) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/emotes.js`, `./core/gorillamachine.js`, `./core/highfive.js` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.043233082706766915 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `workshop.js` to `build.js`?**
  _High betweenness centrality (0.350) - this node is a cross-community bridge._
- **Should `economy.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04828828828828829 - nodes in this community are weakly interconnected._
- **Why does `L` connect `catacombs.js` to `network.js`, `silence.js`, `lobby-door.js`, `laundry.js`, `pet.js`, `banana.js`, `dodgeball.js`, `games.js`, `monster.js`, `main.js`, `room000.js`, `nursery.js`, `ambience.js`, `graffiti.js`, `redlight.js`, `furas.js`, `workshop.js`, `acoustics.js`, `range.js`, `levels.js`, `visuals.js`, `toast`, `acoustics.js`, `lobbygames.js`, `engine.js`, `petnest.js`, `home.js`, `well.js`, `hospital.js`, `trainingdummy.js`, `maze.js`, `pause.js`, `hauntedui.js`, `lobbyplay.js`, `player.js`, `spectate.js`, `wardrobe.js`, `hauntlogic.js`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._