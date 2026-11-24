# Rekwizyty do poziomów (props.glb)

Jeden plik z 9 nazwanymi siatkami (`prop_barrel`, `prop_crate`, `prop_bench`, `prop_pipes`, `prop_debris`, `prop_bucket`, `prop_chair`, `prop_shelf`, `prop_cart`),
zbudowany w Blenderze skryptem `tools/blender/props.py` (potem `tools/blender/shrink_glb.py`). Początek każdej siatki leży w środku podstawy, kolory są w wierzchołkach
(brud od dołu). Gra (`core/props.js`) bierze z niego tylko geometrię i rysuje instancjami; rozmieszczenie i zestawy poziomów: `core/proplogic.js`.
Brak pliku = poziomy wyglądają jak wcześniej. Pakiet z Vite kopiuje ten katalog do `dist/props/`. Podgląd: `cd tests && CHROMIUM_PATH=... node propview.mjs wyjście.png`.
