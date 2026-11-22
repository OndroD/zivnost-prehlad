# Živnosť prehľad

Osobná webová aplikácia na evidenciu mojej práce na živnosť (hodiny, zákazky, zárobky, termíny).
Som začiatočník a učím sa programovať. Vysvetľuj po slovensky a jednoducho.
Každý svoj krok a každý odborný pojem (napr. git, commit, funkcia) vysvetli ako pre začiatočníka, keď ho použiješ prvýkrát.

## Pravidlá
- Beží iba lokálne na mojom PC: otvorím index.html v prehliadači. Žiadny server, žiadna inštalácia, appka nepoužíva internet.
- Iba HTML, CSS a čistý JavaScript. Žiadne frameworky ani knižnice.
- Súbory: index.html, style.css, app.js (ak treba viac, najprv sa opýtaj).
- Dáta ukladaj do localStorage v prehliadači.
- Texty po slovensky, sumy v eurách s čiarkou (1 250,50 €), dátumy DD. MM. RRRR, hodiny ako „7 h 30 min“.
- Kód píš prehľadne a s krátkymi komentármi po slovensky.
- Pred každou väčšou zmenou mi v 3–5 vetách povedz, čo urobíš.
- Na konci každej úlohy mi daj krátky zoznam, ako to otestovať.
- Commit rob iba vtedy, keď ťa o to požiadam.

## Bezpečnosť
- Žiadne externé zdroje: žiadne CDN, Google Fonts, analytika ani `fetch` na internet. Všetko je v našich 3 súboroch.
- Text od používateľa vkladaj do stránky cez `textContent`, nikdy cez `innerHTML` (ochrana pred XSS).
- Pri čítaní z localStorage a pri importe zálohy over, že dáta majú správny tvar. Pri chybe nič neprepíš a ukáž hlásenie.
- Pred mazaním a pred importom, ktorý prepíše dáta, vždy zobraz potvrdenie – vlastným oknom `await potvrd({...})`
  (nie `confirm()` prehliadača); pri mazaní `nebezpecne: true` (červené tlačidlo, kurzor na Zrušiť).
- Pamätaj: vymazanie dát prehliadača zmaže aj dáta appky, preto je záloha do súboru dôležitá.
- Rezerva na dane a odvody je iba orientačná, nie daňové poradenstvo. Sadzby drž v jednom objekte na začiatku app.js, aby sa dali ľahko zmeniť, a v appke ukáž upozornenie.
- Bez môjho súhlasu nemaž súbory, nerob `git push` ani nič neposielaj na internet.
- Mimo priečinka projektu (napr. Stiahnuté) nič nečítaj ani nezapisuj bez toho, aby si sa najprv opýtal.
- Na internete smieš iba vyhľadávať a čítať úradné weby povolené v `.claude/settings.json` (pri overovaní zákonov).
  Ak WebFetch nefunguje (napr. v automatickom režime), použi WebSearch s `allowed_domains` na tieto weby.

## Plán
1. ✅ Formulár a tabuľka záznamov, mesačný súčet
2. ✅ Ukladanie dát, úprava a mazanie záznamov, záloha do súboru
   - ✅ navyše: čas od – do s obedom, prerušenie práce, h + min, uložené sadzby, zobrazenie podľa mesiaca
   - ✅ navyše: výkaz práce za mesiac (tlač/PDF), upozornenie na rovnaký deň, jednorazové položky,
     rozbaľovacia a rolovateľná karta Záznamy
3. ✅ Orientačný odhad daní a odvodov (karta „Dane a odvody“, profil v Nastaveniach) – graf zatiaľ nie
4. ✅ Projekty a stopky (Štart/Pauza/Stop pri projekte vytvorí záznam, súčty a detail projektu)
5. ✅ Vzhľad (UI): paleta, záložky, Prehľad s dlaždicami, prázdne stavy, vlastné okná s otázkou
6. ✅ Pripomienka zálohy (nenápadne dole v bočnom paneli)
7. ✅ Graf po mesiacoch (zárobok / hodiny za posledných 12 mesiacov, v Prehľade)

Nápady na neskôr: predvolený pracovný čas v Nastaveniach, pevná cena projektu (skutočná hodinovka),
výkaz za celý projekt, testovanie s ďalšími ľuďmi (zverejnenie, spätná väzba – vtedy upraviť pravidlá „iba lokálne“).
Zamietnuté (zatiaľ nerobiť): duplikovanie záznamu, termíny a pripomienky platieb, subagenti.

## Kde sme skončili (19. 10. 2026)
- Plán je celý hotový; naposledy prerobená záložka Dane a odvody (prehľadnejšia, výpočty bez zmeny).
- Otvorená otázka: druhá dlaždica v Daniach ukazuje najbližšiu zmenu (teraz január 2027, nové minimum zdravotného).
  Ak chcem, môže radšej ukazovať začiatok sociálneho poistenia (marec 2027).
- Ďalšie možnosti: nápady na neskôr vyššie (predvolený pracovný čas, pevná cena projektu, výkaz za projekt,
  testovanie s ďalšími ľuďmi).
- Po veľkých zmenách si stiahnuť novú zálohu (v appke zatiaľ „Záloha: zatiaľ žiadna“).

## Čo appka vie
- **Záznam:** dátum, sadzba, čas a nepovinná poznámka. Čas sa zadáva dvoma spôsobmi:
  - **Od – do:** začiatok a koniec v ten istý deň. Obed odráta 30 min (`OBED_MINUTY`). Nepovinné **prerušenie práce**
    zadané časom od – do alebo dĺžkou v h + min, s nepovinným dôvodom.
  - **Počet hodín:** dĺžka v políčkach h + min.
  - **Políčka času** (od – do aj prerušenie) sú vlastné `.cas-pole` (text „HH:MM“, nie `type="time"` – ten ukazoval
    AM/PM a nedal sa naštýlovať): klik označí hodiny/minúty, písanie číslic, šípky ↑ ↓ ← →, Backspace, vloženie „7:30“/„730“.
    Rozpísané „07:--“ sa pri odchode doplní na 07:00. Ikona hodín otvorí panel so stĺpcami 00–23 a 00–59
    (`otvorPanelCasu(ciel)` – „cieľ“ hovorí, ako čítať/zapísať h a m; naraz iba jeden – `otvorenyPanel`).
    Hodnota je stále „07:30“ alebo "", formát dát sa nezmenil.
  - **Políčka dĺžky** (Počet hodín aj prerušenie zadané dĺžkou, `.trvanie.cas-vyber`): h + min v jednom rámčeku,
    písanie ako doteraz, šípky ↑ ↓, medzera / „:“ / „h“ skočí na minúty, ikona hodín otvorí ten istý panel (0 – 24 h).
- **Sadzby (Nastavenia):** pridať, upraviť, zmazať, jedna predvolená (vyplní sa pri otvorení). Pod políčkom sadzby
  sú tlačidlá na kliknutie. K záznamu sa ukladá *kópia* názvu sadzby (iba ak suma nebola prepísaná ručne).
- **Projekty a stopky (karta hore):** projekt = názov + sadzba (kópia sadzby, zmena platí iba pre nové záznamy).
  Pri projekte Štart → stopky (Pauza/Pokračovať, Stop a uložiť, Zahodiť, poznámka). Naraz bežia iba jedny.
  Stopky si pamätajú iba čas štartu a pauzy, takže bežia aj po zatvorení appky. Stop vytvorí záznam od – do
  (dátum = deň štartu, bez obeda, pauzy spolu = `prerusenieHodiny`); cez polnoc sa uloží ako počet hodín.
  Pod 1 min sa ponúkne zahodenie, nad 12 h (`DLHE_STOPKY_HODINY`) otázka „nezabudol si ich vypnúť?“.
  Projekt má súčet (čas, suma, počet), Detail so všetkými záznamami, dá sa uzavrieť/otvoriť a zmazať
  (záznamy ostanú bez projektu). Projekt sa dá vybrať aj vo formulári záznamu (vyplní jeho sadzbu).
  Zmeny z inej karty prehliadača (záznamy, projekty, stopky) sa prenesú cez udalosť `storage`.
- **Prehľad:** súčet za zvolený mesiac (‹ ›) a pod ním tabuľka iba so záznamami toho mesiaca.
  V Posledných záznamoch je namiesto dátumu „Dnes“/„Včera“. Strážca dňa (`skontrolujNovyDen`, raz za minútu
  a pri návrate do karty) po polnoci všetko prekreslí a posunie dátum v novom zázname – netreba obnoviť stránku.
  Pri novom zázname na už obsadený deň v tom istom projekte (alebo tiež bez projektu) sa appka opýta.
  Tabuľka sa pri veľa záznamoch roluje s prilepenou hlavičkou.
- **Graf po mesiacoch** (Prehľad, dole): stĺpce za posledných 12 mesiacov, prepínač Zárobok / Hodiny (nikdy oboje
  naraz – iná mierka). Zárobok zahŕňa jednorazové položky. Bublina pri prejdení myšou / Tab, klik (Enter) otvorí
  Záznamy mesiaca, „Zobraziť ako tabuľku“. Kreslí sa v SVG bez knižníc (`vykresliGraf`), prekreslí sa pri zmene
  šírky (ResizeObserver). Farba stĺpcov `--graf-stlpec` (#854F6C, tmavý režim #DFB6B2) – kontrast overený.
- **Jednorazové položky:** sumy mimo hodín (dátum, názov, suma) pre zvolený mesiac, pripočítajú sa k zárobku.
- **Výkaz práce:** tlač/PDF zvoleného mesiaca (voľby: so sumami, s poznámkami). Dôvody prerušení
  vo výkaze nikdy nie sú (výkaz ide zákazníkovi).
- **Dane a odvody** (záložka): hore veta „Počítam s príjmom … €/mesiac“ + Zmeniť (políčko odhadu sa ukáže až po
  kliknutí), upozornenie zbalené na jeden riadok; 3 dlaždice (Teraz platíš · Od <najbližšej zmeny> · Daň za rok);
  karta Mesačné odvody (obdobie | zdravotné | sociálne | spolu, aktuálne obdobie zvýraznené); Ročné povinnosti
  (priznanie, test príjmov, ročné zúčtovanie); Ako sa počíta daň (zbalené po rokoch). Potrebuje profil
  (Nastavenia – profil živnostníka) a odhad mesačného príjmu (appka ho navrhne).
- **Záloha:** uloženie a načítanie súboru `.json` (záznamy, sadzby, jednorazové položky, profil, projekty).
  Bežiace stopky v zálohe nie sú. V Chrome/Edge sa otvorí okno „Uložiť ako“ (`showSaveFilePicker`, prehliadač si
  pamätá posledný priečinok); zrušenie = nič sa neuloží. Safari/Firefox ho nemajú – tam klasické stiahnutie do Stiahnuté.
- **Automatické ukladanie do súboru** (Nastavenia – Záloha dát, iba Chrome/Edge): „Vytvoriť dátový súbor“
  (`showSaveFilePicker`, predvolene `zivnost-data.json` v Dokumentoch) alebo „Otvoriť existujúci súbor“. Odkaz na súbor
  je v IndexedDB (databáza `zivnost-prehlad`, sklad `subory`, kľúč `datovy-subor`). Každé `ulozPolozku` (okrem stopiek)
  naplánuje zápis o 800 ms (`ODKLAD_ZAPISU_MS`); zápisy idú za sebou, pri skrytí karty sa zapíše hneď. Súbor má tvar
  zálohy (`obsahZalohy`). Prázdnu appku do súboru automaticky nikdy nezapíše. Stavy (`stavSuboru`): ziadny / ok /
  povolit (po reštarte prehliadača treba kliknúť – povolenie sa dá vypýtať iba po kliknutí) / nacitat (dáta prehliadača
  sú preč, súbor známy) / chyba. Panel dole ukazuje stav a pri povolit/nacitat klik rovno povolí/načíta.
  Ak prehliadač zmaže aj IndexedDB, súbor sa pripojí znova cez „Otvoriť existujúci súbor“.
  Kód: `precitajZalohu`, `potvrdNahradenie`, `pouziZalohu` (spoločné s ručnou zálohou), `zapisDoSuboru`, `pripravDatovySubor`.
- **Pripomienka zálohy:** dole v bočnom paneli „Posledná záloha: DD. MM. RRRR“ (klik otvorí Nastavenia – Záloha).
  Ak sú dáta a záloha je staršia ako 14 dní (`DNI_PRIPOMIENKY_ZALOHY`) alebo žiadna, text sa zvýrazní a pri
  Nastaveniach (panel aj lišta na mobile) je oranžová bodka. Dátum sa uloží pri „Stiahnuť zálohu“.
- **Otázky (potvrdenia)** sú vo vlastnom okne v dizajne appky (`<dialog id="okno">`): ikona, nadpis, text,
  Zrušiť / hlavné tlačidlo; Esc alebo klik mimo okna = Zrušiť.
- **Záložky** (bočný panel vľavo, na mobile pod 760 px lišta dole), appka si pamätá poslednú:
  Prehľad (4 dlaždice za tento mesiac: odpracované, zárobok, odvody za mesiac, daň za rok – rovnaké výpočty
  ako karta Dane; bežiace stopky; vľavo nový záznam, vpravo „Spustiť stopky“ pri projektoch a 5 posledných
  záznamov; pod 1 100 px pod sebou a „Spustiť stopky“ nad formulárom) · Záznamy (súčet za mesiac, tabuľka, jednorazové položky, výkaz) ·
  Projekty · Dane a odvody · Nastavenia (profil, sadzby, záloha, vzhľad – tmavý režim).
  „Upraviť“ záznam prepne na Prehľad (formulár) a po uložení/zrušení vráti do pôvodnej záložky.
  Štart stopiek prepne na Prehľad; bežiace stopky sú vidieť aj dole v bočnom paneli.

## Dane a odvody (fáza 3)
- Všetky zákonné čísla sú v objekte `PARAMETRE` (po rokoch) na začiatku app.js. Pri novom roku pridaj ďalší rok,
  `overene: false`, kým nie sú čísla oficiálne. Chýbajúci rok sa nahradí posledným známym (v appke ⚠️).
- Pravidlá (overené k 19. 10. 2026): daň 15 % (príjmy do 100 000 €), paušál 60 % max 20 000 €, odvody sa odpočítajú
  navyše, nezdaniteľná časť 21 × životné minimum. Zdravotné 16 %, preddavky od mesiaca po vzniku (ak vznik po 1. dni),
  ročné zúčtovanie VZ = (príjmy − paušál) / 1,486. Sociálne: nová SZČO od 1. dňa 6. mesiaca po vzniku, potom mikroodvod;
  test príjmov k 1. 7. (príjmy za minulý rok): do 10,5 × ŽM nič, do 50 % všeobecného VZ mikroodvod, inak plné
  (čiastkový ZD / 1,486 / 12, aspoň minimum). Platí sa do 8. dňa nasledujúceho mesiaca.
- Zjednodušenia: nový zdravotný preddavok po zúčtovaní platí celý rok; odvody sa rátajú za mesiace roka (nie podľa
  dátumu platby); zamestnanie a príjmy nad 100 000 € sa nepočítajú presne.
- Zdroje: financnasprava.sk (sadzby, NČZD 2026), socpoist.sk (mikroodvod, test príjmov, nová SZČO),
  vszp.sk / dovera.sk / union.sk (preddavky, ročné zúčtovanie), employment.gov.sk (životné minimum 295,22 € od 7/2026).
- WebFetch je v `.claude/settings.json` povolený iba pre tieto úradné weby (+ slov-lex.sk, slovak.statistics.sk).

## Formát dát (dôležité – zálohy musia ostať kompatibilné)
- localStorage kľúče: `zivnost-prehlad.zaznamy` (pole záznamov), `zivnost-prehlad.sadzby`
  (`{ zoznam: [{ id, nazov, suma }], predvolenaId }`), `zivnost-prehlad.rezim` (posledný režim formulára),
  `zivnost-prehlad.zalozka` (naposledy otvorená záložka), `zivnost-prehlad.tema` ("tmava"/"svetla"),
  `zivnost-prehlad.sklo` ("zapnute"/"vypnute", bez kľúča = zapnuté),
  `zivnost-prehlad.subor-ulozene` (ISO čas posledného zápisu do dátového súboru – nie je súčasťou zálohy),
  `zivnost-prehlad.posledna-zaloha` ("RRRR-MM-DD" poslednej stiahnutej zálohy – nie je súčasťou zálohy).
  (Starý kľúč `zivnost-prehlad.zaznamy-rozbalene` sa už nepoužíva.)
  Nečitateľné dáta sa odložia pod kľúč s príponou `.poskodene`.
- Záznam: `{ id, datum: "RRRR-MM-DD", zakazka (= poznámka, môže byť ""), sadzba, hodiny, suma }`
  a nepovinne `sadzbaNazov`, `zaciatok`, `koniec`, `obed`, `prerusenieOd` + `prerusenieDo` alebo `prerusenieHodiny`,
  `prerusenieDovod`, `projektId`.
- `hodiny` sú desatinné číslo (1 h 48 min = 1,8). Pri čase od – do sa `hodiny` aj `suma` pri načítaní vždy prepočítajú.
- Jednorazové položky (`zivnost-prehlad.jednorazove`): `[{ id, datum, nazov, suma }]` – sumy mimo hodín
  (napr. nafta), pripočítajú sa k zárobku mesiaca a sú vo výkaze so sumami.
- Profil (`zivnost-prehlad.profil`): `{ datumVzniku: "RRRR-MM-DD" alebo "", predtymSZCO, zamestnany,
  odhadMesacne: číslo alebo null }`.
- Projekty (`zivnost-prehlad.projekty`): `[{ id, nazov, sadzba, uzavrety }]` a nepovinne `sadzbaNazov`.
  Počítadlo id projektov ide aj za najväčšie `projektId` v záznamoch (aby sa id nepoužilo znova).
- Stopky (`zivnost-prehlad.stopky`, keď nebežia, kľúč neexistuje): `{ projektId, start, pauzy: [{ od, do }], poznamka }`,
  časy v milisekundách (`Date.now()`), pri práve bežiacej pauze je `do: null`.
- Záloha: `{ aplikacia: "zivnost-prehlad", verzia: 5, vytvorene, zaznamy, sadzby, jednorazove, profil, projekty }`.
  Staršie zálohy (verzia 1 bez `sadzby`, 2 bez `jednorazove`, 3 bez `profil`, 4 bez `projekty`) sa musia dať načítať ďalej –
  chýbajúca časť sa vtedy nemení. Nové polia pridávaj iba ako nepovinné.

## Štruktúra projektu
- `index.html` – štruktúra stránky (sekcie záložiek `data-obsah`, navigácia `data-zalozka`, ikony ako SVG `<symbol>`)
- `style.css` – vzhľad (farby v `:root`, tmavý režim, mobil pod 600 px)
  Dizajn: moderný a jednoduchý (nič futuristické ani gýčové). Paleta #190019 · #2B124C · #522B5B · #854F6C ·
  #DFB6B2 · #FBE4D8. Predvolená je **svetlá** verzia; tmavá iba po zapnutí (`data-theme="dark"` na `<html>`).
  Upraviť/Zmazať sú ikony (ceruzka, kôš; text v `title` a `aria-label`), na počítači viditeľné až pod myšou.
  Ikony sú `<symbol>` v index.html, z JS cez `ikona('nazov')`. Dátum v tabuľkách má pod sebou deň v týždni.
  Prázdne stavy (`.prazdny-stav`): ikona v krúžku, krátky návod a tlačidlo s ďalším krokom
  (`data-zalozka` alebo `data-akcia="novy-projekt"`). Výkaz pri tlači: päta „Spolu“ iba raz, dátumy a sumy
  sa nezalamujú, jednorazové položky sa nerozdelia na dve strany. Tlač overujem cez PDF z Chrome bez okna
  (kópia stránky v dočasnom priečinku, ktorá zavolá `pripravVykaz` a pridá triedu `tlac-vykazu`).
  Žiadna predvolená modrá z prehliadača (zaškrtávacie políčka a označený text majú farby palety).
  **Tekuté sklo** (Nastavenia – Vzhľad, predvolene zapnuté): trieda `sklo` na `<html>`, polopriehľadné karty
  s `backdrop-filter` nad plávajúcimi škvrnami (`.sklo-pozadie`), odlesk pod myšou (`--mx`, `--my` z app.js),
  pružné stlačenie tlačidiel, na mobile lišta ako plávajúca kapsula. Vnútri skla sú `--pozadie` a `--karta`
  priesvitné – čo musí byť nepriehľadné (bublina grafu), používa `--karta-pevna`. Riadok pod myšou `--riadok-pod-mysou`.
  Farby nikdy napevno iba pre svetlú tému (raz tak vznikol svetlý riadok pod myšou v tmavom režime). Pri tlači sa sklo vypne; pri vypnutých animáciách v systéme sa nič nehýbe.
  Plán UI: 1. ✅ nový vzhľad · 2. ✅ záložky (bočný panel / lišta dole na mobile) · 3. ✅ Prehľad s dlaždicami
  a ikonami · 4. ✅ doladenie (prázdne stavy, mobil, tlač). Náhľad dizajnu bol iba dočasný súbor mimo projektu.
- `app.js` – logika a práca s dátami. Na začiatku nastavenia a `PARAMETRE` (zákonné čísla).
  Kontrola časov je na jednom mieste vo funkcii `skontrolujCasy` (formulár, náhľad aj načítanie zálohy).
  Výpočet daní a odvodov: `danZaRok`, `zpZuctovanie`, `spZaMesiac`, `testPrijmu`; zobrazenie `vykresliDane`;
  odvody za mesiac `odvodyZaMesiac` (spoločné pre kartu Dane aj dlaždicu v Prehľade).
  Načítanie/ukladanie localStorage cez `nacitajPolozku` / `ulozPolozku`.
  Projekty: `vykresliProjekty`, `vycistiProjekty`; stopky: `spustiStopky`, `zastavStopky`, `vycistiStopky`.

## Ako overujem zmeny
- Po každej zmene: `node --check app.js` (chyby v zápise) a kontrola, či sedí počet otváracích a zatváracích
  HTML značiek (`<div>`, `<details>`, `<section>`).
- Logiku testujem simuláciou stránky v Node (pomocné skripty v dočasnom priečinku, nie v projekte).
  Skutočný prehliadač neklikám – preto vždy pripíš, čo si má používateľ vyskúšať sám.
- Testy v Chrome bez okna: `--virtual-time-budget` nečaká na IndexedDB/súbory (testy „visia“) – vtedy spustiť Chrome
  s `--remote-debugging-port` a výsledky čítať cez DevTools z Node. OPFS na `file://` nefunguje (súbor napodobniť v pamäti).
- Po zmene vzhľadu: kontrola kontrastu v oboch témach (text aspoň 4,5 : 1, veľký 3 : 1) na všetkých záložkách,
  v stopkách a v okne, aj so stavom `:hover` (`CSS.forcePseudoState`). Po vynútení hoveru počkať ~250 ms – riadky majú
  prechod farby. Meranie nevidí farebné škvrny za sklom, preto ešte pozrieť snímky.
- Pri náhrade „všade naraz“ (replace_all) skontroluj, či nezasiahla aj nový kód (raz vznikla nekonečná slučka).
