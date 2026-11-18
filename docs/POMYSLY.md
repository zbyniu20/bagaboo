# Pomysły na gamechangery

Lista pomysłów do realizacji. Kolejność w sekcji „Priorytet” jest ustalona z właścicielem.

## Priorytet

### 1. Warsztat 2.0: publikacja map i społeczność (ZAPAMIĘTANE, robimy jako pierwszy)
- Gracz publikuje mapę z Warsztatu pod 6-znakowym kodem; inni wpisują kod w terminalu.
- Etap 1: kody prywatne (udostępnianie znajomym). Etap 2: publiczna lista, lajki, „mapa tygodnia”, zgłoszenia.
- Autor dostaje prowizję w Bagabucksach za zagranie jego mapy; mapy graczy nadal nie dają rekordów (`reward: 0`, `noRecord: true` dla samych tras).
- Klocki: `core/workshoplogic.js` (`decodeMap`), `core/workshopstore.js`, `core/leveldata.js` (gość przyjmuje mapę tylko przez walidator). Serwer map w `bagaboo-api` (D1).
- Ryzyko: moderacja (nazwy, spam), limity zapisu per konto, nigdy nie ufać danym od klienta.

### 2. Run Roguelike (co-op przez Levels)
Seria 4-6 losowych poziomów horroru, wspólna pula żyć, ulepszenie do wyboru między poziomami (głosowanie na polach jak w Bramie Wspólnej), boss na końcu. Logika w czystym `core/runlogic.js`.

### 3. Wyzwanie Dnia i Duchy
Codzienna mapa z ziarnem z daty, ranking dnia na serwerze kont, duchy (odtwarzanie własnego lub cudzego rekordu przez `decodeBots`).

## Nowe pomysły (burza mózgów)

### 4. Potwór gracza (asymetryczny tryb 1 kontra ekipa)
Jeden gracz steruje potworem (skórki w `core/monsterskins.js`), reszta ucieka i naprawia bezpieczniki jak w Nocnej Zmianie. Rolę losuje host z własnego widoku graczy. Wzorzec: Dodgeball i Hide and Seek.

### 5. Potwór słyszy głos
Czat głosowy (`core/voicehub.js`) staje się mechaniką: głośność mikrofonu podnosi „hałas” gracza, a potwór wybiera cel po hałasie. Krzyk przyciąga potwora, szept pozwala się skradać. Bez nagrywania i bez wysyłania dźwięku do serwera: poziom głośności liczony lokalnie i zgłaszany jako jedna liczba, host ogranicza ją i nigdy nie ufa jej przy nagrodach.

### 6. Sezony i wydarzenia czasowe
Halloween, zima, urodziny gry: tymczasowe dekoracje lobby, limitowane kosmetyki (`core/cosmetics.js`), specjalna Nocna Zmiana, rankingowa lista sezonu. Dane sezonu jako czysty plik konfiguracji z datami.

### 7. Wspólny pokój ekipy
Rozszerzenie Mojego Pokoju: wspólny pokój kilku graczy, do którego każdy kupuje jedno miejsce na mebel, wspólna tablica trofeów i puchar ekipy. Opiera się na `core/homelogic.js` i `normalizeHome`; zapis po stronie konta, odczyt dla gości tylko do wyświetlania.

### 8. Kontrakty dnia
Trzy krótkie zadania dziennie („przejdź Szpital bez latarki”, „wygraj 2 rundy Last Tile”) za Bagabucksy i kosmetyki. Postęp liczy `core/economy.js` z kontrolą po stronie hosta; bez zadań wymagających obecności innych graczy, żeby grały też osoby solo.
