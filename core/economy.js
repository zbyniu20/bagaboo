// ==========================================
// EKONOMIA I ZAPIS GRY: waluta Bagabucks, sklep, nagroda za logowanie, zadania dzienne, bonusy,
// rekordy czasów, osiągnięcia i podpisany zapis (wykrywa ręczne zmiany, ma kopię zapasową)
//
// Bilans: typowy dzień daje ok. 600-800 Bagabucks (1-2 nagrody za logowanie ~250, trzy zadania + bonus ~370,
// aktywności ~150). Dlatego tanie rzeczy (250-500) kupisz w jeden dzień, średnie (600-1000) w 1-2 dni,
// rzadkie (2200-3500) w 3-5 dni, a legendarne (6000) w około tydzień regularnej gry.
// ==========================================
import { toast, markAllDirty } from './terminal.js';
import { RECORD_DEFS, DIFF_LEVEL_IDS } from './registry.js';
import { PERSONAL } from './modstate.js';
import { mutatorActive } from './mutators.js';
import { isAdminName, isModName, isStaffName, isUltimateName, isOwnerName, isCoAdminName, isFurasName, isTherianName, isReservedNick, staffBadgesFor, roleTagsFor } from './config.js';

const SAVE_KEY = 'bagaboo_save_v1';
export const LOGIN_INTERVAL = 6 * 3600 * 1000;      // nagroda za logowanie co 6 godzin
const STREAK_WINDOW = 30 * 3600 * 1000;              // seria trwa, jeśli wrócisz w ciągu 30 godzin
export const QUEST_ALL_BONUS = 150;                  // premia za wykonanie wszystkich 3 zadań dnia
export const START_BONES = 150;
export const STAFF_BONUS = 10000;                // jednorazowa premia dla ekipy (admin, moderator)
export const CURRENCY = 'Bagabucks';
export const REPEAT_LIMIT = 3;                       // ile powtórnych przejść poziomu dziennie daje nagrodę

export const CATALOG = [
    { slot: 'hat', id: 'none', name: 'No hat', price: 0 },
    { slot: 'hat', id: 'cap', name: 'Rusty cap', price: 0 },
    { slot: 'hat', id: 'beanie', name: 'Knitted beanie', price: 300 },
    { slot: 'hat', id: 'tophat', name: 'Undertaker top hat', price: 800 },
    { slot: 'hat', id: 'cowboy', name: 'Dusty cowboy hat', price: 1000 },
    { slot: 'hat', id: 'horns', name: 'Demon horns', price: 2500 },
    { slot: 'hat', id: 'crown', name: 'Rotten crown', price: 3000 },
    { slot: 'hat', id: 'ushanka', name: 'Ushanka (earflap hat)', price: 1000 },
    { slot: 'hat', id: 'halo', name: 'Broken halo', price: 4500 },
    { slot: 'hat', id: 'eyeball', name: 'Eyeball cap', price: 2000 },
    { slot: 'hat', id: 'miner', name: "Miner's helmet", price: 0, locked: true, hint: 'Achievement' },
    { slot: 'glasses', id: 'none', name: 'No glasses', price: 0 },
    { slot: 'glasses', id: 'round', name: 'Round spectacles', price: 400 },
    { slot: 'glasses', id: 'sunglasses', name: 'Sunglasses', price: 500 },
    { slot: 'glasses', id: 'eyepatch', name: 'Eye patch', price: 600 },
    { slot: 'glasses', id: 'weld', name: 'Welding goggles', price: 700 },
    { slot: 'glasses', id: 'visor', name: 'Red glowing visor', price: 2200 },
    { slot: 'glasses', id: 'thirdeye', name: 'Third eye', price: 2600 },
    { slot: 'glasses', id: 'goldshades', name: 'Gold shades', price: 0, locked: true, hint: 'Achievement' },
    { slot: 'sleeve', id: 'cloth', name: 'Cloth sleeve', price: 0 },
    { slot: 'sleeve', id: 'leather', name: 'Leather sleeve', price: 250 },
    { slot: 'sleeve', id: 'camo', name: 'Camo sleeve', price: 350 },
    { slot: 'sleeve', id: 'straitjacket', name: 'Straitjacket', price: 450 },
    { slot: 'sleeve', id: 'bandage', name: 'Bloody bandages', price: 700 },
    { slot: 'sleeve', id: 'gold', name: 'Gold sleeve', price: 3500 },
    { slot: 'sleeve', id: 'ghostcloth', name: 'Ghost cloth', price: 0, locked: true, hint: 'Achievement' },
    { slot: 'gloves', id: 'none', name: 'Bare hands', price: 0 },
    { slot: 'gloves', id: 'black', name: 'Black gloves', price: 900 },
    { slot: 'gloves', id: 'mannequin', name: 'Mannequin hands', price: 1200 },
    { slot: 'gloves', id: 'burnt', name: 'Burnt hands', price: 1600 },
    { slot: 'gloves', id: 'bone', name: 'Bone gloves', price: 2800 },
    { slot: 'gloves', id: 'ghost', name: 'Ghost hands', price: 6000 },
    { slot: 'gloves', id: 'neon', name: 'Neon hands', price: 0, locked: true, hint: 'Achievement' },
    { slot: 'skin', id: 'none', name: 'Your own color', price: 0 },
    { slot: 'skin', id: 'silverback', name: 'Silverback', price: 1500 },
    { slot: 'skin', id: 'albino', name: 'Albino gorilla', price: 2200 },
    { slot: 'skin', id: 'shadow', name: 'Shadow (glowing eyes)', price: 3800 },
    { slot: 'skin', id: 'king', name: 'Parkour King', price: 0, locked: true, hint: 'Red route' },   // tylko za czerwoną trasę w lobby
    { slot: 'skin', id: 'bloodmoon', name: 'Bloodmoon', price: 0, locked: true, hint: 'Achievement' },
    { slot: 'skin', id: 'therian', name: 'Therian (bunny + carrot)', price: 0, locked: true, hint: 'Therian' },   // tylko dla nicków z THERIAN_NAMES: uszy królika, mały ogonek i marchewka, którą postać gryzie
    { slot: 'skin', id: 'furas', name: 'Furas (cat mask + fluffy tail)', price: 0, locked: true, hint: 'Furas' },   // ranga FURAS: maska kota i puchaty ogon
    { slot: 'skin', id: 'cheater', name: 'CHEATER', price: 0, locked: true, hint: 'For hackers' },   // nadawana za włamanie do pokoju szefa, nie da się jej zdjąć
    // Skórki potworów: zakładka "BagaBoo Games", działają tylko w trybie Become the Monster
    { slot: 'mskin', id: 'none', name: 'Classic monster', price: 0 },
    { slot: 'mskin', id: 'mannequin', name: 'Mannequin (The Maze)', price: 1500 },
    { slot: 'mskin', id: 'blind', name: 'The Blind One (Silence)', price: 2000 },
    { slot: 'mskin', id: 'ooze', name: 'Tar Crawler (The Well)', price: 2500 },
    { slot: 'mskin', id: 'thread', name: 'Threadman (Laundromat)', price: 3000 },
    { slot: 'mskin', id: 'lava', name: 'Lava Beast (Burning Memory)', price: 3500 },
    // Pet Pack: kosmetyki Stworka (zakładki Pet hats i Pet wear w sklepie). Zakłada się je na panelu opieki przy gnieździe w lobby, nie w Maszynie goryla.
    // Identyfikatory są też w PET.HATS i PET.NECKS (core/petlogic.js), model w core/petmodel.js; test pilnuje zgodności.
    { slot: 'pethat', id: 'none', name: 'No pet hat', price: 0 },
    { slot: 'pethat', id: 'party', name: 'Party hat', price: 300 },
    { slot: 'pethat', id: 'flower', name: 'Spring flower', price: 400 },
    { slot: 'pethat', id: 'cowboy', name: 'Cowboy hat', price: 800 },
    { slot: 'pethat', id: 'wizard', name: 'Wizard hat', price: 1200 },
    { slot: 'pethat', id: 'crown', name: 'Tiny crown', price: 2200 },
    { slot: 'petneck', id: 'none', name: 'No pet wear', price: 0 },
    { slot: 'petneck', id: 'bow', name: 'Bow tie', price: 300 },
    { slot: 'petneck', id: 'bandana', name: 'Bandana', price: 450 },
    { slot: 'petneck', id: 'scarf', name: 'Cozy scarf', price: 600 },
    { slot: 'petneck', id: 'bell', name: 'Bell collar', price: 900 },
    { slot: 'petneck', id: 'cape', name: 'Hero cape', price: 1800 },
    { slot: 'badge', id: 'none', name: 'No badge', price: 0 },
    { slot: 'badge', id: 'early', name: 'Early player', price: 0 },
    { slot: 'badge', id: 'skull', name: 'Skull pin', price: 500 },
    { slot: 'badge', id: 'bone', name: 'Bone collector', price: 900 },
    { slot: 'badge', id: 'eye', name: 'Watching eye', price: 1200 },
    { slot: 'badge', id: 'moon', name: 'Blood moon', price: 1800 },
    { slot: 'badge', id: 'flame', name: 'Lava walker', price: 0, locked: true, hint: 'Achievement' },
    { slot: 'badge', id: 'crown', name: 'Parkour King', price: 0, locked: true, hint: 'Red route' },
    { slot: 'badge', id: 'owner', name: 'Owner', price: 0, locked: true, hint: 'Owner' },
    { slot: 'badge', id: 'ultimate', name: 'Ultimate Admin', price: 0, locked: true, hint: 'Ultimate Admin' },
    { slot: 'badge', id: 'coadmin', name: 'Co-admin', price: 0, locked: true, hint: 'Co-admin' },
    { slot: 'badge', id: 'admin', name: 'Admin', price: 0, locked: true, hint: 'Admin' },
    { slot: 'badge', id: 'mod', name: 'Moderator', price: 0, locked: true, hint: 'Moderator' },
    { slot: 'badge', id: 'goldfish', name: 'Golden fish pin', price: 0, locked: true, hint: 'Fur Den on Nightmare' },
    { slot: 'badge', id: 'furas', name: 'Furas (kitty)', price: 0, locked: true, hint: 'Furas' },
    // Młotki (kupowane i zakładane na komputerze w pokoju szefa, nie w sklepie)
    { slot: 'tool', id: 'none', name: 'No hammer', price: 0 },
    { slot: 'tool', id: 'kick', name: 'Kick hammer', price: 0, locked: true, hint: 'Staff' },
    { slot: 'tool', id: 'ban', name: 'Ban hammer', price: 1000 },
    { slot: 'tool', id: 'gooby', name: 'Nothing Hammer', price: 0, locked: true, hint: 'Staff' },   // Gooby hammer: trafiony gracz dostaje jumpscare Gooby
    { slot: 'mask', id: 'none', name: 'No mask', price: 0 },
    { slot: 'mask', id: 'hockey', name: 'Hockey mask', price: 900 },
    { slot: 'mask', id: 'gas', name: 'Gas mask', price: 1300 },
    { slot: 'mask', id: 'doll', name: 'Porcelain doll face', price: 1800 },
    { slot: 'mask', id: 'plague', name: 'Plague doctor', price: 2400 },
    { slot: 'mask', id: 'skull', name: 'Skull mask', price: 3200 },
    { slot: 'mask', id: 'blind', name: 'Face of the Blind One', price: 5000 },

    // ===== NOWE KOSMETYKI =====
    // season: kupisz tylko w trakcie sezonu (potem zostaje na zawsze), weekly: w sklepie tylko gdy jest "polecany" w tym tygodniu
    // (4 z puli co tydzień, -20%), locked + hint: odblokowuje się za zadania dzienne albo wyzwania na poziomach (zakładka Awards)
    { slot: 'hat', id: 'santa', name: 'Santa hat', price: 900, season: 'winter' },
    { slot: 'hat', id: 'pumpkin', name: 'Pumpkin head', price: 1500, season: 'halloween' },
    { slot: 'hat', id: 'witch', name: 'Witch hat', price: 1200, season: 'halloween' },
    { slot: 'hat', id: 'bunny', name: 'Bunny ears', price: 800, season: 'spring' },
    { slot: 'hat', id: 'party', name: 'Party hat', price: 500, weekly: true },
    { slot: 'hat', id: 'wizard', name: 'Wizard hat', price: 1400, weekly: true },
    { slot: 'hat', id: 'cone', name: 'Traffic cone', price: 700, weekly: true },
    { slot: 'hat', id: 'headphones', name: 'Headphones', price: 0, locked: true, hint: 'Daily quests x5' },
    { slot: 'hat', id: 'laurel', name: 'Golden laurel', price: 0, locked: true, hint: 'All 3 quests, 7 days' },
    { slot: 'hat', id: 'nursecap', name: 'Nurse cap', price: 0, locked: true, hint: 'Hospital on Nightmare' },
    { slot: 'hat', id: 'bellhop', name: 'Bellhop cap', price: 0, locked: true, hint: 'Hotel on Nightmare' },
    { slot: 'hat', id: 'teddyears', name: 'Teddy ears', price: 0, locked: true, hint: 'Nursery on Nightmare' },
    { slot: 'hat', id: 'prisoncap', name: 'Prisoner cap', price: 0, locked: true, hint: 'Room 000 on Nightmare' },
    { slot: 'hat', id: 'skullcrown', name: 'Skull crown', price: 0, locked: true, hint: 'Catacombs on Nightmare' },
    { slot: 'hat', id: 'lanternhat', name: 'Lantern hat', price: 0, locked: true, hint: 'Cemetery on Nightmare' },
    { slot: 'glasses', id: 'monocle', name: 'Gold monocle', price: 600, weekly: true },
    { slot: 'glasses', id: 'heart', name: 'Heart glasses', price: 700, season: 'spring' },
    { slot: 'glasses', id: 'shutter', name: 'Shutter shades', price: 800, weekly: true },
    { slot: 'glasses', id: 'night', name: 'Night vision', price: 0, locked: true, hint: 'Silence on Nightmare' },
    { slot: 'glasses', id: '3d', name: '3D glasses', price: 0, locked: true, hint: 'Daily quests x20' },
    { slot: 'sleeve', id: 'sweater', name: 'Ugly sweater', price: 800, season: 'winter' },
    { slot: 'sleeve', id: 'hawaii', name: 'Hawaiian shirt', price: 800, season: 'summer' },
    { slot: 'sleeve', id: 'plaid', name: 'Plaid flannel', price: 500, weekly: true },
    { slot: 'sleeve', id: 'ember', name: 'Ember cloth', price: 0, locked: true, hint: 'Memory on Nightmare' },
    { slot: 'sleeve', id: 'woven', name: 'Woven threads', price: 0, locked: true, hint: 'Laundry on Nightmare' },
    { slot: 'gloves', id: 'mittens', name: 'Knit mittens', price: 600, season: 'winter' },
    { slot: 'gloves', id: 'boxing', name: 'Boxing gloves', price: 1000, weekly: true },
    { slot: 'gloves', id: 'rubber', name: 'Rubber gloves', price: 600, weekly: true },
    { slot: 'gloves', id: 'tar', name: 'Tar hands', price: 0, locked: true, hint: 'Well on Nightmare' },
    { slot: 'gloves', id: 'golden', name: 'Golden gloves', price: 0, locked: true, hint: 'Login streak of 7' },
    { slot: 'skin', id: 'snowape', name: 'Snow ape', price: 2600, season: 'winter' },
    { slot: 'skin', id: 'pumpkinape', name: 'Pumpkin ape', price: 2400, season: 'halloween' },
    { slot: 'skin', id: 'zombie', name: 'Zombie ape', price: 2800, season: 'halloween' },
    { slot: 'skin', id: 'jungle', name: 'Jungle ape', price: 1800, weekly: true },
    { slot: 'skin', id: 'nightmare', name: 'Nightmare ape', price: 0, locked: true, hint: 'All 7 on Nightmare' },
    { slot: 'mask', id: 'jack', name: 'Jack-o-lantern', price: 2000, season: 'halloween' },
    { slot: 'mask', id: 'snowman', name: 'Snowman mask', price: 1800, season: 'winter' },
    { slot: 'mask', id: 'clown', name: 'Clown mask', price: 1500, weekly: true },
    { slot: 'mask', id: 'oni', name: 'Oni mask', price: 2200, weekly: true },
    { slot: 'mask', id: 'stitched', name: 'Stitched face', price: 0, locked: true, hint: 'Maze on Nightmare' },
    { slot: 'badge', id: 'pumpkin', name: 'Pumpkin pin', price: 400, season: 'halloween' },
    { slot: 'badge', id: 'snow', name: 'Snowflake pin', price: 400, season: 'winter' },
    { slot: 'badge', id: 'sun', name: 'Sun pin', price: 400, season: 'summer' },
    { slot: 'badge', id: 'nm', name: 'Nightmare pin', price: 0, locked: true, hint: '1st Nightmare clear' },
    { slot: 'badge', id: 'ghost', name: 'Ghost badge', price: 0, locked: true, hint: '10 Hide&Seek wins' },
    { slot: 'badge', id: 'banana', name: 'Banana badge', price: 0, locked: true, hint: '5 Banana wins' },
    { slot: 'badge', id: 'flag', name: 'Race flag', price: 0, locked: true, hint: '5 Race wins' },
    { slot: 'badge', id: 'daily', name: 'Calendar badge', price: 0, locked: true, hint: '5 Daily Runs' },
    { slot: 'badge', id: 'present', name: 'Present badge', price: 0, locked: true, hint: 'Gift 3 items' },
    // Emotki (widzą je inni gracze; klawisz G / przycisk A,X otwiera panel). Wear = ulubiona emotka.
    { slot: 'emote', id: 'wave', name: 'Wave', price: 0 },
    { slot: 'emote', id: 'cheer', name: 'Cheer', price: 0 },
    { slot: 'emote', id: 'clap', name: 'Clap', price: 400 },
    { slot: 'emote', id: 'bow', name: 'Bow', price: 500 },
    { slot: 'emote', id: 'flex', name: 'Flex', price: 900 },
    { slot: 'emote', id: 'dance', name: 'Dance', price: 1200 },
    { slot: 'emote', id: 'highfive', name: 'High five', price: 0 },   // darmowa: dwóch graczy blisko siebie robi ją naraz = przybijają piątkę
    { slot: 'emote', id: 'salute', name: 'Salute', price: 0, locked: true, hint: 'Clear 25 levels' },
    { slot: 'emote', id: 'shrug', name: 'Shrug', price: 0, locked: true, hint: '25 jumpscares' },
    { slot: 'emote', id: 'heart', name: 'Heart', price: 0, locked: true, hint: '5 high fives' },
    // Nowe kosmetyki
    { slot: 'hat', id: 'viking', name: 'Viking helmet', price: 1300, weekly: true },
    { slot: 'hat', id: 'chef', name: 'Chef hat', price: 600, weekly: true },
    { slot: 'hat', id: 'pirate', name: 'Pirate tricorn', price: 1600 },
    { slot: 'hat', id: 'sprout', name: 'Little sprout', price: 500, weekly: true },
    { slot: 'hat', id: 'ufo', name: 'UFO', price: 2800 },
    { slot: 'hat', id: 'foil', name: 'Tinfoil hat', price: 400, weekly: true },
    { slot: 'hat', id: 'earmuffs', name: 'Frosty earmuffs', price: 900, season: 'winter' },
    { slot: 'hat', id: 'batcap', name: 'Bat cap', price: 1100, season: 'halloween' },
    { slot: 'glasses', id: 'aviator', name: 'Gold aviators', price: 650, weekly: true },
    { slot: 'glasses', id: 'hippie', name: 'Hippie specs', price: 800 },
    { slot: 'glasses', id: 'steampunk', name: 'Steampunk goggles', price: 1800 },
    { slot: 'glasses', id: 'catseye', name: 'Cat-eye glasses', price: 700, weekly: true },
    { slot: 'glasses', id: 'pixel', name: 'Pixel shades', price: 900 },
    { slot: 'mask', id: 'luchador', name: 'Luchador mask', price: 2200 },
    { slot: 'mask', id: 'ninja', name: 'Ninja mask', price: 1900 },
    { slot: 'mask', id: 'robot', name: 'Robot faceplate', price: 2400 },
    { slot: 'mask', id: 'cat', name: 'Black cat mask', price: 1800, season: 'halloween' },
    { slot: 'sleeve', id: 'denim', name: 'Denim jacket', price: 500, weekly: true },
    { slot: 'sleeve', id: 'galaxy', name: 'Galaxy sleeve', price: 3200 },
    { slot: 'sleeve', id: 'chain', name: 'Chainmail', price: 2000 },
    { slot: 'gloves', id: 'chrome', name: 'Chrome hands', price: 3000 },
    { slot: 'gloves', id: 'lavaglove', name: 'Lava hands', price: 2200 },
    { slot: 'gloves', id: 'candy', name: 'Candy hands', price: 600, weekly: true },
    { slot: 'gloves', id: 'rainbow', name: 'Rainbow hands', price: 1800 },
    { slot: 'skin', id: 'sakura', name: 'Sakura ape', price: 2200, season: 'spring' },
    // Nowe kosmetyki: słodkie skórki i dodatki oraz bardzo straszne (nóż i siekiera w głowie, mózg, poroże, zaszyte usta)
    // Druga paczka bardzo strasznych kosmetyków
    { slot: 'skin', id: 'demonape', name: 'Demon ape', price: 4200 },
    { slot: 'skin', id: 'skeletape', name: 'Skeleton ape', price: 3800 },
    { slot: 'skin', id: 'plagueape', name: 'Plague ape', price: 3400 },
    { slot: 'hat', id: 'bolts', name: 'Frankenstein bolts', price: 3600 },
    { slot: 'hat', id: 'spiderhat', name: 'Spider on head', price: 4200 },
    { slot: 'hat', id: 'crowhat', name: 'Crow on head', price: 3800 },
    { slot: 'hat', id: 'wormhead', name: 'Tentacle head', price: 4800 },
    { slot: 'hat', id: 'candlecrown', name: 'Candle crown', price: 3900 },
    { slot: 'hat', id: 'eyestalks', name: 'Eyes on stalks', price: 5000 },
    { slot: 'hat', id: 'knifehalo', name: 'Ring of knives', price: 5200 },
    { slot: 'mask', id: 'screamer', name: 'Screaming ghost', price: 4000 },
    { slot: 'mask', id: 'zipperface', name: 'Zipper mouth', price: 3800 },
    { slot: 'mask', id: 'grin', name: 'Endless grin', price: 4500 },
    { slot: 'mask', id: 'burned', name: 'Burned face', price: 4200 },
    { slot: 'glasses', id: 'stitchedeyes', name: 'Sewn-shut eyes', price: 3000 },
    { slot: 'glasses', id: 'manyeyes', name: 'Many red eyes', price: 3600 },
    { slot: 'glasses', id: 'bloodshot', name: 'Bulging eyes', price: 3400 },
    { slot: 'sleeve', id: 'rotting', name: 'Rotting flesh sleeve', price: 2400 },
    { slot: 'gloves', id: 'rotten', name: 'Rotting hands', price: 2600 },
    // Trzecia paczka bardzo strasznych kosmetyków
    { slot: 'skin', id: 'voidape', name: 'Void ape', price: 4600 },
    { slot: 'skin', id: 'rustape', name: 'Rusty ape', price: 3800 },
    { slot: 'skin', id: 'frozenape', name: 'Frozen corpse ape', price: 3600 },
    { slot: 'hat', id: 'noosehat', name: 'Hangman noose', price: 3400 },
    { slot: 'hat', id: 'rodhead', name: 'Rod through the head', price: 4400 },
    { slot: 'hat', id: 'maggothat', name: 'Maggot hat', price: 3600 },
    { slot: 'hat', id: 'ribcrown', name: 'Rib cage crown', price: 4800 },
    { slot: 'hat', id: 'bleedhalo', name: 'Dripping blood halo', price: 5200 },
    { slot: 'hat', id: 'reaperhood', name: 'Reaper hood', price: 5500 },
    { slot: 'mask', id: 'pigmask', name: 'Bloody pig mask', price: 4000 },
    { slot: 'mask', id: 'melted', name: 'Melted face', price: 4300 },
    { slot: 'mask', id: 'crackeddoll', name: 'Cracked doll face', price: 4600 },
    { slot: 'glasses', id: 'wormeyes', name: 'Worm eyes', price: 3200 },
    { slot: 'glasses', id: 'nailedeyes', name: 'Nails in the eyes', price: 3800 },
    { slot: 'glasses', id: 'cyclops', name: 'Cyclops eye', price: 3500 },
    { slot: 'sleeve', id: 'barbed', name: 'Barbed wire sleeve', price: 2800 },
    { slot: 'gloves', id: 'veined', name: 'Veiny dead hands', price: 3000 },
    { slot: 'skin', id: 'furasek', name: 'Furasek (kitty ape)', price: 3200 },
    { slot: 'skin', id: 'bubblegum', name: 'Bubblegum ape', price: 2000 },
    { slot: 'skin', id: 'cottoncandy', name: 'Cotton candy ape', price: 2000 },
    { slot: 'skin', id: 'honeyape', name: 'Honey bear ape', price: 2200 },
    { slot: 'skin', id: 'mintape', name: 'Mint choc ape', price: 2200 },
    { slot: 'skin', id: 'cadaver', name: 'Cadaver ape', price: 3000 },
    { slot: 'hat', id: 'catears', name: 'Kitty ears', price: 1800 },
    { slot: 'hat', id: 'flowercrown', name: 'Flower crown', price: 1200 },
    { slot: 'hat', id: 'donut', name: 'Donut hat', price: 1500 },
    { slot: 'hat', id: 'unicorn', name: 'Unicorn horn', price: 2500 },
    { slot: 'hat', id: 'knifehead', name: 'Knife in the head', price: 3500 },
    { slot: 'hat', id: 'axehead', name: 'Axe in the skull', price: 4000 },
    { slot: 'hat', id: 'brainhat', name: 'Exposed brain', price: 4500 },
    { slot: 'hat', id: 'nailcrown', name: 'Crown of nails', price: 3800 },
    { slot: 'hat', id: 'antlers', name: 'Bloody antlers', price: 3500 },
    { slot: 'glasses', id: 'starglasses', name: 'Star glasses', price: 900 },
    { slot: 'glasses', id: 'buttoneyes', name: 'Button eyes', price: 2800 },
    { slot: 'glasses', id: 'bleedingeyes', name: 'Bleeding red eyes', price: 3200 },
    { slot: 'mask', id: 'flayed', name: 'Flayed face', price: 4200 },
    { slot: 'mask', id: 'sewn', name: 'Sewn mouth', price: 3600 },
    { slot: 'mask', id: 'faceless', name: 'Faceless', price: 3000 },
    { slot: 'sleeve', id: 'bloodstained', name: 'Butcher apron', price: 1500 },
    { slot: 'gloves', id: 'blooded', name: 'Blood-soaked hands', price: 2000 },
    { slot: 'skin', id: 'lavaape', name: 'Lava ape', price: 3800 },
    { slot: 'skin', id: 'panda', name: 'Panda ape', price: 2400 },
    { slot: 'skin', id: 'midnight', name: 'Midnight ape', price: 1800, weekly: true },
    { slot: 'badge', id: 'heart', name: 'Heart pin', price: 400 },
    { slot: 'badge', id: 'bolt', name: 'Lightning pin', price: 500 },
    { slot: 'badge', id: 'clover', name: 'Clover pin', price: 500 },
    { slot: 'badge', id: 'paw', name: 'Paw print pin', price: 600 },
    { slot: 'emote', id: 'chestpound', name: 'Chest pound', price: 1500 },
    { slot: 'emote', id: 'thumbsup', name: 'Thumbs up', price: 400 },
    { slot: 'emote', id: 'facepalm', name: 'Facepalm', price: 500 },
    { slot: 'emote', id: 'laugh', name: 'Laugh', price: 700 },
    { slot: 'emote', id: 'dab', name: 'Dab', price: 800 },
    { slot: 'emote', id: 'think', name: 'Thinking', price: 400 },
    { slot: 'emote', id: 'victory', name: 'Victory', price: 600 },
    { slot: 'emote', id: 'robot', name: 'Robot dance', price: 1000 }
];


// ---------- SEZONY I TYGODNIOWA ROTACJA SKLEPU ----------
// Sezonowe przedmioty kupisz tylko w oknie czasowym (daty co roku te same), zdobyte zostają na zawsze.
export const SEASONS = {
    halloween: { name: 'Halloween', from: [10, 15], to: [11, 20] },
    winter: { name: 'Winter', from: [12, 1], to: [1, 10] },
    spring: { name: 'Spring', from: [3, 15], to: [5, 15] },
    summer: { name: 'Summer', from: [6, 15], to: [8, 31] }
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mdVal = (m, d) => m * 100 + d;
export function seasonActive(id) {
    const z = SEASONS[id]; if (!z) return true;
    const n = new Date(), v = mdVal(n.getMonth() + 1, n.getDate()), a = mdVal(z.from[0], z.from[1]), b = mdVal(z.to[0], z.to[1]);
    return a <= b ? (v >= a && v <= b) : (v >= a || v <= b);
}
export function seasonText(id) {
    const z = SEASONS[id]; if (!z) return '';
    return seasonActive(id) ? 'until ' + MONTHS[z.to[0] - 1] + ' ' + z.to[1] : 'back ' + MONTHS[z.from[0] - 1] + ' ' + z.from[1];
}
const WEEK_MS = 7 * 86400000, WEEK_SHIFT = 3 * 86400000;   // tydzień od poniedziałku (epoka Unix zaczyna się w czwartek)
export const WEEKLY_COUNT = 4, WEEKLY_DISCOUNT = 0.2;
export function weekIndex() { return Math.floor((Date.now() + WEEK_SHIFT) / WEEK_MS); }
export function weekMsLeft() { return (weekIndex() + 1) * WEEK_MS - WEEK_SHIFT - Date.now(); }
let weeklyCache = { week: -1, keys: new Set() };
export function weeklyKeys() {
    const w = weekIndex();
    if (weeklyCache.week === w) return weeklyCache.keys;
    const pool = CATALOG.filter(i => i.weekly).map(i => i.slot + ':' + i.id);
    let h = hashStr('week-' + w);
    const keys = new Set();
    while (keys.size < Math.min(WEEKLY_COUNT, pool.length)) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; keys.add(pool.splice(h % pool.length, 1)[0]); }
    weeklyCache = { week: w, keys: keys };
    return keys;
}
export function isFeatured(item) { return !!item.weekly && weeklyKeys().has(item.slot + ':' + item.id); }
// Cena z rabatem dla polecanych w tym tygodniu
export function priceOf(item) { return isFeatured(item) ? Math.round(item.price * (1 - WEEKLY_DISCOUNT) / 10) * 10 : item.price; }
// Dlaczego nie można teraz kupić (pusty tekst = można)
export function lockText(item) {
    if (isOwned(item)) return '';
    if (item.locked) return item.hint || 'Locked';
    if (item.season && !seasonActive(item.season)) return SEASONS[item.season].name + ' ' + seasonText(item.season);
    if (item.weekly && !isFeatured(item)) return 'Not in stock this week';
    return '';
}
export const SLOTS = [{ id: 'skin', name: 'Skins' }, { id: 'badge', name: 'Badges' }, { id: 'hat', name: 'Hats' }, { id: 'glasses', name: 'Glasses' }, { id: 'mask', name: 'Masks' }, { id: 'sleeve', name: 'Sleeves' }, { id: 'gloves', name: 'Hands' }, { id: 'mskin', name: 'BagaBoo Games' }, { id: 'emote', name: 'Emotes' }, { id: 'pethat', name: 'Pet hats' }, { id: 'petneck', name: 'Pet wear' }];

// Pula zadań dziennych: każdego dnia losowane są 3 (takie same dla wszystkich graczy danego dnia)
export const QUEST_POOL = [
    { id: 'height', text: 'Climb 12 m above the floor', target: 12, reward: 100 },
    { id: 'rope', text: 'Grab the guts ropes 5 times', target: 5, reward: 60 },
    { id: 'throw', text: 'Throw an eyeball 8 times', target: 8, reward: 50 },
    { id: 'play', text: 'Play for 15 minutes', target: 15, reward: 70 },
    { id: 'social', text: 'Spend 10 minutes with other players', target: 10, reward: 120 },
    { id: 'top', text: 'Stand on top of the spiral stairs', target: 1, reward: 90 },
    { id: 'shop', text: 'Buy or wear an item in the shop', target: 1, reward: 40 }
];

// Bonusy za aktywności (z dziennym limitem, żeby nie dało się ich nabijać w nieskończoność)
export const ACTIVITY = {
    tramp: { each: 2, cap: 40, label: 'Trampoline bounce' },
    rope: { each: 3, cap: 30, label: 'Rope grab' },
    throw: { each: 1, cap: 20, label: 'Eyeball throw' },
    play: { each: 10, every: 300, cap: 120, label: 'Every 5 min played' },
    social: { each: 15, every: 300, cap: 150, label: 'Every 5 min with others' },
    fuse: { each: 40, cap: 160, label: 'Fuse found' }
};

// Osiągnięcia: każde odblokowuje unikalny kosmetyk
export const ACHIEVEMENTS = [
    { id: 'maze_runner', name: 'Maze runner', desc: 'Escape the maze without a single jumpscare', reward: ['gloves', 'neon'], rewardName: 'Neon hands' },
    { id: 'silent_ghost', name: 'Silent ghost', desc: 'Survive Absolute Silence without throwing a ball or being caught', reward: ['sleeve', 'ghostcloth'], rewardName: 'Ghost cloth' },
    { id: 'well_climber', name: 'Well climber', desc: 'Climb out of the well in under 4:30', reward: ['hat', 'miner'], rewardName: "Miner's helmet" },
    { id: 'route_rush', name: 'Route rush', desc: 'Finish the red route in under 1:30', reward: ['glasses', 'goldshades'], rewardName: 'Gold shades' },
    { id: 'lava_walker', name: 'Lava walker', desc: 'Finish Floor is Lava without burning even once', reward: ['badge', 'flame'], rewardName: 'Lava walker badge' },
    { id: 'completionist', name: 'Completionist', desc: 'Beat all three levels and become Parkour King', reward: ['skin', 'bloodmoon'], rewardName: 'Bloodmoon skin' },
    // --- Zadania dzienne ---
    { id: 'quest_5', name: 'Errand runner', desc: 'Finish 5 daily quests', reward: ['hat', 'headphones'], rewardName: 'Headphones', goal: 5, val: () => SAVE.questsDone || 0 },
    { id: 'quest_20', name: 'Quest veteran', desc: 'Finish 20 daily quests', reward: ['glasses', '3d'], rewardName: '3D glasses', goal: 20, val: () => SAVE.questsDone || 0 },
    { id: 'quest_days7', name: 'Perfect week', desc: 'Finish all 3 quests on 7 different days', reward: ['hat', 'laurel'], rewardName: 'Golden laurel', goal: 7, val: () => SAVE.bonusDays || 0 },
    { id: 'streak_7', name: 'Regular', desc: 'Reach a login streak of 7', reward: ['gloves', 'golden'], rewardName: 'Golden gloves', goal: 7, val: () => SAVE.login.streak || 0 },
    // --- Wyzwania na poziomach (Nightmare) ---
    { id: 'nm_first', name: 'Into the dark', desc: 'Clear any level on Nightmare', reward: ['badge', 'nm'], rewardName: 'Nightmare pin' },
    { id: 'nm_maze', name: 'Lost for real', desc: 'Escape The Maze on Nightmare', reward: ['mask', 'stitched'], rewardName: 'Stitched face' },
    { id: 'nm_silence', name: 'Deaf to fear', desc: 'Survive Silence on Nightmare', reward: ['glasses', 'night'], rewardName: 'Night vision' },
    { id: 'nm_well', name: 'Tar-proof', desc: 'Climb out of The Well on Nightmare', reward: ['gloves', 'tar'], rewardName: 'Tar hands' },
    { id: 'nm_laundry', name: 'Clean getaway', desc: 'Escape the Laundromat on Nightmare', reward: ['sleeve', 'woven'], rewardName: 'Woven threads' },
    { id: 'nm_memory', name: 'Burning brain', desc: 'Cross Burning Memory on Nightmare', reward: ['sleeve', 'ember'], rewardName: 'Ember cloth' },
    { id: 'nm_hospital', name: 'Do not blink', desc: 'Escape The Hospital on Nightmare', reward: ['hat', 'nursecap'], rewardName: 'Nurse cap' },
    { id: 'nm_cemetery', name: 'Rest in peace', desc: 'Escape The Cemetery on Nightmare', reward: ['hat', 'lanternhat'], rewardName: 'Lantern hat' },
    { id: 'nm_hotel', name: 'Checked out', desc: 'Escape The Hotel on Nightmare', reward: ['hat', 'bellhop'], rewardName: 'Bellhop cap' },
    { id: 'nm_nursery', name: 'Lullaby', desc: 'Escape The Nursery on Nightmare', reward: ['hat', 'teddyears'], rewardName: 'Teddy ears' },
    { id: 'nm_catacombs', name: 'Bone collector', desc: 'Escape The Catacombs on Nightmare', reward: ['hat', 'skullcrown'], rewardName: 'Skull crown' },
    { id: 'nm_room000', name: 'Inmate 000', desc: 'Escape Room 000 on Nightmare', reward: ['hat', 'prisoncap'], rewardName: 'Prisoner cap' },
    { id: 'nm_furas', name: 'Fluffy nightmare', desc: 'Escape The Fur Den on Nightmare', reward: ['badge', 'goldfish'], rewardName: 'Golden fish pin' },
    { id: 'nm_all', name: 'Nightmare master', desc: 'Clear all ' + DIFF_LEVEL_IDS.length + ' levels on Nightmare', reward: ['skin', 'nightmare'], rewardName: 'Nightmare ape', goal: DIFF_LEVEL_IDS.length, val: () => Object.keys(SAVE.nmWins || {}).length },
    // --- Tryby gry ---
    { id: 'hs_10', name: 'Ghost of the warehouse', desc: 'Win 10 rounds of Hide and Seek', reward: ['badge', 'ghost'], rewardName: 'Ghost badge', goal: 10, val: () => SAVE.hideseekWins || 0 },
    { id: 'banana_5', name: 'Top banana', desc: 'Win 5 rounds of Capture the Banana', reward: ['badge', 'banana'], rewardName: 'Banana badge', goal: 5, val: () => SAVE.bananaWins || 0 },
    { id: 'race_5', name: 'Fast lane', desc: 'Win 5 races', reward: ['badge', 'flag'], rewardName: 'Race flag', goal: 5, val: () => SAVE.raceWins || 0 },
    { id: 'gift_3', name: 'Generous', desc: 'Give 3 gifts to other players', reward: ['badge', 'present'], rewardName: 'Present badge', goal: 3, val: () => SAVE.giftsSent || 0 },
    // --- Statystyki konta (SAVE.stats) ---
    { id: 'hf_5', name: 'High fiver', desc: 'Give 5 high fives to other players', reward: ['emote', 'heart'], rewardName: 'Heart emote', goal: 5, val: () => stat('highFives') },
    { id: 'scared_25', name: 'Easily spooked', desc: 'Get jumpscared 25 times', reward: ['emote', 'shrug'], rewardName: 'Shrug emote', goal: 25, val: () => stat('scares') },
    { id: 'clears_25', name: 'Seasoned survivor', desc: 'Clear levels 25 times', reward: ['emote', 'salute'], rewardName: 'Salute emote', goal: 25, val: () => stat('clears') },
    { id: 'play_5h', name: 'Basement dweller', desc: 'Play for 5 hours in total', reward: ['bones', 1000], rewardName: '+1000 Bagabucks', goal: 5, val: () => Math.floor(stat('playSec') / 3600) },
    { id: 'walk_10k', name: 'Marathon', desc: 'Walk 10 km in total', reward: ['bones', 800], rewardName: '+800 Bagabucks', goal: 10, val: () => Math.floor(stat('meters') / 1000) },
    { id: 'emote_50', name: 'Show-off', desc: 'Use emotes 50 times', reward: ['bones', 500], rewardName: '+500 Bagabucks', goal: 50, val: () => stat('emotes') },
    { id: 'daily_5', name: 'Daily habit', desc: 'Finish 5 Daily Runs (Maze, Well or Memory)', reward: ['badge', 'daily'], rewardName: 'Calendar badge', goal: 5, val: () => SAVE.dailyRuns || 0 }
];
// Statystyki konta liczone na stałe (SAVE.stats): playSec, meters, scares, clears, emotes, highFives
export function stat(k) { return (SAVE.stats && SAVE.stats[k]) || 0; }
export const RECORDS = RECORD_DEFS;   // z core/registry.js (poziom z polem rec dostaje rekord, poziom z trudnością także rekord Nightmare)

// ---------- POZIOMY TRUDNOŚCI (poziomy z drzwi w sali Levels) ----------
// speed: mnożnik prędkości potworów, grace: mnożnik czasu na reakcję/przewagi, checkpoints: czy działają punkty kontrolne, respawns: ile razy na bieg wolno wrócić do checkpointu (brak = bez limitu),
// reward: mnożnik nagrody za przejście. Easy nie liczy się do rekordów, Nightmare ma własne rekordy i bonus za pierwsze przejście.
export const DIFFS = {
    easy: { id: 'easy', name: 'Easy', color: '#7fc47f', speed: 0.8, grace: 1.5, checkpoints: true, reward: 0.5, info: 'Slower monsters, more time. Reward x0.5, no records.' },
    normal: { id: 'normal', name: 'Normal', color: '#ffd27a', speed: 1, grace: 1, checkpoints: true, respawns: 3, reward: 1, info: 'The original experience. 3 checkpoint respawns per run.' },
    nightmare: { id: 'nightmare', name: 'Nightmare', color: '#ff4a3a', speed: 1.25, grace: 0.6, checkpoints: false, reward: 1.5, info: 'Faster monsters, no checkpoints. Reward x1.5, own records, first-clear bonus.' }
};
export const DIFF_ORDER = ['easy', 'normal', 'nightmare'];
export const DIFF_LEVELS = DIFF_LEVEL_IDS;   // z core/registry.js

// ---------- DAILY RUN: dzienny, wspólny układ dla poziomów z losową mapą ----------
// Układ Maze, Well i Memory liczy się z daty UTC (ten sam dla wszystkich graczy na świecie), więc działa duch,
// dzienna lista czasów i jednorazowy bonus za ukończenie. Bieg jest "dzienny", gdy ziarno poziomu = ziarno dnia.
export const DAILY_LEVELS = ['maze', 'well', 'memory'];
const RUN = {};   // czy bieżący bieg poziomu jest dzienny (ustawia main.js przy wejściu)
export function dailyDate() { return new Date().toISOString().slice(0, 10); }
export function dailySeed(level) { return hashStr('daily-' + level + '-' + dailyDate()) % 1000000000; }
export function setRunSeed(level, seed) { RUN[level] = seed !== undefined && DAILY_LEVELS.includes(level) && seed === dailySeed(level); }
export function isDaily(level) { return !!RUN[level]; }
export function dailyOn(level) { return !!(SAVE.dailyMode && SAVE.dailyMode[level]); }
export function setDailyMode(level, on) { SAVE.dailyMode = SAVE.dailyMode || {}; SAVE.dailyMode[level] = !!on; saveGame(); markAllDirty(); }
export function dailyKey(level, diff) { return 'daily:' + level + ':' + dailyDate() + ':' + (diff || getDiff(level)); }
function pruneDaily(obj) { if (!obj) return; const d = ':' + dailyDate() + ':'; for (const k of Object.keys(obj)) if (k.startsWith('daily:') && !k.includes(d)) delete obj[k]; }
export const HEIGHT_RECORD_BONUS = 10;   // za każdy nowy metr rekordu wysokości
export const HIGH_DAILY_BONUS = 30;      // pierwsze wejście na 15 m danego dnia

function defaultSave() {
    return {
        v: 1, wallet: START_BONES, earned: 0,
        owned: ['skin:none', 'badge:none', 'tool:none', 'mskin:none', 'hat:none', 'hat:cap', 'glasses:none', 'mask:none', 'sleeve:cloth', 'gloves:none', 'pethat:none', 'petneck:none', 'emote:wave', 'emote:cheer', 'emote:highfive'],
        equipped: { skin: 'none', badge: 'none', tool: 'none', mskin: 'none', hat: 'none', glasses: 'none', mask: 'none', sleeve: 'cloth', gloves: 'none', pethat: 'none', petneck: 'none', emote: 'wave' },
        profile: { name: 'Acrobat', color: '#3d2314' },
        best: { height: 0, jumps: 0 },
        login: { last: 0, streak: 0 },
        daily: null, pos: null, savedAt: 0,
        records: {}, achievements: {}, diff: {}, top: {}, nmWins: {}, questsDone: 0, bonusDays: 0, dailyMode: {}, dailyTop: {}, dailyDone: {}, dailyRuns: 0, stats: {}
    };
}
// Podpis zapisu: suma kontrolna z "solą". Wykrywa ręczne zmiany w przeglądarce (nie jest to pełne zabezpieczenie).
const SALT = 'bgb-vr-2026-salt';
function sign(text) { let h = 2166136261; const t = SALT + text; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
export let loadNotice = '';   // komunikat dla gracza po wczytaniu (np. zapis był zmieniony)
function readSlot(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return { state: 'empty' };
    let obj; try { obj = JSON.parse(raw); } catch (e) { return { state: 'broken' }; }
    if (obj && obj.d && obj.s) { const text = JSON.stringify(obj.d); return sign(text) === obj.s ? { state: 'ok', data: obj.d } : { state: 'tampered' }; }
    return obj && typeof obj === 'object' ? { state: 'ok', data: obj, legacy: true } : { state: 'broken' };   // stary, niepodpisany zapis
}
function load() {
    const d = defaultSave();
    let r;
    try {
        r = readSlot(SAVE_KEY);
        if (r.state === 'broken' || r.state === 'tampered') {
            const b = readSlot(SAVE_KEY + '_bak');
            if (b.state === 'ok') { loadNotice = r.state === 'broken' ? 'Your save was damaged. Restored the backup.' : 'Your save was modified. Restored the backup.'; r = b; }
            else { loadNotice = r.state === 'broken' ? 'Your save was damaged and could not be restored.' : 'Your save was modified by hand. Progress was reset.'; return d; }
        }
        if (r.state !== 'ok') return d;
        const s = r.data;
        const owned = Array.isArray(s.owned) ? s.owned : d.owned.slice();
        for (const o of d.owned) if (!owned.includes(o)) owned.push(o);   // nowe darmowe przedmioty dla starych zapisów
        return Object.assign(d, s, {
            equipped: Object.assign(d.equipped, s.equipped || {}),
            profile: Object.assign(d.profile, s.profile || {}),
            best: Object.assign(d.best, s.best || {}),
            login: Object.assign(d.login, s.login || {}),
            records: Object.assign({}, s.records || {}),
            achievements: Object.assign({}, s.achievements || {}),
            diff: Object.assign({}, s.diff || {}), top: Object.assign({}, s.top || {}), nmWins: Object.assign({}, s.nmWins || {}),
            dailyMode: Object.assign({}, s.dailyMode || {}), dailyTop: Object.assign({}, s.dailyTop || {}), dailyDone: Object.assign({}, s.dailyDone || {}),
            stats: Object.assign({}, s.stats || {}),
            owned: owned
        });
    } catch (e) { return d; }
}
export const SAVE = load();
let statDirty = false, statSaveT = 0;
// Zwiększa licznik statystyk. Zapis na dysk jest rzadki (co ok. 30 s), osiągnięcia sprawdzane przy zmianie całości.
export function bumpStat(k, n) {
    n = n === undefined ? 1 : n; if (!(n > 0)) return;
    SAVE.stats[k] = (SAVE.stats[k] || 0) + n; statDirty = true;
    if (Math.floor(SAVE.stats[k]) !== Math.floor(SAVE.stats[k] - n)) checkStatAchievements();
}
function checkStatAchievements() { for (const a of ACHIEVEMENTS) if (a.val && a.goal && !SAVE.achievements[a.id] && a.id.match(/^(hf_|scared_|clears_|play_|walk_|emote_)/) && a.val() >= a.goal) unlockAchievement(a.id); }
export function flushStats(dt) { statSaveT += dt; if (statDirty && statSaveT > 30) { statSaveT = 0; statDirty = false; saveGame(); } }
export const SESSION = { maxH: 0, jumps: 0, since: Date.now(), lastM: 0 };

export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
export function saveGame() {
    try {
        SAVE.savedAt = Date.now();
        const prev = localStorage.getItem(SAVE_KEY);
        if (prev && readSlot(SAVE_KEY).state === 'ok') localStorage.setItem(SAVE_KEY + '_bak', prev);   // kopia zapasowa poprzedniego zapisu
        const text = JSON.stringify(SAVE);
        localStorage.setItem(SAVE_KEY, JSON.stringify({ d: JSON.parse(text), s: sign(text) }));
        return true;
    } catch (e) { return false; }
}
export function resetSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '_bak'); } catch (e) {} }

// Wydatek spoza sklepu z katalogiem (np. meble w Moim Pokoju): tylko dodatnia, skończona kwota i tylko gdy stać gracza; zapisuje grę
export function spendBones(n, why) {
    if (typeof n !== 'number' || !Number.isFinite(n) || !(n > 0) || SAVE.wallet < n) return false;
    SAVE.wallet -= n; toast('-' + n + ' ' + CURRENCY + ': ' + why, '#e0a030'); saveGame(); markAllDirty();
    return true;
}
export function addBones(n, why) {
    if (!(n > 0)) return;
    SAVE.wallet += n; SAVE.earned += n;
    toast('+' + n + ' ' + CURRENCY + ': ' + why);
    markAllDirty();
}

// --- Wygląd i sklep ---
const lookListeners = [];
export function onLookChange(fn) { lookListeners.push(fn); }
function notifyLook() { const l = getLook(); lookListeners.forEach(f => f(l)); markAllDirty(); }
export function getLook() {
    if ((SAVE.cheater || SAVE.equipped.skin === 'cheater') && isStaffName(SAVE.profile.name)) { SAVE.cheater = false; if (SAVE.equipped.skin === 'cheater') SAVE.equipped.skin = 'none'; refreshStaffItems(); saveGame(); }   // ekipa nigdy nie jest CHEATEREM
    // Ultimate admin jest zawsze cały złoty
    // Ultimate admin jest zawsze cały złoty, a przyłapany na włamaniu ma na zawsze skórkę CHEATER
    return { name: SAVE.profile.name, hideTag: !!SAVE.profile.hideTag && !SAVE.cheater, cheater: !!SAVE.cheater, mskin: SAVE.equipped.mskin || 'none',
        skin: SAVE.cheater ? 'cheater' : (isUltimateName(SAVE.profile.name) ? 'ultimate' : SAVE.equipped.skin), badge: SAVE.equipped.badge, tool: SAVE.equipped.tool, color: SAVE.profile.color, hat: SAVE.equipped.hat, glasses: SAVE.equipped.glasses, mask: SAVE.equipped.mask, sleeve: SAVE.equipped.sleeve, gloves: SAVE.equipped.gloves, roleTags: activeRoleTags() };
}
// Napisy ról nad głową do wyboru w Gorilla Machine (np. BoyIsGamer: owner, admin, mod). Konto z jedną rolą nie ma wyboru (null = bez filtra).
export function roleTagOptions() { return roleTagsFor(SAVE.profile.name).map(r => ({ id: r.id, text: r.text })); }
// Zapisujemy, które napisy gracz WYŁĄCZYŁ (roleTagsOff), a nie które włączył: dzięki temu nowa rola (np. FURAS) pokazuje się od razu, także na starym zapisie.
// Stary zapis (lista pokazywanych roleTags) jest przy odczycie przeliczany na listę wyłączonych; nowych ról w nim nie było, więc FURAS zostaje widoczny.
function hiddenRoleTags(all) {
    const off = SAVE.profile.roleTagsOff;
    if (Array.isArray(off)) return off;
    const sel = SAVE.profile.roleTags;
    return Array.isArray(sel) ? all.filter(id => id !== 'furas' && !sel.includes(id)) : [];
}
export function activeRoleTags() {
    const all = roleTagOptions().map(o => o.id);
    if (all.length < 2) return null;
    const off = hiddenRoleTags(all), pick = all.filter(id => !off.includes(id));
    return pick.length ? pick : all;
}
// Włącza / wyłącza jeden napis; zawsze zostaje przynajmniej jeden (pokazać można od 1 do wszystkich)
export function toggleRoleTag(id) {
    const cur = activeRoleTags(); if (!cur) return;
    const all = roleTagOptions().map(o => o.id), next = cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id);
    if (!next.length) return;
    SAVE.profile.roleTagsOff = all.filter(x => !next.includes(x)); delete SAVE.profile.roleTags; saveGame(); notifyLook();
}
// Ukrywanie własnego napisu z rolą nad głową (przełącznik w pokoju szefa)
export function setHideTag(on) { SAVE.profile.hideTag = !!on; saveGame(); notifyLook(); }
// Włamanie do pokoju szefa: skórka CHEATER na zawsze (zapisana w save, nie do zdjęcia)
export function markCheater() { if (isStaffName(SAVE.profile.name)) return; if (!SAVE.cheater) { SAVE.cheater = true; if (!SAVE.owned.includes('skin:cheater')) SAVE.owned.push('skin:cheater'); SAVE.equipped.skin = 'cheater'; saveGame(); notifyLook(); } }
export function setProfile(p) { Object.assign(SAVE.profile, p); refreshStaffItems(); saveGame(); notifyLook(); }
// Odznaki Admin / Moderator i młotek Kick należą się tylko ekipie (wg nicku); reszcie są zabierane
// Nick potwierdzony przez serwer kont w tej sesji (ustawia main.js po zalogowaniu); nie jest zapisywany
let verifiedNick = '';
export const ULTIMATE_SPEED = 2;   // ultimate admin biega 2 razy szybciej niż każdy inny gracz
// Prędkość ultimate admina liczy się tylko dla konta potwierdzonego przez serwer kont (sam wpisany nick nic nie daje)
function syncPersonal() { const k = String(SAVE.profile.name || '').trim().toLowerCase(); PERSONAL.speed = isUltimateName(SAVE.profile.name) && verifiedNick === k ? ULTIMATE_SPEED : 1; }
export function markNickVerified(name) { verifiedNick = String(name || '').trim().toLowerCase(); syncPersonal(); }
const BONUS_KEY = 'bagaboo_staff_bonus_';
function grantStaffBonus() {
    const n = SAVE.profile.name, k = String(n || '').trim().toLowerCase();
    if (!isStaffName(n) || !isReservedNick(n) || verifiedNick !== k) return;   // stała ekipa + hasło potwierdzone teraz
    let claimed = false; try { claimed = !!localStorage.getItem(BONUS_KEY + k); } catch (e) {}
    if (claimed || SAVE.staffBonus10k) { SAVE.staffBonus10k = true; return; }
    SAVE.staffBonus10k = true; try { localStorage.setItem(BONUS_KEY + k, String(Date.now())); } catch (e) {}
    addBones(STAFF_BONUS, 'staff bonus');
}
export function refreshStaffItems() {
    syncPersonal();
    // Ekipa (admin, moderator) nigdy nie jest CHEATEREM: skórka z błędnego włamania jest zdejmowana
    if (SAVE.cheater && isStaffName(SAVE.profile.name)) { SAVE.cheater = false; const i = SAVE.owned.indexOf('skin:cheater'); if (i >= 0) SAVE.owned.splice(i, 1); if (SAVE.equipped.skin === 'cheater') SAVE.equipped.skin = 'none'; }
    // Premia dla ekipy: jednorazowo 10000 Bagabucks, ale TYLKO dla stałej ekipy (nicki z hasłem w config.js), po poprawnym haśle w tej sesji.
    // Moderatorzy mianowani w grze (localMods) i każdy, kto ręcznie wpisze nick ekipy w pamięci przeglądarki, jej nie dostają.
    // Znacznik odebrania leży osobno od zapisu gry (kasowanie zapisu nie daje drugiej premii na tym urządzeniu).
    grantStaffBonus();
    const n = SAVE.profile.name, give = (key, on) => { const has = SAVE.owned.includes(key); if (on && !has) SAVE.owned.push(key); if (!on && has) SAVE.owned.splice(SAVE.owned.indexOf(key), 1); };
    if ((isOwnerName(n) || isUltimateName(n)) && !SAVE.owned.includes('tool:ban')) SAVE.owned.push('tool:ban');   // Ban hammer za darmo dla właściciela i ultimate admina
    const rights = staffBadgesFor(n);
    for (const b of ['owner', 'ultimate', 'coadmin', 'admin', 'mod']) give('badge:' + b, rights.includes(b));   // odznaka furas jest niżej, razem ze skórką
    const furas = isFurasName(n), hadFuras = SAVE.owned.includes('skin:furas');   // ranga FURAS: skórka (maska kota + ogon) i odznaka z kotkiem
    give('badge:furas', furas); give('skin:furas', furas);
    if (furas && !hadFuras && SAVE.equipped.skin === 'none') SAVE.equipped.skin = 'furas';   // przy pierwszym nadaniu skórka od razu się zakłada
    if (!furas && SAVE.equipped.skin === 'furas') SAVE.equipped.skin = 'none';
    const therian = isTherianName(n), hadTherian = SAVE.owned.includes('skin:therian');   // Therian: skórka na własność dla wybranych nicków; można ją zdjąć i założyć w każdej chwili w Maszynie goryla
    give('skin:therian', therian);
    if (therian && !SAVE.therianSet) { SAVE.therianSet = true; SAVE.equipped.skin = 'therian'; }   // domyślna skórka spikyvr: zakłada się raz, od razu (też na starym zapisie); potem może ją zmienić na dowolną inną i z powrotem
    if (!therian && SAVE.equipped.skin === 'therian') SAVE.equipped.skin = 'none';
    give('tool:kick', isStaffName(n));
    give('tool:gooby', isStaffName(n));   // Nothing Hammer (Gooby) dla całej ekipy
    if (['owner', 'ultimate', 'coadmin', 'admin', 'mod', 'furas'].includes(SAVE.equipped.badge) && !rights.includes(SAVE.equipped.badge)) SAVE.equipped.badge = 'none';
    if (!isStaffName(n)) { if (SAVE.equipped.tool !== 'none') SAVE.equipped.tool = 'none'; }
}
export function isOwned(item) { return SAVE.owned.includes(item.slot + ':' + item.id); }
export function isEquipped(item) { return SAVE.equipped[item.slot] === item.id; }
export function isLocked(item) { return !isOwned(item) && !!lockText(item); }
// Trudność wybrana dla poziomu (zapisana w save, ustawiana przy drzwiach w sali Levels)
export function getDiff(level) { const d = SAVE.diff && SAVE.diff[level]; return DIFFS[d] ? d : 'normal'; }
export function diffOf(level) { return DIFFS[getDiff(level)]; }
export function setDiff(level, d) { if (!DIFFS[d]) return; SAVE.diff = SAVE.diff || {}; SAVE.diff[level] = d; saveGame(); markAllDirty(); }
// Klucz rekordu z uwzględnieniem trudności (Nightmare ma osobne rekordy, Easy żadnych)
export function recordKey(level, diff) { diff = diff || getDiff(level); return diff === 'nightmare' ? level + '_nm' : level; }
// Nagroda za przejście poziomu: pełna za pierwszym razem, potem mniejsza, maks. REPEAT_LIMIT razy dziennie.
// Mnożnik trudności; pierwsze przejście na Nightmare daje jednorazowy bonus (poza dziennym limitem).
export function levelReward(level, first, repeat, label) {
    if (mutatorActive()) { toast('Mutator run: no reward, no record, no progress', '#ffb030'); return; }   // bieg ze zmienionymi zasadami (core/mutators.js)
    SESSION.wins = (SESSION.wins || 0) + 1;   // wygrane w tej sesji (tablica w lobby, tylko do wyświetlania)
    const key = level + 'Wins', wins = SAVE[key] || 0, df = diffOf(level);
    SAVE[key] = wins + 1;
    let amount = 0;
    if (wins === 0) amount = first;
    else {
        const d = ensureDaily(); d.repeats = d.repeats || {};
        const n = d.repeats[level] || 0;
        if (n < REPEAT_LIMIT) { d.repeats[level] = n + 1; amount = repeat; }
    }
    amount = Math.round(amount * df.reward);
    const tag = df.id === 'normal' ? '' : ' [' + df.name + ']';
    if (amount > 0) addBones(amount, (wins === 0 ? 'first ' : '') + label + tag);
    else toast('Daily reward limit for this level reached. Come back tomorrow!', '#ffb030');
    if (df.id === 'nightmare' && !SAVE.nmWins[level]) { SAVE.nmWins[level] = Date.now(); addBones(Math.round(first * 0.5), 'first Nightmare clear!'); }
    if (isDaily(level)) {   // Daily Run: jednorazowy bonus za każdy poziom dziennie (poza dziennym limitem powtórek)
        const k = dailyKey(level); pruneDaily(SAVE.dailyDone);
        if (!SAVE.dailyDone[k]) { SAVE.dailyDone[k] = 1; SAVE.dailyRuns = (SAVE.dailyRuns || 0) + 1; addBones(Math.round(first * 0.3 * df.reward), 'Daily Run bonus'); }
    }
    bumpStat('clears');
    checkCompletionist(); checkCounters();
    saveGame();
    return amount;
}
export function rewardActivity(key) { capped(key, ACTIVITY[key].each); }
// Rekordy czasów (w sekundach). Zwraca true przy nowym rekordzie. Easy nie liczy się do rekordów,
// Nightmare zapisuje się pod kluczem "<poziom>_nm". Każdy zaliczony czas trafia też do listy top 5.
export function recordTime(id, sec) {
    if (mutatorActive()) return false;   // mutator zmienia zasady: bez rekordów (nie rusza listy czasów ani ducha)
    const diff = getDiff(id);
    if (diff === 'easy') { toast('Easy runs do not count for records', '#9aa0a0'); return false; }
    if (isDaily(id)) {   // dzienny układ: osobna lista czasów dnia (nie miesza się z rekordami życia)
        const dk = dailyKey(id, diff); SAVE.dailyTop = SAVE.dailyTop || {}; pruneDaily(SAVE.dailyTop);
        const prevList = SAVE.dailyTop[dk] || [], prevBest = prevList[0], r = Math.round(sec * 10) / 10;
        SAVE.dailyTop[dk] = prevList.concat([r]).sort((a, b) => a - b).slice(0, 5);
        saveGame(); markAllDirty();
        if (prevBest === undefined || r < prevBest) { toast(prevBest === undefined ? 'Daily time: ' + fmtDuration(sec * 1000) : 'New daily record: ' + fmtDuration(sec * 1000), '#7fe8ff'); return true; }
        return false;
    }
    const key = recordKey(id, diff), prev = SAVE.records[key];
    SAVE.top = SAVE.top || {};
    const list = (SAVE.top[key] || []).concat([Math.round(sec * 10) / 10]).sort((a, b) => a - b).slice(0, 5);
    SAVE.top[key] = list;
    if (prev === undefined || sec < prev) {
        SAVE.records[key] = Math.round(sec * 10) / 10; saveGame(); markAllDirty();
        if (prev !== undefined) toast('New record: ' + fmtDuration(sec * 1000), '#ffd27a');
        return true;
    }
    saveGame(); markAllDirty();
    return false;
}
export function topTimes(id, diff, daily) {
    const l = daily ? SAVE.dailyTop && SAVE.dailyTop[dailyKey(id, diff)] : SAVE.top && SAVE.top[recordKey(id, diff)];
    return l ? l.slice() : [];
}
// Rekord punktowy (im więcej, tym lepiej), np. strzelnica
export function recordScore(id, score) {
    if (mutatorActive()) return;
    const prev = SAVE.records[id];
    if (prev === undefined || score > prev) { SAVE.records[id] = score; saveGame(); markAllDirty(); if (prev !== undefined) toast('New record: ' + score, '#ffd27a'); return true; }
    return false;
}
// Osiągnięcia oparte na licznikach (zadania, seria logowań, Nightmare, wygrane w trybach); wywoływane po każdej takiej zmianie
export function checkCounters() {
    if ((SAVE.questsDone || 0) >= 5) unlockAchievement('quest_5');
    if ((SAVE.questsDone || 0) >= 20) unlockAchievement('quest_20');
    if ((SAVE.bonusDays || 0) >= 7) unlockAchievement('quest_days7');
    if ((SAVE.login.streak || 0) >= 7) unlockAchievement('streak_7');
    const nm = SAVE.nmWins || {};
    if (Object.keys(nm).length) unlockAchievement('nm_first');
    for (const l of DIFF_LEVELS) if (nm[l]) unlockAchievement('nm_' + l);
    if (DIFF_LEVELS.every(l => nm[l])) unlockAchievement('nm_all');
    if ((SAVE.hideseekWins || 0) >= 10) unlockAchievement('hs_10');
    if ((SAVE.bananaWins || 0) >= 5) unlockAchievement('banana_5');
    if ((SAVE.raceWins || 0) >= 5) unlockAchievement('race_5');
    if ((SAVE.dailyRuns || 0) >= 5) unlockAchievement('daily_5');
    if ((SAVE.giftsSent || 0) >= 3) unlockAchievement('gift_3');
}
// ---------- PREZENTY ----------
// Podarować można kosmetyk, który da się teraz kupić (nie nagrodę za osiągnięcie ani rzecz dla ekipy). Płaci darczyńca (cena z rabatem
// tygodnia), a obdarowany dostaje przedmiot do szafy. Limit 3 prezentów dziennie.
export const GIFT_LIMIT = 3;
const GIFT_SLOTS = ['skin', 'hat', 'glasses', 'mask', 'sleeve', 'gloves', 'badge', 'mskin', 'emote'];
export function giftable(item) { return !!item && GIFT_SLOTS.includes(item.slot) && !item.locked && item.price > 0 && !isLocked(item); }
export function giftsLeft() { const d = ensureDaily(); return Math.max(0, GIFT_LIMIT - (d.gifts || 0)); }
export function findItem(key) { return CATALOG.find(i => i.slot + ':' + i.id === key); }
// Obdarowany: przyjmuje tylko prawdziwy przedmiot z katalogu, który może jeszcze nie ma. Zwraca true, gdy przyjął.
export function receiveGift(key, fromName) {
    const it = findItem(key);
    if (!it || !GIFT_SLOTS.includes(it.slot) || it.locked || SAVE.owned.includes(key)) return false;
    SAVE.owned.push(key); saveGame(); markAllDirty();
    toast(String(fromName || 'Someone') + ' gifted you ' + it.name + '!', '#ffd27a');
    return true;
}
// Darczyńca: po potwierdzeniu odbioru płaci (nie zejdzie poniżej zera) i liczy prezent
export function confirmGift(key, toName) {
    const it = findItem(key); if (!it) return;
    const price = priceOf(it), d = ensureDaily();
    SAVE.wallet = Math.max(0, SAVE.wallet - price); d.gifts = (d.gifts || 0) + 1; SAVE.giftsSent = (SAVE.giftsSent || 0) + 1;
    toast('Gift delivered to ' + String(toName || 'player') + ': ' + it.name + ' (-' + price + ')', '#7fc47f');
    checkCounters(); saveGame(); markAllDirty();
}
export function unlockAchievement(id) {
    if (SAVE.achievements[id]) return false;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return false;
    SAVE.achievements[id] = Date.now();
    if (a.reward[0] === 'bones') addBones(a.reward[1], 'achievement: ' + a.name);
    else { const key = a.reward[0] + ':' + a.reward[1]; if (!SAVE.owned.includes(key)) SAVE.owned.push(key); }
    saveGame(); markAllDirty();
    setTimeout(() => toast('Achievement: ' + a.name + '! Unlocked ' + a.rewardName, '#ffd27a'), 1500);
    return true;
}
export function checkCompletionist() {
    if ((SAVE.mazeWins || 0) > 0 && (SAVE.silenceWins || 0) > 0 && (SAVE.wellWins || 0) > 0 && SAVE.owned.includes('skin:king')) unlockAchievement('completionist');
}
// Odblokowanie przedmiotu za osiągnięcie (np. Parkour King za czerwoną trasę)
export function unlockItem(slot, id) {
    const key = slot + ':' + id;
    if (SAVE.owned.includes(key)) return false;
    SAVE.owned.push(key); SAVE.equipped[slot] = id;
    saveGame(); notifyLook(); checkCompletionist();
    return true;
}
const PET_SLOTS = ['pethat', 'petneck'];   // kosmetyki Stworka zakłada się na panelu przy gnieździe (core/petnest.js)
export function buyItem(item) {
    if (isOwned(item)) return 'owned';
    if (isLocked(item)) return 'locked';
    const price = priceOf(item);
    if (SAVE.wallet < price) { toast('Not enough ' + CURRENCY + ' for ' + item.name, '#e0533f'); return 'poor'; }
    SAVE.wallet -= price; SAVE.owned.push(item.slot + ':' + item.id);   // zakładanie jest w Maszynie goryla (nie tu): kupiony przedmiot trafia do niej
    toast('Bought ' + item.name + ' (-' + price + '). ' + (PET_SLOTS.includes(item.slot) ? 'Put it on your pet at the nest in the lobby.' : 'Wear it at the Gorilla Machine.'), '#7fc47f');
    track('shop'); saveGame(); markAllDirty();
    return 'ok';
}
export function equipItem(item) {
    if (!isOwned(item)) return;
    SAVE.equipped[item.slot] = item.id;
    track('shop'); saveGame(); notifyLook();
}

// --- Nagroda za logowanie co 6 godzin ---
export function loginRewardAmount(streak) { return Math.min(250, 100 + 15 * (streak - 1)); }
function nextStreak() { const now = Date.now(); return (SAVE.login.last && now - SAVE.login.last <= STREAK_WINDOW) ? Math.min(11, SAVE.login.streak + 1) : 1; }
export function loginStatus() {
    const now = Date.now(), next = SAVE.login.last + LOGIN_INTERVAL, s = nextStreak();
    return { ready: now >= next, msLeft: Math.max(0, next - now), nextStreak: s, nextAmount: loginRewardAmount(s), streak: SAVE.login.streak };
}
export function claimLoginReward() {
    const st = loginStatus();
    if (!st.ready) return 0;
    SAVE.login.streak = st.nextStreak; SAVE.login.last = Date.now();
    addBones(st.nextAmount, 'login reward, streak ' + st.nextStreak);
    checkCounters();
    saveGame();
    return st.nextAmount;
}

// --- Zadania dzienne ---
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function msToMidnight() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; }
export function ensureDaily() {
    const k = todayKey();
    if (SAVE.daily && SAVE.daily.date === k) {
        // zadanie wycofane z puli (np. trampolina z lobby) w dzisiejszym zapisie: podmieniamy na inne, jeszcze niewylosowane
        const retired = SAVE.daily.quests.filter(q => !QUEST_POOL.some(x => x.id === q.id));
        if (retired.length) {
            const free = QUEST_POOL.filter(x => !SAVE.daily.quests.some(q => q.id === x.id));
            for (const q of retired) { const n = free.shift(); if (n) { q.id = n.id; q.p = 0; q.done = false; } }
            SAVE.daily.quests = SAVE.daily.quests.filter(q => QUEST_POOL.some(x => x.id === q.id)); saveGame();
        }
        return SAVE.daily;
    }
    let h = hashStr(k);
    const pool = QUEST_POOL.slice(), picks = [];
    while (picks.length < 3) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0]); }
    SAVE.daily = {
        date: k, quests: picks.map(q => ({ id: q.id, p: 0, done: false })), bonus: false,
        caps: { tramp: 0, rope: 0, throw: 0, play: 0, social: 0 }, acc: { play: 0, social: 0, playMin: 0, socialMin: 0 }, highBonus: false
    };
    saveGame(); markAllDirty();
    return SAVE.daily;
}
export function questDef(id) { return QUEST_POOL.find(q => q.id === id); }
function questProgress(id, value, isMax) {
    const d = ensureDaily();
    for (const q of d.quests) {
        if (q.id !== id || q.done) continue;
        const def = questDef(id);
        q.p = isMax ? Math.max(q.p, value) : q.p + value;
        if (q.p >= def.target) {
            q.p = def.target; q.done = true;
            SAVE.questsDone = (SAVE.questsDone || 0) + 1;
            addBones(def.reward, 'daily quest done');
            if (d.quests.every(x => x.done) && !d.bonus) { d.bonus = true; SAVE.bonusDays = (SAVE.bonusDays || 0) + 1; addBones(QUEST_ALL_BONUS, 'all daily quests'); }
            checkCounters();
            saveGame();
        }
        markAllDirty();
    }
}
function capped(key, amount) {
    const d = ensureDaily(), a = ACTIVITY[key], give = Math.min(amount, a.cap - d.caps[key]);
    if (give > 0) { d.caps[key] += give; addBones(give, a.label.toLowerCase()); }
}

// Zdarzenia z gry: 'tramp', 'rope', 'throw', 'shop', 'top', 'height' (v = metry nad podłogą)
export function track(ev, v) {
    if (ev === 'height') {
        if (v > SESSION.maxH) SESSION.maxH = v;
        const m = Math.floor(v);
        if (m <= SESSION.lastM) return;
        SESSION.lastM = m;
        questProgress('height', m, true);
        const prevBest = Math.floor(SAVE.best.height);
        if (m > prevBest) { SAVE.best.height = m; addBones((m - prevBest) * HEIGHT_RECORD_BONUS, 'new height record ' + m + ' m'); }
        const d = ensureDaily();
        if (m >= 15 && !d.highBonus) { d.highBonus = true; addBones(HIGH_DAILY_BONUS, 'reached 15 m today'); }
        return;
    }
    if (ev === 'tramp') { SESSION.jumps++; SAVE.best.jumps++; capped('tramp', ACTIVITY.tramp.each); questProgress('tramp', 1); }
    else if (ev === 'rope') { capped('rope', ACTIVITY.rope.each); questProgress('rope', 1); }
    else if (ev === 'throw') { capped('throw', ACTIVITY.throw.each); questProgress('throw', 1); }
    else if (ev === 'shop') questProgress('shop', 1);
    else if (ev === 'top') { const d = ensureDaily(); if (d.quests.some(q => q.id === 'top' && !q.done)) questProgress('top', 1, true); }
}

// Wywoływane co klatkę: czas gry i czas z innymi graczami
export function tick(dt, othersCount) {
    bumpStat('playSec', dt); flushStats(dt);
    const d = ensureDaily(), a = d.acc;
    a.play += dt; a.playMin += dt;
    if (a.playMin >= 60) { a.playMin -= 60; questProgress('play', 1); }
    if (a.play >= ACTIVITY.play.every) { a.play -= ACTIVITY.play.every; capped('play', ACTIVITY.play.each); }
    if (othersCount > 0) {
        a.social += dt; a.socialMin += dt;
        if (a.socialMin >= 60) { a.socialMin -= 60; questProgress('social', 1); }
        if (a.social >= ACTIVITY.social.every) { a.social -= ACTIVITY.social.every; capped('social', ACTIVITY.social.each); }
    }
}
export function fmtDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? h + 'h ' + (m < 10 ? '0' : '') + m + 'm' : m + 'm ' + (ss < 10 ? '0' : '') + ss + 's';
}
