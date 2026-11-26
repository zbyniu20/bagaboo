# Graph Report - bagaboo  (2026-11-26)

## Corpus Check
- 564 files · ~1,407,216 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 99 file(s) not represented in the graph (top: .css 84, .glb 12, (none) 3)

## Summary
- 6991 nodes · 17906 edges · 260 communities (236 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 562 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1360fc7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- network.js
- economy.js
- textures.js
- silence.js
- mine.js
- hideseek.js
- hospital.js
- banana.js
- hide.mjs
- lib
- Tests & Module Imports
- Monster
- monster.js
- main.js
- pause.js
- L
- ./core/engine.js
- glb.mjs
- config.js
- redlight.js
- puzzlelogic.js
- terminal.js
- common.py
- ambience.js
- graffiti.js
- memory.js
- scenes/lib.js
- changed.mjs
- avatar.js
- photos.mjs
- consistency.mjs
- playwright
- dotted-globe/effect.js
- pet.js
- icons.mjs
- print3d.js
- buzz
- addCrispBlock
- well.js
- lightbake.js
- staff.js
- lobby-door.js
- createHead
- build.js
- hideseek.js
- fx.js
- start.mjs
- copy-lint.mjs
- photo.js
- engine.js
- nightchest.js
- Docs: Accounts & Rules
- cosmetics.js
- make-posters.mjs
- levels.js
- xrperf.js
- gate.mjs
- hotel.js
- bake.mjs
- spectate.js
- moments.mjs
- audio.js
- duotone-grade/effect.js
- staffkey.js
- steps
- loop
- ui/ui.js
- pause.js
- bag
- shader
- static.mjs
- perf.mjs
- ref_url
- gradient-mesh/effect.js
- logic.mjs
- warning.mjs
- line-engraving/effect.js
- split-reveal/object.js
- kit.js
- annexstatues.js
- diagram.js
- silence.mjs
- lobby.mjs
- monstermaps.js
- player.js
- moments/lib.js
- _demo/shoot.mjs
- build
- rng
- scripts/shoot.mjs
- backgrounds/check.mjs
- mountPrint
- effects.mjs
- account.mjs
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
- ref_path
- film-light-leak/effect.js
- sleep
- goobyTexture
- still
- deal.mjs
- Copy registers
- reduced
- mountProduct
- shared.js
- product-render/auto.js
- ouijalogic.js
- stage
- 4. Place
- System
- block
- annex.mjs
- layout.js
- annexplay.js
- fx-feature-card/component.js
- .render
- orb-sphere/effect.js
- product-turntable/object.js
- Copy moves
- Effects beyond backgrounds
- lobbygames.js
- murals.js
- tone
- .build
- halftone-screen/effect.js
- ruled-grounds/effect.js
- Motion
- god-rays/effect.js
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
- modmenu.js
- cemetery.js
- Photo prints
- _scenes/auto.js
- Diagrams
- sections-library.md
- Sections for a kind of content
- Photographs, rooms, services and people
- room000.mjs
- room000map.js
- withLoop
- compilerOptions
- print-globe/object.js
- Copy tells
- Icons
- home.js
- _print-core/auto.js
- Scene objects (`assets/objects/<id>`, runtime in `_scenes`)
- Backgrounds
- The finish gate
- Page plans
- animateFaces
- haunt.mjs
- kit.mjs
- gore.mjs
- desktop.js
- picture-develops/moment.js
- Price and questions
- Footers
- Navigation
- Performance budget
- Closes
- props.py
- pages.yml
- photo-chapters/moment.js
- package.json
- sdf.py
- core/kit.js
- maze.js
- word-highlight/moment.js
- { color, normalizePalette, readPalette, GLSL_LIB }
- presence.js
- room000.js
- music.js
- glbmonster.js
- vrmenu.js
- shots.mjs
- graffitiround.js
- acoustics.js
- readHtml
- staffhaunt.mjs
- fontLink
- props.mjs
- bestiarylogic.js
- annexzip.js
- smoke-dist.mjs
- pace.mjs
- settings.js
- scripts
- eggs.js
- petmodel.js
- Terminal
- annextunnel.js
- lobbyplay.js
- gallerylogic.js
- visuals.js
- musiclogic.js
- prism-dispersion/effect.js
- dodgeball.js
- humanoid_clips
- bestiary.js
- heightlogic.js
- monsterskins.js
- silk-folds/effect.js
- tutorial.mjs
- _scenes/lint-glsl.mjs
- props/README.md
- headOf
- proplogic.js
- onGraffitiMsg
- engine.js
- tickHunt
- workshop.js
- dread.mjs
- debug.js
- shafts.js
- pElbow
- _print-core/demo.js
- tpAdd

## God Nodes (most connected - your core abstractions)
1. `toast()` - 275 edges
2. `lib()` - 148 edges
3. `addCrispBlock()` - 101 edges
4. `buzz()` - 93 edges
5. `makeCanvas()` - 82 edges
6. `buildDoor()` - 75 edges
7. `L` - 72 edges
8. `toTex()` - 64 edges
9. `levelReward()` - 63 edges
10. `shader()` - 60 edges

## Surprising Connections (you probably didn't know these)
- `1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)` --references--> `decodeMap()`  [INFERRED]
  docs/POMYSLY.md → core/workshoplogic.js
- `7. Wspólny pokój ekipy` --references--> `normalizeHome()`  [INFERRED]
  docs/POMYSLY.md → core/homelogic.js
- `The eleven heroes` --references--> `collage()`  [INFERRED]
  .claude/skills/taste-skill/references/layout-v4.md → .claude/skills/taste-skill/assets/layout/layout.js
- `Modele potworów (GLB)` --references--> `shotStep()`  [INFERRED]
  assets/monsters/README.md → core/glblogic.js
- `Gooby: photo of a fluffy white rabbit-like creature` --conceptually_related_to--> `bagaboo (gtag fangame)`  [INFERRED]
  core/gooby.webp → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adding content: level/mode registration and cards** — claude_new_level_procedure, claude_levels_room_listing, claude_games_modes, claude_level_cards [EXTRACTED 1.00]
- **Identity verification chain** — claude_bagaboo_api, claude_reserved_nicks, claude_host_proof [EXTRACTED 1.00]
- **Page boot: importmap loader, libs, and lobby UI start the game** — index_files, index_libs, index_auth_screen, index_menu_stage [INFERRED 0.75]

## Communities (260 total, 24 thin omitted)

### Community 0 - "network.js"
Cohesion: 0.04
Nodes (96): getAudioContext(), randomNonce(), canPunish(), updateHammer(), answerCall(), attachMic(), audioEls, banList() (+88 more)

### Community 1 - "economy.js"
Cohesion: 0.04
Nodes (84): activeRoleTags(), ACTIVITY, buyItem(), capped(), claimLoginReward(), CURRENCY, DAILY_LEVELS, dailySeed() (+76 more)

### Community 2 - "textures.js"
Cohesion: 0.08
Nodes (66): buildPads(), plateTexture(), rustDoorTexture(), storyTextures(), vignetteTexture(), crackTex(), eggTexture(), ANISO() (+58 more)

### Community 3 - "silence.js"
Cohesion: 0.07
Nodes (57): addBody(), addConstraint(), isOnRope(), releaseRope(), rope(), addGutsRope(), animateMonster(), avoidObstacles() (+49 more)

### Community 4 - "mine.js"
Cohesion: 0.05
Nodes (56): addInstancedBlocks(), ADJ, BATTERY, batteryAdd(), batteryStep(), DIFF_MUL, edgeKind(), EDGES (+48 more)

### Community 5 - "hideseek.js"
Cohesion: 0.09
Nodes (35): canPulse(), HAPTIC, PATTERNS, shape(), actuators(), hapticPlay(), hapticStats, lastPulse (+27 more)

### Community 6 - "hospital.js"
Cohesion: 0.09
Nodes (29): lighting, KINDS, _p, animate(), bfsFrom(), buildCards(), buildGrid(), _c (+21 more)

### Community 7 - "banana.js"
Cohesion: 0.12
Nodes (29): PACE, BASES, botThink(), broadcast(), build(), buildArena(), buildBanana(), carrying() (+21 more)

### Community 8 - "hide.mjs"
Cohesion: 0.16
Nodes (11): DEPS, errors, g1, HERE, hf(), lf(), MIME, ROOT (+3 more)

### Community 9 - "lib"
Cohesion: 0.06
Nodes (135): lib(), add(), arrive(), audit(), backdrop(), barRoot(), beneath(), bordered() (+127 more)

### Community 10 - "Tests & Module Imports"
Cohesion: 0.08
Nodes (22): ./core/emotes.js, ./core/gorillamachine.js, ./core/highfive.js, ./core/leveldata.js, ./core/ui.js, ./core/voicehub.js, ./core/workshopstore.js, ./core/xrperf.js (+14 more)

### Community 12 - "monster.js"
Cohesion: 0.06
Nodes (47): dismemberText(), GATE, gateStep(), winnerOf(), cleanMapPick(), cleanOptions(), cleanVotes(), generateMap() (+39 more)

### Community 13 - "main.js"
Cohesion: 0.05
Nodes (52): updateListener(), errorText(), GFX, LIGHT_MODE, enableDesktop(), onLookChange(), clearLevel(), accept() (+44 more)

### Community 14 - "pause.js"
Cohesion: 0.19
Nodes (18): autoStartTutorial(), debugTutorial(), enterStep(), finish(), metrics(), nextStep(), skipTutorial(), ST (+10 more)

### Community 15 - "L"
Cohesion: 0.08
Nodes (35): buildAnnex(), buildAnnexShell(), debugAnnex(), draw(), getAnnex(), near(), updateAnnex(), _w (+27 more)

### Community 16 - "./core/engine.js"
Cohesion: 0.04
Nodes (53): DEPS, errors, HERE, LEVELS, MIME, ROOT, run(), server (+45 more)

### Community 17 - "glb.mjs"
Cohesion: 0.06
Nodes (35): DEPS, errors, errs, fresh(), HERE, hit(), MIME, ROOT (+27 more)

### Community 18 - "config.js"
Cohesion: 0.06
Nodes (66): account(), accountsOn(), API_URL, b64uToBytes(), call(), finish(), isLoggedIn(), listeners (+58 more)

### Community 19 - "redlight.js"
Cohesion: 0.07
Nodes (81): bumpStat(), checkCompletionist(), checkCounters(), checkStatAchievements(), confirmGift(), levelReward(), pruneDaily(), recordScore() (+73 more)

### Community 20 - "puzzlelogic.js"
Cohesion: 0.07
Nodes (25): buildDeepSkulls(), debugTakeSkull(), take(), updateDeepSkulls(), _w, COMBO, dailyCode(), DEEP (+17 more)

### Community 21 - "terminal.js"
Cohesion: 0.04
Nodes (84): buildAnnexRadio(), debugRadio(), draw(), tune(), _w, LOBBY_MOVE_SCALE, CATALOG, close() (+76 more)

### Community 22 - "common.py"
Cohesion: 0.08
Nodes (12): add_mesh(), flesh_material(), fur_object(), metaball(), shade_smooth(), stage(), tufts(), _basis() (+4 more)

### Community 23 - "ambience.js"
Cohesion: 0.07
Nodes (46): _af, _ap, app, aroundPlayer(), DEFS, _dp, dreadUpdate(), dst (+38 more)

### Community 24 - "graffiti.js"
Cohesion: 0.10
Nodes (44): isMouseDown(), addPoster(), apply(), AREA, canClear(), clearWall(), debugGrafHaunt(), disposeGraffiti() (+36 more)

### Community 25 - "memory.js"
Cohesion: 0.07
Nodes (41): GROUP, physicsMat, swapRoot(), makeLavaMaterial(), build(), buildCourse(), buildHall(), buildLava() (+33 more)

### Community 26 - "scenes/lib.js"
Cohesion: 0.07
Nodes (56): destroy(), cloudCanvas(), mount(), mount(), mount(), mount(), mount(), mount() (+48 more)

### Community 27 - "changed.mjs"
Cohesion: 0.12
Nodes (11): args, files, gameFiles, info, lines, ROOT, stat, strict (+3 more)

### Community 28 - "avatar.js"
Cohesion: 0.05
Nodes (60): addFurShells(), addWound(), animateFace(), applyGrime(), ARM_GEO, BADGES, badgeTex, burntTexture() (+52 more)

### Community 29 - "photos.mjs"
Cohesion: 0.06
Nodes (69): ALIAS, argv, byId, cmdPath(), craftFits(), craftOf(), CRAFTS, credit() (+61 more)

### Community 30 - "consistency.mjs"
Cohesion: 0.03
Nodes (62): argv, asJson, AUDIENCE, BANNED, BUSY_EDGE, BUSY_RNG, CATEGORY, CHECKS (+54 more)

### Community 31 - "playwright"
Cohesion: 0.10
Nodes (21): playwright, typescript, ./levels/mine.js, DEPS, errors, HERE, MIME, ROOT (+13 more)

### Community 32 - "dotted-globe/effect.js"
Cohesion: 0.07
Nodes (61): at(), L(), mount(), params, tones(), uniforms(), CITIES, earthSampler() (+53 more)

### Community 33 - "pet.js"
Cohesion: 0.05
Nodes (104): purr(), squeak(), saveGame(), spendBones(), petPage(), buildPet(), carryStep(), _dir (+96 more)

### Community 34 - "icons.mjs"
Cohesion: 0.08
Nodes (54): ALIAS, argv, CACHE, checkCmd(), clean(), colours(), contentBox(), fetchCached() (+46 more)

### Community 35 - "print3d.js"
Cohesion: 0.06
Nodes (57): acquire(), atlas, CELL, clamp(), colMajor(), COMMON_PARAMS, config, cross() (+49 more)

### Community 36 - "buzz"
Cohesion: 0.05
Nodes (68): buzz(), drawInstructions(), introSeen(), takeRespawn(), releaseAll(), setPlayerPosition(), applyEvent(), caught() (+60 more)

### Community 37 - "addCrispBlock"
Cohesion: 0.05
Nodes (67): addCrispBlock(), tex, createGridMaze(), checkTick(), favorite(), hideStep(), MEMORY, newMemory() (+59 more)

### Community 38 - "well.js"
Cohesion: 0.07
Nodes (45): dreadScared(), LIGHT_PRESETS, addDoorPortal(), buildMaw(), noobTexture(), seenIntros, signTexture(), STORY_PHRASES (+37 more)

### Community 39 - "lightbake.js"
Cohesion: 0.17
Nodes (21): rayBox(), BAKE, bakeScale(), bakeVertex(), blocked(), boxVerts(), cellFor(), cullBoxes() (+13 more)

### Community 40 - "staff.js"
Cohesion: 0.11
Nodes (41): crackle(), MOD_NAMES, tickHaunt(), eyesDistance(), grafAlpha(), HAUNT, hideSpot(), manStep() (+33 more)

### Community 41 - "lobby-door.js"
Cohesion: 0.08
Nodes (30): addRoleTag(), buildHat(), createGorillaArm(), placeArm(), poseHand(), roleLabel(), ULTIMATE_SCALE, emoteState() (+22 more)

### Community 42 - "createHead"
Cohesion: 0.11
Nodes (30): addScaryFace(), bakeShade(), BONE(), buildBadge(), buildBunnyEars(), buildCarrot(), buildGlasses(), buildGlassesRaw() (+22 more)

### Community 43 - "build.js"
Cohesion: 0.07
Nodes (51): add(), AXES, axisAngle(), axisOf(), build(), BUILTIN, checkSpec(), colorOf() (+43 more)

### Community 44 - "hideseek.js"
Cohesion: 0.12
Nodes (28): ARRIVAL_FROM_HIDESEEK, BOT, botSees(), botThink(), broadcast(), catchPlayer(), drawHud(), fmt() (+20 more)

### Community 45 - "fx.js"
Cohesion: 0.07
Nodes (45): BASE_UNIFORMS, CALM_SPOTS, clamp(), compose(), cssToHex(), DEFAULT_PALETTE, enforceBudget(), FOCAL (+37 more)

### Community 46 - "start.mjs"
Cohesion: 0.06
Nodes (33): ALIAS, allTypes, args, block(), buttonInk(), dealTypes(), DEFAULT_MONO, FONT_TAGS() (+25 more)

### Community 47 - "copy-lint.mjs"
Cohesion: 0.07
Nodes (35): APART, args, BLOCK, CAST, CAST_CO, clip(), COINED, cross (+27 more)

### Community 48 - "photo.js"
Cohesion: 0.06
Nodes (43): FLAT, inks(), mount(), params, analyse(), analyses, BASE, bestSrc() (+35 more)

### Community 49 - "engine.js"
Cohesion: 0.05
Nodes (80): disposeAnnex(), disposeAnnexGallery(), disposeAnnexPlay(), disposeAnnexRadio(), updateAnnexRadio(), disposeAnnexRoom(), updateAnnexRoom(), disposeAnnexSlide() (+72 more)

### Community 50 - "nightchest.js"
Cohesion: 0.09
Nodes (55): buildAnnexRoom(), debugRoom(), debugVault(), debugVaultCode(), draw(), enter(), press(), afterOpen() (+47 more)

### Community 51 - "Docs: Accounts & Rules"
Cohesion: 0.11
Nodes (19): Player accounts and host identity verification, bagaboo-api account server (Cloudflare Worker + D1), Games salon modes (MODES in levels/games.js, buildDoors, return portal to games), hostAuth / hostProof handshake, Level and mode cards (core/levelcards.js), Levels room listing (LV list in levels/levels.js, EXIT door), New level procedure (levels/ file, core/registry.js entry, FILES in index.html), RESERVED_NICKS staff nicknames (+11 more)

### Community 52 - "cosmetics.js"
Cohesion: 0.16
Nodes (21): LP, at(), BLOOD(), BLOOD_DARK, cache, CUTE, dark(), EXTRA_BADGES (+13 more)

### Community 53 - "make-posters.mjs"
Cohesion: 0.11
Nodes (14): args, child, guard, here, kill(), MIME, opt(), portFile (+6 more)

### Community 54 - "levels.js"
Cohesion: 0.04
Nodes (92): IS_QUEST, dailyKey(), dailyOn(), fmtDuration(), getDiff(), recordKey(), setDailyMode(), setDiff() (+84 more)

### Community 55 - "xrperf.js"
Cohesion: 0.14
Nodes (21): BASE, desktopPerfInfo(), resetDesktopPerf(), st, updateDesktopPerf(), renderer, captureEnvironment(), cubeLuminance() (+13 more)

### Community 56 - "gate.mjs"
Cohesion: 0.04
Nodes (70): applyFlags(), args, attrs(), base, browserChecks(), children, codeOnly(), copyChecks() (+62 more)

### Community 57 - "hotel.js"
Cohesion: 0.04
Nodes (102): DREAD, setDread(), createBot(), diffOf(), createEvents(), swapModel(), VOICE, addStoryProps() (+94 more)

### Community 58 - "bake.mjs"
Cohesion: 0.07
Nodes (38): addRing(), area(), args, bb, BOX, chains(), clipLine(), clipRing() (+30 more)

### Community 59 - "spectate.js"
Cohesion: 0.18
Nodes (17): boxes(), spectateNext(), ST, startSpectate(), stopSpectate(), updateSpectate(), CAM, cameraSpot() (+9 more)

### Community 60 - "moments.mjs"
Cohesion: 0.09
Nodes (35): auditPage(), buildIndex(), cmdCheck(), cmdGallery(), cmdList(), cmdPick(), cmdServe(), cmdSheet() (+27 more)

### Community 61 - "audio.js"
Cohesion: 0.08
Nodes (56): AC, occludedFilter(), occludedGain(), appFigure(), dreadAppear(), freeSpot(), oneShot(), tone() (+48 more)

### Community 62 - "duotone-grade/effect.js"
Cohesion: 0.13
Nodes (36): calmMax(), clamp01(), coverScale(), finish(), guard(), hueDist(), isMuddy(), isViolet() (+28 more)

### Community 63 - "staffkey.js"
Cohesion: 0.07
Nodes (58): API_URL, b64uToBytes(), call(), errorText(), finish(), isLoggedIn(), listeners, login() (+50 more)

### Community 64 - "steps"
Cohesion: 0.12
Nodes (22): runs-on, steps, runs-on, steps, jobs, build, fast, types (+14 more)

### Community 65 - "loop"
Cohesion: 0.09
Nodes (19): init(), words(), init(), init(), init(), init(), init(), init() (+11 more)

### Community 66 - "ui/ui.js"
Cohesion: 0.09
Nodes (37): addPause(), AGAIN, bakeDpr(), bakeDraw(), bakeOne(), bakeQueue, BASE, boxes (+29 more)

### Community 67 - "pause.js"
Cohesion: 0.12
Nodes (26): applyVolumes(), applyBrightness(), applyIntensity(), DESCRIPTIONS, intensityOf(), LABELS, LEVELS, needsWarning() (+18 more)

### Community 68 - "bag"
Cohesion: 0.17
Nodes (26): init(), PARAMS, FILL, init(), DATA, init(), init(), init() (+18 more)

### Community 69 - "shader"
Cohesion: 0.07
Nodes (51): mount(), params, tones(), uniforms(), mount(), params, tones(), uniforms() (+43 more)

### Community 70 - "static.mjs"
Cohesion: 0.11
Nodes (19): avSrc, code(), EXP, exportsOf(), files, gameIds, gamesSrc, graph (+11 more)

### Community 71 - "perf.mjs"
Cohesion: 0.08
Nodes (31): analyse(), args, B, child, count(), cpuSnap(), die(), exited (+23 more)

### Community 72 - "ref_url"
Cohesion: 0.04
Nodes (40): defs, HERE, num(), range(), ROOT, check(), done(), bot (+32 more)

### Community 73 - "gradient-mesh/effect.js"
Cohesion: 0.33
Nodes (9): ADD, at(), DEAL, L(), mount(), params, sat(), tones() (+1 more)

### Community 74 - "logic.mjs"
Cohesion: 0.08
Nodes (17): b64u(), bad, forge(), gfx, html, ids, keys, lines (+9 more)

### Community 75 - "warning.mjs"
Cohesion: 0.15
Nodes (7): ./core/intensitylogic.js, DEPS, errors, HERE, MIME, ROOT, server

### Community 76 - "line-engraving/effect.js"
Cohesion: 0.32
Nodes (12): resolveParams(), clamp(), f1(), fallback(), holdStill(), inkOf(), layout(), lin() (+4 more)

### Community 77 - "split-reveal/object.js"
Cohesion: 0.19
Nodes (28): DEFAULT_SEQUENCE, mount(), cutOut(), DEFAULT_PHOTO, lin(), LUT, mount(), build() (+20 more)

### Community 78 - "kit.js"
Cohesion: 0.08
Nodes (27): demo(), esc(), q, creditsLine(), photoCredit(), demo(), esc(), PALETTES (+19 more)

### Community 79 - "annexstatues.js"
Cohesion: 0.10
Nodes (29): buildAnnexGallery(), debugAnnexGallery(), debugGalleryGold(), draw(), endGold(), getGallery(), ghostTexture(), onHit() (+21 more)

### Community 80 - "diagram.js"
Cohesion: 0.09
Nodes (27): api, auto(), CAPS, cleanName(), fallbackList(), h(), iconCache, iconMeta (+19 more)

### Community 81 - "silence.mjs"
Cohesion: 0.11
Nodes (15): ./core/audio.js, ./core/voice.js, ./core/voicelogic.js, DEPS, errors, HERE, MIME, ROOT (+7 more)

### Community 82 - "lobby.mjs"
Cohesion: 0.07
Nodes (20): AMB, CAT, CEM, FUR, GRF, HOM, HTL, IN (+12 more)

### Community 83 - "monstermaps.js"
Cohesion: 0.20
Nodes (23): aisles(), box(), carnival(), free(), gbox(), GEN, HEDGE, hedge() (+15 more)

### Community 84 - "player.js"
Cohesion: 0.07
Nodes (38): track(), containBall(), playerRig, BOOST_MULT, capMul(), FLY_SPEED, MOD, PERSONAL (+30 more)

### Community 85 - "moments/lib.js"
Cohesion: 0.08
Nodes (22): clamp(), ease, inCard(), phone(), reduced(), scrub(), still(), stillWhy() (+14 more)

### Community 86 - "_demo/shoot.mjs"
Cohesion: 0.12
Nodes (31): argv, buildIndex(), chrome(), cmdMake(), cmdProbe(), cmdShoot(), COSTS, decodePNG() (+23 more)

### Community 87 - "build"
Cohesion: 0.17
Nodes (15): catchOutcome(), cleanDismember(), DM, DM_CODES, GRACE, MAX_ENTRIES, pickDismember(), pickOptions() (+7 more)

### Community 88 - "rng"
Cohesion: 0.16
Nodes (23): BAYER4, fallbackCSS(), hash2(), makeNoise(), mountAscii(), buildAtlas(), draw(), layout() (+15 more)

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

### Community 93 - "account.mjs"
Cohesion: 0.12
Nodes (13): destroy(), DEPS, errors, errs, HERE, MIME, ROOT, server (+5 more)

### Community 94 - "system.js"
Cohesion: 0.14
Nodes (26): actionbar(), DAY_NAMES, DAYS, daySet(), faq(), forms(), glowOnHover(), GROUNDS (+18 more)

### Community 95 - "ref_node_fs"
Cohesion: 0.09
Nodes (20): DARK, deal(), FLAT_TYPES, HERE, OWN_LOUD, random(), roleOf(), strHash() (+12 more)

### Community 96 - "color"
Cohesion: 0.19
Nodes (22): makeLayer(), mount(), calmAt(), colours(), count(), draw(), drawGrid(), drawPulse() (+14 more)

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
Cohesion: 0.11
Nodes (20): fetchText(), link(), load(), loadAll(), plan(), script(), start(), startAll() (+12 more)

### Community 102 - "norm"
Cohesion: 0.15
Nodes (18): addressMod, areaMod, basicsMod, CDP, copyChecks(), copyTerms(), holds(), holdsAny() (+10 more)

### Community 103 - "runWidth"
Cohesion: 0.12
Nodes (23): auditFindings(), bySev(), clean(), clusterLooks(), extrasFindings(), groupLike(), groupSame(), invertedLook() (+15 more)

### Community 104 - "Objects and prints (`assets/objects`)"
Cohesion: 0.17
Nodes (11): GPU cost, Limits, Mount, Mount, Never, Objects and prints (`assets/objects`), Posters, Product renders (+3 more)

### Community 105 - "soft-light-bars/effect.js"
Cohesion: 0.24
Nodes (19): alpha(), banned(), blendsClean(), companion(), darkLight(), fallback(), guard(), hueGap() (+11 more)

### Community 106 - "photoGL"
Cohesion: 0.20
Nodes (18): mount(), params, makeTexture(), photoGL(), adapt(), bindTextures(), draw(), finish() (+10 more)

### Community 107 - "ref_path"
Cohesion: 0.07
Nodes (18): DEPS, errors, HERE, MIME, ROOT, server, achievements, bad (+10 more)

### Community 108 - "film-light-leak/effect.js"
Cohesion: 0.50
Nodes (7): guard(), isWarm(), mount(), params, pickEdge(), tones(), uniforms()

### Community 109 - "sleep"
Cohesion: 0.22
Nodes (14): cropTo(), deadIoPass(), glFallbackPass(), hiddenNow(), hiddenWalk(), lose(), narrowPass(), reducedPass() (+6 more)

### Community 110 - "goobyTexture"
Cohesion: 0.24
Nodes (12): CROP, drawFace(), GOOBY_EYES, GOOBY_IMAGE, goobyTexture(), scareUp(), triggerGooby(), buildTrainingDummy() (+4 more)

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

### Community 118 - "ouijalogic.js"
Cohesion: 0.14
Nodes (6): ghostPath(), keyById(), KEYS, OUIJA, REPLIES, startGhost()

### Community 119 - "stage"
Cohesion: 0.30
Nodes (14): renderScale(), hasWebGL(), injectStyles(), reducedMotion(), stage(), draw(), fallBack(), fit() (+6 more)

### Community 120 - "4. Place"
Cohesion: 0.14
Nodes (13): 1. Plan in screens, 2. The deal, 3. The plans, 4. Place, 5. Visuals, Designed variety without effects, Look, Order by trade (+5 more)

### Community 121 - "System"
Cohesion: 0.14
Nodes (13): Access, Base, Cards, lists and forms, Colour, Footer, Forms, Head, Motion (+5 more)

### Community 122 - "block"
Cohesion: 0.15
Nodes (20): activeIn(), allow(), applyWaivers(), below(), block(), dotOf(), errorReason(), findProject() (+12 more)

### Community 123 - "annex.mjs"
Cohesion: 0.04
Nodes (61): DEPS, errors, ev(), HERE, MIME, ROOT, server, shot() (+53 more)

### Community 124 - "layout.js"
Cohesion: 0.37
Nodes (12): collage(), film(), init(), letters(), liveWord(), lockLines(), other(), phone() (+4 more)

### Community 125 - "annexplay.js"
Cohesion: 0.08
Nodes (34): annexDim(), boardTexture(), buildAnnexPlay(), _c, debugAnnexDim(), debugOrganKey(), debugOuijaPick(), drawText() (+26 more)

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

### Community 132 - "lobbygames.js"
Cohesion: 0.18
Nodes (20): BOARD, buildLobbyGames(), drawBoard(), lobbyGamesNet(), updateLobbyGames(), addHoop(), addTarget(), BALL_COOLDOWN (+12 more)

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

### Community 139 - "god-rays/effect.js"
Cohesion: 0.50
Nodes (7): aim(), fits(), mount(), params, tones(), uniforms(), warm()

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
Nodes (5): init(), init(), reset(), init(), POINTER_SVG

### Community 149 - "Copy"
Cohesion: 0.22
Nodes (8): Banned, Contacts the brief does not give, Copy, Five rules, Headlines and text, Plain versions, The copy layer, What may be assumed

### Community 150 - "Copy voice"
Cohesion: 0.22
Nodes (8): 1. The fact sheet, from the brief, 2. The voice card, 3. Shape from the reader's questions, 4. Draft, 5. The device budget, per page, 6. Check, Copy voice, Why model copy reads as model copy

### Community 151 - "Effects usage"
Cohesion: 0.22
Nodes (8): Deal the effect, never by taste, Deal the moments and the scene, Effects usage, Never, Tech budget, The gate (house rule 8), What each kind gets, Where things sit

### Community 152 - "Features"
Cohesion: 0.22
Nodes (9): app-frame, bento, chapter, Features, features-2x2, product-statement, split-text-left, steps (+1 more)

### Community 153 - "Monster"
Cohesion: 0.15
Nodes (23): box(), ellipsoid(), tube(), blind(), butler(), doll(), face(), finish() (+15 more)

### Community 154 - "furas.js"
Cohesion: 0.07
Nodes (43): addBot(), ADJ, animateFuras(), blob(), buildDecor(), buildFish(), buildFuras(), buildFurasBots() (+35 more)

### Community 155 - "blender/README.md"
Cohesion: 0.50
Nodes (3): Modele awatara w Blenderze (skrypty), Potwory (modele GLB do gry), Rekwizyty (zestaw do poziomów)

### Community 156 - "modmenu.js"
Cohesion: 0.12
Nodes (26): isModMenuUser(), _a, _b, cool, HF, bPressed(), buildXray(), closeMenu() (+18 more)

### Community 157 - "cemetery.js"
Cohesion: 0.09
Nodes (28): heardVoice(), panelBg(), AISLES_X, AISLES_Z, animate(), buildRelics(), buildSky(), buildYard() (+20 more)

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

### Community 164 - "room000.mjs"
Cohesion: 0.12
Nodes (14): blocks, cellOf(), cover, diags, dist, doors, grid, plan (+6 more)

### Community 165 - "room000map.js"
Cohesion: 0.10
Nodes (32): AVOID_R, buildPlan(), cellPoint(), cellProps(), cellX(), cellYaw(), cellZ(), clearLine() (+24 more)

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

### Community 171 - "home.js"
Cohesion: 0.08
Nodes (47): ACHIEVEMENTS, acceptVisit(), buy(), canBuy(), cleanOwner(), cleanSlots(), cupsFor(), emptyHome() (+39 more)

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

### Community 177 - "animateFaces"
Cohesion: 0.18
Nodes (20): clearWounds(), lostHead(), lostLeft(), lostRight(), animateFaces(), applyDismember(), bloodBurst(), clearDebris() (+12 more)

### Community 178 - "haunt.mjs"
Cohesion: 0.12
Nodes (16): ./core/graffiti.js, ./core/petmodel.js, ./core/registry.js, DEPS, errors, gh(), HERE, hh() (+8 more)

### Community 179 - "kit.mjs"
Cohesion: 0.14
Nodes (13): ./core/kit.js, DEPS, errors, HERE, HUBS, lv, MIME, probe() (+5 more)

### Community 180 - "gore.mjs"
Cohesion: 0.05
Nodes (33): d, DEPS, errors, HERE, MIME, ROOT, server, st() (+25 more)

### Community 181 - "desktop.js"
Cohesion: 0.14
Nodes (12): cross, DESKTOP, help, keyHooks, keys, _o, onDesktopKey(), _q (+4 more)

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

### Community 188 - "props.py"
Cohesion: 0.19
Nodes (18): barrel(), bench(), bucket(), cart(), chair(), crate(), debris(), hexc() (+10 more)

### Community 189 - "pages.yml"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, environment, runs-on, steps, name, url (+18 more)

### Community 191 - "package.json"
Cohesion: 0.11
Nodes (19): dependencies, cannon-es@0.20.0, peerjs@1.5.2, three@0.187.0, description, devDependencies, vite@^8.3.8, cannon-es (+11 more)

### Community 192 - "sdf.py"
Cohesion: 0.14
Nodes (10): mirror_union(), run(), capsule(), ell(), Grid, smax(), smin(), sub() (+2 more)

### Community 193 - "core/kit.js"
Cohesion: 0.11
Nodes (33): familyName(), baseId(), cellUV(), DECAL_SKIP, decalCount(), decalEnabled(), DECALS, decalSet() (+25 more)

### Community 202 - "maze.js"
Cohesion: 0.12
Nodes (34): isDaily(), scaleBoxUVs(), addLamp(), bfs(), build(), buildCage(), buildCheckpoints(), buildDecor() (+26 more)

### Community 212 - "presence.js"
Cohesion: 0.33
Nodes (12): apply(), cleanup(), connectClient(), getInfo(), members, onChange(), PRESENCE, retry() (+4 more)

### Community 213 - "room000.js"
Cohesion: 0.07
Nodes (49): ARRIVAL_FROM_ROOM000, addMarks(), animate(), blotTexture(), buildDecor(), buildDecoys(), buildGhost(), buildHangers() (+41 more)

### Community 214 - "music.js"
Cohesion: 0.10
Nodes (21): hooks, step(), threatLevel(), ensureBus(), LEVEL_THEME, mtof(), note(), SCALES (+13 more)

### Community 215 - "glbmonster.js"
Cohesion: 0.09
Nodes (32): Modele potworów (GLB), BOT_KINDS, candidateUrls(), clipFor(), FALLBACK, fitScale(), hasClip(), MAX_BYTES (+24 more)

### Community 216 - "vrmenu.js"
Cohesion: 0.23
Nodes (13): COLORS, drawKeyboard(), field(), KEYS, label(), menu, pageBtn(), setField() (+5 more)

### Community 217 - "shots.mjs"
Cohesion: 0.04
Nodes (55): errs, EXTRA, HERE, MIME, ROOT, server, views, blobs (+47 more)

### Community 218 - "graffitiround.js"
Cohesion: 0.14
Nodes (21): buildGraffiti(), buildHaunt(), contestHost(), mount(), newContest(), restoreWall(), dayKey(), emptyWall() (+13 more)

### Community 219 - "acoustics.js"
Cohesion: 0.18
Nodes (20): blendRoom(), blockCount(), DIRS, freeDistances(), occlusionFor(), roomFromRays(), smoothRoom(), baseOf() (+12 more)

### Community 220 - "readHtml"
Cohesion: 0.27
Nodes (12): attrOf(), brandsOf(), declaredKind(), decode(), hasAttr(), hiddenOrMock(), lint(), readHtml() (+4 more)

### Community 221 - "staffhaunt.mjs"
Cohesion: 0.09
Nodes (20): ./core/ambience.js, ./core/economy.js, ./core/mutators.js, ./core/terminal.js, fog(), ./levels/staff.js, DEPS, errors (+12 more)

### Community 222 - "fontLink"
Cohesion: 0.21
Nodes (12): axisOrder(), axisVal(), describe(), fontLink(), isLower(), monoOf(), opt(), pc() (+4 more)

### Community 223 - "props.mjs"
Cohesion: 0.18
Nodes (10): ./core/props.js, DEPS, e2, errors, HERE, LEVELS, MIME, probe() (+2 more)

### Community 224 - "bestiarylogic.js"
Cohesion: 0.21
Nodes (13): baseLevel(), beastById(), beastForLevel(), BEASTS, BY_LEVEL, isComplete(), isSeen(), markRewarded() (+5 more)

### Community 225 - "annexzip.js"
Cohesion: 0.09
Nodes (33): buildAnnexSlide(), leverNear(), updateAnnexSlide(), _w, buildAnnexZip(), handNear(), place(), updateAnnexZip() (+25 more)

### Community 226 - "smoke-dist.mjs"
Cohesion: 0.17
Nodes (9): cdn, DIST, errors, failures, HERE, LEVELS, MIME, ROOT (+1 more)

### Community 227 - "pace.mjs"
Cohesion: 0.17
Nodes (8): DEPS, errors, HERE, ids, MIME, out, ROOT, server

### Community 228 - "settings.js"
Cohesion: 0.28
Nodes (11): build(), _c, disposeDust(), softSprite(), updateDust(), advance(), driftStep(), DUST (+3 more)

### Community 229 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, changed, check, fast, levelpack, logic, registry, rounds (+4 more)

### Community 230 - "eggs.js"
Cohesion: 0.12
Nodes (12): ALL_BONUS, allFound(), EGG_BONES, EGGS, findEgg(), GAZE, isEgg(), isFound() (+4 more)

### Community 231 - "petmodel.js"
Cohesion: 0.24
Nodes (10): createPetModel(), emit(), stepParts(), update(), drawFace(), drawScaryFace(), EYES, geo() (+2 more)

### Community 232 - "Terminal"
Cohesion: 0.23
Nodes (6): castVote(), drawGallery(), nameOf(), voteFor(), galleryRank(), galleryVote()

### Community 233 - "annextunnel.js"
Cohesion: 0.29
Nodes (8): buildAnnexTunnel(), _d, debugTunnelZ(), feed(), _p, paint(), TEXTS, updateAnnexTunnel()

### Community 234 - "lobbyplay.js"
Cohesion: 0.07
Nodes (43): bell(), applyLighting(), A, canCatch(), clamp01(), GATE_Z, gateOpen(), GENS (+35 more)

### Community 235 - "gallerylogic.js"
Cohesion: 0.28
Nodes (4): GAL, galleryStep(), registerHit(), span()

### Community 236 - "visuals.js"
Cohesion: 0.17
Nodes (19): LIQUID_TIME, addDetail(), addHalos(), buildEnvironment(), buildFlashBeam(), buildMist(), buildMotes(), _cam (+11 more)

### Community 237 - "musiclogic.js"
Cohesion: 0.48
Nodes (6): setTension(), clamp01(), hushMul(), TENSION, tensionParams(), tensionSmooth()

### Community 238 - "prism-dispersion/effect.js"
Cohesion: 0.50
Nodes (7): hd(), layout(), mount(), params, spectrumCentre(), tones(), uniforms()

### Community 239 - "dodgeball.js"
Cohesion: 0.06
Nodes (63): stepBot(), camera, sendContest(), broadcast(), drawHud(), updateLobbyPlay(), onLevelMsg(), sendLevelMsg() (+55 more)

### Community 240 - "humanoid_clips"
Cohesion: 0.29
Nodes (9): humanoid_clips(), attack(), gait(), fn(), idle(), legs(), listen(), scream() (+1 more)

### Community 241 - "bestiary.js"
Cohesion: 0.21
Nodes (15): bestiaryTick(), buildBestiary(), debugBestiary(), debugSelectBeast(), discoverBeast(), draw(), ensureYou(), getBestiary() (+7 more)

### Community 242 - "heightlogic.js"
Cohesion: 0.24
Nodes (11): faceMat(), fbm(), HEIGHT, heightField(), noise(), normalsFromHeight(), sample(), smooth() (+3 more)

### Community 243 - "monsterskins.js"
Cohesion: 0.36
Nodes (11): ball(), blind(), box(), cyl(), glowEye(), lavaBeast(), lavaTex(), mannequin() (+3 more)

### Community 244 - "silk-folds/effect.js"
Cohesion: 0.52
Nodes (6): cool(), mount(), params, sheenTurn(), tones(), uniforms()

### Community 245 - "tutorial.mjs"
Cohesion: 0.09
Nodes (20): ./core/pause.js, ./core/tutorial.js, ./core/tutoriallogic.js, DEPS, errors, errs, HERE, LEVELS (+12 more)

### Community 246 - "_scenes/lint-glsl.mjs"
Cohesion: 0.20
Nodes (6): GLSL_PRINT, files, here, MUST_CATCH, MUST_PASS, OBJECTS

### Community 248 - "headOf"
Cohesion: 0.11
Nodes (26): buildMonsterSkin(), canMark(), cleanFallen(), nearestRescuer(), newFallen(), RESCUE, rescueStep(), secondsLeft() (+18 more)

### Community 249 - "proplogic.js"
Cohesion: 0.25
Nodes (14): baseLevelId(), mulberry(), pickKind(), placeProps(), PROP_SETS, propCount(), PROPS, propsEnabled() (+6 more)

### Community 250 - "onGraffitiMsg"
Cohesion: 0.21
Nodes (15): load(), loadPrivate(), onGraffitiMsg(), cleanCells(), decodeRle(), decodeWall(), makeBucket(), near() (+7 more)

### Community 251 - "engine.js"
Cohesion: 0.09
Nodes (25): FAMILIES, FAMILY_OF, familyFor(), gradeColor(), lerp(), mixHex(), TILE, tileStrength() (+17 more)

### Community 252 - "tickHunt"
Cohesion: 0.36
Nodes (9): botBoost(), fearLevel(), finalHunt(), HUNT, monsterBoost(), num(), pulseAt(), survivorsAlive() (+1 more)

### Community 253 - "workshop.js"
Cohesion: 0.05
Nodes (72): register(), atFinish(), blockError(), canGo(), centre(), copy(), covers(), decodeMap() (+64 more)

### Community 254 - "dread.mjs"
Cohesion: 0.20
Nodes (8): ./core/botkit.js, ./core/levelkit.js, DEPS, errors, HERE, MIME, ROOT, server

### Community 255 - "debug.js"
Cohesion: 0.22
Nodes (7): box, c, errors, mesh, origError, tx, updateDebug()

### Community 256 - "shafts.js"
Cohesion: 0.39
Nodes (6): BAKE_U, pickShafts(), SHAFT, shaftsEnabled(), buildShafts(), shaftInfo

### Community 257 - "pElbow"
Cohesion: 0.62
Nodes (7): joint(), outline(), P(), pCurve(), pElbow(), pLine(), r1()

### Community 258 - "_print-core/demo.js"
Cohesion: 0.40
Nodes (3): EFFECT_LABEL, PAPERS, EFFECTS

## Knowledge Gaps
- **49 isolated node(s):** `./core/emotes.js`, `./core/gorillamachine.js`, `./core/highfive.js`, `./core/leveldata.js`, `./core/ui.js` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2496 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `build.js` to `static.mjs`, `ref_path`, `copy-lint.mjs`, `gate.mjs`, `changed.mjs`, `workshop.js`, `ref_node_fs`?**
  _High betweenness centrality (0.334) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `lib()` (e.g. with `arrive()` and `audit()`) actually correct?**
  _`lib()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./core/emotes.js`, `./core/gorillamachine.js`, `./core/highfive.js` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `network.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04162419300033979 - nodes in this community are weakly interconnected._
- **Why does `mode` connect `workshop.js` to `build.js`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Should `economy.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04459644322845417 - nodes in this community are weakly interconnected._
- **Why does `L` connect `levels.js` to `network.js`, `shafts.js`, `silence.js`, `lobbygames.js`, `mine.js`, `hospital.js`, `banana.js`, `hideseek.js`, `monster.js`, `main.js`, `L`, `redlight.js`, `puzzlelogic.js`, `terminal.js`, `ambience.js`, `graffiti.js`, `memory.js`, `furas.js`, `cemetery.js`, `pet.js`, `buzz`, `addCrispBlock`, `well.js`, `lightbake.js`, `staff.js`, `lobby-door.js`, `home.js`, `hideseek.js`, `engine.js`, `nightchest.js`, `desktop.js`, `xrperf.js`, `hotel.js`, `spectate.js`, `core/kit.js`, `maze.js`, `annexstatues.js`, `player.js`, `room000.js`, `acoustics.js`, `workshop.js`, `annexzip.js`, `annextunnel.js`, `lobbyplay.js`, `visuals.js`, `goobyTexture`, `dodgeball.js`, `bestiary.js`, `proplogic.js`, `engine.js`, `annexplay.js`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._