# Zasady pracy w tym repozytorium

- **Informuj użytkownika na bieżąco.** Przed każdym krokiem (czytanie plików, edycja, testy, commit, push, PR) napisz jednym zdaniem, co robisz w tej chwili. Robisz to za każdym razem, także przy kolejnych krokach jednego zadania i po dłuższej ciszy.
- Odpowiadaj po polsku.
- Nowy poziom: plik w `levels/`, wpis w `core/registry.js`, nazwa pliku w `FILES` w `index.html`, poziom w grupie w `.github/workflows/smoke.yml` (opis na górze `core/registry.js`). Smoke testy w CI są wyłączone i ruszają tylko ręcznie (workflow_dispatch).
- Poziom wybierany w sali Levels: dopisz go do listy `LV` w `levels/levels.js` (terminal), a na jego końcu zrób drzwi/znak z napisem `'EXIT'` (test sprawdza to dla każdego poziomu z rejestru).
- Tryb w salonie Games: dopisz go do `MODES` w `levels/games.js` (terminal; salon nie ma już drzwi do trybów) i zrób w trybie drzwi powrotne do salonu (portal `target: 'games'` ze `spawn: ARRIVAL_FROM_*`; test sprawdza to dla każdego trybu z rejestru).
- Każdy poziom i tryb ma kartę w `core/levelcards.js` (miejsce, cel, jak grać, na co uważać), pokazywaną po kliknięciu na terminalu; test sprawdza, że karta istnieje (hasło `room000` to ukryte drzwi).
- Testy: `cd tests && npm ci && node smoke.mjs [lista,poziomów]` (lokalnie z `CHROMIUM_PATH` wskazującym zainstalowaną przeglądarkę).
