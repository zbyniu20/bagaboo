# Zasady pracy w tym repozytorium

- **Informuj użytkownika na bieżąco.** Przed każdym krokiem (czytanie plików, edycja, testy, commit, push, PR) napisz jednym zdaniem, co robisz w tej chwili. Robisz to za każdym razem, także przy kolejnych krokach jednego zadania i po dłuższej ciszy.
- Odpowiadaj po polsku.
- Nowy poziom: plik w `levels/`, wpis w `core/registry.js`, nazwa pliku w `FILES` w `index.html`, poziom w grupie w `.github/workflows/smoke.yml` (opis na górze `core/registry.js`). Smoke testy w CI są wyłączone i ruszają tylko ręcznie (workflow_dispatch).
- Testy: `cd tests && npm ci && node smoke.mjs [lista,poziomów]` (lokalnie z `CHROMIUM_PATH` wskazującym zainstalowaną przeglądarkę).
