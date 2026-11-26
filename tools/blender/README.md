# Modele awatara w Blenderze (skrypty)

Skrypty budują modele BagaBoo w Blenderze uruchamianym bez okna (moduł `bpy`) i renderują podglądy. Układ współrzędnych: twarz patrzy w +Y Blendera
(w grze to -Z), góra to +Z (w grze +Y), jednostki to metry; wymiary zgodne z obecnym awatarem (`core/avatar.js`).

    python3 -m venv v && v/bin/pip install bpy numpy scikit-image
    STEP=0.003 v/bin/python tools/blender/gorilla_head.py /tmp/podglad/    # STEP: rozdzielczość siatki (0.003 szybki podgląd, 0.0018 dokładny)

- `sdf.py`: modelowanie funkcją odległości (łączenie i wycinanie elipsoid z gładkością, marching cubes).
- `common.py`: scena, światła, kamera i render podglądu.
- `gorilla_head.py`: głowa goryla (górna część i osobna żuchwa). Stan: pilotaż kształtu, jeszcze bez zębów, tekstur i futra.

## Potwory (modele GLB do gry)

    /tmp/v/bin/python tools/blender/monsters.py [nazwa ...]     # bez argumentów: wszystkie; wynik: assets/monsters/<nazwa>.glb

- `monsterlib.py`: biblioteka. Szkielet kości -> siatka z modyfikatora Skin (organiczne tuby) -> dodatki (zęby, rogi, oczy, całuny, igły) -> wagi (dwie najbliższe kości) ->
  kolory wierzchołków (brud i krew) -> szkielet i animacje Idle, Walk, Run, Attack (procedurą) -> eksport GLB (przód potwora = +Z gry).
- `monsters.py`: przepisy: mannequin, gravedigger, warden, doll, patient, butler, blind, threadman, furas, ghost, lavabeast, officer (2,3-4,8 tys. trójkątów każdy).
  Nowy potwór = funkcja w `monsters.py` i wpis w `RECIPES`, wpis w `MONSTERS` w `core/glblogic.js` (test pilnuje spójności), a w poziomie `swapModel(m, 'nazwa')` po `buildMannequin`.
- Podgląd GLB w three.js: `cd tests && CHROMIUM_PATH=... node glbshot.mjs wynik.png Walk ../assets/monsters/a.glb ../assets/monsters/b.glb` (`CAM=head` = zbliżenie), w poziomach: `node monsterview.mjs katalog poziom1,poziom2`.
- `shrink_glb.py`: po eksporcie `monsters.py` przepakowuje wagi kości i kolory wierzchołków na znormalizowane bajty (plik mniejszy o ok. 20%, bez rozszerzeń glTF). Dalsza kompresja (meshopt) jest możliwa zewnętrznym narzędziem, a loader już ją obsługuje (`MeshoptDecoder`).

## Rekwizyty (zestaw do poziomów)

    /tmp/v/bin/python tools/blender/props.py && /tmp/v/bin/python tools/blender/shrink_glb.py assets/props/props.glb    # wynik: assets/props/props.glb (ok. 74 KB)

- `props.py`: 9 rekwizytów budowanych w `bmesh` (prymitywy, kolory wierzchołków, brud od dołu), wynik jest powtarzalny (to samo ziarno z `crc32` nazwy).
  Nowy rekwizyt = funkcja w `props.py` i wpis w `BUILD`, wpis w `PROPS` w `core/proplogic.js` (test sprawdza zgodność nazw) i w zestawach poziomów `PROP_SETS`.
