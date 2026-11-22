# Modele awatara w Blenderze (skrypty)

Skrypty budują modele BagaBoo w Blenderze uruchamianym bez okna (moduł `bpy`) i renderują podglądy. Układ współrzędnych: twarz patrzy w +Y Blendera
(w grze to -Z), góra to +Z (w grze +Y), jednostki to metry; wymiary zgodne z obecnym awatarem (`core/avatar.js`).

    python3 -m venv v && v/bin/pip install bpy numpy scikit-image
    STEP=0.003 v/bin/python tools/blender/gorilla_head.py /tmp/podglad/    # STEP: rozdzielczość siatki (0.003 szybki podgląd, 0.0018 dokładny)

- `sdf.py`: modelowanie funkcją odległości (łączenie i wycinanie elipsoid z gładkością, marching cubes).
- `common.py`: scena, światła, kamera i render podglądu.
- `gorilla_head.py`: głowa goryla (górna część i osobna żuchwa). Stan: pilotaż kształtu, jeszcze bez zębów, tekstur i futra.
