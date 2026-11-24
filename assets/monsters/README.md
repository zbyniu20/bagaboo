# Modele potworów (GLB)

Wrzuć tu plik `monster.glb`, a potwór-bot w Become the Monster użyje go zamiast proceduralnego manekina (brak pliku = manekin).

Wymagania (patrz `core/glblogic.js`):
- format glTF binarny (`.glb`), do 6 MB i do 40 000 trójkątów (budżet Quest 3S), najlepiej jeden materiał;
- model patrzy w +Z (przód), skala dowolna: gra dopasowuje wysokość do 2,3 m i stawia model na podłodze;
- (opcjonalnie) jednorazowe klipy `scream`, `listen` i `attack`: gra odtwarza je sama (patrz `shotStep` w `core/glblogic.js`), brak klipu = bez tej animacji;
- animacje po nazwach (wielkość liter bez znaczenia, wystarczy fragment): `idle`/`stand`, `walk`/`creep`, `run`/`sprint`/`chase`; brak klipu = najbliższy zamiennik albo pierwszy klip;
- inna wysokość lub obrót: `MONSTERS` w `core/glblogic.js` (`height`, `yaw`).

Pakiet z Vite kopiuje ten katalog do `dist/monsters/`.
