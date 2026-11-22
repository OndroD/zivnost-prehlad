// Živnosť prehľad – fáza 2
// Záznamy sa ukladajú do localStorage (pamäť prehliadača), dajú sa upraviť,
// zmazať a zálohovať do súboru. Čas sa dá zadať ako "od – do" (aj s obedom) alebo počtom hodín.

'use strict';

// ===== Nastavenia =====

// Pod týmto názvom ("kľúčom") sú záznamy uložené v localStorage
const KLUC_ULOZISKA = 'zivnost-prehlad.zaznamy';
// Pod týmto kľúčom sú uložené sadzby z Nastavení
const KLUC_SADZBY = 'zivnost-prehlad.sadzby';
// Najdlhší povolený názov sadzby
const MAX_DLZKA_NAZVU_SADZBY = 40;
// Najdlhší povolený dôvod prerušenia (rovnako ako maxlength v index.html)
const MAX_DLZKA_DOVODU = 100;
// Pod týmto kľúčom si pamätáme naposledy otvorenú záložku
const KLUC_ZALOZKA = 'zivnost-prehlad.zalozka';
// Pod týmto kľúčom si pamätáme vzhľad: "tmava" alebo "svetla" (predvolená)
const KLUC_TEMA = 'zivnost-prehlad.tema';
const KLUC_SKLO = 'zivnost-prehlad.sklo'; // "zapnute" / "vypnute" (tekuté sklo, predvolene zapnuté)
// Záložky appky (rovnaké názvy ako data-obsah a data-zalozka v index.html)
const ZALOZKY = ['prehlad', 'zaznamy', 'projekty', 'dane', 'nastavenia'];
// Pod týmto kľúčom sú uložené jednorazové položky (napr. nafta)
const KLUC_JEDNORAZOVE = 'zivnost-prehlad.jednorazove';
// Najdlhší povolený názov jednorazovej položky (rovnako ako maxlength v index.html)
const MAX_DLZKA_NAZVU_POLOZKY = 100;
// Pod týmto kľúčom je uložený profil živnostníka (pre výpočet daní a odvodov)
const KLUC_PROFIL = 'zivnost-prehlad.profil';
// Pod týmto kľúčom sú uložené projekty
const KLUC_PROJEKTY = 'zivnost-prehlad.projekty';
// Pod týmto kľúčom sú uložené bežiace stopky (aby bežali ďalej aj po zatvorení appky)
const KLUC_STOPKY = 'zivnost-prehlad.stopky';
// Najdlhší povolený názov projektu (rovnako ako maxlength v index.html)
const MAX_DLZKA_NAZVU_PROJEKTU = 60;
// Ak stopky bežia dlhšie ako toľko hodín, pred uložením sa opýtame (možno si ich zabudol vypnúť)
const DLHE_STOPKY_HODINY = 12;

// ===== Zákonné čísla pre dane a odvody (ORIENTAČNE, nie daňové poradenstvo) =====
// Overené k 19. 10. 2026 z webov Finančnej správy, Sociálnej poisťovne, zdravotných poisťovní
// a MPSVR (zoznam zdrojov je v CLAUDE.md). Keď sa zákon zmení, opravuje sa iba tu.
// overene: false = čísla na ten rok ešte nie sú všetky oficiálne (v appke sa ukáže ⚠️).
const PARAMETRE = {
  2026: {
    overene: true,
    pausalMax: 20000,          // paušálne výdavky najviac 20 000 € za rok
    nczd: 5966.73,             // nezdaniteľná časť základu dane (21 × životné minimum 284,13 €)
    nczdHranica: 26083.13,     // do tohto základu dane platí celá nezdaniteľná časť
    nczdKonstanta: 14661.11,   // nad hranicou: nezdaniteľná časť = 14 661,11 − základ dane / 3
    zpMinVZ: 762,              // zdravotné: minimálny vymeriavací základ (50 % priemernej mzdy 2024)
    zpMinPreddavok: 121.92,    // zdravotné: minimálny mesačný preddavok
    spMinVZ: 914.4,            // sociálne: minimálny vymeriavací základ
    spMinPoistne: 303.11,      // sociálne: minimálne mesačné poistné (plné odvody)
    spMaxVZ: 16764,            // sociálne: maximálny vymeriavací základ
    spMikroodvod: 131.34,      // sociálne: mikroodvod (od 7/2026)
    testSpodna: 2983.37,       // test príjmov za 2026: do tejto sumy žiadne povinné sociálne poistenie
    testHorna: 9720,           // test príjmov za 2026: do tejto sumy mikroodvod, nad ňou plné odvody
                               // (⚠️ 50 % všeobecného VZ 19 440 € – vypočítané, nie priamo uvedené)
  },
  2027: {
    overene: false,            // sumy odvodené z priemernej mzdy 2025 (1 620 €) a život. minima 295,22 €
    pausalMax: 20000,
    nczd: 6199.62,             // 21 × 295,22 €
    nczdHranica: 27101.19,
    nczdKonstanta: 15233.35,   // 51,6 × 295,22 €
    zpMinVZ: 810,
    zpMinPreddavok: 129.6,
    spMinVZ: 972,
    spMinPoistne: 322.21,
    spMaxVZ: 17820,
    spMikroodvod: 139.61,      // potvrdené Sociálnou poisťovňou
    testSpodna: 3099.81,       // 10,5 × 295,22 €
    testHorna: null,           // zatiaľ neznáme – použije sa suma z predchádzajúceho roka
  },
};
const SADZBA_DANE = 0.15;          // daň z príjmov pre živnostníka s príjmami do 100 000 €
const HRANICA_SADZBY_15 = 100000;
const PAUSAL_PERCENTO = 0.6;       // paušálne výdavky 60 %
const ZP_SADZBA = 0.16;            // zdravotné poistenie 16 %
const SP_SADZBA = 0.3315;          // sociálne poistenie 33,15 %
const KOEFICIENT_VZ = 1.486;       // koeficient na výpočet vymeriavacieho základu z daňového priznania
// Pod týmto kľúčom si pamätáme, či naposledy zadávaš čas "od – do" alebo počet hodín
const KLUC_REZIM = 'zivnost-prehlad.rezim';
// Najväčší povolený súbor so zálohou (5 MB) – ochrana pred omylom vybraným veľkým súborom
const MAX_VELKOST_ZALOHY = 5 * 1024 * 1024;
// Koľko minút sa odráta za obedovú prestávku (ak zmeníš, uprav aj text v index.html)
const OBED_MINUTY = 30;

// Dni v týždni v poradí, ako ich vracia getDay() (0 = nedeľa)
const DNI_TYZDNA = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

const NAZVY_MESIACOV = [
  'január', 'február', 'marec', 'apríl', 'máj', 'jún',
  'júl', 'august', 'september', 'október', 'november', 'december',
];

// ===== Dáta =====

// Zoznam všetkých záznamov. Každý záznam je objekt:
// { id, datum: "RRRR-MM-DD", zakazka, hodiny, sadzba, suma }
// "zakazka" je nepovinná poznámka (môže byť aj prázdny text "")
// Ak bola sadzba vybraná z uložených, má záznam aj { sadzbaNazov: "Víkend" }
// Ak bol zadaný časom od – do, má navyše: { zaciatok: "HH:MM", koniec: "HH:MM", obed: true/false }
// a ak bolo prerušenie práce (napr. lekár), aj: { prerusenieOd: "HH:MM", prerusenieDo: "HH:MM" }
// alebo, ak bolo prerušenie zadané počtom hodín: { prerusenieHodiny: číslo }
// a ak si k prerušeniu napísal dôvod: { prerusenieDovod: "opravár práčka" }
// Ak záznam patrí k projektu, má aj { projektId: číslo }
let zaznamy = [];

// Ako sa zadáva čas: 'cas' = od – do, 'hodiny' = rovno počet hodín
let rezim = 'cas';

// Počítadlo, aby mal každý záznam jedinečné id
let dalsieId = 1;

// id záznamu, ktorý práve upravujeme (null = pridávame nový)
let upravovaneId = null;

// Mesiac, ktorého súčet zobrazujeme, ako text "RRRR-MM"
let vybranyMesiac = dnesnyDatum().slice(0, 7);

// Ak je false, do localStorage nezapisujeme (napr. keď ho prehliadač nepovolí)
let ukladanieZapnute = true;

// Dátový súbor (automatické ukladanie na disk): odkaz na súbor, alebo null
let datovySubor = null;
// 'ziadny' = nie je pripojený, 'ok' = ukladá sa, 'povolit' = treba kliknúť na Povoliť,
// 'nacitat' = dáta prehliadača sú preč a dajú sa načítať zo súboru, 'chyba' = zápis zlyhal
let stavSuboru = 'ziadny';
// Časovač čakajúceho zápisu do súboru (null = nič nečaká)
let casovacZapisu = null;

// Uložené sadzby z Nastavení. Každá je objekt { id, nazov, suma }.
let sadzby = [];
let dalsieIdSadzby = 1;
// id sadzby, ktorá sa vyplní sama pri otvorení appky (null = žiadna)
let predvolenaSadzbaId = null;
// id sadzby, ktorú práve upravuješ v Nastaveniach (null = pridávaš novú)
let upravovanaSadzbaId = null;
// Jednorazové položky (sumy mimo hodín). Každá je objekt { id, datum: "RRRR-MM-DD", nazov, suma }.
let jednorazove = [];
let dalsieIdJednorazovej = 1;
// id položky, ktorú práve upravuješ (null = pridávaš novú)
let upravovanaJednorazovaId = null;

// Profil živnostníka pre výpočet daní a odvodov
let profil = { datumVzniku: '', predtymSZCO: false, zamestnany: false, odhadMesacne: null };

// Sadzba, ktorú si naposledy vybral kliknutím: { nazov, suma }, alebo null.
// Podľa nej sa k záznamu uloží názov sadzby.
let aktivnaSadzba = null;

// Projekty. Každý je objekt { id, nazov, sadzba, uzavrety: true/false } a nepovinne { sadzbaNazov }.
let projekty = [];
let dalsieIdProjektu = 1;
// id projektu, ktorý práve upravuješ (null = pridávaš nový)
let upravovanyProjektId = null;
// id projektu, ktorého detail je otvorený (null = žiadny)
let detailProjektuId = null;
// Sadzba vybraná kliknutím vo formulári projektu: { nazov, suma }, alebo null
let aktivnaSadzbaProjektu = null;

// Bežiace stopky, alebo null, keď nebežia. Časy sú v milisekundách (tak ich vracia Date.now()):
// { projektId, start, pauzy: [{ od, do }], poznamka }. Pri práve bežiacej pauze je "do" null.
let stopky = null;

// ===== Formátovanie podľa slovenských zvyklostí =====

// Eurá: napr. 1250.5 -> "1 250,50 €"
const formatEur = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' });

// Hodiny záznamu ako celé minúty (napr. 1.8 h -> 108 min) – na zobrazenie "1 h 48 min"
function minutyZaznamu(z) {
  return Math.round(z.hodiny * 60);
}

// Dnešný dátum ako text "RRRR-MM-DD" podľa miestneho času
// (toISOString by použil svetový čas a okolo polnoci by vrátil zlý deň)
function dnesnyDatum() {
  return datumZCasu(Date.now());
}

// Okamih v milisekundách -> dátum "RRRR-MM-DD" podľa miestneho času
function datumZCasu(ms) {
  const d = new Date(ms);
  const rok = d.getFullYear();
  const mesiac = String(d.getMonth() + 1).padStart(2, '0');
  const den = String(d.getDate()).padStart(2, '0');
  return `${rok}-${mesiac}-${den}`;
}

// Okamih v milisekundách -> čas "HH:MM" podľa miestneho času (sekundy sa zahodia)
function hodinaZCasu(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "2026-10-18" -> "18. 10. 2026"
function formatDatum(iso) {
  const [rok, mesiac, den] = iso.split('-');
  return `${den}. ${mesiac}. ${rok}`;
}

// "2026-10" -> "október 2026"
function formatMesiac(rokMesiac) {
  const [rok, mesiac] = rokMesiac.split('-').map(Number);
  return `${NAZVY_MESIACOV[mesiac - 1]} ${rok}`;
}

// Slovenské tvary podľa počtu, napr. sklonuj(5, 'záznam', 'záznamy', 'záznamov') -> "5 záznamov"
function sklonuj(n, jeden, dva, pat) {
  if (n === 1) return `1 ${jeden}`;
  if (n >= 2 && n <= 4) return `${n} ${dva}`;
  return `${n} ${pat}`;
}

// 1 záznam, 2 záznamy, 5 záznamov
function pocetZaznamov(n) {
  return sklonuj(n, 'záznam', 'záznamy', 'záznamov');
}

// 1 sadzba, 2 sadzby, 5 sadzieb
function pocetSadzieb(n) {
  return sklonuj(n, 'sadzba', 'sadzby', 'sadzieb');
}

// Zaokrúhlenie na centy (počítače majú pri desatinných číslach drobné nepresnosti)
function naCenty(cislo) {
  return Math.round(cislo * 100) / 100;
}

// Prevedie text z políčka na číslo. Prijme bodku aj čiarku ("1.5" aj "1,5").
// Ak text nie je platné číslo, vráti NaN ("not a number").
function precitajCislo(text) {
  const upraveny = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(upraveny)) {
    return NaN;
  }
  return Number(upraveny);
}

// Prečíta dvojicu políčok "h" a "min" a vráti celkový počet minút (napr. "1" a "48" -> 108).
// Prázdne políčko sa ráta ako 0. Ak nie sú zadané celé čísla alebo sú minúty nad 59, vráti NaN.
function precitajTrvanie(textHodiny, textMinuty) {
  const hodiny = textHodiny.trim() === '' ? 0 : precitajCeleCislo(textHodiny);
  const minuty = textMinuty.trim() === '' ? 0 : precitajCeleCislo(textMinuty);
  if (Number.isNaN(hodiny) || Number.isNaN(minuty) || minuty > 59) {
    return NaN;
  }
  return hodiny * 60 + minuty;
}

// "12" -> 12; čokoľvek iné ako samé číslice (napr. "1,5" alebo "abc") -> NaN
function precitajCeleCislo(text) {
  const upraveny = text.trim();
  return /^\d+$/.test(upraveny) ? Number(upraveny) : NaN;
}

// Vyplní dvojicu políčok h + min podľa počtu hodín (napr. 1.8 -> "1" h "48" min)
function vyplnTrvanie(poleHodiny, poleMinut, hodiny) {
  const spoluMinut = Math.round(hodiny * 60);
  poleHodiny.value = String(Math.floor(spoluMinut / 60));
  poleMinut.value = String(spoluMinut % 60);
}

// Vymaže hlavné políčka "Odpracovaný čas" (h aj min)
function vymazPolickaHodin() {
  polia.hodiny.value = '';
  poleMinuty.value = '';
}

// Číslo do políčka formulára: 1.5 -> "1,5"
function cisloDoPolicka(cislo) {
  return String(cislo).replace('.', ',');
}

// ===== Počítanie s časom =====

// Je text platný čas "HH:MM" (od 00:00 do 23:59)?
function jePlatnyCas(text) {
  return typeof text === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

// "08:30" -> 510 (počet minút od polnoci). S minútami sa počíta ľahšie ako s hodinami.
function naMinuty(cas) {
  const [hodiny, minuty] = cas.split(':').map(Number);
  return hodiny * 60 + minuty;
}

// Koľko minút sa odpracovalo od začiatku do konca. Odráta obed a prerušenie, ak boli.
// "casy" je objekt: { zaciatok, koniec, obed, prerusenie, prerusenieRezim,
//                     prerusenieOd, prerusenieDo, prerusenieHodiny }
// (časy musia byť už skontrolované – pozri skontrolujCasy)
function odpracovaneMinuty(casy) {
  let minuty = naMinuty(casy.koniec) - naMinuty(casy.zaciatok);
  if (casy.obed) {
    minuty -= OBED_MINUTY;
  }
  if (casy.prerusenie) {
    minuty -= minutyPrerusenia(casy);
  }
  return minuty;
}

// Koľko minút trvalo prerušenie – buď z časov od – do, alebo z počtu hodín
function minutyPrerusenia(casy) {
  if (casy.prerusenieRezim === 'hodiny') {
    return Math.round(casy.prerusenieHodiny * 60); // napr. 1,5 h -> 90 min
  }
  return naMinuty(casy.prerusenieDo) - naMinuty(casy.prerusenieOd);
}

// Skontroluje časy od – do (aj prerušenie). Vráti objekt s chybami; prázdny = všetko v poriadku.
// Používa ho formulár aj načítanie zálohy, aby platili rovnaké pravidlá.
function skontrolujCasy(casy) {
  const chyby = {};
  if (!jePlatnyCas(casy.zaciatok)) {
    chyby.zaciatok = 'Zadaj čas začiatku, napr. 08:00.';
  }
  if (!jePlatnyCas(casy.koniec)) {
    chyby.koniec = 'Zadaj čas konca, napr. 16:30.';
  }
  if (casy.prerusenie && casy.prerusenieRezim === 'hodiny') {
    // Kladné číslo a aspoň 1 minúta (NaN > 0 je false, takže zachytí aj text, ktorý nie je číslo)
    if (!(casy.prerusenieHodiny > 0) || Math.round(casy.prerusenieHodiny * 60) < 1) {
      chyby.prerusenieHodiny = 'Zadaj, ako dlho prerušenie trvalo, napr. 1 h 30 min (minúty 0 – 59).';
    }
  } else if (casy.prerusenie) {
    if (!jePlatnyCas(casy.prerusenieOd)) {
      chyby.prerusenieOd = 'Zadaj začiatok prerušenia, napr. 11:00.';
    }
    if (!jePlatnyCas(casy.prerusenieDo)) {
      chyby.prerusenieDo = 'Zadaj koniec prerušenia, napr. 13:00.';
    }
  }
  // Ďalej porovnávame časy, iba ak sú všetky zadané správne
  if (Object.keys(chyby).length > 0) {
    return chyby;
  }

  const zaciatok = naMinuty(casy.zaciatok);
  const koniec = naMinuty(casy.koniec);
  if (koniec <= zaciatok) {
    chyby.koniec = 'Koniec musí byť neskôr ako začiatok (v ten istý deň).';
    return chyby;
  }

  // Časy od – do prerušenia musia byť v poradí a vnútri pracovného času
  if (casy.prerusenie && casy.prerusenieRezim !== 'hodiny') {
    const prerusenieOd = naMinuty(casy.prerusenieOd);
    const prerusenieDo = naMinuty(casy.prerusenieDo);
    if (prerusenieDo <= prerusenieOd) {
      chyby.prerusenieDo = 'Koniec prerušenia musí byť neskôr ako jeho začiatok.';
      return chyby;
    }
    if (prerusenieOd < zaciatok || prerusenieDo > koniec) {
      chyby.prerusenieOd = 'Prerušenie musí byť medzi začiatkom a koncom práce.';
      return chyby;
    }
  }

  if (odpracovaneMinuty(casy) <= 0) {
    chyby.koniec = 'Po odrátaní obeda a prerušenia neostal žiadny odpracovaný čas.';
  }
  return chyby;
}

// 450 -> "7 h 30 min"
function formatTrvanie(minuty) {
  const h = Math.floor(minuty / 60);
  const m = minuty % 60;
  if (m === 0) return `${h} h`;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

// Posunie mesiac "RRRR-MM" o zadaný počet mesiacov (napr. -1 = predchádzajúci, -11 = o 11 dozadu)
function posunMesiac(rokMesiac, o) {
  const [rok, mesiac] = rokMesiac.split('-').map(Number);
  // Mesiace prevedieme na jedno číslo (rok × 12 + mesiac od 0), posunieme a prevedieme späť
  const spolu = rok * 12 + (mesiac - 1) + o;
  const novyRok = Math.floor(spolu / 12);
  const novyMesiac = (spolu % 12) + 1;
  return `${novyRok}-${String(novyMesiac).padStart(2, '0')}`;
}

// ===== Prvky zo stránky =====

const formular = document.getElementById('formular');
// Políčka, ktoré kontrolujeme (v poradí, v akom sú na stránke)
const polia = {
  datum: document.getElementById('datum'),
  sadzba: document.getElementById('sadzba'),
  zakazka: document.getElementById('zakazka'),
  zaciatok: document.getElementById('zaciatok'),
  koniec: document.getElementById('koniec'),
  prerusenieOd: document.getElementById('prerusenie-od'),
  prerusenieDo: document.getElementById('prerusenie-do'),
  prerusenieHodiny: document.getElementById('prerusenie-hodiny'),
  hodiny: document.getElementById('hodiny'),
};
// Políčka s minútami (patria k políčkam s hodinami vyššie)
const poleMinuty = document.getElementById('minuty');
const polePreruseniaMinuty = document.getElementById('prerusenie-minuty');
const polePreruseniaDovod = document.getElementById('prerusenie-dovod');
const polieObed = document.getElementById('obed');
const polePrerusenie = document.getElementById('prerusenie');
const blokPrerusenie = document.getElementById('blok-prerusenie');
const rezimPreruseniaRadia = document.querySelectorAll('input[name="prerusenie-rezim"]');
const blokPreruseniaCas = document.getElementById('blok-prerusenie-cas');
const blokPreruseniaHodiny = document.getElementById('blok-prerusenie-hodiny');
const rezimRadia = document.querySelectorAll('input[name="rezim"]');
const blokCas = document.getElementById('blok-cas');
const blokHodiny = document.getElementById('blok-hodiny');
const nahlad = document.getElementById('nahlad');
const kartaFormulara = document.getElementById('karta-formulara');
const nadpisFormulara = document.getElementById('nadpis-formulara');
const tlacidloUlozit = document.getElementById('tlacidlo-ulozit');
const tlacidloZrusit = document.getElementById('tlacidlo-zrusit');
// Rozbaľovací výber projektu vo formulári záznamu
const poleProjekt = document.getElementById('projekt');

const tabulka = document.getElementById('tabulka');
const teloTabulky = document.getElementById('telo-tabulky');
const prazdne = document.getElementById('prazdne');
const nadpisZaznamov = document.getElementById('nadpis-zaznamov');

const nazovMesiaca = document.getElementById('nazov-mesiaca');
const mesiacSpat = document.getElementById('mesiac-spat');
const mesiacDalej = document.getElementById('mesiac-dalej');
const mesiacDnes = document.getElementById('mesiac-dnes');
const sucetHodiny = document.getElementById('sucet-hodiny');
const sucetZarobok = document.getElementById('sucet-zarobok');
const sucetPocet = document.getElementById('sucet-pocet');

const tlacidloStiahnut = document.getElementById('tlacidlo-stiahnut');
const tlacidloNacitat = document.getElementById('tlacidlo-nacitat');
const vyberSuboru = document.getElementById('vyber-suboru');

// Jednorazové položky
const sucetJednorazove = document.getElementById('sucet-jednorazove');
const nadpisJednorazovych = document.getElementById('nadpis-jednorazovych');
const zoznamJednorazovych = document.getElementById('zoznam-jednorazovych');
const ziadneJednorazove = document.getElementById('ziadne-jednorazove');
const pridanieJednorazovej = document.getElementById('pridanie-jednorazovej');
const formularJednorazovej = document.getElementById('formular-jednorazovej');
const nadpisFormularaJednorazovej = document.getElementById('nadpis-formulara-jednorazovej');
const poleJednorazovaDatum = document.getElementById('jednorazova-datum');
const poleJednorazovaNazov = document.getElementById('jednorazova-nazov');
const poleJednorazovaSuma = document.getElementById('jednorazova-suma');
const tlacidloUlozitJednorazovu = document.getElementById('tlacidlo-ulozit-jednorazovu');
const tlacidloZrusitJednorazovu = document.getElementById('tlacidlo-zrusit-jednorazovu');

// Dane a odvody + profil
const poleOdhadMesacne = document.getElementById('odhad-mesacne');
const odhadNavrh = document.getElementById('odhad-navrh');
const odhadText = document.getElementById('odhad-text');
const odhadZmenit = document.getElementById('odhad-zmenit');
const odhadPole = document.getElementById('odhad-pole');
const odhadHotovo = document.getElementById('odhad-hotovo');
const vysledokDane = document.getElementById('vysledok-dane');
const nastaveniaProfil = document.getElementById('nastavenia-profil');
const formularProfil = document.getElementById('formular-profil');
const poleProfilVznik = document.getElementById('profil-vznik');
const poleProfilPredtym = document.getElementById('profil-predtym');
const poleProfilZamestnany = document.getElementById('profil-zamestnany');

// Výkaz práce
const tlacidloVykaz = document.getElementById('tlacidlo-vykaz');
const vykazSumy = document.getElementById('vykaz-sumy');
const vykazPoznamky = document.getElementById('vykaz-poznamky');
const vykaz = document.getElementById('vykaz');

// Sadzby: tlačidlá pri formulári a časť Nastavenia
const sadzbyTlacidla = document.getElementById('sadzby-tlacidla');
const nastavenia = document.getElementById('nastavenia');
const zoznamSadzieb = document.getElementById('zoznam-sadzieb');
const ziadneSadzby = document.getElementById('ziadne-sadzby');
const formularSadzby = document.getElementById('formular-sadzby');
const nadpisSadzby = document.getElementById('nadpis-sadzby');
const poleNazovSadzby = document.getElementById('sadzba-nazov');
const poleSumaSadzby = document.getElementById('sadzba-suma');
const tlacidloUlozitSadzbu = document.getElementById('tlacidlo-ulozit-sadzbu');
const tlacidloZrusitSadzbu = document.getElementById('tlacidlo-zrusit-sadzbu');

const sprava = document.getElementById('sprava');
const spravaText = document.getElementById('sprava-text');
const spravaZavriet = document.getElementById('sprava-zavriet');

// ===== Správa dole na obrazovke =====

let casovacSpravy = null;

// Zobrazí krátku správu. Bežná správa po 5 sekundách zmizne, chybová ostane, kým ju nezavrieš.
function zobrazSpravu(text, jeChyba) {
  spravaText.textContent = text;
  sprava.className = jeChyba ? 'sprava sprava-chyba' : 'sprava';
  sprava.hidden = false;
  clearTimeout(casovacSpravy);
  if (!jeChyba) {
    casovacSpravy = setTimeout(() => {
      sprava.hidden = true;
    }, 5000);
  }
}

spravaZavriet.addEventListener('click', () => {
  sprava.hidden = true;
});

// ===== Vlastné okno s otázkou (namiesto confirm() prehliadača) =====

const okno = document.getElementById('okno');
const oknoNadpis = document.getElementById('okno-nadpis');
const oknoText = document.getElementById('okno-text');
const oknoIkona = document.getElementById('okno-ikona');
const oknoAno = document.getElementById('okno-ano');
const oknoNie = document.getElementById('okno-nie');

// Zobrazí okno s otázkou a počká na odpoveď. Vráti Promise ("prísľub" výsledku):
// true = klikol si na hlavné tlačidlo, false = Zrušiť, Esc alebo klik mimo okna.
// Použitie: if (await potvrd({ nadpis: 'Zmazať?', text: '...', ano: 'Zmazať', nebezpecne: true })) { ... }
// nebezpecne: true = červené tlačidlo a kurzor na "Zrušiť" (Enter nič nezmaže omylom)
function potvrd({ nadpis, text, ano = 'OK', nie = 'Zrušiť', nebezpecne = false, ikona = null }) {
  oknoNadpis.textContent = nadpis;
  oknoText.textContent = text;
  oknoAno.textContent = ano;
  oknoNie.textContent = nie;
  oknoAno.classList.toggle('tlacidlo-nebezpecne', nebezpecne);
  okno.classList.toggle('nebezpecne', nebezpecne);
  oknoIkona.setAttribute('href', `#i-${ikona || (nebezpecne ? 'kos' : 'otaznik')}`);
  okno.returnValue = '';
  okno.showModal(); // showModal = okno navrchu, zvyšok stránky sa dovtedy nedá použiť
  (nebezpecne ? oknoNie : oknoAno).focus();
  return new Promise((vyries) => {
    // "close" nastane, keď sa okno zavrie (tlačidlom, Esc alebo klikom mimo)
    okno.addEventListener('close', () => vyries(okno.returnValue === 'ano'), { once: true });
  });
}

// Klik na stmavené pozadie mimo okna = Zrušiť
okno.addEventListener('click', (udalost) => {
  if (udalost.target === okno) {
    okno.close('nie');
  }
});

// ===== Pripomienka zálohy =====

// Pod týmto kľúčom si pamätáme dátum poslednej stiahnutej zálohy ("RRRR-MM-DD")
const KLUC_POSLEDNA_ZALOHA = 'zivnost-prehlad.posledna-zaloha';
// Po koľkých dňoch bez zálohy appka nenápadne pripomenie stiahnuť novú
const DNI_PRIPOMIENKY_ZALOHY = 14;

const panelZaloha = document.getElementById('panel-zaloha');
const panelZalohaText = document.getElementById('panel-zaloha-text');
const zalohaStav = document.getElementById('zaloha-stav');

// Dátum poslednej zálohy, alebo null (ešte nebola, alebo sa nedá prečítať)
function poslednaZaloha() {
  try {
    const datum = localStorage.getItem(KLUC_POSLEDNA_ZALOHA);
    return jePlatnyDatum(datum) ? datum : null;
  } catch {
    return null;
  }
}

// Koľko dní ubehlo medzi dvoma dátumami "RRRR-MM-DD"
function rozdielDni(od, do_) {
  return Math.round((Date.parse(do_) - Date.parse(od)) / 86400000); // 86 400 000 ms = 1 deň
}

// "dnes", "včera", "pred 5 dňami"
function textPredDnami(dni) {
  if (dni <= 0) return 'dnes';
  if (dni === 1) return 'včera';
  return `pred ${dni} dňami`;
}

// Má appka nejaké dáta, ktoré stojí za to zálohovať?
function appkaMaData() {
  return zaznamy.length > 0 || projekty.length > 0 || jednorazove.length > 0 || sadzby.length > 0;
}

// Ukáže stav zálohy v bočnom paneli a v Nastaveniach; pri starej zálohe pridá bodku k Nastaveniam
function vykresliZalohu() {
  const maData = appkaMaData();
  const posledna = poslednaZaloha();
  const dni = posledna ? rozdielDni(posledna, dnesnyDatum()) : null;
  // Pripomíname iba vtedy, keď je čo zálohovať a dáta sa neukladajú samé do súboru
  const staraRucna = maData && stavSuboru !== 'ok' && (posledna === null || dni > DNI_PRIPOMIENKY_ZALOHY);
  // Dátový súbor potrebuje tvoju pozornosť (povoliť, načítať, chyba)
  const suborTreba = ['povolit', 'nacitat', 'chyba'].includes(stavSuboru);
  const stara = staraRucna || suborTreba;

  panelZaloha.hidden = !maData && posledna === null && !suborTreba;
  if (stavSuboru === 'ok') {
    const kedy = textUlozeniaDoSuboru();
    panelZalohaText.textContent = kedy ? `Uložené do súboru ${kedy}` : 'Ukladám do súboru';
  } else if (stavSuboru === 'povolit') {
    panelZalohaText.textContent = 'Povoliť ukladanie do súboru';
  } else if (stavSuboru === 'nacitat') {
    panelZalohaText.textContent = 'Načítať dáta zo súboru';
  } else if (stavSuboru === 'chyba') {
    panelZalohaText.textContent = 'Ukladanie do súboru zlyhalo';
  } else {
    panelZalohaText.textContent = posledna
      ? `Posledná záloha: ${formatDatum(posledna)}`
      : 'Záloha: zatiaľ žiadna';
  }
  panelZaloha.classList.toggle('stara', stara);
  panelZaloha.title = suborTreba ? 'Klikni na vyriešenie' : stara ? 'Je čas stiahnuť novú zálohu' : 'Otvoriť zálohu dát';

  zalohaStav.textContent = (posledna
    ? `Posledná ručná záloha: ${formatDatum(posledna)} (${textPredDnami(dni)}).`
    : 'Ručnú zálohu si v tomto prehliadači ešte nesťahoval.') +
    (staraRucna ? ' Odporúčam stiahnuť novú.' : '');
  zalohaStav.classList.toggle('stara', staraRucna);
  vykresliDatovySubor();

  for (const tlacidlo of document.querySelectorAll('[data-zalozka="nastavenia"]')) {
    tlacidlo.classList.toggle('ma-bodku', stara);
  }
}

// Klik na zálohu v paneli: pri "Povoliť" / "Načítať" to rovno urobí,
// inak otvorí Nastavenia a presunie sa ku karte Záloha dát
panelZaloha.addEventListener('click', () => {
  if (stavSuboru === 'povolit' || stavSuboru === 'nacitat') {
    povolSubor();
    return;
  }
  prepniZalozku('nastavenia');
  document.getElementById('nastavenia-zaloha').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ===== Záložky a vzhľad =====

const dnesnyDen = document.getElementById('dnesny-den');
const poleTmavyRezim = document.getElementById('tmavy-rezim');
const poleSklo = document.getElementById('sklo-rezim');
const skloPozadie = document.querySelector('.sklo-pozadie');

// Práve otvorená záložka
let aktualnaZalozka = 'prehlad';
// Záložka, z ktorej si klikol na "Upraviť" záznam (po uložení sa do nej vrátime), alebo null
let zalozkaPredUpravou = null;

// Ukáže zvolenú záložku, ostatné skryje a zvýrazní ju v navigácii
function prepniZalozku(nova) {
  if (!ZALOZKY.includes(nova)) {
    nova = 'prehlad'; // neznáma (napr. nič uložené) -> Prehľad
  }
  aktualnaZalozka = nova;
  for (const sekcia of document.querySelectorAll('[data-obsah]')) {
    sekcia.hidden = sekcia.dataset.obsah !== nova;
  }
  // aria-current="page" = "toto je práve otvorené" (CSS podľa toho zvýrazní tlačidlo)
  for (const tlacidlo of document.querySelectorAll('.nav-polozka, .spodna-nav button')) {
    if (tlacidlo.dataset.zalozka === nova) {
      tlacidlo.setAttribute('aria-current', 'page');
    } else {
      tlacidlo.removeAttribute('aria-current');
    }
  }
  window.scrollTo(0, 0); // nová záložka sa ukáže od začiatku
  try {
    localStorage.setItem(KLUC_ZALOZKA, nova);
  } catch {
    // nevadí, iba si to prehliadač nezapamätá
  }
}

// Klik na čokoľvek s data-zalozka (bočný panel, lišta dole, stopky v paneli) prepne záložku
document.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('[data-zalozka]');
  if (tlacidlo) {
    prepniZalozku(tlacidlo.dataset.zalozka);
  }
});

// Zapne alebo vypne tmavý režim (atribút data-theme na <html> prepne farby v style.css)
function nastavTemu(tmava) {
  if (tmava) {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
  poleTmavyRezim.checked = tmava;
}

function nacitajTemu() {
  try {
    nastavTemu(localStorage.getItem(KLUC_TEMA) === 'tmava');
  } catch {
    nastavTemu(false);
  }
}

poleTmavyRezim.addEventListener('change', () => {
  nastavTemu(poleTmavyRezim.checked);
  try {
    localStorage.setItem(KLUC_TEMA, poleTmavyRezim.checked ? 'tmava' : 'svetla');
  } catch {
    // nevadí, iba si to prehliadač nezapamätá
  }
});

// ===== Tekuté sklo (liquid glass) =====
// Trieda "sklo" na <html> zapne v style.css priesvitné karty a farebné škvrny za nimi
function nastavSklo(zapnute) {
  document.documentElement.classList.toggle('sklo', zapnute);
  poleSklo.checked = zapnute;
}

function nacitajSklo() {
  try {
    nastavSklo(localStorage.getItem(KLUC_SKLO) !== 'vypnute');
  } catch {
    nastavSklo(true);
  }
}

poleSklo.addEventListener('change', () => {
  nastavSklo(poleSklo.checked);
  try {
    localStorage.setItem(KLUC_SKLO, poleSklo.checked ? 'zapnute' : 'vypnute');
  } catch {
    // nevadí, iba si to prehliadač nezapamätá
  }
});

// Odlesk pod myšou: pozíciu myši vo vnútri skla zapíšeme do CSS premenných --mx a --my.
// Škvrny v pozadí sa zároveň jemne posunú opačne ako myš (pocit hĺbky).
const SKLENENE_PRVKY = '.karta, .dlazdica, .okno';
const menejPohybu = window.matchMedia('(prefers-reduced-motion: reduce)');
let sklenenyPrvok = null;    // sklo, nad ktorým je práve myš
let poslednaMys = null;      // posledná udalosť myši, spracuje sa raz za snímku
let cakaNaSnimku = false;

function zhasniOdlesk() {
  if (sklenenyPrvok) {
    sklenenyPrvok.style.removeProperty('--mx');
    sklenenyPrvok.style.removeProperty('--my');
    sklenenyPrvok = null;
  }
}

function posunOdlesk() {
  cakaNaSnimku = false;
  const udalost = poslednaMys;
  const prvok = udalost.target instanceof Element ? udalost.target.closest(SKLENENE_PRVKY) : null;
  if (prvok !== sklenenyPrvok) {
    zhasniOdlesk();
    sklenenyPrvok = prvok;
  }
  if (prvok) {
    const r = prvok.getBoundingClientRect();
    prvok.style.setProperty('--mx', `${Math.round(udalost.clientX - r.left)}px`);
    prvok.style.setProperty('--my', `${Math.round(udalost.clientY - r.top)}px`);
  }
  if (!menejPohybu.matches) {
    // posun najviac o 15 px na každú stranu
    const x = (udalost.clientX / window.innerWidth - 0.5) * -30;
    const y = (udalost.clientY / window.innerHeight - 0.5) * -30;
    skloPozadie.style.setProperty('--px', `${Math.round(x)}px`);
    skloPozadie.style.setProperty('--py', `${Math.round(y)}px`);
  }
}

document.addEventListener('pointermove', (udalost) => {
  // iba myš (nie prst na mobile) a iba pri zapnutom skle
  if (udalost.pointerType !== 'mouse' || !document.documentElement.classList.contains('sklo')) {
    return;
  }
  poslednaMys = udalost;
  // requestAnimationFrame = urob to tesne pred ďalším prekreslením (nie stokrát za sekundu zbytočne)
  if (!cakaNaSnimku) {
    cakaNaSnimku = true;
    requestAnimationFrame(posunOdlesk);
  }
});

// Myš odišla z okna prehliadača: odlesk zhasne
document.documentElement.addEventListener('pointerleave', zhasniOdlesk);

// ===== Kontrola dát zo súboru alebo z localStorage =====

// Je text platný dátum "RRRR-MM-DD"? (napr. "2026-02-30" nie je)
function jePlatnyDatum(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const [rok, mesiac, den] = text.split('-').map(Number);
  const d = new Date(rok, mesiac - 1, den);
  return d.getFullYear() === rok && d.getMonth() === mesiac - 1 && d.getDate() === den;
}

// Skontroluje jeden záznam. Vráti nový "čistý" záznam iba so známymi údajmi,
// alebo null, ak je v ňom niečo zle.
function vycistiZaznam(z) {
  if (typeof z !== 'object' || z === null) {
    return null;
  }
  const zakladJeSpravny =
    Number.isInteger(z.id) && z.id > 0 &&
    jePlatnyDatum(z.datum) &&
    typeof z.zakazka === 'string' && z.zakazka.length <= 100 && // poznámka môže byť prázdna
    Number.isFinite(z.sadzba) && z.sadzba > 0;
  if (!zakladJeSpravny) {
    return null;
  }

  const cisty = { id: z.id, datum: z.datum, zakazka: z.zakazka.trim(), sadzba: z.sadzba };

  // Názov sadzby je nepovinný (staršie záznamy ho nemajú)
  if (z.sadzbaNazov !== undefined) {
    if (typeof z.sadzbaNazov !== 'string' || z.sadzbaNazov.trim() === '' ||
        z.sadzbaNazov.length > MAX_DLZKA_NAZVU_SADZBY) {
      return null;
    }
    cisty.sadzbaNazov = z.sadzbaNazov.trim();
  }

  // Projekt je nepovinný (staršie záznamy ho nemajú)
  if (z.projektId !== undefined) {
    if (!Number.isInteger(z.projektId) || z.projektId <= 0) {
      return null;
    }
    cisty.projektId = z.projektId;
  }

  if (z.zaciatok !== undefined || z.koniec !== undefined) {
    // Záznam zadaný časom od – do: skontrolujeme časy a hodiny vypočítame znova
    if (typeof z.obed !== 'boolean') {
      return null;
    }
    const maPrerusenieCasom = z.prerusenieOd !== undefined || z.prerusenieDo !== undefined;
    const maPrerusenieHodinami = z.prerusenieHodiny !== undefined;
    if (maPrerusenieCasom && maPrerusenieHodinami) {
      return null; // prerušenie môže byť zadané iba jedným spôsobom
    }
    const casy = {
      zaciatok: z.zaciatok,
      koniec: z.koniec,
      obed: z.obed,
      prerusenie: maPrerusenieCasom || maPrerusenieHodinami,
      prerusenieRezim: maPrerusenieHodinami ? 'hodiny' : 'cas',
      prerusenieOd: z.prerusenieOd,
      prerusenieDo: z.prerusenieDo,
      prerusenieHodiny: z.prerusenieHodiny,
    };
    if (Object.keys(skontrolujCasy(casy)).length > 0) {
      return null;
    }
    cisty.zaciatok = z.zaciatok;
    cisty.koniec = z.koniec;
    cisty.obed = z.obed;
    if (maPrerusenieCasom) {
      cisty.prerusenieOd = z.prerusenieOd;
      cisty.prerusenieDo = z.prerusenieDo;
    }
    if (maPrerusenieHodinami) {
      cisty.prerusenieHodiny = z.prerusenieHodiny;
    }
    // Dôvod prerušenia je nepovinný a dáva zmysel iba vtedy, keď prerušenie bolo
    if (z.prerusenieDovod !== undefined) {
      if (!casy.prerusenie || typeof z.prerusenieDovod !== 'string' ||
          z.prerusenieDovod.trim() === '' || z.prerusenieDovod.length > MAX_DLZKA_DOVODU) {
        return null;
      }
      cisty.prerusenieDovod = z.prerusenieDovod.trim();
    }
    cisty.hodiny = odpracovaneMinuty(casy) / 60;
  } else {
    // Záznam zadaný počtom hodín
    if (!(Number.isFinite(z.hodiny) && z.hodiny > 0)) {
      return null;
    }
    cisty.hodiny = z.hodiny;
  }

  cisty.suma = naCenty(cisty.hodiny * cisty.sadzba); // sumu radšej vypočítame znova
  return cisty;
}

// Skontroluje celý zoznam záznamov. Vráti pole čistých záznamov, alebo null pri chybe.
function vycistiZoznam(zoznam) {
  if (!Array.isArray(zoznam)) {
    return null;
  }
  const vysledok = [];
  const pouziteId = new Set();
  for (const z of zoznam) {
    const cisty = vycistiZaznam(z);
    if (cisty === null || pouziteId.has(cisty.id)) {
      return null; // stačí jeden zlý záznam a celý zoznam odmietneme
    }
    pouziteId.add(cisty.id);
    vysledok.push(cisty);
  }
  return vysledok;
}

// Nastaví nový zoznam záznamov a posunie počítadlo id za najväčšie použité
function nastavZaznamy(zoznam) {
  zaznamy = zoznam;
  dalsieId = zoznam.reduce((max, z) => Math.max(max, z.id), 0) + 1;
}

// ===== localStorage: načítanie a uloženie =====

// Načíta a skontroluje jednu vec z localStorage (záznamy alebo sadzby).
// "vycisti" je funkcia, ktorá dáta skontroluje; "popis" sa použije v chybovej hláške.
// Vráti skontrolované dáta, alebo null, ak nič uložené nie je alebo sa to nedá prečítať.
function nacitajPolozku(kluc, vycisti, popis) {
  let text;
  try {
    text = localStorage.getItem(kluc);
  } catch {
    ukladanieZapnute = false;
    zobrazSpravu('Prehliadač nepovolil ukladanie. Údaje po zatvorení stránky zmiznú.', true);
    return null;
  }

  if (text === null) {
    return null; // prvé spustenie – zatiaľ nič uložené
  }

  let data = null;
  try {
    data = vycisti(JSON.parse(text));
  } catch {
    data = null; // JSON.parse zlyhá, ak text nie je platný JSON
  }

  if (data === null) {
    // Dáta sa nedajú prečítať. Neprepíšeme ich – najprv ich odložíme bokom.
    try {
      localStorage.setItem(kluc + '.poskodene', text);
      zobrazSpravu(`Uložené ${popis} sa nepodarilo prečítať. Odložil som ich bokom. Ak máš zálohu, načítaj ju.`, true);
    } catch {
      ukladanieZapnute = false;
      zobrazSpravu(`Uložené ${popis} sa nepodarilo prečítať. Ukladanie som vypol, aby sa neprepísali.`, true);
    }
  }
  return data;
}

// Uloží dáta do localStorage pod zadaným kľúčom
function ulozPolozku(kluc, data) {
  if (!ukladanieZapnute) {
    return;
  }
  try {
    // localStorage vie uložiť iba text, preto dáta prevedieme na JSON text
    localStorage.setItem(kluc, JSON.stringify(data));
  } catch {
    zobrazSpravu('Údaje sa nepodarilo uložiť do prehliadača. Stiahni si zálohu.', true);
  }
  // Bežiace stopky nie sú súčasťou zálohy, kvôli nim súbor neprepisujeme
  if (kluc !== KLUC_STOPKY) {
    naplanujZapisDoSuboru();
  }
}

// Uloží všetky záznamy (volá sa po každej zmene)
function ulozDoUloziska() {
  ulozPolozku(KLUC_ULOZISKA, zaznamy);
}

// ===== Kontrola vstupov vo formulári =====

// Vráti objekt s chybami, napr. { hodiny: "..." }. Prázdny objekt = všetko v poriadku.
function skontroluj(udaje) {
  const chyby = {};
  if (!udaje.datum) {
    chyby.datum = 'Vyber dátum.';
  }
  // Poznámka (zakazka) je nepovinná, preto ju nekontrolujeme
  // NaN > 0 je false, takže toto zachytí aj text, ktorý nie je číslo
  if (!(udaje.sadzba > 0)) {
    chyby.sadzba = 'Sadzba musí byť kladné číslo v eurách, napr. 25 alebo 30,50.';
  }

  if (udaje.rezim === 'hodiny') {
    if (!(udaje.hodiny > 0)) {
      chyby.hodiny = 'Zadaj odpracovaný čas, napr. 7 h 30 min (minúty 0 – 59).';
    }
  } else {
    // Object.assign pridá chyby časov k ostatným chybám
    Object.assign(chyby, skontrolujCasy(udaje));
  }
  return chyby;
}

// Z údajov formulára poskladá záznam na uloženie
function vytvorZaznam(id, udaje) {
  const zaznam = { id, datum: udaje.datum, zakazka: udaje.zakazka, sadzba: udaje.sadzba };
  if (udaje.sadzbaNazov) {
    zaznam.sadzbaNazov = udaje.sadzbaNazov;
  }
  if (udaje.projektId !== undefined) {
    zaznam.projektId = udaje.projektId;
  }
  if (udaje.rezim === 'cas') {
    zaznam.zaciatok = udaje.zaciatok;
    zaznam.koniec = udaje.koniec;
    zaznam.obed = udaje.obed;
    if (udaje.prerusenie && udaje.prerusenieRezim === 'hodiny') {
      zaznam.prerusenieHodiny = udaje.prerusenieHodiny;
    } else if (udaje.prerusenie) {
      zaznam.prerusenieOd = udaje.prerusenieOd;
      zaznam.prerusenieDo = udaje.prerusenieDo;
    }
    if (udaje.prerusenie && udaje.prerusenieDovod) {
      zaznam.prerusenieDovod = udaje.prerusenieDovod;
    }
    zaznam.hodiny = odpracovaneMinuty(udaje) / 60;
  } else {
    zaznam.hodiny = udaje.hodiny;
  }
  zaznam.suma = naCenty(zaznam.hodiny * zaznam.sadzba);
  return zaznam;
}

// ===== Prepínač Od – do / Počet hodín =====

// Prepne formulár do zvoleného režimu ('cas' alebo 'hodiny')
function nastavRezim(novyRezim) {
  rezim = novyRezim;
  for (const radio of rezimRadia) {
    radio.checked = radio.value === novyRezim;
  }
  blokCas.hidden = novyRezim !== 'cas';
  blokHodiny.hidden = novyRezim !== 'hodiny';
  zobrazChyby({}); // staré chybové hlášky už neplatia
  vykresliNahlad();
}

// Zistí, ktorý režim si použil naposledy (pamätá si to prehliadač)
function nacitajOblubenyRezim() {
  try {
    const ulozeny = localStorage.getItem(KLUC_REZIM);
    if (ulozeny === 'cas' || ulozeny === 'hodiny') {
      return ulozeny;
    }
  } catch {
    // ak localStorage nefunguje, nevadí – použijeme predvolený režim
  }
  return 'cas';
}

function ulozOblubenyRezim() {
  try {
    localStorage.setItem(KLUC_REZIM, rezim);
  } catch {
    // nevadí, iba si to prehliadač nezapamätá
  }
}

// Prečíta z formulára všetky časy do jedného objektu
function casyZFormulara() {
  return {
    zaciatok: polia.zaciatok.value,
    koniec: polia.koniec.value,
    obed: polieObed.checked,
    prerusenie: polePrerusenie.checked,
    prerusenieRezim: rezimPrerusenia(),
    prerusenieOd: polia.prerusenieOd.value,
    prerusenieDo: polia.prerusenieDo.value,
    // z h + min vypočítame hodiny (napr. 1 h 30 min -> 1,5); pri zlom vstupe vyjde NaN
    prerusenieHodiny: precitajTrvanie(polia.prerusenieHodiny.value, polePreruseniaMinuty.value) / 60,
    prerusenieDovod: polePreruseniaDovod.value.trim(),
  };
}

// Ktorý spôsob zadania prerušenia je vybraný: 'cas' (od – do) alebo 'hodiny'
function rezimPrerusenia() {
  for (const radio of rezimPreruseniaRadia) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return 'cas';
}

// Prepne prerušenie na zadanie časom od – do ('cas') alebo počtom hodín ('hodiny')
function nastavRezimPrerusenia(novyRezim) {
  for (const radio of rezimPreruseniaRadia) {
    radio.checked = radio.value === novyRezim;
  }
  blokPreruseniaCas.hidden = novyRezim !== 'cas';
  blokPreruseniaHodiny.hidden = novyRezim !== 'hodiny';
  vykresliNahlad();
}

// Ukáže pod časmi, koľko si odpracoval, ešte pred uložením
function vykresliNahlad() {
  const casy = casyZFormulara();
  if (Object.keys(skontrolujCasy(casy)).length > 0) {
    nahlad.textContent = 'Odpracované: –'; // časy ešte nie sú zadané správne
    return;
  }
  const minuty = odpracovaneMinuty(casy);
  nahlad.textContent = `Odpracované: ${formatTrvanie(minuty)}`;
}

// Ukáže alebo skryje políčka "Prerušenie od / do" podľa zaškrtnutia
function zobrazPrerusenie() {
  blokPrerusenie.hidden = !polePrerusenie.checked;
  vykresliNahlad();
}

// Zruší prerušenie vo formulári (prerušenie býva výnimočné, preto sa neopakuje)
function vymazPrerusenie() {
  polePrerusenie.checked = false;
  polia.prerusenieOd.value = '';
  polia.prerusenieDo.value = '';
  polia.prerusenieHodiny.value = '';
  polePreruseniaMinuty.value = '';
  polePreruseniaDovod.value = '';
  nastavRezimPrerusenia('cas');
  zobrazPrerusenie();
}

// Zobrazí hlášky pod políčkami (a zmaže staré)
function zobrazChyby(chyby) {
  for (const nazov in polia) {
    const hlaska = chyby[nazov] || '';
    // textContent namiesto innerHTML: text sa zobrazí ako text, nikdy sa nespustí ako kód
    document.getElementById('chyba-' + nazov).textContent = hlaska;
    polia[nazov].setAttribute('aria-invalid', hlaska ? 'true' : 'false');
  }
  // Pri dvojiciach h + min zvýrazníme červenou aj políčko s minútami
  poleMinuty.setAttribute('aria-invalid', chyby.hodiny ? 'true' : 'false');
  polePreruseniaMinuty.setAttribute('aria-invalid', chyby.prerusenieHodiny ? 'true' : 'false');
  // Kurzor presunieme do prvého chybného políčka
  const prveChybne = Object.keys(polia).find((nazov) => chyby[nazov]);
  if (prveChybne) {
    polia[prveChybne].focus();
  }
}

// ===== Úprava a mazanie =====

// Načíta záznam do formulára, aby sa dal upraviť
function zacniUpravu(id) {
  const z = zaznamy.find((x) => x.id === id);
  if (!z) {
    return;
  }
  // Formulár je v záložke Prehľad; zapamätáme si, odkiaľ si prišiel, aby sme sa po uložení vrátili
  if (zalozkaPredUpravou === null && aktualnaZalozka !== 'prehlad') {
    zalozkaPredUpravou = aktualnaZalozka;
  }
  prepniZalozku('prehlad');
  upravovaneId = id;
  polia.datum.value = z.datum;
  polia.zakazka.value = z.zakazka;
  polia.sadzba.value = cisloDoPolicka(z.sadzba);
  // Ak mal záznam názov sadzby, ponecháme ho (kým sumu neprepíšeš)
  aktivnaSadzba = z.sadzbaNazov ? { nazov: z.sadzbaNazov, suma: z.sadzba } : null;
  vykresliTlacidlaSadzieb();
  // Projekt nastavíme až po upravovaneId – výber ukáže aj uzavretý projekt tohto záznamu
  vykresliVyberProjektu();
  poleProjekt.value = z.projektId !== undefined && najdiProjekt(z.projektId) ? String(z.projektId) : '';

  // Formulár prepneme do režimu, v ktorom bol záznam zadaný
  if (z.zaciatok !== undefined) {
    polia.zaciatok.value = z.zaciatok;
    polia.koniec.value = z.koniec;
    polieObed.checked = z.obed;
    polePrerusenie.checked = z.prerusenieOd !== undefined || z.prerusenieHodiny !== undefined;
    polia.prerusenieOd.value = z.prerusenieOd || '';
    polia.prerusenieDo.value = z.prerusenieDo || '';
    if (z.prerusenieHodiny !== undefined) {
      vyplnTrvanie(polia.prerusenieHodiny, polePreruseniaMinuty, z.prerusenieHodiny);
    } else {
      polia.prerusenieHodiny.value = '';
      polePreruseniaMinuty.value = '';
    }
    polePreruseniaDovod.value = z.prerusenieDovod || '';
    nastavRezimPrerusenia(z.prerusenieHodiny !== undefined ? 'hodiny' : 'cas');
    blokPrerusenie.hidden = !polePrerusenie.checked;
    vymazPolickaHodin();
    nastavRezim('cas');
  } else {
    vyplnTrvanie(polia.hodiny, poleMinuty, z.hodiny);
    vymazPrerusenie();
    nastavRezim('hodiny');
  }

  nadpisFormulara.textContent = 'Upraviť záznam';
  tlacidloUlozit.textContent = 'Uložiť zmeny';
  tlacidloZrusit.hidden = false;

  kartaFormulara.scrollIntoView({ behavior: 'smooth', block: 'start' });
  polia.datum.focus({ preventScroll: true });
  vykresliTabulku(); // zvýrazní upravovaný riadok
  vykresliPrehlad(); // aj v posledných záznamoch
}

// Vráti formulár do režimu "Nový záznam"
function ukonciUpravu() {
  upravovaneId = null;
  polia.datum.value = dnesnyDatum();
  polia.zakazka.value = '';
  vykresliVyberProjektu();
  poleProjekt.value = '';
  vymazPolickaHodin();
  vymazPrerusenie();
  vyplnPredvolenuSadzbu();
  nastavRezim(nacitajOblubenyRezim()); // vráti režim, ktorý používaš bežne

  nadpisFormulara.textContent = 'Nový záznam';
  tlacidloUlozit.textContent = 'Pridať záznam';
  tlacidloZrusit.hidden = true;
  vykresliTabulku();
  vykresliPrehlad();

  // Vrátime sa do záložky, z ktorej si prišiel upravovať (napr. Záznamy alebo Projekty)
  if (zalozkaPredUpravou !== null) {
    const spat = zalozkaPredUpravou;
    zalozkaPredUpravou = null;
    prepniZalozku(spat);
  }
}

// Zmaže záznam po potvrdení (async = funkcia počká na odpoveď v okne, kým pokračuje)
async function zmazZaznam(id) {
  const z = zaznamy.find((x) => x.id === id);
  if (!z) {
    return;
  }
  const poznamka = z.zakazka ? ` „${z.zakazka}“` : '';
  const potvrdene = await potvrd({
    nadpis: 'Zmazať záznam?',
    text: `Záznam${poznamka} z ${formatDatum(z.datum)} (${formatTrvanie(minutyZaznamu(z))}) sa zmaže. ` +
      'Tento krok sa nedá vrátiť.',
    ano: 'Zmazať',
    nebezpecne: true,
  });
  if (!potvrdene) {
    return;
  }
  zaznamy = zaznamy.filter((x) => x.id !== id);
  if (upravovaneId === id) {
    ukonciUpravu();
  }
  ulozDoUloziska();
  vykresli();
  zobrazSpravu('Záznam je zmazaný.', false);
}

// ===== Vykreslenie =====

// SVG (obrázky ikon) potrebujú pri vytváraní z JavaScriptu vlastný "menný priestor"
const SVG_NS = 'http://www.w3.org/2000/svg';

// Vytvorí ikonu z "skladu" ikon v index.html, napr. ikona('ceruzka') -> <svg><use href="#i-ceruzka"></svg>
function ikona(nazov) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ikona');
  svg.setAttribute('aria-hidden', 'true');
  const pouzi = document.createElementNS(SVG_NS, 'use');
  pouzi.setAttribute('href', `#i-${nazov}`);
  svg.appendChild(pouzi);
  return svg;
}

// Ikony pre akcie tlačidiel (ostatné akcie ostanú ako text)
const IKONY_AKCII = { upravit: 'ceruzka', 'upravit-zaznam': 'ceruzka', zmazat: 'kos' };

// Ak má akcia ikonu, zmení tlačidlo na ikonové. Text sa ukáže v bublinke po prejdení myšou (title);
// čítačky obrazovky prečítajú aria-label, ktorý tlačidlo už má.
function pridajIkonu(tlacidlo, akcia) {
  const nazov = IKONY_AKCII[akcia];
  if (!nazov) {
    return;
  }
  tlacidlo.title = tlacidlo.textContent;
  tlacidlo.replaceChildren(ikona(nazov));
  tlacidlo.classList.add('tlacidlo-ikona');
}

// Bunka s dátumom a pod ním sivo deň v týždni, napr. "19. 10. 2026 / pondelok"
// Pri dnesVcera = true sa namiesto dnešného/včerajšieho dátumu ukáže "Dnes"/"Včera" a dátum pod tým.
function pridajBunkuDatum(riadok, datum, dnesVcera = false) {
  const bunka = document.createElement('td');
  bunka.className = 'datum';
  bunka.dataset.nazov = 'Dátum';
  const obsah = document.createElement('div');
  const text = document.createElement('span');
  const den = document.createElement('span');
  den.className = 'detail';
  const dni = rozdielDni(datum, dnesnyDatum());
  if (dnesVcera && (dni === 0 || dni === 1)) {
    text.textContent = dni === 0 ? 'Dnes' : 'Včera';
    den.textContent = formatDatum(datum);
  } else {
    text.textContent = formatDatum(datum);
    den.textContent = denVTyzdni(datum);
  }
  obsah.append(text, den);
  bunka.appendChild(obsah);
  riadok.appendChild(bunka);
}

// Pridá do riadku tabuľky jednu bunku s textom
function pridajBunku(riadok, nazovStlpca, text, jeCislo) {
  const bunka = document.createElement('td');
  bunka.textContent = text;
  bunka.dataset.nazov = nazovStlpca; // na mobile sa zobrazí ako popis
  if (jeCislo) {
    bunka.className = 'cislo';
  }
  riadok.appendChild(bunka);
}

// Bunka "Projekt / poznámka": názov projektu (ak je) a pod ním sivo poznámka
function pridajBunkuPoznamka(riadok, z) {
  if (z.projektId === undefined) {
    pridajBunku(riadok, 'Projekt / poznámka', z.zakazka || '–', false);
    if (!z.zakazka) {
      riadok.lastChild.classList.add('bez-poznamky'); // pomlčka bude sivá
    }
    return;
  }
  const bunka = document.createElement('td');
  bunka.dataset.nazov = 'Projekt / poznámka';
  const obsah = document.createElement('div');
  const nazov = document.createElement('span');
  nazov.className = 'nazov-projektu';
  nazov.textContent = nazovProjektu(z.projektId);
  obsah.appendChild(nazov);
  if (z.zakazka) {
    const poznamka = document.createElement('span');
    poznamka.className = 'detail';
    poznamka.textContent = z.zakazka;
    obsah.appendChild(poznamka);
  }
  bunka.appendChild(obsah);
  riadok.appendChild(bunka);
}

// Bunka s hodinami. Ak bol záznam zadaný časom, pod hodinami ukáže aj "08:00 – 16:30 · obed".
function pridajBunkuHodiny(riadok, z) {
  const bunka = document.createElement('td');
  bunka.className = 'cislo';
  bunka.dataset.nazov = 'Hodiny';

  const obsah = document.createElement('div');
  const hodiny = document.createElement('span');
  hodiny.textContent = formatTrvanie(minutyZaznamu(z)); // napr. "8 h 30 min"
  obsah.appendChild(hodiny);

  if (z.zaciatok !== undefined) {
    const detail = document.createElement('span');
    detail.className = 'detail';
    detail.textContent = `${z.zaciatok} – ${z.koniec}` + (z.obed ? ' · obed' : '');
    obsah.appendChild(detail);
  }

  if (z.prerusenieOd !== undefined || z.prerusenieHodiny !== undefined) {
    const detailPrerusenia = document.createElement('span');
    detailPrerusenia.className = 'detail';
    const casPrerusenia = z.prerusenieHodiny !== undefined
      ? formatTrvanie(Math.round(z.prerusenieHodiny * 60)) // napr. "1 h 30 min"
      : `${z.prerusenieOd} – ${z.prerusenieDo}`;
    // Ak je zadaný dôvod, pridáme ho za čas, napr. "prerušenie 2 h · opravár práčka"
    detailPrerusenia.textContent = `prerušenie ${casPrerusenia}` +
      (z.prerusenieDovod ? ` · ${z.prerusenieDovod}` : '');
    obsah.appendChild(detailPrerusenia);
  }

  bunka.appendChild(obsah);
  riadok.appendChild(bunka);
}

// Bunka so sadzbou. Ak má záznam názov sadzby, ukáže ho sivo pod sumou.
function pridajBunkuSadzba(riadok, z) {
  const bunka = document.createElement('td');
  bunka.className = 'cislo';
  bunka.dataset.nazov = 'Sadzba';

  const obsah = document.createElement('div');
  const suma = document.createElement('span');
  suma.textContent = formatEur.format(z.sadzba);
  obsah.appendChild(suma);

  if (z.sadzbaNazov) {
    const nazov = document.createElement('span');
    nazov.className = 'detail';
    nazov.textContent = z.sadzbaNazov;
    obsah.appendChild(nazov);
  }

  bunka.appendChild(obsah);
  riadok.appendChild(bunka);
}

// Vytvorí malé tlačidlo do tabuľky (Upraviť / Zmazať)
function vytvorTlacidlo(text, akcia, z) {
  const tlacidlo = document.createElement('button');
  tlacidlo.type = 'button';
  tlacidlo.className = akcia === 'zmazat' ? 'tlacidlo-male nebezpecne' : 'tlacidlo-male';
  tlacidlo.textContent = text;
  // data-akcia a data-id nám neskôr povedia, čo a pri ktorom zázname sa kliklo
  tlacidlo.dataset.akcia = akcia;
  tlacidlo.dataset.id = z.id;
  // Celý popis pre čítačky obrazovky, napr. "Zmazať záznam z 18. 10. 2026"
  tlacidlo.setAttribute('aria-label', `${text} záznam z ${formatDatum(z.datum)}`);
  pridajIkonu(tlacidlo, akcia);
  return tlacidlo;
}

// Prekreslí tabuľku – iba záznamy z vybraného mesiaca
function vykresliTabulku() {
  teloTabulky.replaceChildren(); // vymaže staré riadky
  // filter vytvorí nové pole iba so záznamami, ktorých dátum začína napr. "2026-09"
  const zMesiaca = zaznamy.filter((z) => z.datum.startsWith(vybranyMesiac));

  // Počet v nadpise je vidno, aj keď je karta zbalená
  nadpisZaznamov.textContent = `Záznamy – ${formatMesiac(vybranyMesiac)} (${pocetZaznamov(zMesiaca.length)})`;

  // Najnovšie hore: podľa dátumu zostupne, pri rovnakom dátume naposledy pridaný hore.
  const zoradene = zMesiaca.sort(
    (a, b) => b.datum.localeCompare(a.datum) || b.id - a.id
  );

  for (const z of zoradene) {
    const riadok = document.createElement('tr');
    if (z.id === upravovaneId) {
      riadok.className = 'upravovany';
    }
    pridajBunkuDatum(riadok, z.datum);
    pridajBunkuPoznamka(riadok, z);
    pridajBunkuHodiny(riadok, z);
    pridajBunkuSadzba(riadok, z);
    pridajBunku(riadok, 'Suma', formatEur.format(z.suma), true);

    const bunkaAkcie = document.createElement('td');
    bunkaAkcie.className = 'akcie';
    bunkaAkcie.append(vytvorTlacidlo('Upraviť', 'upravit', z), vytvorTlacidlo('Zmazať', 'zmazat', z));
    riadok.appendChild(bunkaAkcie);

    teloTabulky.appendChild(riadok);
  }

  const ziadneZaznamy = zMesiaca.length === 0;
  tabulka.hidden = ziadneZaznamy;
  prazdne.hidden = !ziadneZaznamy;
  document.getElementById('prazdne-text').textContent = zaznamy.length === 0
    ? 'Zatiaľ žiadne záznamy. Prvý pridáš v Prehľade – formulárom alebo stopkami pri projekte.'
    : `V mesiaci ${formatMesiac(vybranyMesiac)} nemáš žiadne záznamy. Iný mesiac vyberieš šípkami ‹ › vyššie.`;
}

// Spočíta hodiny a zárobok za vybraný mesiac
function vykresliSucet() {
  const zMesiaca = zaznamy.filter((z) => z.datum.startsWith(vybranyMesiac));
  // Sčítame celé minúty (presnejšie ako sčítavať desatinné hodiny)
  const minuty = zMesiaca.reduce((spolu, z) => spolu + minutyZaznamu(z), 0);
  const zaHodiny = zMesiaca.reduce((spolu, z) => spolu + z.suma, 0);
  const zaPolozky = sucetJednorazovych(jednorazoveZMesiaca());

  nazovMesiaca.textContent = formatMesiac(vybranyMesiac);
  sucetHodiny.textContent = formatTrvanie(minuty); // napr. "55 h 23 min"
  sucetZarobok.textContent = formatEur.format(naCenty(zaHodiny + zaPolozky));
  sucetJednorazove.hidden = zaPolozky === 0;
  sucetJednorazove.textContent = `z toho jednorazové položky: ${formatEur.format(zaPolozky)}`;
  sucetPocet.textContent = zMesiaca.length;

  // Odkaz "Tento mesiac" ukážeme iba vtedy, keď si práve v inom mesiaci
  mesiacDnes.hidden = vybranyMesiac === dnesnyDatum().slice(0, 7);
}

function vykresli() {
  vykresliProjekty(); // súčty pri projektoch sa mohli zmeniť
  vykresliPrehlad();
  vykresliGraf();
  vykresliTabulku();
  vykresliJednorazove();
  vykresliSucet();
  vykresliDane(); // príjmy sa mohli zmeniť, preto prepočítame aj odhad daní a odvodov
  vykresliZalohu(); // pribudli/ubudli dáta – možno treba pripomenúť zálohu
}

// ===== Udalosti (čo sa stane po kliknutí) =====

// Odoslanie formulára: pridanie nového alebo uloženie upraveného záznamu
formular.addEventListener('submit', async (udalost) => {
  udalost.preventDefault(); // zabráni prehliadaču znova načítať stránku

  const udaje = {
    rezim: rezim,
    datum: polia.datum.value,
    zakazka: polia.zakazka.value.trim(), // trim odstráni medzery na začiatku a konci
    sadzba: precitajCislo(polia.sadzba.value),
    sadzbaNazov: nazovSadzbyPreZaznam(precitajCislo(polia.sadzba.value)),
    // z h + min vypočítame hodiny (napr. 1 h 48 min -> 1,8); pri zlom vstupe vyjde NaN
    hodiny: precitajTrvanie(polia.hodiny.value, poleMinuty.value) / 60,
    ...casyZFormulara(), // pridá zaciatok, koniec, obed a prerušenie
    // "" = bez projektu (undefined), inak id projektu ako číslo
    projektId: poleProjekt.value === '' ? undefined : Number(poleProjekt.value),
  };

  const chyby = skontroluj(udaje);
  zobrazChyby(chyby);
  if (Object.keys(chyby).length > 0) {
    return; // sú chyby – nič neukladáme
  }

  // Upozornenie, ak už na tento deň máš iný záznam v tom istom projekte (alebo tiež bez projektu),
  // aby sa deň omylom nezadal dvakrát. Viac projektov v jeden deň je bežné, na to sa nepýtame.
  // Pri úprave sa pýtame iba vtedy, keď si zmenil dátum alebo projekt.
  const povodny = zaznamy.find((x) => x.id === upravovaneId);
  if (!povodny || povodny.datum !== udaje.datum || povodny.projektId !== udaje.projektId) {
    const tenDen = zaznamy.filter((x) =>
      x.datum === udaje.datum && x.id !== upravovaneId && x.projektId === udaje.projektId
    );
    if (tenDen.length > 0) {
      const minuty = tenDen.reduce((spolu, x) => spolu + minutyZaznamu(x), 0);
      const vProjekte = udaje.projektId !== undefined ? ` v projekte „${nazovProjektu(udaje.projektId)}“` : '';
      const potvrdene = await potvrd({
        nadpis: 'Ďalší záznam v ten istý deň?',
        text: `Na ${formatDatum(udaje.datum)} už máš${vProjekte} ${pocetZaznamov(tenDen.length)} ` +
          `(spolu ${formatTrvanie(minuty)}). Naozaj chceš pridať ďalší?`,
        ano: 'Pridať aj tak',
        ikona: 'pozor',
      });
      if (!potvrdene) {
        return; // nič neukladáme, formulár ostane vyplnený
      }
    }
  }

  // Prepneme prehľad na mesiac záznamu, aby si ho hneď videl v tabuľke
  vybranyMesiac = udaje.datum.slice(0, 7);

  if (upravovaneId !== null) {
    // Úprava: starý záznam nahradíme novým s rovnakým id
    const index = zaznamy.findIndex((x) => x.id === upravovaneId);
    if (index !== -1) {
      zaznamy[index] = vytvorZaznam(upravovaneId, udaje);
    }
    ulozDoUloziska();
    ukonciUpravu();
    zobrazSpravu('Zmeny sú uložené.', false);
  } else {
    // Nový záznam
    zaznamy.push(vytvorZaznam(dalsieId++, udaje));
    ulozDoUloziska();
    // Vyčistíme poznámku, hodiny a prerušenie. Dátum, projekt, sadzbu, časy a obed necháme – často sa opakujú.
    polia.zakazka.value = '';
    vymazPolickaHodin();
    vymazPrerusenie();
    zobrazSpravu('Záznam je pridaný.', false);
  }

  vykresli();
});

tlacidloZrusit.addEventListener('click', ukonciUpravu);

// Prepnutie Od – do / Počet hodín (a zapamätanie si voľby)
for (const radio of rezimRadia) {
  radio.addEventListener('change', () => {
    nastavRezim(radio.value);
    ulozOblubenyRezim();
  });
}

// Pri každej zmene času alebo obeda hneď prepočítame "Odpracované"
polia.zaciatok.addEventListener('input', vykresliNahlad);
polia.koniec.addEventListener('input', vykresliNahlad);
polieObed.addEventListener('change', vykresliNahlad);
polePrerusenie.addEventListener('change', zobrazPrerusenie);
polia.prerusenieOd.addEventListener('input', vykresliNahlad);
polia.prerusenieDo.addEventListener('input', vykresliNahlad);
polia.prerusenieHodiny.addEventListener('input', vykresliNahlad);
polePreruseniaMinuty.addEventListener('input', vykresliNahlad);
for (const radio of rezimPreruseniaRadia) {
  radio.addEventListener('change', () => nastavRezimPrerusenia(radio.value));
}

// ===== Výber času (políčka Od – do) =====
// Vlastné políčko "HH:MM" namiesto <input type="time"> prehliadača (to vyzerá všade inak a niekde
// ukazuje AM/PM). Hodnota je stále text "07:30" alebo "" – zvyšok appky sa preto nemení.
// Klik na hodiny alebo minúty ich označí, potom sa píše číslicami alebo mení šípkami ↑ ↓.
// Kým časť nie je zadaná, je v nej "--" (napr. "07:--"); taký čas kontrola neprijme.

// Rozdelí hodnotu políčka na hodiny a minúty: "07:30" -> { h: '07', m: '30' }, "" -> { h: '--', m: '--' }
function castiCasu(pole) {
  const [h = '--', m = '--'] = pole.value.split(':');
  return { h, m };
}

// Označí hodiny ('h') alebo minúty ('m'), aby sa dalo hneď písať
function oznacCast(pole, cast) {
  pole.dataset.cast = cast;
  delete pole.dataset.prva; // rozpísaná prvá číslica sa zahodí
  if (pole.value === '') {
    pole.value = '--:--'; // aby bolo čo označiť; pri odchode z políčka sa vráti na ""
  }
  if (cast === 'h') {
    pole.setSelectionRange(0, 2);
  } else {
    pole.setSelectionRange(3, 5);
  }
}

// Zapíše hodiny a minúty do políčka a dá vedieť zvyšku appky (udalosť "input" prepočíta náhľad)
function zapisCasti(pole, h, m) {
  pole.value = `${h}:${m}`;
  pole.dispatchEvent(new Event('input', { bubbles: true }));
  if (document.activeElement === pole) {
    oznacCast(pole, pole.dataset.cast || 'h');
  }
  if (otvorenyPanel && otvorenyPanel.ciel.obal === pole.parentElement) {
    oznacVPaneli();
  }
}

// Dvojmiestne číslo: 7 -> "07"
function dveCislice(n) {
  return String(n).padStart(2, '0');
}

// Napísaná číslica. Prvá číslica čaká na druhú (iba ak ešte môže prísť platná druhá),
// po hodinách sa prejde na minúty – ako pri bežných hodinách.
function napisCislicu(pole, cislica) {
  const { h, m } = castiCasu(pole);
  const cast = pole.dataset.cast || 'h';
  const najviac = cast === 'h' ? 23 : 59;
  const prva = pole.dataset.prva;
  let hodnota;
  let hotovo;
  if (prva !== undefined && Number(prva + cislica) <= najviac) {
    hodnota = Number(prva + cislica); // druhá číslica, napr. 1 a 5 -> 15
    hotovo = true;
  } else {
    hodnota = cislica;
    // ak by s ďalšou číslicou vyšlo viac ako 23 (59), druhá už nepríde (napr. 7 -> 07)
    hotovo = cislica * 10 > najviac;
  }
  if (cast === 'h') {
    zapisCasti(pole, dveCislice(hodnota), m);
  } else {
    zapisCasti(pole, h, dveCislice(hodnota));
  }
  if (!hotovo) {
    pole.dataset.prva = String(cislica); // zapisCasti ju zmazal, preto až teraz
  } else if (cast === 'h') {
    oznacCast(pole, 'm');
  }
}

// Šípka ↑ / ↓: o 1 viac / menej, dokola (23 -> 00). Prázdna časť začne aktuálnym časom.
function posunCast(pole, smer) {
  const { h, m } = castiCasu(pole);
  const cast = pole.dataset.cast || 'h';
  const teraz = new Date();
  if (cast === 'h') {
    const nova = h === '--' ? teraz.getHours() : (Number(h) + smer + 24) % 24;
    zapisCasti(pole, dveCislice(nova), m);
  } else {
    const nova = m === '--' ? 0 : (Number(m) + smer + 60) % 60;
    zapisCasti(pole, h, dveCislice(nova));
  }
}

// Vložený text, napr. "7:30", "730", "7.30", "15" -> "HH:MM", alebo null, ak to čas nie je
function precitajCasText(text) {
  const t = text.trim();
  let zhoda = t.match(/^(\d{1,2})\s*[:.,h ]\s*(\d{1,2})$/);
  if (!zhoda) {
    zhoda = t.match(/^(\d{1,2})(\d{2})?$/); // "7", "15", "730", "1530"
  }
  if (!zhoda) {
    return null;
  }
  const cas = `${dveCislice(zhoda[1])}:${dveCislice(zhoda[2] || '0')}`;
  return jePlatnyCas(cas) ? cas : null;
}

// Panel so stĺpcami Hodiny a Minúty pod políčkom (tlačidlo s ikonou hodín).
// Slúži pre čas od – do aj pre dĺžku (h + min). Čo s výberom urobiť, povie "cieľ":
//   { obal, pocetHodin, formatHodin(n), nahradnaHodina, citaj() -> { h, m } (číslo alebo null),
//     zapisHodiny(n), zapisMinuty(n), poVybere() }
// Naraz je otvorený najviac jeden: { ciel, panel, stlpce: { h, m } }, inak null.
let otvorenyPanel = null;

function otvorPanelCasu(ciel) {
  zatvorPanelCasu();
  const panel = document.createElement('div');
  panel.className = 'cas-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Výber času');
  const stlpce = { h: null, m: null };
  for (const [cast, nadpis, pocet] of [['h', 'Hod.', ciel.pocetHodin], ['m', 'Min.', 60]]) {
    const stlpec = document.createElement('div');
    stlpec.className = 'cas-stlpec';
    const hlavicka = document.createElement('p');
    hlavicka.className = 'cas-stlpec-nadpis';
    hlavicka.textContent = nadpis;
    const zoznam = document.createElement('div');
    zoznam.className = 'cas-zoznam';
    for (let i = 0; i < pocet; i++) {
      const tlacidlo = document.createElement('button');
      tlacidlo.type = 'button';
      tlacidlo.textContent = cast === 'h' ? ciel.formatHodin(i) : dveCislice(i);
      tlacidlo.dataset.hodnota = String(i);
      tlacidlo.setAttribute('aria-label', cast === 'h' ? `${i} h` : `${i} min`);
      zoznam.appendChild(tlacidlo);
    }
    // Klik na hodinu: panel ostane otvorený. Klik na minúty: hotovo, panel sa zavrie.
    zoznam.addEventListener('click', (udalost) => {
      const tlacidlo = udalost.target.closest('button');
      if (!tlacidlo) {
        return;
      }
      if (cast === 'h') {
        ciel.zapisHodiny(Number(tlacidlo.dataset.hodnota));
        oznacVPaneli();
      } else {
        ciel.zapisMinuty(Number(tlacidlo.dataset.hodnota));
        zatvorPanelCasu();
        ciel.poVybere();
      }
    });
    stlpec.append(hlavicka, zoznam);
    panel.appendChild(stlpec);
    stlpce[cast] = zoznam;
  }
  ciel.obal.appendChild(panel);
  ciel.obal.querySelector('.cas-tlacidlo').setAttribute('aria-expanded', 'true');
  otvorenyPanel = { ciel, panel, stlpce };
  oznacVPaneli();
}

// Zvýrazní v paneli zvolenú hodinu a minútu a odroluje k nim
function oznacVPaneli() {
  const { ciel, stlpce } = otvorenyPanel;
  const { h, m } = ciel.citaj();
  for (const [cast, hodnota, nahradna] of [['h', h, ciel.nahradnaHodina], ['m', m, 0]]) {
    const zoznam = stlpce[cast];
    let cielove = null;
    for (const tlacidlo of zoznam.children) {
      const zvolene = Number(tlacidlo.dataset.hodnota) === hodnota;
      tlacidlo.setAttribute('aria-pressed', zvolene ? 'true' : 'false');
      if (zvolene) {
        cielove = tlacidlo;
      }
    }
    // Nič nezvolené: odrolujeme k náhradnej hodine (minúty na začiatok)
    cielove = cielove || zoznam.children[nahradna];
    // scrollTop namiesto scrollIntoView – to by posúvalo aj celú stránku
    zoznam.scrollTop = cielove.offsetTop - zoznam.clientHeight / 2 + cielove.offsetHeight / 2;
  }
}

function zatvorPanelCasu() {
  if (otvorenyPanel) {
    otvorenyPanel.panel.remove();
    otvorenyPanel.ciel.obal.querySelector('.cas-tlacidlo').setAttribute('aria-expanded', 'false');
    otvorenyPanel = null;
  }
}

// Tlačidlo s ikonou hodín v obale otvorí / zavrie panel pre daný cieľ
function pripojTlacidloPanela(ciel) {
  ciel.obal.querySelector('.cas-tlacidlo').addEventListener('click', () => {
    if (otvorenyPanel && otvorenyPanel.ciel.obal === ciel.obal) {
      zatvorPanelCasu();
    } else {
      otvorPanelCasu(ciel);
    }
  });
}

// Pripojí správanie ku každému políčku času
for (const pole of document.querySelectorAll('.cas-pole')) {
  let klikMysou = false;

  pole.addEventListener('mousedown', () => {
    klikMysou = true;
  });
  // Príchod klávesom Tab: označia sa hodiny
  pole.addEventListener('focus', () => {
    if (!klikMysou) {
      oznacCast(pole, 'h');
    }
  });
  // Klik myšou: označí sa tá časť, na ktorú si klikol
  pole.addEventListener('click', () => {
    klikMysou = false;
    oznacCast(pole, pole.selectionStart <= 2 ? 'h' : 'm');
  });
  // Odchod z políčka: "07:--" sa doplní na "07:00", prázdne "--:--" sa vráti na ""
  pole.addEventListener('blur', () => {
    klikMysou = false;
    delete pole.dataset.prva;
    const { h, m } = castiCasu(pole);
    if (h === '--' && m === '--') {
      pole.value = '';
    } else if (h !== '--' && m === '--') {
      zapisCasti(pole, h, '00');
    }
  });

  // Písanie: prehliadač nič nezapíše sám, každý znak spracujeme my
  pole.addEventListener('beforeinput', (udalost) => {
    udalost.preventDefault();
    const typ = udalost.inputType;
    const data = udalost.data || '';
    if (typ.startsWith('delete')) {
      // Backspace / Delete vymaže označenú časť; v prázdnych minútach skočí späť na hodiny
      const { h, m } = castiCasu(pole);
      if (pole.dataset.cast === 'm' && m === '--' && typ === 'deleteContentBackward') {
        oznacCast(pole, 'h');
      } else if (pole.dataset.cast === 'm') {
        zapisCasti(pole, h, '--');
      } else {
        zapisCasti(pole, '--', m);
      }
    } else if (/^\d$/.test(data)) {
      napisCislicu(pole, Number(data));
    } else if (/^[:.,h ]$/.test(data)) {
      oznacCast(pole, 'm'); // dvojbodka (bodka, čiarka, medzera) skočí na minúty
    } else if (data.length > 1) {
      const cas = precitajCasText(data); // napr. doplnenie z klávesnice na mobile
      if (cas) {
        zapisCasti(pole, ...cas.split(':'));
      }
    }
  });
  // Vloženie (Ctrl+V) – obsah schránky nemusí byť v beforeinput, preto osobitne
  pole.addEventListener('paste', (udalost) => {
    udalost.preventDefault();
    const cas = precitajCasText(udalost.clipboardData.getData('text'));
    if (cas) {
      zapisCasti(pole, ...cas.split(':'));
    }
  });

  pole.addEventListener('keydown', (udalost) => {
    if (udalost.key === 'ArrowUp' || udalost.key === 'ArrowDown') {
      udalost.preventDefault();
      posunCast(pole, udalost.key === 'ArrowUp' ? 1 : -1);
    } else if (udalost.key === 'ArrowLeft' || udalost.key === 'ArrowRight') {
      udalost.preventDefault();
      oznacCast(pole, udalost.key === 'ArrowLeft' ? 'h' : 'm');
    } else if (udalost.key === 'Escape' && otvorenyPanel) {
      udalost.preventDefault();
      zatvorPanelCasu();
    }
  });
  // Tlačidlo s ikonou hodín: panel 00 – 23, nezvolený čas odroluje k aktuálnej hodine
  pripojTlacidloPanela({
    obal: pole.parentElement,
    pocetHodin: 24,
    formatHodin: dveCislice,
    get nahradnaHodina() {
      return new Date().getHours(); // zistí sa až pri otvorení panela
    },
    citaj() {
      const { h, m } = castiCasu(pole);
      return { h: h === '--' ? null : Number(h), m: m === '--' ? null : Number(m) };
    },
    // minúty, ak ešte nie sú, budú 00
    zapisHodiny: (n) => zapisCasti(pole, dveCislice(n), castiCasu(pole).m === '--' ? '00' : castiCasu(pole).m),
    zapisMinuty: (n) => zapisCasti(pole, castiCasu(pole).h, dveCislice(n)),
    poVybere() {
      pole.focus();
      oznacCast(pole, 'm');
    },
  });
}

// ===== Výber dĺžky (Počet hodín a prerušenie zadané dĺžkou) =====
// Dve políčka h + min v jednom rámčeku. Píše sa do nich ako doteraz, šípky ↑ ↓ menia číslo,
// medzera / dvojbodka / "h" skočí z hodín na minúty a ikona hodín otvorí ten istý panel (0 – 24 h).
for (const obal of document.querySelectorAll('.trvanie')) {
  const [poleH, poleM] = obal.querySelectorAll('input');

  // Prečíta celé číslo z políčka; prázdne alebo nesprávne -> null
  const cislo = (pole) => {
    const n = precitajCeleCislo(pole.value);
    return Number.isNaN(n) ? null : n;
  };
  const zapis = (pole, n) => {
    pole.value = String(n);
    pole.dispatchEvent(new Event('input', { bubbles: true })); // prepočíta "Odpracované"
  };

  for (const pole of [poleH, poleM]) {
    pole.addEventListener('keydown', (udalost) => {
      if (udalost.key !== 'ArrowUp' && udalost.key !== 'ArrowDown') {
        return;
      }
      udalost.preventDefault();
      const smer = udalost.key === 'ArrowUp' ? 1 : -1;
      const n = cislo(pole) ?? 0;
      // minúty idú dokola (59 -> 0), hodiny nejdú pod nulu
      zapis(pole, pole === poleM ? (n + smer + 60) % 60 : Math.max(0, n + smer));
      pole.select();
    });
  }
  poleH.addEventListener('beforeinput', (udalost) => {
    if (udalost.data && /^[:.,h ]$/.test(udalost.data)) {
      udalost.preventDefault();
      poleM.focus();
      poleM.select();
    }
  });

  pripojTlacidloPanela({
    obal,
    pocetHodin: 25, // 0 – 24 h
    formatHodin: String,
    nahradnaHodina: poleH === polia.hodiny ? 8 : 1, // bežný deň 8 h, prerušenie okolo 1 h
    citaj: () => ({ h: cislo(poleH), m: cislo(poleM) }),
    // minúty, ak ešte nie sú, budú 0
    zapisHodiny(n) {
      zapis(poleH, n);
      if (cislo(poleM) === null) {
        zapis(poleM, 0);
      }
    },
    zapisMinuty: (n) => zapis(poleM, n),
    poVybere: () => poleM.focus(),
  });
}

// Klik mimo políčka času alebo Esc v paneli zavrie panel
document.addEventListener('pointerdown', (udalost) => {
  if (!udalost.target.closest('.cas-vyber')) {
    zatvorPanelCasu();
  }
});
document.addEventListener('keydown', (udalost) => {
  if (udalost.key === 'Escape' && udalost.target.closest && udalost.target.closest('.cas-panel')) {
    const pole = udalost.target.closest('.cas-vyber').querySelector('input');
    zatvorPanelCasu();
    pole.focus();
  }
});

// Kliknutie v tabuľke. Namiesto samostatného "poslucháča" pre každé tlačidlo
// počúvame na celej tabuľke a pozrieme sa, na ktoré tlačidlo sa kliklo.
teloTabulky.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo) {
    return;
  }
  const id = Number(tlacidlo.dataset.id);
  if (tlacidlo.dataset.akcia === 'upravit') {
    zacniUpravu(id);
  } else if (tlacidlo.dataset.akcia === 'zmazat') {
    zmazZaznam(id);
  }
});

// Prepínač mesiacov
mesiacSpat.addEventListener('click', () => {
  vybranyMesiac = posunMesiac(vybranyMesiac, -1);
  vykresli(); // prekreslí súčet aj tabuľku pre nový mesiac
});

mesiacDalej.addEventListener('click', () => {
  vybranyMesiac = posunMesiac(vybranyMesiac, 1);
  vykresli(); // prekreslí súčet aj tabuľku pre nový mesiac
});

mesiacDnes.addEventListener('click', () => {
  vybranyMesiac = dnesnyDatum().slice(0, 7);
  vykresli(); // prekreslí súčet aj tabuľku pre nový mesiac
});

// ===== Výkaz práce =====

// "2026-09-21" -> "pondelok"
function denVTyzdni(iso) {
  const [rok, mesiac, den] = iso.split('-').map(Number);
  return DNI_TYZDNA[new Date(rok, mesiac - 1, den).getDay()];
}

// Prestávky záznamu ako text, napr. "obed 30 min, prerušenie 2 h".
// Dôvod prerušenia sem zámerne nedávame – výkaz ide zákazníkovi a dôvod je súkromný.
function textPrestavok(z) {
  const casti = [];
  if (z.obed) {
    casti.push(`obed ${formatTrvanie(OBED_MINUTY)}`);
  }
  if (z.prerusenieHodiny !== undefined) {
    casti.push(`prerušenie ${formatTrvanie(Math.round(z.prerusenieHodiny * 60))}`);
  } else if (z.prerusenieOd !== undefined) {
    casti.push(`prerušenie ${z.prerusenieOd} – ${z.prerusenieDo}`);
  }
  return casti.length > 0 ? casti.join(', ') : '–';
}

// Vytvorí bunku tabuľky (td alebo th) s textom
function bunkaVykazu(znacka, text) {
  const bunka = document.createElement(znacka);
  bunka.textContent = text;
  return bunka;
}

// Poskladá výkaz za vybraný mesiac do skrytej sekcie #vykaz
function pripravVykaz(zMesiaca, polozkyMesiaca, sumy, poznamky) {
  vykaz.replaceChildren();

  const nadpis = document.createElement('h1');
  nadpis.textContent = 'Výkaz práce';
  const obdobie = document.createElement('p');
  obdobie.textContent = `Obdobie: ${formatMesiac(vybranyMesiac)}`;

  // Hlavička tabuľky – stĺpce so sumami a poznámkami iba ak sú zapnuté
  const stlpce = ['Dátum', 'Deň', 'Čas', 'Prestávky', 'Odpracované'];
  if (sumy) stlpce.push('Sadzba', 'Suma');
  if (poznamky) stlpce.push('Poznámka');

  const tabulkaVykazu = document.createElement('table');
  const hlavicka = document.createElement('thead');
  const riadokHlavicky = document.createElement('tr');
  for (const nazov of stlpce) {
    riadokHlavicky.appendChild(bunkaVykazu('th', nazov));
  }
  hlavicka.appendChild(riadokHlavicky);

  // Vo výkaze ide čas prirodzene: od najstaršieho dňa po najnovší
  const zoradene = [...zMesiaca].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id);
  const telo = document.createElement('tbody');
  for (const z of zoradene) {
    const riadok = document.createElement('tr');
    riadok.appendChild(bunkaVykazu('td', formatDatum(z.datum)));
    riadok.appendChild(bunkaVykazu('td', denVTyzdni(z.datum)));
    riadok.appendChild(bunkaVykazu('td', z.zaciatok !== undefined ? `${z.zaciatok} – ${z.koniec}` : '–'));
    riadok.appendChild(bunkaVykazu('td', textPrestavok(z)));
    riadok.appendChild(bunkaVykazu('td', formatTrvanie(minutyZaznamu(z))));
    if (sumy) {
      riadok.appendChild(bunkaVykazu('td', formatEur.format(z.sadzba)));
      riadok.appendChild(bunkaVykazu('td', formatEur.format(z.suma)));
    }
    if (poznamky) {
      riadok.appendChild(bunkaVykazu('td', z.zakazka || ''));
    }
    telo.appendChild(riadok);
  }

  // Päta tabuľky so súčtom
  const minuty = zMesiaca.reduce((spolu, z) => spolu + minutyZaznamu(z), 0);
  const zarobok = zMesiaca.reduce((spolu, z) => spolu + z.suma, 0);
  const pata = document.createElement('tfoot');
  const riadokPaty = document.createElement('tr');
  const popisSpolu = bunkaVykazu('td', `Spolu (${pocetZaznamov(zMesiaca.length)})`);
  popisSpolu.colSpan = 4; // zaberie stĺpce Dátum až Prestávky
  riadokPaty.append(popisSpolu, bunkaVykazu('td', formatTrvanie(minuty)));
  if (sumy) {
    riadokPaty.append(bunkaVykazu('td', ''), bunkaVykazu('td', formatEur.format(naCenty(zarobok))));
  }
  if (poznamky) {
    riadokPaty.appendChild(bunkaVykazu('td', ''));
  }
  pata.appendChild(riadokPaty);

  tabulkaVykazu.append(hlavicka, telo, pata);

  const vytvorene = document.createElement('p');
  vytvorene.className = 'vykaz-pata';
  vytvorene.textContent = `Vytvorené: ${formatDatum(dnesnyDatum())}`;

  vykaz.append(nadpis, obdobie, tabulkaVykazu);

  // Jednorazové položky – iba vo výkaze so sumami (bez súm by nemali zmysel)
  if (sumy && polozkyMesiaca.length > 0) {
    const nadpisPoloziek = document.createElement('h2');
    nadpisPoloziek.textContent = 'Jednorazové položky';

    const tabulkaPoloziek = document.createElement('table');
    const hlavickaPoloziek = document.createElement('thead');
    const riadokHlavickyPoloziek = document.createElement('tr');
    riadokHlavickyPoloziek.append(bunkaVykazu('th', 'Dátum'), bunkaVykazu('th', 'Položka'), bunkaVykazu('th', 'Suma'));
    hlavickaPoloziek.appendChild(riadokHlavickyPoloziek);

    const teloPoloziek = document.createElement('tbody');
    for (const p of polozkyMesiaca) {
      const riadok = document.createElement('tr');
      riadok.append(bunkaVykazu('td', formatDatum(p.datum)), bunkaVykazu('td', p.nazov), bunkaVykazu('td', formatEur.format(p.suma)));
      teloPoloziek.appendChild(riadok);
    }

    const zaPolozky = sucetJednorazovych(polozkyMesiaca);
    const pataPoloziek = document.createElement('tfoot');
    const riadokPatyPoloziek = document.createElement('tr');
    const popisPoloziek = bunkaVykazu('td', 'Spolu');
    popisPoloziek.colSpan = 2;
    riadokPatyPoloziek.append(popisPoloziek, bunkaVykazu('td', formatEur.format(zaPolozky)));
    pataPoloziek.appendChild(riadokPatyPoloziek);

    tabulkaPoloziek.append(hlavickaPoloziek, teloPoloziek, pataPoloziek);

    const spoluZaMesiac = document.createElement('p');
    spoluZaMesiac.className = 'vykaz-spolu';
    spoluZaMesiac.textContent = `Spolu za mesiac: ${formatEur.format(naCenty(zarobok + zaPolozky))}`;

    // Spoločný obal: nadpis a tabuľka položiek sa pri tlači nerozdelia na dve strany
    const blokPoloziek = document.createElement('div');
    blokPoloziek.className = 'vykaz-polozky';
    blokPoloziek.append(nadpisPoloziek, tabulkaPoloziek, spoluZaMesiac);
    vykaz.appendChild(blokPoloziek);
  }

  vykaz.appendChild(vytvorene);
}

// Tlačidlo "Výkaz práce za mesiac": pripraví výkaz a otvorí okno tlače
tlacidloVykaz.addEventListener('click', () => {
  const zMesiaca = zaznamy.filter((z) => z.datum.startsWith(vybranyMesiac));
  if (zMesiaca.length === 0) {
    zobrazSpravu(`V mesiaci ${formatMesiac(vybranyMesiac)} nemáš žiadne záznamy – výkaz by bol prázdny.`, true);
    return;
  }
  pripravVykaz(zMesiaca, jednorazoveZMesiaca(), vykazSumy.checked, vykazPoznamky.checked);

  // Názov stránky sa použije ako názov PDF súboru, napr. "Vykaz prace 2026-09"
  const povodnyNazov = document.title;
  document.title = `Vykaz prace ${vybranyMesiac}`;
  document.body.classList.add('tlac-vykazu'); // CSS pri tlači ukáže iba výkaz
  window.print();
  // Po zatvorení okna tlače všetko vrátime späť
  document.body.classList.remove('tlac-vykazu');
  document.title = povodnyNazov;
});

// ===== Záloha =====

// Zapamätá si dnešný dátum ako dátum poslednej zálohy (pre pripomienku) a prekreslí ju
function zapamatajZalohu() {
  try {
    localStorage.setItem(KLUC_POSLEDNA_ZALOHA, dnesnyDatum());
  } catch {
    // pripomienka sa iba nezmení
  }
  vykresliZalohu();
}

// Všetky dáta appky v tvare zálohy (rovnaký tvar má aj dátový súbor)
function obsahZalohy() {
  return {
    aplikacia: 'zivnost-prehlad', // podľa toho pri načítaní spoznáme našu zálohu
    verzia: 5, // 2 = aj sadzby, 3 = aj jednorazové položky, 4 = aj profil, 5 = aj projekty
    vytvorene: new Date().toISOString(),
    zaznamy: zaznamy,
    sadzby: { zoznam: sadzby, predvolenaId: predvolenaSadzbaId },
    jednorazove: jednorazove,
    profil: profil,
    projekty: projekty,
  };
}

// Uloží zálohu do súboru .json.
// Chrome a Edge vedia otvoriť okno "Uložiť ako" (showSaveFilePicker) – vyberieš priečinok aj názov.
// Ostatné prehliadače (Safari, Firefox) to nevedia, tam sa súbor stiahne ako doteraz do Stiahnuté.
tlacidloStiahnut.addEventListener('click', async () => {
  if (zaznamy.length === 0 && sadzby.length === 0 && jednorazove.length === 0 &&
      projekty.length === 0 && !profil.datumVzniku) {
    zobrazSpravu('Zatiaľ nie je čo zálohovať – nemáš žiadne záznamy, projekty, položky ani sadzby.', true);
    return;
  }
  const text = JSON.stringify(obsahZalohy(), null, 2);
  const nazovSuboru = `zaloha-zivnost-${dnesnyDatum()}.json`;
  const coObsahuje = `${pocetZaznamov(zaznamy.length)}, ${pocetSadzieb(sadzby.length)}`;

  // 1) Okno "Uložiť ako" (iba ak ho prehliadač pozná)
  if (typeof window.showSaveFilePicker === 'function') {
    let cielovySubor = null;
    try {
      cielovySubor = await window.showSaveFilePicker({
        suggestedName: nazovSuboru,
        id: 'zivnost-zaloha', // prehliadač si pod týmto menom zapamätá naposledy vybraný priečinok
        startIn: 'downloads', // prvýkrát sa otvorí priečinok Stiahnuté
        types: [{ description: 'Záloha Živnosť prehľad', accept: { 'application/json': ['.json'] } }],
      });
    } catch (chyba) {
      if (chyba.name === 'AbortError') {
        return; // výber si zrušil – nič neukladáme, dátum zálohy sa nemení
      }
      // Iná chyba (prehliadač okno nepovolil) – pokračujeme klasickým stiahnutím nižšie
    }
    if (cielovySubor !== null) {
      try {
        const zapis = await cielovySubor.createWritable();
        await zapis.write(text);
        await zapis.close();
      } catch {
        zobrazSpravu('Zálohu sa nepodarilo uložiť. Skús iný priečinok alebo to skús znova.', true);
        return;
      }
      zapamatajZalohu();
      zobrazSpravu(`Záloha uložená ako „${cielovySubor.name}“ (${coObsahuje}).`, false);
      return;
    }
  }

  // 2) Klasické stiahnutie: Blob = "súbor v pamäti"; z neho vyrobíme dočasný odkaz a "klikneme" naň
  const subor = new Blob([text], { type: 'application/json' });
  const odkaz = document.createElement('a');
  odkaz.href = URL.createObjectURL(subor);
  odkaz.download = nazovSuboru;
  odkaz.click();
  // Dočasný odkaz po chvíli zrušíme, aby nezaberal pamäť
  setTimeout(() => URL.revokeObjectURL(odkaz.href), 1000);
  zapamatajZalohu();
  zobrazSpravu(`Záloha stiahnutá (${coObsahuje}). Nájdeš ju v priečinku Stiahnuté.`, false);
});

// Tlačidlo "Načítať zálohu" otvorí okno na výber súboru
tlacidloNacitat.addEventListener('click', () => {
  vyberSuboru.click();
});

// Prečíta a skontroluje text zálohy (.json). Vráti dáta na obnovenie, alebo null, ak súbor nie je platná záloha.
// Časti, ktoré staršia záloha nemá (sadzby, položky, profil, projekty), ostanú null – tie sa potom nemenia.
function precitajZalohu(text) {
  let obsah;
  try {
    obsah = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obsah || obsah.aplikacia !== 'zivnost-prehlad') {
    return null;
  }
  const data = {
    zoznam: vycistiZoznam(obsah.zaznamy),
    noveSadzby: obsah.sadzby !== undefined ? vycistiSadzby(obsah.sadzby) : null,
    noveJednorazove: obsah.jednorazove !== undefined ? vycistiJednorazove(obsah.jednorazove) : null,
    novyProfil: obsah.profil !== undefined ? vycistiProfil(obsah.profil) : null,
    noveProjekty: obsah.projekty !== undefined ? vycistiProjekty(obsah.projekty) : null,
  };
  // Časť, ktorá v zálohe je, ale je chybná (vycisti vrátilo null) = celá záloha je neplatná
  if (data.zoznam === null ||
      (obsah.sadzby !== undefined && data.noveSadzby === null) ||
      (obsah.jednorazove !== undefined && data.noveJednorazove === null) ||
      (obsah.profil !== undefined && data.novyProfil === null) ||
      (obsah.projekty !== undefined && data.noveProjekty === null)) {
    return null;
  }
  return data;
}

// Ak by načítanie prepísalo súčasné dáta, opýta sa (vlastné okno). Vráti true = pokračovať.
async function potvrdNahradenie(data, nadpis, ano) {
  const { zoznam, noveSadzby, noveJednorazove, noveProjekty } = data;
  if (zaznamy.length === 0 && (noveSadzby === null || sadzby.length === 0) &&
      (noveJednorazove === null || jednorazove.length === 0) &&
      (noveProjekty === null || projekty.length === 0)) {
    return true; // nie je čo prepísať
  }
  const vetaOPolozkach = noveJednorazove !== null
    ? `Jednorazové položky zo zálohy (${noveJednorazove.length}) nahradia tvoje súčasné položky.`
    : 'Záloha neobsahuje jednorazové položky – tvoje súčasné položky ostanú.';
  const vetaOProjektoch = noveProjekty !== null
    ? `Projekty zo zálohy (${noveProjekty.length}) nahradia tvoje súčasné projekty.`
    : 'Záloha neobsahuje projekty – tvoje súčasné projekty ostanú.';
  const vetaOSadzbach = noveSadzby !== null
    ? `Sadzby zo zálohy (${pocetSadzieb(noveSadzby.zoznam.length)}) nahradia tvoje súčasné sadzby.`
    : 'Záloha neobsahuje sadzby – tvoje súčasné sadzby ostanú.';
  return potvrd({
    nadpis: nadpis,
    text: `Záloha obsahuje ${pocetZaznamov(zoznam.length)}, teraz máš ${pocetZaznamov(zaznamy.length)}. ` +
      'Súčasné záznamy sa nahradia zálohou.\n\n' +
      vetaOSadzbach + '\n' + vetaOPolozkach + '\n' + vetaOProjektoch,
    ano: ano,
    nebezpecne: true,
    ikona: 'pozor',
  });
}

// Nahradí dáta appky dátami zo zálohy, uloží ich, prekreslí a ukáže správu (napr. "Záloha načítaná: 12 záznamov.")
function pouziZalohu(data, uvodSpravy) {
  const { zoznam, noveSadzby, noveJednorazove, novyProfil, noveProjekty } = data;
  if (upravovaneId !== null) {
    ukonciUpravu();
  }
  nastavZaznamy(zoznam);
  ulozDoUloziska();

  if (noveSadzby !== null) {
    if (upravovanaSadzbaId !== null) {
      ukonciUpravuSadzby();
    }
    nastavSadzby(noveSadzby);
    ulozSadzby();
    vyplnPredvolenuSadzbu();
    vykresliSadzby();
  }

  if (noveJednorazove !== null) {
    if (upravovanaJednorazovaId !== null) {
      ukonciUpravuJednorazovej();
    }
    nastavJednorazove(noveJednorazove);
    ulozJednorazove();
  }

  if (novyProfil !== null) {
    profil = novyProfil;
    ulozProfil();
    vyplnProfil();
  }

  if (noveProjekty !== null) {
    if (upravovanyProjektId !== null) {
      ukonciUpravuProjektu();
    }
    detailProjektuId = null;
    nastavProjekty(noveProjekty);
    ulozProjekty();
  }
  // Počítadlo id projektov musí ísť aj za id použité v záznamoch zo zálohy
  posunPocitadloProjektov();

  // Bežiace stopky pri projekte, ktorý v zálohe nie je, by nemali kam uložiť záznam
  if (stopky !== null && !najdiProjekt(stopky.projektId)) {
    nastavStopky(null);
    vykresli();
    zobrazSpravu(`${uvodSpravy}: ${pocetZaznamov(zoznam.length)}. Bežiace stopky som zrušil – ich projekt v zálohe nie je.`, true);
    return;
  }

  vykresli();
  zobrazSpravu(`${uvodSpravy}: ${pocetZaznamov(zoznam.length)}.`, false);
}

// Keď si vyberieš súbor, skontrolujeme ho a po potvrdení obnovíme záznamy
vyberSuboru.addEventListener('change', async () => {
  const subor = vyberSuboru.files[0];
  vyberSuboru.value = ''; // vďaka tomu sa dá ten istý súbor vybrať znova
  if (!subor) {
    return;
  }
  if (subor.size > MAX_VELKOST_ZALOHY) {
    zobrazSpravu('Súbor je príliš veľký na zálohu z tejto appky. Nič som nezmenil.', true);
    return;
  }

  let data = null;
  try {
    // await = počkáme, kým prehliadač súbor prečíta
    data = precitajZalohu(await subor.text());
  } catch {
    data = null;
  }
  if (data === null) {
    zobrazSpravu('Tento súbor nie je platná záloha zo Živnosť prehľadu. Nič som nezmenil.', true);
    return;
  }
  if (!await potvrdNahradenie(data, 'Načítať zálohu a nahradiť dáta?', 'Načítať zálohu')) {
    return;
  }
  pouziZalohu(data, 'Záloha načítaná');
});

// ===== Automatické ukladanie do dátového súboru =====
// Appka si pamätá "odkaz" na jeden súbor na disku (FileSystemFileHandle) a po každej zmene ho prepíše.
// Odkaz sa dá uložiť iba do IndexedDB (ďalšie úložisko prehliadača), localStorage to nevie.
// Keď prehliadač vymaže dáta, súbor na disku ostane – dáta z neho načítaš späť.
// Vie to iba Chrome a Edge (File System Access API); inde ostáva ručná záloha.

const KLUC_SUBOR_ULOZENE = 'zivnost-prehlad.subor-ulozene'; // kedy sa naposledy zapísalo do súboru (ISO čas)
const ODKLAD_ZAPISU_MS = 800; // po zmene chvíľu počkáme, aby sa viac zmien naraz zapísalo jedným zápisom
const VIE_SUBORY = typeof window.showSaveFilePicker === 'function' &&
  typeof window.showOpenFilePicker === 'function' && 'indexedDB' in window;
const TYP_DATOVEHO_SUBORU = [{ description: 'Dáta Živnosť prehľad', accept: { 'application/json': ['.json'] } }];

const suborDatText = document.getElementById('subor-dat-text');
const suborVytvorit = document.getElementById('subor-vytvorit');
const suborOtvorit = document.getElementById('subor-otvorit');
const suborPovolit = document.getElementById('subor-povolit');
const suborOdpojit = document.getElementById('subor-odpojit');

// Zápisy do súboru idú za sebou (nikdy dva naraz) – každý nový počká na predchádzajúci
let zapisBezi = Promise.resolve();

// --- IndexedDB: jedna databáza s jedným "skladom", v ňom iba odkaz na súbor ---
function otvorDatabazu() {
  return new Promise((vyries, odmietni) => {
    const poziadavka = indexedDB.open('zivnost-prehlad', 1);
    // Pri prvom otvorení databázu pripravíme (vytvoríme sklad "subory")
    poziadavka.onupgradeneeded = () => poziadavka.result.createObjectStore('subory');
    poziadavka.onsuccess = () => vyries(poziadavka.result);
    poziadavka.onerror = () => odmietni(poziadavka.error);
  });
}

// Uloží odkaz na súbor (null = zabudne ho)
async function ulozOdkazNaSubor(odkaz) {
  const db = await otvorDatabazu();
  try {
    await new Promise((vyries, odmietni) => {
      const transakcia = db.transaction('subory', 'readwrite');
      if (odkaz) {
        transakcia.objectStore('subory').put(odkaz, 'datovy-subor');
      } else {
        transakcia.objectStore('subory').delete('datovy-subor');
      }
      transakcia.oncomplete = vyries;
      transakcia.onerror = () => odmietni(transakcia.error);
    });
  } finally {
    db.close();
  }
}

// Vráti zapamätaný odkaz na súbor, alebo null
async function nacitajOdkazNaSubor() {
  const db = await otvorDatabazu();
  try {
    return await new Promise((vyries, odmietni) => {
      const poziadavka = db.transaction('subory').objectStore('subory').get('datovy-subor');
      poziadavka.onsuccess = () => vyries(poziadavka.result || null);
      poziadavka.onerror = () => odmietni(poziadavka.error);
    });
  } finally {
    db.close();
  }
}

// --- Zápis do súboru ---

// Volá sa po každom uložení do localStorage: zápis do súboru sa spustí o chvíľu
function naplanujZapisDoSuboru() {
  if (datovySubor === null) {
    return;
  }
  clearTimeout(casovacZapisu);
  casovacZapisu = setTimeout(zapisDoSuboru, ODKLAD_ZAPISU_MS);
}

// Zapíše dáta do súboru hneď (zaradí sa za prípadný bežiaci zápis)
function zapisDoSuboru(ajPrazdne = false) {
  clearTimeout(casovacZapisu);
  casovacZapisu = null;
  zapisBezi = zapisBezi.then(() => zapisTeraz(ajPrazdne));
  return zapisBezi;
}

// ajPrazdne = false: prázdnu appku do súboru nezapíšeme (ochrana – napr. po vymazaní dát prehliadača
// by sme inak prepísali súbor s tvojimi dátami prázdnym)
async function zapisTeraz(ajPrazdne) {
  const odkaz = datovySubor;
  if (odkaz === null || (!ajPrazdne && !appkaMaData())) {
    return;
  }
  const predtym = stavSuboru;
  try {
    // Bez povolenia sa zapisovať nedá; povolenie sa dá vypýtať iba po kliknutí (tlačidlo Povoliť)
    if (await odkaz.queryPermission({ mode: 'readwrite' }) !== 'granted') {
      stavSuboru = 'povolit';
      vykresliZalohu();
      return;
    }
    const text = JSON.stringify(obsahZalohy(), null, 2);
    // Prehliadač píše do dočasnej kópie a pôvodný súbor nahradí až pri close().
    // Keby sa zápis prerušil, starý súbor ostane celý.
    const zapis = await odkaz.createWritable();
    await zapis.write(text);
    await zapis.close();
    stavSuboru = 'ok';
    try {
      localStorage.setItem(KLUC_SUBOR_ULOZENE, new Date().toISOString());
    } catch {
      // čas posledného uloženia sa iba neukáže
    }
  } catch {
    stavSuboru = 'chyba';
    if (predtym !== 'chyba') {
      zobrazSpravu(`Do súboru „${odkaz.name}“ sa nepodarilo uložiť. Dáta sú zatiaľ iba v prehliadači – pozri Nastavenia – Záloha dát.`, true);
    }
  }
  vykresliZalohu();
}

// Keď zatváraš kartu alebo prepneš inam, čakajúci zápis urobíme hneď
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && casovacZapisu !== null) {
    zapisDoSuboru();
  }
});

// "dnes 18:42" alebo "26. 10. 2026 18:42" – kedy sa naposledy zapísalo do súboru ('' = nevieme)
function textUlozeniaDoSuboru() {
  let iso = null;
  try {
    iso = localStorage.getItem(KLUC_SUBOR_ULOZENE);
  } catch {
    return '';
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return '';
  }
  const d = new Date(ms);
  const cas = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const datum = datumZCasu(ms);
  return datum === dnesnyDatum() ? `dnes ${cas}` : `${formatDatum(datum)} ${cas}`;
}

// --- Tlačidlá ---

// Vytvoriť dátový súbor: vyberieš miesto a appka doň hneď zapíše všetky dáta
async function vytvorDatovySubor() {
  if (!appkaMaData()) {
    const pokracovat = await potvrd({
      nadpis: 'Vytvoriť prázdny dátový súbor?',
      text: 'Appka je teraz prázdna. Ak už dátový súbor máš, použi „Otvoriť existujúci súbor“ – ' +
        'keby si ho tu vybral, prepísal by sa prázdnymi dátami.',
      ano: 'Vytvoriť prázdny',
      nebezpecne: true,
      ikona: 'pozor',
    });
    if (!pokracovat) {
      return;
    }
  }
  let odkaz;
  try {
    odkaz = await window.showSaveFilePicker({
      suggestedName: 'zivnost-data.json',
      id: 'zivnost-data', // prehliadač si zapamätá priečinok
      startIn: 'documents', // prvýkrát sa otvoria Dokumenty
      types: TYP_DATOVEHO_SUBORU,
    });
  } catch (chyba) {
    if (chyba.name !== 'AbortError') {
      zobrazSpravu('Okno na výber súboru sa nepodarilo otvoriť.', true);
    }
    return; // AbortError = zrušil si výber
  }
  await pripojSubor(odkaz);
  await zapisDoSuboru(true);
  if (stavSuboru === 'ok') {
    zobrazSpravu(`Hotovo. Každú zmenu teraz ukladám do súboru „${odkaz.name}“.`, false);
  }
}

// Otvoriť existujúci súbor: načíta z neho dáta (po potvrdení) a ďalej doň ukladá
async function otvorExistujuciSubor() {
  let odkazy;
  try {
    odkazy = await window.showOpenFilePicker({ id: 'zivnost-data', startIn: 'documents', types: TYP_DATOVEHO_SUBORU });
  } catch (chyba) {
    if (chyba.name !== 'AbortError') {
      zobrazSpravu('Okno na výber súboru sa nepodarilo otvoriť.', true);
    }
    return;
  }
  const odkaz = odkazy[0];
  // Povolenie na zápis si vypýtame hneď (kým platí tvoje kliknutie). Ak to nejde, appka neskôr ukáže "Povoliť".
  try {
    await odkaz.requestPermission({ mode: 'readwrite' });
  } catch {
    // nevadí
  }
  await nacitajZoSuboru(odkaz);
}

// Prečíta súbor, skontroluje ho, po potvrdení nahradí dáta a súbor si zapamätá
async function nacitajZoSuboru(odkaz) {
  let data = null;
  try {
    const subor = await odkaz.getFile();
    if (subor.size > MAX_VELKOST_ZALOHY) {
      zobrazSpravu('Súbor je príliš veľký na dáta z tejto appky. Nič som nezmenil.', true);
      return;
    }
    data = precitajZalohu(await subor.text());
  } catch {
    zobrazSpravu(`Súbor „${odkaz.name}“ sa nepodarilo prečítať (možno je presunutý alebo zmazaný). Nič som nezmenil.`, true);
    return;
  }
  if (data === null) {
    zobrazSpravu('Tento súbor nie sú dáta ani záloha zo Živnosť prehľadu. Nič som nezmenil.', true);
    return;
  }
  if (!await potvrdNahradenie(data, 'Načítať dáta zo súboru?', 'Načítať zo súboru')) {
    return;
  }
  // Súbor pripojíme ešte pred obnovením, aby sa zmeny zapísali doň (a nie do predošlého súboru)
  await pripojSubor(odkaz);
  pouziZalohu(data, `Načítané zo súboru „${odkaz.name}“`);
  await zapisDoSuboru(true); // overí povolenie na zápis (a ukáže stav)
}

// Zapamätá si súbor ako dátový (v premennej aj v IndexedDB)
async function pripojSubor(odkaz) {
  datovySubor = odkaz;
  stavSuboru = 'ok';
  try {
    await ulozOdkazNaSubor(odkaz);
  } catch {
    zobrazSpravu('Prehliadač si súbor nezapamätá – po zatvorení appky ho bude treba otvoriť znova.', true);
  }
  vykresliZalohu();
}

// Povoliť: vypýta povolenie na zápis (iba po kliknutí) a hneď zapíše.
// Ak sú dáta prehliadača prázdne, namiesto toho načíta dáta zo súboru.
async function povolSubor() {
  if (datovySubor === null) {
    return;
  }
  let povolenie;
  try {
    povolenie = await datovySubor.requestPermission({ mode: 'readwrite' });
  } catch {
    povolenie = 'denied';
  }
  if (povolenie !== 'granted') {
    zobrazSpravu('Bez povolenia nemôžem do súboru zapisovať. Zmeny sú zatiaľ iba v prehliadači.', true);
    return;
  }
  if (stavSuboru === 'nacitat') {
    await nacitajZoSuboru(datovySubor);
  } else {
    await zapisDoSuboru();
    if (stavSuboru === 'ok') {
      zobrazSpravu(`Ukladanie do súboru „${datovySubor.name}“ beží.`, false);
    }
  }
}

// Odpojiť: appka prestane ukladať do súboru (súbor na disku ostane)
async function odpojSubor() {
  const potvrdene = await potvrd({
    nadpis: 'Odpojiť dátový súbor?',
    text: `Appka prestane ukladať zmeny do súboru „${datovySubor.name}“. Súbor na disku ostane, nič sa nezmaže.`,
    ano: 'Odpojiť',
  });
  if (!potvrdene) {
    return;
  }
  if (casovacZapisu !== null) {
    await zapisDoSuboru(); // posledné zmeny ešte zapíšeme
  }
  datovySubor = null;
  stavSuboru = 'ziadny';
  try {
    await ulozOdkazNaSubor(null);
    localStorage.removeItem(KLUC_SUBOR_ULOZENE);
  } catch {
    // nevadí
  }
  vykresliZalohu();
}

suborVytvorit.addEventListener('click', vytvorDatovySubor);
suborOtvorit.addEventListener('click', otvorExistujuciSubor);
suborPovolit.addEventListener('click', povolSubor);
suborOdpojit.addEventListener('click', odpojSubor);

// Ukáže stav dátového súboru v karte Záloha dát
function vykresliDatovySubor() {
  const nazov = datovySubor ? `„${datovySubor.name}“` : '';
  let text;
  if (!VIE_SUBORY) {
    text = 'Automatické ukladanie do súboru vie iba Chrome alebo Edge. V tomto prehliadači si sťahuj zálohu ručne.';
  } else if (stavSuboru === 'ok') {
    const kedy = textUlozeniaDoSuboru();
    text = `Každú zmenu ukladám do súboru ${nazov}.` + (kedy ? ` Naposledy uložené ${kedy}.` : '');
  } else if (stavSuboru === 'povolit') {
    text = `Prehliadač potrebuje tvoje povolenie, aby mohol zapisovať do ${nazov}. Kým ho nedáš, zmeny sú iba v prehliadači.`;
  } else if (stavSuboru === 'nacitat') {
    text = `V prehliadači nie sú žiadne dáta, ale appka pozná súbor ${nazov}. Načítaj z neho svoje dáta.`;
  } else if (stavSuboru === 'chyba') {
    text = `Do súboru ${nazov} sa nepodarilo uložiť (možno je presunutý alebo zmazaný). ` +
      'Dáta sú zatiaľ iba v prehliadači – vytvor nový súbor alebo otvor ten existujúci.';
  } else {
    text = 'Appka môže každú zmenu sama ukladať do súboru na disku (napr. do Dokumentov alebo iCloud Drive). ' +
      'Keď prehliadač vymaže históriu a dáta stránok, z tohto súboru ich načítaš späť.';
  }
  suborDatText.textContent = text;
  suborDatText.classList.toggle('stara', ['povolit', 'nacitat', 'chyba'].includes(stavSuboru));

  const vyber = VIE_SUBORY && (stavSuboru === 'ziadny' || stavSuboru === 'chyba');
  suborVytvorit.hidden = !vyber;
  suborOtvorit.hidden = !vyber;
  suborPovolit.hidden = !(stavSuboru === 'povolit' || stavSuboru === 'nacitat');
  suborPovolit.textContent = stavSuboru === 'nacitat' ? 'Načítať zo súboru' : 'Povoliť ukladanie';
  suborOdpojit.hidden = datovySubor === null;
}

// Pri štarte: nájde zapamätaný súbor a zistí, či doň smieme zapisovať
async function pripravDatovySubor() {
  if (!VIE_SUBORY) {
    return;
  }
  let odkaz = null;
  try {
    odkaz = await nacitajOdkazNaSubor();
  } catch {
    odkaz = null;
  }
  if (odkaz === null) {
    if (!appkaMaData()) {
      zobrazSpravu('V prehliadači nie sú žiadne dáta. Ak máš dátový súbor, otvor ho v Nastaveniach – Záloha dát.', false);
    }
    return;
  }
  datovySubor = odkaz;
  if (!appkaMaData()) {
    // Dáta prehliadača sú preč, ale súbor poznáme – ponúkneme načítanie (nič neprepíšeme)
    stavSuboru = 'nacitat';
  } else {
    try {
      stavSuboru = await odkaz.queryPermission({ mode: 'readwrite' }) === 'granted' ? 'ok' : 'povolit';
    } catch {
      stavSuboru = 'chyba';
    }
  }
  vykresliZalohu();
}

// ===== Dane a odvody (orientačný odhad) =====

// Mesiace počítame ako jedno číslo: rok × 12 + (mesiac − 1).
// S takým číslom sa ľahko pripočítava (+6 = o 6 mesiacov neskôr) aj porovnáva.
function cisloMesiaca(rok, mesiac) {
  return rok * 12 + (mesiac - 1);
}

function rokZCisla(c) {
  return Math.floor(c / 12);
}

function mesiacZCisla(c) {
  return (c % 12) + 1;
}

// napr. "10/2026"
function textMesiaca(c) {
  return `${String(mesiacZCisla(c)).padStart(2, '0')}/${rokZCisla(c)}`;
}

function aktualnyMesiac() {
  const dnes = dnesnyDatum();
  return cisloMesiaca(Number(dnes.slice(0, 4)), Number(dnes.slice(5, 7)));
}

// Parametre pre rok. Ak rok v PARAMETRE ešte nie je, použije sa posledný známy (a označí sa ako neistý).
function parametreRoka(rok) {
  const roky = Object.keys(PARAMETRE).map(Number).sort((a, b) => a - b);
  const pouzity = roky.filter((r) => r <= rok).pop() ?? roky[0];
  const p = PARAMETRE[pouzity];
  return { ...p, overene: p.overene && pouzity === rok };
}

// Mesiac vzniku živnosti (ako číslo mesiaca)
function mesiacVzniku() {
  const [rok, mesiac] = profil.datumVzniku.split('-').map(Number);
  return cisloMesiaca(rok, mesiac);
}

function rokVzniku() {
  return Number(profil.datumVzniku.slice(0, 4));
}

// Skutočné príjmy za rok zo záznamov a jednorazových položiek
function prijmySkutocne(rok) {
  const r = String(rok);
  const zaHodiny = zaznamy.filter((z) => z.datum.startsWith(r)).reduce((s, z) => s + z.suma, 0);
  const zaPolozky = jednorazove.filter((p) => p.datum.startsWith(r)).reduce((s, p) => s + p.suma, 0);
  return naCenty(zaHodiny + zaPolozky);
}

// Návrh odhadu mesačného príjmu: priemer mesiacov od prvého celého mesiaca po vzniku po aktuálny mesiac
function navrhOdhadu() {
  const prvy = mesiacVzniku() + 1;
  const posledny = aktualnyMesiac();
  let spolu = 0;
  let pocet = 0;
  for (let c = prvy; c <= posledny; c++) {
    const prefix = `${rokZCisla(c)}-${String(mesiacZCisla(c)).padStart(2, '0')}`;
    spolu += zaznamy.filter((z) => z.datum.startsWith(prefix)).reduce((s, z) => s + z.suma, 0);
    spolu += jednorazove.filter((p) => p.datum.startsWith(prefix)).reduce((s, p) => s + p.suma, 0);
    pocet++;
  }
  return pocet > 0 ? naCenty(spolu / pocet) : 0;
}

function odhadMesacne() {
  return profil.odhadMesacne ?? navrhOdhadu();
}

// Príjmy za rok: skutočné + odhad na mesiace, ktoré ešte len prídu (po aktuálnom mesiaci)
function prijmyZaRok(rok) {
  const prvy = Math.max(cisloMesiaca(rok, 1), mesiacVzniku(), aktualnyMesiac() + 1);
  const posledny = cisloMesiaca(rok, 12);
  const buduceMesiace = Math.max(0, posledny - prvy + 1);
  const skutocne = prijmySkutocne(rok);
  const odhad = naCenty(buduceMesiace * odhadMesacne());
  return { skutocne: skutocne, odhad: odhad, spolu: naCenty(skutocne + odhad) };
}

// Paušálne výdavky: 60 % z príjmov, najviac limit na daný rok
function pausalneVydavky(rok, prijmy) {
  return naCenty(Math.min(prijmy * PAUSAL_PERCENTO, parametreRoka(rok).pausalMax));
}

// --- Zdravotné poistenie ---

// Prvý mesiac preddavkov: ak živnosť vznikla po 1. dni mesiaca, ten mesiac sa nepočíta
function prvyMesiacZP() {
  const den = Number(profil.datumVzniku.slice(8, 10));
  return mesiacVzniku() + (den > 1 ? 1 : 0);
}

// Koľko mesiacov v roku platíš preddavky na zdravotné
function mesiaceZP(rok) {
  const prvy = Math.max(prvyMesiacZP(), cisloMesiaca(rok, 1));
  return Math.max(0, cisloMesiaca(rok, 12) - prvy + 1);
}

// Ročný vymeriavací základ pre zdravotné: (príjmy − paušálne výdavky) / 1,486
function zpVymeriavaciZaklad(rok) {
  const prijmy = prijmyZaRok(rok).spolu;
  return (prijmy - pausalneVydavky(rok, prijmy)) / KOEFICIENT_VZ;
}

// Mesačný preddavok: minimum, alebo viac, ak ti to vyšlo z predchádzajúceho roka
// (⚠️ zjednodušenie: nový preddavok po ročnom zúčtovaní berieme na celý rok)
function zpPreddavok(rok) {
  const minimum = parametreRoka(rok).zpMinPreddavok;
  const mesiacePred = mesiaceZP(rok - 1);
  if (mesiacePred === 0) {
    return minimum;
  }
  return Math.max(minimum, naCenty((zpVymeriavaciZaklad(rok - 1) / mesiacePred) * ZP_SADZBA));
}

// Ročné zúčtovanie zdravotného: koľko si mal zaplatiť vs. koľko si zaplatil na preddavkoch
function zpZuctovanie(rok) {
  const mesiace = mesiaceZP(rok);
  const minimum = parametreRoka(rok).zpMinVZ * mesiace;
  const poistne = naCenty(Math.max(zpVymeriavaciZaklad(rok), minimum) * ZP_SADZBA);
  const zaplatene = naCenty(zpPreddavok(rok) * mesiace);
  return { poistne: poistne, zaplatene: zaplatene, rozdiel: naCenty(poistne - zaplatene) };
}

// --- Sociálne poistenie ---

// Prvý mesiac sociálneho poistenia: nová SZČO od 1. dňa 6. mesiaca po mesiaci vzniku,
// inak hneď (⚠️ pri návrate do 60 mesiacov môžu platiť ďalšie podmienky)
function prvyMesiacSP() {
  return profil.predtymSZCO ? mesiacVzniku() : mesiacVzniku() + 6;
}

// Test príjmu za rok (robí ho Sociálna poisťovňa k 1. júlu nasledujúceho roka):
// 'ziadne' = bez povinného poistenia, 'mikro' = mikroodvod, 'plne' = plné odvody
function testPrijmu(rokPrijmu) {
  if (rokPrijmu < rokVzniku()) {
    return 'mikro'; // v tom roku si ešte nebol SZČO – platí mikroodvod
  }
  const prijmy = prijmyZaRok(rokPrijmu).spolu;
  const par = parametreRoka(rokPrijmu);
  const horna = par.testHorna ?? parametreRoka(rokPrijmu - 1).testHorna;
  if (prijmy <= par.testSpodna) return 'ziadne';
  if (prijmy <= horna) return 'mikro';
  return 'plne';
}

// Čiastkový základ dane z podnikania: príjmy − paušál − zaplatené odvody
function ciastkovyZakladDane(rok) {
  const prijmy = prijmyZaRok(rok).spolu;
  return Math.max(0, naCenty(prijmy - pausalneVydavky(rok, prijmy) - odvodyZaRok(rok)));
}

// Sociálne poistenie za jeden mesiac (c = číslo mesiaca)
function spZaMesiac(c) {
  if (c < prvyMesiacSP()) {
    return { suma: 0, typ: 'pred' };
  }
  const rok = rokZCisla(c);
  // Od júla platí test podľa príjmov za minulý rok, do júna podľa príjmov spred dvoch rokov
  const rokPrijmu = mesiacZCisla(c) >= 7 ? rok - 1 : rok - 2;
  const typ = testPrijmu(rokPrijmu);
  const par = parametreRoka(rok);
  if (typ === 'ziadne') {
    return { suma: 0, typ: typ };
  }
  if (typ === 'mikro') {
    return { suma: par.spMikroodvod, typ: typ };
  }
  // Plné odvody: vymeriavací základ = čiastkový základ dane / 1,486 / 12, aspoň minimum
  const vz = ciastkovyZakladDane(rokPrijmu) / KOEFICIENT_VZ / 12;
  if (vz <= par.spMinVZ) {
    return { suma: par.spMinPoistne, typ: typ };
  }
  return { suma: naCenty(Math.min(vz, par.spMaxVZ) * SP_SADZBA), typ: typ };
}

// Všetky odvody (zdravotné + sociálne) za mesiace daného roka
function odvodyZaRok(rok) {
  let spolu = zpPreddavok(rok) * mesiaceZP(rok);
  for (let mesiac = 1; mesiac <= 12; mesiac++) {
    spolu += spZaMesiac(cisloMesiaca(rok, mesiac)).suma;
  }
  return naCenty(spolu);
}

// --- Daň z príjmov ---

function danZaRok(rok) {
  const par = parametreRoka(rok);
  const prijmy = prijmyZaRok(rok).spolu;
  const vydavky = pausalneVydavky(rok, prijmy);
  const odvody = odvodyZaRok(rok);
  const zakladDane = Math.max(0, naCenty(prijmy - vydavky - odvody));
  // Nezdaniteľná časť: celá do hranice, nad ňou sa znižuje
  const nczd = zakladDane <= par.nczdHranica
    ? par.nczd
    : Math.max(0, naCenty(par.nczdKonstanta - zakladDane / 3));
  const zdanitelne = Math.max(0, naCenty(zakladDane - nczd));
  return {
    prijmy: prijmy,
    vydavky: vydavky,
    odvody: odvody,
    zakladDane: zakladDane,
    nczd: nczd,
    dan: Math.floor(zdanitelne * SADZBA_DANE * 100) / 100, // daň sa zaokrúhľuje na centy nadol
    priznaniePovinne: prijmy > par.nczd / 2,
    nad100k: prijmy > HRANICA_SADZBY_15,
  };
}

// --- Zobrazenie ---

// Pridá riadok "popis – suma" do tabuľky výpočtu
function riadokDane(tabulka, popis, hodnota, jeVysledok) {
  const riadok = document.createElement('tr');
  if (jeVysledok) {
    riadok.className = 'vysledok';
  }
  riadok.append(bunkaVykazu('td', popis), bunkaVykazu('td', hodnota));
  tabulka.appendChild(riadok);
}

// Spojí za sebou idúce mesiace s rovnakou sumou do jedného riadku časovej osi
function rozsahyPlatieb(odMesiaca, doMesiaca, platbaZaMesiac) {
  const rozsahy = [];
  for (let c = odMesiaca; c <= doMesiaca; c++) {
    const platba = platbaZaMesiac(c);
    const posledny = rozsahy[rozsahy.length - 1];
    if (posledny && posledny.suma === platba.suma && posledny.typ === platba.typ) {
      posledny.do = c;
    } else {
      rozsahy.push({ od: c, do: c, suma: platba.suma, typ: platba.typ });
    }
  }
  return rozsahy;
}

const POPIS_TESTU = {
  ziadne: 'bez povinného sociálneho poistenia',
  mikro: 'mikroodvod',
  plne: 'plné odvody',
};

// Mesiace v 2. páde (pre "Od marca 2027")
const MESIACE_OD = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra',
];

// Odvody za jeden mesiac (c = číslo mesiaca): zdravotné + sociálne a typ sociálneho
// Rovnaký výpočet používa karta Dane aj dlaždica v Prehľade.
function odvodyZaMesiac(c) {
  const zdravotne = c >= prvyMesiacZP() ? zpPreddavok(rokZCisla(c)) : 0;
  const socialne = spZaMesiac(c); // pred začiatkom platenia vráti 0 € a typ 'pred'
  return {
    zdravotne: zdravotne,
    socialne: socialne.suma,
    typ: socialne.typ,
    spolu: naCenty(zdravotne + socialne.suma),
  };
}

// Text sociálneho poistenia do tabuľky, napr. "139,61 € mikroodvod"
function textSocialneho(o) {
  if (o.typ === 'pred') return '0 € (odvodové prázdniny)';
  if (o.typ === 'ziadne') return '0 € (príjmy pod hranicou)';
  return `${formatEur.format(o.socialne)} ${o.typ === 'mikro' ? 'mikroodvod' : 'plné odvody'}`;
}

// Obdobia s rovnakými odvodmi: od tohto mesiaca (alebo od vzniku) do konca obdobia
function obdobiaOdvodov(odMesiaca, doMesiaca) {
  const obdobia = [];
  for (let c = odMesiaca; c <= doMesiaca; c++) {
    const o = odvodyZaMesiac(c);
    const posledne = obdobia[obdobia.length - 1];
    if (posledne && posledne.zdravotne === o.zdravotne && posledne.socialne === o.socialne && posledne.typ === o.typ) {
      posledne.do = c;
    } else {
      obdobia.push({ ...o, od: c, do: c });
    }
  }
  return obdobia;
}

// Karta s nadpisom (vráti ju, aby sa do nej dalo pridávať)
function novaKartaDane(nadpis) {
  const karta = document.createElement('section');
  karta.className = 'karta';
  if (nadpis) {
    const h2 = document.createElement('h2');
    h2.textContent = nadpis;
    karta.appendChild(h2);
  }
  vysledokDane.appendChild(karta);
  return karta;
}

// Dlaždica bez kliknutia: popis, hodnota a text pod ňou
function dlazdicaDane(popis, hodnota, pod) {
  const dlazdica = document.createElement('div');
  dlazdica.className = 'dlazdica staticka';
  const p1 = document.createElement('span');
  p1.className = 'dlazdica-popis';
  p1.textContent = popis;
  const p2 = document.createElement('span');
  p2.className = 'dlazdica-hodnota';
  p2.textContent = hodnota;
  const p3 = document.createElement('span');
  p3.className = 'dlazdica-pod';
  p3.textContent = pod;
  dlazdica.append(p1, p2, p3);
  return dlazdica;
}

// Odhad príjmu ako jedna veta: "Počítam s príjmom 1 800 €/mesiac (tvoj odhad)"
function vykresliOdhadPrijmu() {
  // Bez profilu sa odhad nepoužíva – celý blok skryjeme
  document.getElementById('odhad-prijmu').hidden = !profil.datumVzniku;
  if (!profil.datumVzniku) {
    return;
  }
  odhadZmenit.hidden = !odhadPole.hidden; // kým je políčko otvorené, "Zmeniť" netreba
  odhadText.textContent = `Počítam s príjmom ${formatEurCele.format(odhadMesacne())}/mesiac ` +
    (profil.odhadMesacne === null ? '(návrh appky)' : '(tvoj odhad)');
  odhadNavrh.textContent = profil.odhadMesacne === null
    ? `Navrhujem ${formatEur.format(navrhOdhadu())} – priemer tvojich mesiacov od vzniku živnosti. Môžeš prepísať.`
    : `Vymaž políčko, ak chceš návrh appky (${formatEur.format(navrhOdhadu())}).`;
}

function vykresliDane() {
  vykresliDlazdiceDane(); // dlaždice v Prehľade používajú rovnaké výpočty
  vykresliOdhadPrijmu();
  vysledokDane.replaceChildren();

  // Bez dátumu vzniku sa nedá nič vypočítať
  if (!profil.datumVzniku) {
    const karta = novaKartaDane('');
    const info = document.createElement('p');
    info.textContent = 'Najprv vyplň dátum vzniku živnosti v Nastaveniach (Profil živnostníka).';
    const odkaz = document.createElement('button');
    odkaz.type = 'button';
    odkaz.className = 'tlacidlo-odkaz';
    odkaz.textContent = 'Otvoriť profil';
    odkaz.addEventListener('click', () => {
      prepniZalozku('nastavenia');
      nastaveniaProfil.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    karta.append(info, odkaz);
    return;
  }
  if (rokVzniku() < 2026) {
    const info = document.createElement('p');
    info.textContent = 'Výpočet zatiaľ podporuje iba živnosti, ktoré vznikli od 1. 1. 2026 (podľa nových pravidiel).';
    novaKartaDane('').appendChild(info);
    return;
  }

  if (profil.zamestnany) {
    const pozor = document.createElement('p');
    pozor.className = 'upozornenie';
    pozor.textContent = 'Si zamestnaný – minimálne zdravotné pre teba neplatí a nezdaniteľnú časť využíva aj zamestnanie. ' +
      'Výpočet nižšie počíta, akoby si mal iba živnosť, preto pre teba nemusí sedieť.';
    vysledokDane.appendChild(pozor);
  }

  const teraz = aktualnyMesiac();
  const prvyRok = Math.max(rokZCisla(teraz), rokVzniku());
  const koniec = cisloMesiaca(prvyRok + 2, 12);
  const obdobia = obdobiaOdvodov(Math.max(teraz, mesiacVzniku()), koniec);
  const neiste = (c) => (parametreRoka(rokZCisla(c)).overene ? '' : ' ⚠️');

  // 1) Tri dlaždice: teraz, ďalšia zmena, daň za tento rok
  const dlazdice = document.createElement('div');
  dlazdice.className = 'dlazdice dlazdice-dane';
  const terajsie = obdobia[0];
  const casti = [];
  if (terajsie.zdravotne > 0) casti.push(`zdravotné ${formatEur.format(terajsie.zdravotne)}`);
  if (terajsie.socialne > 0) casti.push(`sociálne ${formatEur.format(terajsie.socialne)}`);
  dlazdice.appendChild(dlazdicaDane(
    teraz >= mesiacVzniku() ? 'Teraz platíš' : `Od ${MESIACE_OD[mesiacZCisla(terajsie.od) - 1]} ${rokZCisla(terajsie.od)}`,
    `${formatEur.format(terajsie.spolu)} mesačne`,
    (casti.length > 0 ? casti.join(' + ') : 'zatiaľ nič') + ' · do 8. dňa ďalšieho mesiaca'
  ));
  const dalsie = obdobia[1];
  if (dalsie) {
    const zmeny = [];
    if (dalsie.socialne !== terajsie.socialne || dalsie.typ !== terajsie.typ) {
      zmeny.push(`sociálne ${textSocialneho(dalsie)}`);
    }
    if (dalsie.zdravotne !== terajsie.zdravotne) {
      zmeny.push(`zdravotné ${formatEur.format(dalsie.zdravotne)}`);
    }
    dlazdice.appendChild(dlazdicaDane(
      `Od ${MESIACE_OD[mesiacZCisla(dalsie.od) - 1]} ${rokZCisla(dalsie.od)}`,
      `${formatEur.format(dalsie.spolu)} mesačne`,
      zmeny.join(' · ') + neiste(dalsie.od)
    ));
  } else {
    dlazdice.appendChild(dlazdicaDane('Ďalšia zmena', 'bez zmeny', `do konca roka ${prvyRok + 2}`));
  }
  const danTeraz = danZaRok(prvyRok);
  dlazdice.appendChild(dlazdicaDane(
    `Daň za ${prvyRok} (odhad)`,
    formatEur.format(danTeraz.dan),
    danTeraz.priznaniePovinne
      ? `priznanie a daň do 31. 3. ${prvyRok + 1}`
      : 'priznanie podľa odhadu podávať netreba'
  ));
  vysledokDane.appendChild(dlazdice);

  // 2) Mesačné odvody: jedno obdobie = jeden riadok so súčtom
  const kartaOdvodov = novaKartaDane('Mesačné odvody');
  const obal = document.createElement('div');
  obal.className = 'tabulka-obal';
  const tabulkaOdvodov = document.createElement('table');
  tabulkaOdvodov.className = 'tabulka-odvodov';
  const hlavicka = document.createElement('thead');
  const riadokHlavicky = document.createElement('tr');
  for (const [nazov, jeCislo] of [['Obdobie', false], ['Zdravotné', true], ['Sociálne', true], ['Spolu', true]]) {
    const th = bunkaVykazu('th', nazov);
    if (jeCislo) th.className = 'cislo';
    riadokHlavicky.appendChild(th);
  }
  hlavicka.appendChild(riadokHlavicky);
  const telo = document.createElement('tbody');
  for (const o of obdobia) {
    const riadok = document.createElement('tr');
    const obdobie = o.od === o.do ? textMesiaca(o.od) : `${textMesiaca(o.od)} – ${textMesiaca(o.do)}`;
    pridajBunku(riadok, 'Obdobie', obdobie + neiste(o.od), false);
    if (o === terajsie && teraz >= mesiacVzniku()) {
      riadok.className = 'aktualne';
      const stitok = document.createElement('span');
      stitok.className = 'stitok';
      stitok.textContent = 'teraz';
      riadok.lastChild.appendChild(stitok);
    }
    pridajBunku(riadok, 'Zdravotné', formatEur.format(o.zdravotne), true);
    pridajBunku(riadok, 'Sociálne', textSocialneho(o), true);
    pridajBunku(riadok, 'Spolu', formatEur.format(o.spolu), true);
    riadok.lastChild.classList.add('spolu');
    telo.appendChild(riadok);
  }
  tabulkaOdvodov.append(hlavicka, telo);
  obal.appendChild(tabulkaOdvodov);
  const splatnost = document.createElement('p');
  splatnost.className = 'slabsi poznamka-dane';
  splatnost.textContent = 'Zdravotné aj sociálne sa platí vždy do 8. dňa nasledujúceho mesiaca. ' +
    '⚠️ = odhad z ešte neoficiálnych čísel.';
  kartaOdvodov.append(obal, splatnost);

  // 3) Ročné povinnosti: priznanie, test príjmov, ročné zúčtovanie
  const kartaPovinnosti = novaKartaDane('Ročné povinnosti');
  const os = document.createElement('ul');
  os.className = 'casova-os';
  const udalosti = []; // { c: číslo mesiaca na zoradenie, kedy, text }
  for (let rok = rokVzniku(); rok <= prvyRok + 1; rok++) {
    const dan = danZaRok(rok);
    const ner = parametreRoka(rok).overene ? '' : ' ⚠️';
    udalosti.push({ c: cisloMesiaca(rok + 1, 3), kedy: `do 31. 3. ${rok + 1}`,
      text: `Daňové priznanie za ${rok} · daň ${formatEur.format(dan.dan)}` +
        (dan.priznaniePovinne ? '' : ' (podľa odhadu podávať netreba)') + ner });
    const prijmy = prijmyZaRok(rok).spolu;
    udalosti.push({ c: cisloMesiaca(rok + 1, 7), kedy: `1. 7. ${rok + 1}`,
      text: `Test príjmov za ${rok} (${formatEurCele.format(prijmy)}) → od júla ${rok + 1} ${POPIS_TESTU[testPrijmu(rok)]}${ner}` });
    const zuctovanie = zpZuctovanie(rok);
    udalosti.push({ c: cisloMesiaca(rok + 1, 9), kedy: `jeseň ${rok + 1}`,
      text: `Ročné zúčtovanie zdravotného za ${rok} · ` + (zuctovanie.rozdiel > 0
        ? `doplatok ${formatEur.format(zuctovanie.rozdiel)}`
        : zuctovanie.rozdiel < 0 ? `preplatok ${formatEur.format(-zuctovanie.rozdiel)}` : 'bez doplatku') + ' ⚠️' });
  }
  udalosti.sort((a, b) => a.c - b.c);
  for (const u of udalosti) {
    const polozka = document.createElement('li');
    const kedy = document.createElement('span');
    kedy.className = 'kedy';
    kedy.textContent = u.kedy;
    const text = document.createElement('span');
    text.textContent = u.text;
    polozka.append(kedy, text);
    os.appendChild(polozka);
  }
  kartaPovinnosti.appendChild(os);

  // 4) Podrobný výpočet dane – zbalený, kto chce, rozbalí si ho
  const kartaVypoctu = novaKartaDane('Ako sa počíta daň');
  for (const rok of [prvyRok, prvyRok + 1]) {
    const par = parametreRoka(rok);
    const prijmy = prijmyZaRok(rok);
    const dan = danZaRok(rok);
    const zuctovanie = zpZuctovanie(rok);

    const rozbal = document.createElement('details');
    rozbal.className = 'vypocet-dane';
    const nadpis = document.createElement('summary');
    nadpis.textContent = `Rok ${rok} · daň ${formatEur.format(dan.dan)}` +
      (par.overene ? '' : ' ⚠️ (čísla ešte nie sú všetky oficiálne)');
    const tabulkaDane = document.createElement('table');
    tabulkaDane.className = 'tabulka-dane';
    riadokDane(tabulkaDane,
      prijmy.skutocne > 0 && prijmy.odhad > 0
        ? `Príjmy (skutočné ${formatEur.format(prijmy.skutocne)} + odhad ${formatEur.format(prijmy.odhad)})`
        : prijmy.odhad > 0 ? 'Príjmy (odhad)' : 'Príjmy',
      formatEur.format(prijmy.spolu));
    riadokDane(tabulkaDane, 'Paušálne výdavky 60 %', '− ' + formatEur.format(dan.vydavky));
    riadokDane(tabulkaDane, 'Zaplatené odvody (zdravotné + sociálne)', '− ' + formatEur.format(dan.odvody));
    riadokDane(tabulkaDane, 'Základ dane', formatEur.format(dan.zakladDane));
    riadokDane(tabulkaDane, 'Nezdaniteľná časť', '− ' + formatEur.format(Math.min(dan.nczd, dan.zakladDane)));
    riadokDane(tabulkaDane, `Daň z príjmov 15 % – zaplatiť do 31. 3. ${rok + 1}`, formatEur.format(dan.dan), true);
    riadokDane(tabulkaDane,
      zuctovanie.rozdiel > 0 ? 'Zdravotné – doplatok v ročnom zúčtovaní'
        : zuctovanie.rozdiel < 0 ? 'Zdravotné – preplatok v ročnom zúčtovaní' : 'Zdravotné – ročné zúčtovanie',
      formatEur.format(Math.abs(zuctovanie.rozdiel)), true);

    const poznamka = document.createElement('p');
    poznamka.className = 'slabsi poznamka-dane';
    poznamka.textContent = (dan.priznaniePovinne
      ? `Daňové priznanie za ${rok} musíš podať do 31. 3. ${rok + 1} (príjmy nad ${formatEur.format(par.nczd / 2)}).`
      : `Daňové priznanie za ${rok} podľa odhadu podávať nemusíš (príjmy do ${formatEur.format(par.nczd / 2)}).`) +
      (dan.nad100k ? ' Pri príjmoch nad 100 000 € platí vyššia sadzba dane – appka ju nepočíta.' : '');

    rozbal.append(nadpis, tabulkaDane, poznamka);
    kartaVypoctu.appendChild(rozbal);
  }
}

// --- Profil ---

// Skontroluje profil z localStorage alebo zo zálohy. Vráti čistý profil, alebo null.
function vycistiProfil(data) {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const jeSpravny =
    (data.datumVzniku === '' || jePlatnyDatum(data.datumVzniku)) &&
    typeof data.predtymSZCO === 'boolean' &&
    typeof data.zamestnany === 'boolean' &&
    (data.odhadMesacne === null || (Number.isFinite(data.odhadMesacne) && data.odhadMesacne >= 0));
  if (!jeSpravny) {
    return null;
  }
  return {
    datumVzniku: data.datumVzniku,
    predtymSZCO: data.predtymSZCO,
    zamestnany: data.zamestnany,
    odhadMesacne: data.odhadMesacne,
  };
}

function ulozProfil() {
  ulozPolozku(KLUC_PROFIL, profil);
}

// Vyplní formulár profilu a políčko odhadu podľa uloženého profilu
function vyplnProfil() {
  poleProfilVznik.value = profil.datumVzniku;
  poleProfilPredtym.checked = profil.predtymSZCO;
  poleProfilZamestnany.checked = profil.zamestnany;
  poleOdhadMesacne.value = profil.odhadMesacne === null ? '' : cisloDoPolicka(profil.odhadMesacne);
}

formularProfil.addEventListener('submit', (udalost) => {
  udalost.preventDefault();
  const datum = poleProfilVznik.value;
  const chyba = jePlatnyDatum(datum) ? '' : 'Vyber dátum vzniku živnosti (nájdeš ho v živnostenskom registri).';
  document.getElementById('chyba-profil-vznik').textContent = chyba;
  poleProfilVznik.setAttribute('aria-invalid', chyba ? 'true' : 'false');
  if (chyba) {
    poleProfilVznik.focus();
    return;
  }
  profil.datumVzniku = datum;
  profil.predtymSZCO = poleProfilPredtym.checked;
  profil.zamestnany = poleProfilZamestnany.checked;
  ulozProfil();
  vykresliDane();
  zobrazSpravu('Profil je uložený. Odhad daní a odvodov sa prepočítal.', false);
});

// "Zmeniť" ukáže políčko s odhadom príjmu, "Hotovo" ho zas skryje
odhadZmenit.addEventListener('click', () => {
  odhadPole.hidden = false;
  odhadZmenit.hidden = true;
  poleOdhadMesacne.focus();
});

odhadHotovo.addEventListener('click', () => {
  odhadPole.hidden = true;
  vykresliOdhadPrijmu(); // ukáže späť "Zmeniť"
});

// Enter v políčku = Hotovo (zmena sa uloží cez udalosť "change")
poleOdhadMesacne.addEventListener('keydown', (udalost) => {
  if (udalost.key === 'Enter') {
    poleOdhadMesacne.blur(); // opustenie políčka spustí "change"
    odhadHotovo.click();
  }
});

// Odhad mesačného príjmu: prázdne políčko = návrh appky
poleOdhadMesacne.addEventListener('change', () => {
  const text = poleOdhadMesacne.value.trim();
  if (text === '') {
    profil.odhadMesacne = null;
  } else {
    const suma = precitajCislo(text);
    if (!(suma >= 0)) {
      zobrazSpravu('Odhad príjmu musí byť číslo v eurách, napr. 1500.', true);
      return;
    }
    profil.odhadMesacne = naCenty(suma);
  }
  ulozProfil();
  vykresliDane();
});

// ===== Jednorazové položky =====

// Skontroluje jednorazové položky z localStorage alebo zo zálohy.
// Vráti pole čistých položiek, alebo null, ak je v nich niečo zle.
function vycistiJednorazove(zoznam) {
  if (!Array.isArray(zoznam)) {
    return null;
  }
  const vysledok = [];
  const pouziteId = new Set();
  for (const p of zoznam) {
    if (typeof p !== 'object' || p === null) {
      return null;
    }
    const nazov = typeof p.nazov === 'string' ? p.nazov.trim() : '';
    const jeSpravna =
      Number.isInteger(p.id) && p.id > 0 && !pouziteId.has(p.id) &&
      jePlatnyDatum(p.datum) &&
      nazov !== '' && nazov.length <= MAX_DLZKA_NAZVU_POLOZKY &&
      Number.isFinite(p.suma) && p.suma > 0;
    if (!jeSpravna) {
      return null;
    }
    pouziteId.add(p.id);
    vysledok.push({ id: p.id, datum: p.datum, nazov: nazov, suma: naCenty(p.suma) });
  }
  return vysledok;
}

function nastavJednorazove(zoznam) {
  jednorazove = zoznam;
  dalsieIdJednorazovej = zoznam.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

function ulozJednorazove() {
  ulozPolozku(KLUC_JEDNORAZOVE, jednorazove);
}

// Položky vybraného mesiaca, od najstaršej
function jednorazoveZMesiaca() {
  return jednorazove
    .filter((p) => p.datum.startsWith(vybranyMesiac))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id);
}

function sucetJednorazovych(zoznam) {
  return naCenty(zoznam.reduce((spolu, p) => spolu + p.suma, 0));
}

// Predvolený dátum novej položky: dnes, ak si v aktuálnom mesiaci, inak 1. deň vybraného mesiaca
function predvolenyDatumJednorazovej() {
  const dnes = dnesnyDatum();
  return dnes.startsWith(vybranyMesiac) ? dnes : `${vybranyMesiac}-01`;
}

// Zoznam položiek vybraného mesiaca
function vykresliJednorazove() {
  nadpisJednorazovych.textContent = `Jednorazové položky – ${formatMesiac(vybranyMesiac)}`;
  zoznamJednorazovych.replaceChildren();

  const zMesiaca = jednorazoveZMesiaca();
  ziadneJednorazove.hidden = zMesiaca.length > 0;
  document.getElementById('ziadne-jednorazove-text').textContent =
    `V mesiaci ${formatMesiac(vybranyMesiac)} nemáš žiadne jednorazové položky.`;

  for (const p of zMesiaca) {
    const polozka = document.createElement('li');
    if (p.id === upravovanaJednorazovaId) {
      polozka.className = 'upravovany';
    }

    const info = document.createElement('span');
    const datum = document.createElement('span');
    datum.className = 'slabsi';
    datum.textContent = `${formatDatum(p.datum)} · `;
    const nazov = document.createElement('strong');
    nazov.textContent = p.nazov;
    const suma = document.createElement('span');
    suma.className = 'suma-polozky';
    suma.textContent = ` – ${formatEur.format(p.suma)}`;
    info.append(datum, nazov, suma);

    const akcie = document.createElement('span');
    akcie.className = 'akcie';
    akcie.append(
      vytvorTlacidloJednorazovej('Upraviť', 'upravit', p),
      vytvorTlacidloJednorazovej('Zmazať', 'zmazat', p)
    );

    polozka.append(info, akcie);
    zoznamJednorazovych.appendChild(polozka);
  }

  // Dátum v prázdnom formulári sa drží vybraného mesiaca
  if (upravovanaJednorazovaId === null && !poleJednorazovaDatum.value.startsWith(vybranyMesiac)) {
    poleJednorazovaDatum.value = predvolenyDatumJednorazovej();
  }
}

function vytvorTlacidloJednorazovej(text, akcia, p) {
  const tlacidlo = document.createElement('button');
  tlacidlo.type = 'button';
  tlacidlo.className = akcia === 'zmazat' ? 'tlacidlo-male nebezpecne' : 'tlacidlo-male';
  tlacidlo.textContent = text;
  tlacidlo.dataset.akcia = akcia;
  tlacidlo.dataset.id = p.id;
  tlacidlo.setAttribute('aria-label', `${text} – položka ${p.nazov}`);
  pridajIkonu(tlacidlo, akcia);
  return tlacidlo;
}

// Zobrazí chybové hlášky vo formulári položky
function zobrazChybyJednorazovej(chyby) {
  const trojice = [
    ['datum', poleJednorazovaDatum, 'chyba-jednorazova-datum'],
    ['suma', poleJednorazovaSuma, 'chyba-jednorazova-suma'],
    ['nazov', poleJednorazovaNazov, 'chyba-jednorazova-nazov'],
  ];
  let prveChybne = null;
  for (const [kluc, pole, idChyby] of trojice) {
    const hlaska = chyby[kluc] || '';
    document.getElementById(idChyby).textContent = hlaska;
    pole.setAttribute('aria-invalid', hlaska ? 'true' : 'false');
    if (hlaska && prveChybne === null) {
      prveChybne = pole;
    }
  }
  if (prveChybne) {
    prveChybne.focus();
  }
}

// Načíta položku do formulára, aby sa dala upraviť
function zacniUpravuJednorazovej(id) {
  const p = jednorazove.find((x) => x.id === id);
  if (!p) {
    return;
  }
  upravovanaJednorazovaId = id;
  poleJednorazovaDatum.value = p.datum;
  poleJednorazovaNazov.value = p.nazov;
  poleJednorazovaSuma.value = cisloDoPolicka(p.suma);
  zobrazChybyJednorazovej({});
  nadpisFormularaJednorazovej.textContent = 'Upraviť položku';
  tlacidloUlozitJednorazovu.textContent = 'Uložiť zmeny';
  tlacidloZrusitJednorazovu.hidden = false;
  pridanieJednorazovej.open = true; // rozbalí formulár
  pridanieJednorazovej.scrollIntoView({ behavior: 'smooth', block: 'center' });
  poleJednorazovaNazov.focus({ preventScroll: true });
  vykresliJednorazove();
}

// Vráti formulár položky do režimu "Nová položka"
function ukonciUpravuJednorazovej() {
  upravovanaJednorazovaId = null;
  poleJednorazovaDatum.value = predvolenyDatumJednorazovej();
  poleJednorazovaNazov.value = '';
  poleJednorazovaSuma.value = '';
  zobrazChybyJednorazovej({});
  nadpisFormularaJednorazovej.textContent = 'Nová položka';
  tlacidloUlozitJednorazovu.textContent = 'Pridať položku';
  tlacidloZrusitJednorazovu.hidden = true;
  vykresliJednorazove();
}

// Zmaže položku po potvrdení
async function zmazJednorazovu(id) {
  const p = jednorazove.find((x) => x.id === id);
  if (!p) {
    return;
  }
  const potvrdene = await potvrd({
    nadpis: 'Zmazať položku?',
    text: `Položka „${p.nazov}“ (${formatEur.format(p.suma)}) z ${formatDatum(p.datum)} sa zmaže. ` +
      'Tento krok sa nedá vrátiť.',
    ano: 'Zmazať',
    nebezpecne: true,
  });
  if (!potvrdene) {
    return;
  }
  jednorazove = jednorazove.filter((x) => x.id !== id);
  if (upravovanaJednorazovaId === id) {
    ukonciUpravuJednorazovej();
  }
  ulozJednorazove();
  vykresli();
  zobrazSpravu(`Položka „${p.nazov}“ je zmazaná.`, false);
}

// Uloženie položky z formulára (nová alebo upravená)
formularJednorazovej.addEventListener('submit', (udalost) => {
  udalost.preventDefault();

  const datum = poleJednorazovaDatum.value;
  const nazov = poleJednorazovaNazov.value.trim();
  const suma = precitajCislo(poleJednorazovaSuma.value);

  const chyby = {};
  if (!jePlatnyDatum(datum)) {
    chyby.datum = 'Vyber dátum (podľa neho sa položka zaradí do mesiaca).';
  }
  if (!(suma > 0)) {
    chyby.suma = 'Suma musí byť kladné číslo v eurách, napr. 50 alebo 12,90.';
  }
  if (nazov === '') {
    chyby.nazov = 'Napíš, čo to je, napr. nafta.';
  }
  zobrazChybyJednorazovej(chyby);
  if (Object.keys(chyby).length > 0) {
    return;
  }

  const polozka = { id: upravovanaJednorazovaId, datum: datum, nazov: nazov, suma: naCenty(suma) };
  if (upravovanaJednorazovaId !== null) {
    const index = jednorazove.findIndex((x) => x.id === upravovanaJednorazovaId);
    if (index !== -1) {
      jednorazove[index] = polozka;
    }
    zobrazSpravu(`Položka „${nazov}“ je upravená.`, false);
  } else {
    polozka.id = dalsieIdJednorazovej++;
    jednorazove.push(polozka);
    zobrazSpravu(`Položka „${nazov}“ je pridaná.`, false);
  }

  // Prepneme prehľad na mesiac položky, aby si ju hneď videl
  vybranyMesiac = datum.slice(0, 7);
  ulozJednorazove();
  ukonciUpravuJednorazovej();
  pridanieJednorazovej.open = false; // formulár sa zbalí
  vykresli();
});

tlacidloZrusitJednorazovu.addEventListener('click', ukonciUpravuJednorazovej);

zoznamJednorazovych.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo) {
    return;
  }
  const id = Number(tlacidlo.dataset.id);
  if (tlacidlo.dataset.akcia === 'upravit') {
    zacniUpravuJednorazovej(id);
  } else if (tlacidlo.dataset.akcia === 'zmazat') {
    zmazJednorazovu(id);
  }
});

// ===== Prehľad (dlaždice, posledné záznamy, rýchly štart stopiek) =====

const prehladHodiny = document.getElementById('prehlad-hodiny');
const prehladHodinyPod = document.getElementById('prehlad-hodiny-pod');
const prehladZarobok = document.getElementById('prehlad-zarobok');
const prehladZarobokPod = document.getElementById('prehlad-zarobok-pod');
const prehladOdvody = document.getElementById('prehlad-odvody');
const prehladOdvodyPopis = document.getElementById('prehlad-odvody-popis');
const prehladOdvodyPod = document.getElementById('prehlad-odvody-pod');
const prehladDan = document.getElementById('prehlad-dan');
const prehladDanPopis = document.getElementById('prehlad-dan-popis');
const prehladDanPod = document.getElementById('prehlad-dan-pod');
const posledneZaznamy = document.getElementById('posledne-zaznamy');
const posledneTabulka = document.getElementById('posledne-tabulka');
const poslednePrazdne = document.getElementById('posledne-prazdne');
const vsetkyZaznamy = document.getElementById('vsetky-zaznamy');
const rychlyStart = document.getElementById('rychly-start');
const rychlyStartZoznam = document.getElementById('rychly-start-zoznam');
const rychlyStartPrazdne = document.getElementById('rychly-start-prazdne');
// Koľko posledných záznamov ukážeme v Prehľade
const POCET_POSLEDNYCH = 5;

// Dlaždice Odpracované a Zárobok (vždy za tento mesiac) a posledné záznamy
function vykresliPrehlad() {
  const tentoMesiac = dnesnyDatum().slice(0, 7);
  const suhrn = suhrnZaznamov(zaznamy.filter((z) => z.datum.startsWith(tentoMesiac)));
  const zaPolozky = sucetJednorazovych(jednorazove.filter((p) => p.datum.startsWith(tentoMesiac)));

  prehladHodiny.textContent = formatTrvanie(suhrn.minuty);
  prehladHodinyPod.textContent = `${pocetZaznamov(suhrn.pocet)} · ${formatMesiac(tentoMesiac)}`;
  prehladZarobok.textContent = formatEur.format(naCenty(suhrn.suma + zaPolozky));
  prehladZarobokPod.textContent = zaPolozky > 0
    ? `z toho položky ${formatEur.format(zaPolozky)}`
    : formatMesiac(tentoMesiac);

  // Posledné záznamy: najnovší dátum hore, pri rovnakom dátume naposledy pridaný hore
  const posledne = [...zaznamy]
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id)
    .slice(0, POCET_POSLEDNYCH);
  posledneZaznamy.replaceChildren();
  for (const z of posledne) {
    const riadok = document.createElement('tr');
    if (z.id === upravovaneId) {
      riadok.className = 'upravovany';
    }
    pridajBunkuDatum(riadok, z.datum, true);
    pridajBunkuPoznamka(riadok, z);
    pridajBunku(riadok, 'Odpracované', formatTrvanie(minutyZaznamu(z)), true);
    pridajBunku(riadok, 'Suma', formatEur.format(z.suma), true);
    const bunkaAkcie = document.createElement('td');
    bunkaAkcie.className = 'akcie';
    bunkaAkcie.appendChild(vytvorTlacidlo('Upraviť', 'upravit', z));
    riadok.appendChild(bunkaAkcie);
    posledneZaznamy.appendChild(riadok);
  }
  posledneTabulka.hidden = posledne.length === 0;
  vsetkyZaznamy.hidden = posledne.length === 0;
  poslednePrazdne.hidden = posledne.length > 0;
}

// Dlaždice Odvody za tento mesiac a Daň za tento rok (rovnaké výpočty ako karta Dane a odvody)
function vykresliDlazdiceDane() {
  const c = aktualnyMesiac();
  const rok = rokZCisla(c);
  prehladOdvodyPopis.textContent = `Odvody za ${NAZVY_MESIACOV[mesiacZCisla(c) - 1]}`;
  prehladDanPopis.textContent = `Daň za ${rok} (odhad)`;

  if (!profil.datumVzniku || rokVzniku() < 2026) {
    prehladOdvody.textContent = '–';
    prehladOdvodyPod.textContent = 'vyplň profil v Nastaveniach';
    prehladDan.textContent = '–';
    prehladDanPod.textContent = 'vyplň profil v Nastaveniach';
    return;
  }

  // Zdravotné a sociálne za tento mesiac (pred začiatkom platenia 0 €) – rovnako ako karta Dane
  const spolu = odvodyZaMesiac(c).spolu;
  prehladOdvody.textContent = formatEur.format(spolu);
  // Platí sa do 8. dňa nasledujúceho mesiaca
  prehladOdvodyPod.textContent = spolu > 0
    ? `zaplatiť do 8. ${mesiacZCisla(c + 1)}. ${rokZCisla(c + 1)} · orientačne`
    : 'tento mesiac nič · orientačne';

  prehladDan.textContent = formatEur.format(danZaRok(rok).dan);
  prehladDanPod.textContent = `zaplatiť do 31. 3. ${rok + 1} · orientačne`;
}

// Rýchly štart: tlačidlo pre každý rozpracovaný projekt (skryté, kým stopky bežia)
function vykresliRychlyStart() {
  rychlyStart.hidden = stopky !== null;
  const otvorene = projekty.filter((p) => !p.uzavrety);
  rychlyStartPrazdne.hidden = otvorene.length > 0;
  rychlyStartZoznam.replaceChildren();
  for (const p of otvorene) {
    const tlacidlo = document.createElement('button');
    tlacidlo.type = 'button';
    tlacidlo.className = 'tlacidlo-start';
    tlacidlo.dataset.akcia = 'start';
    tlacidlo.dataset.id = p.id;
    tlacidlo.setAttribute('aria-label', `Spustiť stopky – projekt ${p.nazov}`);

    const kruh = document.createElement('span');
    kruh.className = 'start-ikona';
    kruh.appendChild(ikona('play'));

    const text = document.createElement('span');
    const nazov = document.createElement('strong');
    nazov.textContent = p.nazov;
    const detail = document.createElement('span');
    detail.className = 'detail';
    const suhrn = suhrnZaznamov(zaznamyProjektu(p.id));
    detail.textContent = `${formatEur.format(p.sadzba)}/h · spolu ${formatTrvanie(suhrn.minuty)}`;
    text.append(nazov, detail);

    tlacidlo.append(kruh, text);
    rychlyStartZoznam.appendChild(tlacidlo);
  }
}

rychlyStartZoznam.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (tlacidlo) {
    spustiStopky(Number(tlacidlo.dataset.id));
  }
});

// Upraviť v posledných záznamoch
posledneZaznamy.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (tlacidlo && tlacidlo.dataset.akcia === 'upravit') {
    zacniUpravu(Number(tlacidlo.dataset.id));
  }
});

// Dlaždice Odpracované a Zárobok otvoria Záznamy za tento mesiac
// (samotné prepnutie záložky zariadi data-zalozka v index.html)
for (const id of ['dlazdica-hodiny', 'dlazdica-zarobok']) {
  document.getElementById(id).addEventListener('click', () => {
    vybranyMesiac = dnesnyDatum().slice(0, 7);
    vykresli();
  });
}

// ===== Graf po mesiacoch (posledných 12 mesiacov) =====
// Kreslí sa v SVG (obrázok z čiar a tvarov zapísaný kódom) – bez knižníc a bez internetu.

const grafObal = document.getElementById('graf-obal');
const grafBublina = document.getElementById('graf-bublina');
const grafPrazdny = document.getElementById('graf-prazdny');
const grafTabulka = document.getElementById('graf-tabulka');
const grafTabulkaTelo = document.getElementById('graf-tabulka-telo');
const grafNadpis = document.getElementById('graf-nadpis');
const grafPodnadpis = document.getElementById('graf-podnadpis');
const prepinacGrafu = document.getElementById('prepinac-grafu');

const POCET_MESIACOV_GRAFU = 12;
const VYSKA_GRAFU = 220; // v pixeloch
const MAX_SIRKA_STLPCA = 24; // tenké stĺpce, okolo nich vzduch
const KRATKE_MESIACE = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
// Eurá bez centov – na popis osi (napr. "1 500 €")
const formatEurCele = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Čo graf ukazuje: 'zarobok' alebo 'hodiny'
let grafMiera = 'zarobok';
// Šírka, pre ktorú bol graf naposledy nakreslený (pri zmene šírky okna ho nakreslíme znova)
let sirkaGrafu = 0;

// Čísla za posledných 12 mesiacov (od najstaršieho po tento mesiac)
function udajeGrafu() {
  const tentoMesiac = dnesnyDatum().slice(0, 7);
  const vysledok = [];
  for (let i = POCET_MESIACOV_GRAFU - 1; i >= 0; i--) {
    const mesiac = posunMesiac(tentoMesiac, -i);
    const suhrn = suhrnZaznamov(zaznamy.filter((z) => z.datum.startsWith(mesiac)));
    const zaPolozky = sucetJednorazovych(jednorazove.filter((p) => p.datum.startsWith(mesiac)));
    vysledok.push({
      mesiac: mesiac,
      minuty: suhrn.minuty,
      zarobok: naCenty(suhrn.suma + zaPolozky),
      pocet: suhrn.pocet,
      tento: mesiac === tentoMesiac,
    });
  }
  return vysledok;
}

// "Pekná" os: strop a krok čiar z okrúhlych čísel (napr. max 1 610 € -> strop 2 000 € po 500 €)
function peknaOs(max, kroky) {
  if (!(max > 0)) {
    return { strop: kroky[0], krok: kroky[0] };
  }
  const hrubyKrok = max / 4; // chceme zhruba 4 čiary
  const rad = 10 ** Math.floor(Math.log10(hrubyKrok)); // 1, 10, 100, 1000…
  const krok = kroky.map((k) => k * rad).find((k) => k >= hrubyKrok) || 10 * rad;
  return { strop: Math.ceil(max / krok) * krok, krok: krok };
}

// Vytvorí prvok SVG s atribútmi, napr. svgPrvok('line', { x1: 0, y1: 0, ... })
function svgPrvok(znacka, atributy) {
  const prvok = document.createElementNS(SVG_NS, znacka);
  for (const nazov in atributy) {
    prvok.setAttribute(nazov, atributy[nazov]);
  }
  return prvok;
}

// Text v SVG (vždy cez textContent)
function svgText(text, atributy) {
  const prvok = svgPrvok('text', atributy);
  prvok.textContent = text;
  return prvok;
}

// Ukáže bublinu nad stĺpcom: hodnota výrazne, pod ňou mesiac a ostatné čísla
function ukazBublinu(u, x, y) {
  const jeZarobok = grafMiera === 'zarobok';
  const hodnota = document.createElement('strong');
  hodnota.textContent = jeZarobok ? formatEur.format(u.zarobok) : formatTrvanie(u.minuty);
  const mesiac = document.createElement('span');
  mesiac.textContent = formatMesiac(u.mesiac);
  const detail = document.createElement('span');
  detail.textContent = ` · ${jeZarobok ? formatTrvanie(u.minuty) : formatEur.format(u.zarobok)} · ${pocetZaznamov(u.pocet)}`;
  grafBublina.replaceChildren(hodnota, mesiac, detail);
  grafBublina.hidden = false;
  // Bublina nesmie vyjsť z grafu vľavo ani vpravo
  const polovica = (grafBublina.offsetWidth || 0) / 2;
  const vlavo = Math.min(Math.max(x, polovica), sirkaGrafu - polovica);
  grafBublina.style.left = `${vlavo}px`;
  grafBublina.style.top = `${y}px`;
}

function skryBublinu() {
  grafBublina.hidden = true;
}

// Klik na stĺpec otvorí Záznamy toho mesiaca
function otvorMesiacZGrafu(mesiac) {
  vybranyMesiac = mesiac;
  prepniZalozku('zaznamy');
  vykresli();
}

// Nakreslí graf a vyplní tabuľku pod ním
function vykresliGraf() {
  const udaje = udajeGrafu();
  const jeZarobok = grafMiera === 'zarobok';
  const hodnota = (u) => (jeZarobok ? u.zarobok : u.minuty / 60);

  grafNadpis.textContent = jeZarobok ? 'Zárobok po mesiacoch' : 'Odpracované hodiny po mesiacoch';
  grafPodnadpis.textContent = `${formatMesiac(udaje[0].mesiac)} – ${formatMesiac(udaje[udaje.length - 1].mesiac)}`;

  // Tabuľka: tie isté čísla, najnovší mesiac hore
  grafTabulkaTelo.replaceChildren();
  for (const u of [...udaje].reverse()) {
    const riadok = document.createElement('tr');
    pridajBunku(riadok, 'Mesiac', formatMesiac(u.mesiac), false);
    pridajBunku(riadok, 'Hodiny', formatTrvanie(u.minuty), true);
    pridajBunku(riadok, 'Zárobok', formatEur.format(u.zarobok), true);
    pridajBunku(riadok, 'Záznamy', String(u.pocet), true);
    grafTabulkaTelo.appendChild(riadok);
  }

  const maData = udaje.some((u) => u.pocet > 0 || u.zarobok > 0);
  grafPrazdny.hidden = maData;
  grafObal.hidden = !maData;
  grafTabulka.hidden = !maData;
  skryBublinu();
  if (!maData) {
    grafObal.replaceChildren(grafBublina);
    return;
  }

  // Rozmery: šírka podľa miesta na stránke (ak je záložka skrytá, dočasne 600 px)
  const sirka = grafObal.clientWidth > 0 ? grafObal.clientWidth : 600;
  sirkaGrafu = sirka;
  const okraj = { hore: 22, vpravo: 4, dole: 26, vlavo: jeZarobok ? 58 : 42 };
  const plochaSirka = sirka - okraj.vlavo - okraj.vpravo;
  const plochaVyska = VYSKA_GRAFU - okraj.hore - okraj.dole;
  const os = peknaOs(Math.max(...udaje.map(hodnota)), jeZarobok ? [1, 2, 2.5, 5] : [1, 2, 5]);
  const y = (v) => okraj.hore + plochaVyska - (v / os.strop) * plochaVyska; // hodnota -> výška v pixeloch
  const slot = plochaSirka / udaje.length; // miesto pre jeden mesiac
  const sirkaStlpca = Math.min(MAX_SIRKA_STLPCA, slot * 0.6);

  const svg = svgPrvok('svg', {
    viewBox: `0 0 ${sirka} ${VYSKA_GRAFU}`,
    width: sirka,
    height: VYSKA_GRAFU,
    role: 'img',
    'aria-label': `${grafNadpis.textContent}, ${grafPodnadpis.textContent}. Presné čísla sú v tabuľke pod grafom.`,
  });

  // Vodorovné čiary mriežky a popisy na ľavej osi (0, 500 €, 1 000 €…)
  for (let v = 0; v <= os.strop + 1e-9; v += os.krok) {
    svg.appendChild(svgPrvok('line', {
      class: 'graf-mriezka', x1: okraj.vlavo, x2: sirka - okraj.vpravo, y1: y(v), y2: y(v),
    }));
    svg.appendChild(svgText(jeZarobok ? formatEurCele.format(v) : `${cisloDoPolicka(v)} h`, {
      class: 'graf-os-text', x: okraj.vlavo - 8, y: y(v) + 4, 'text-anchor': 'end',
    }));
  }

  // Pri úzkom grafe popíšeme iba každý druhý mesiac (vždy aj tento mesiac)
  const kazdyDruhy = slot < 30;
  udaje.forEach((u, i) => {
    const stred = okraj.vlavo + slot * i + slot / 2;
    const v = hodnota(u);
    const [rok, cisloMesiaca] = u.mesiac.split('-').map(Number);

    // Skupina pre jeden mesiac: dá sa na ňu kliknúť aj prejsť klávesom Tab
    const cast = svgPrvok('g', {
      class: 'graf-cast',
      tabindex: 0,
      role: 'button',
      'aria-label': `${formatMesiac(u.mesiac)}: ${formatEur.format(u.zarobok)}, ${formatTrvanie(u.minuty)}, ` +
        `${pocetZaznamov(u.pocet)}. Otvoriť záznamy mesiaca.`,
    });
    // Priehľadná plocha cez celú výšku – myšou ju trafíš ľahšie ako úzky stĺpec
    cast.appendChild(svgPrvok('rect', {
      class: 'graf-zasah', x: stred - slot / 2, y: okraj.hore, width: slot, height: plochaVyska, rx: 6,
    }));

    if (v > 0) {
      // Stĺpec: hore zaoblený (4 px), dole rovný na základnej čiare
      const vrch = y(v);
      const spodok = y(0);
      const r = Math.min(4, spodok - vrch, sirkaStlpca / 2);
      const x0 = stred - sirkaStlpca / 2;
      const x1 = stred + sirkaStlpca / 2;
      cast.appendChild(svgPrvok('path', {
        class: 'graf-stlpec',
        d: `M${x0},${spodok} V${vrch + r} Q${x0},${vrch} ${x0 + r},${vrch} ` +
          `H${x1 - r} Q${x1},${vrch} ${x1},${vrch + r} V${spodok} Z`,
      }));
    }

    // Popis mesiaca pod osou (pri januári aj rok, napr. "jan 27")
    if (!kazdyDruhy || (udaje.length - 1 - i) % 2 === 0) {
      const popis = KRATKE_MESIACE[cisloMesiaca - 1] + (cisloMesiaca === 1 ? ` ${String(rok).slice(2)}` : '');
      cast.appendChild(svgText(popis, {
        class: u.tento ? 'graf-os-text tento' : 'graf-os-text',
        x: stred, y: VYSKA_GRAFU - 8, 'text-anchor': 'middle',
      }));
    }

    // Číslo iba nad tento mesiac (ostatné sú v bubline a v tabuľke)
    if (u.tento && v > 0) {
      cast.appendChild(svgText(jeZarobok ? formatEurCele.format(u.zarobok) : formatTrvanie(u.minuty), {
        class: 'graf-hodnota', x: stred, y: y(v) - 7, 'text-anchor': 'middle',
      }));
    }

    const vyskaBubliny = v > 0 ? y(v) : y(0);
    cast.addEventListener('pointerenter', () => ukazBublinu(u, stred, vyskaBubliny));
    cast.addEventListener('focus', () => ukazBublinu(u, stred, vyskaBubliny));
    cast.addEventListener('pointerleave', skryBublinu);
    cast.addEventListener('blur', skryBublinu);
    cast.addEventListener('click', () => otvorMesiacZGrafu(u.mesiac));
    cast.addEventListener('keydown', (udalost) => {
      if (udalost.key === 'Enter' || udalost.key === ' ') {
        udalost.preventDefault(); // medzerník by inak posunul stránku
        otvorMesiacZGrafu(u.mesiac);
      }
    });
    svg.appendChild(cast);
  });

  grafObal.replaceChildren(svg, grafBublina);
}

// Prepínač Zárobok / Hodiny
prepinacGrafu.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button');
  if (!tlacidlo) {
    return;
  }
  grafMiera = tlacidlo.dataset.miera;
  for (const t of prepinacGrafu.children) {
    t.setAttribute('aria-pressed', t === tlacidlo ? 'true' : 'false');
  }
  vykresliGraf();
});

// Keď sa zmení šírka grafu (okno, otvorenie záložky Prehľad), nakreslíme ho znova.
// ResizeObserver = "pozorovateľ veľkosti", zavolá funkciu pri zmene rozmerov prvku.
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    if (grafObal.clientWidth > 0 && grafObal.clientWidth !== sirkaGrafu) {
      vykresliGraf();
    }
  }).observe(grafObal);
}

// ===== Projekty =====

const zoznamProjektov = document.getElementById('zoznam-projektov');
const ziadneProjekty = document.getElementById('ziadne-projekty');
const detailProjektu = document.getElementById('detail-projektu');
const uzavreteProjekty = document.getElementById('uzavrete-projekty');
const nadpisUzavretych = document.getElementById('nadpis-uzavretych');
const zoznamUzavretych = document.getElementById('zoznam-uzavretych');
const pridanieProjektu = document.getElementById('pridanie-projektu');
const formularProjektu = document.getElementById('formular-projektu');
const nadpisFormularaProjektu = document.getElementById('nadpis-formulara-projektu');
const poleProjektNazov = document.getElementById('projekt-nazov');
const poleProjektSadzba = document.getElementById('projekt-sadzba');
const projektSadzbyTlacidla = document.getElementById('projekt-sadzby-tlacidla');
const tlacidloUlozitProjekt = document.getElementById('tlacidlo-ulozit-projekt');
const tlacidloZrusitProjekt = document.getElementById('tlacidlo-zrusit-projekt');

// Skontroluje projekty z localStorage alebo zo zálohy.
// Vráti pole čistých projektov, alebo null, ak je v nich niečo zle.
function vycistiProjekty(zoznam) {
  if (!Array.isArray(zoznam)) {
    return null;
  }
  const vysledok = [];
  const pouziteId = new Set();
  for (const p of zoznam) {
    if (typeof p !== 'object' || p === null) {
      return null;
    }
    const nazov = typeof p.nazov === 'string' ? p.nazov.trim() : '';
    const jeSpravny =
      Number.isInteger(p.id) && p.id > 0 && !pouziteId.has(p.id) &&
      nazov !== '' && nazov.length <= MAX_DLZKA_NAZVU_PROJEKTU &&
      Number.isFinite(p.sadzba) && p.sadzba > 0 &&
      typeof p.uzavrety === 'boolean';
    if (!jeSpravny) {
      return null;
    }
    const cisty = { id: p.id, nazov: nazov, sadzba: p.sadzba, uzavrety: p.uzavrety };
    // Názov sadzby je nepovinný (iba ak bola sadzba vybraná z uložených)
    if (p.sadzbaNazov !== undefined) {
      if (typeof p.sadzbaNazov !== 'string' || p.sadzbaNazov.trim() === '' ||
          p.sadzbaNazov.length > MAX_DLZKA_NAZVU_SADZBY) {
        return null;
      }
      cisty.sadzbaNazov = p.sadzbaNazov.trim();
    }
    pouziteId.add(p.id);
    vysledok.push(cisty);
  }
  return vysledok;
}

function nastavProjekty(zoznam) {
  projekty = zoznam;
  posunPocitadloProjektov();
}

// Posunie počítadlo id za najväčšie id projektu aj za najväčšie projektId v záznamoch,
// aby nový projekt omylom "nezdedil" záznamy iného (napr. zo zálohy)
function posunPocitadloProjektov() {
  const maxProjekt = projekty.reduce((max, p) => Math.max(max, p.id), 0);
  const maxVZaznamoch = zaznamy.reduce(
    (max, z) => (z.projektId !== undefined ? Math.max(max, z.projektId) : max), 0
  );
  dalsieIdProjektu = Math.max(dalsieIdProjektu, maxProjekt + 1, maxVZaznamoch + 1);
}

function ulozProjekty() {
  ulozPolozku(KLUC_PROJEKTY, projekty);
}

// Projekt podľa id, alebo null
function najdiProjekt(id) {
  return projekty.find((p) => p.id === id) || null;
}

// Názov projektu na zobrazenie (záznam môže odkazovať na projekt, ktorý sa nenačítal)
function nazovProjektu(id) {
  const p = najdiProjekt(id);
  return p ? p.nazov : 'neznámy projekt';
}

// Všetky záznamy projektu (zo všetkých mesiacov)
function zaznamyProjektu(id) {
  return zaznamy.filter((z) => z.projektId === id);
}

// Súčet čísel za zoznam záznamov: { minuty, suma, pocet }
function suhrnZaznamov(zoznam) {
  return {
    minuty: zoznam.reduce((spolu, z) => spolu + minutyZaznamu(z), 0),
    suma: naCenty(zoznam.reduce((spolu, z) => spolu + z.suma, 0)),
    pocet: zoznam.length,
  };
}

// Rozbaľovací výber projektu vo formulári záznamu
function vykresliVyberProjektu() {
  const vybrany = poleProjekt.value;
  const upravovany = zaznamy.find((x) => x.id === upravovaneId);
  // new Option(text, hodnota) vloží text bezpečne ako text (nie ako HTML)
  poleProjekt.replaceChildren(new Option('Bez projektu', ''));
  for (const p of projekty) {
    // Uzavretý projekt ponúkneme iba pri úprave záznamu, ktorý k nemu patrí
    if (p.uzavrety && !(upravovany && upravovany.projektId === p.id)) {
      continue;
    }
    poleProjekt.appendChild(new Option(p.uzavrety ? `${p.nazov} (uzavretý)` : p.nazov, String(p.id)));
  }
  // Ak vybraný projekt v zozname ostal, ostane aj vybraný
  const jeVZozname = [...poleProjekt.options].some((o) => o.value === vybrany);
  poleProjekt.value = jeVZozname ? vybrany : '';
}

// Malé tlačidlo pri projekte
function vytvorTlacidloProjektu(text, akcia, p) {
  const tlacidlo = document.createElement('button');
  tlacidlo.type = 'button';
  tlacidlo.className = akcia === 'zmazat' ? 'tlacidlo-male nebezpecne' : 'tlacidlo-male';
  tlacidlo.textContent = text;
  tlacidlo.dataset.akcia = akcia;
  tlacidlo.dataset.id = p.id;
  tlacidlo.setAttribute('aria-label', `${text} – projekt ${p.nazov}`);
  if (akcia === 'start') {
    tlacidlo.prepend(ikona('play')); // ▶ Štart
  }
  pridajIkonu(tlacidlo, akcia);
  return tlacidlo;
}

// Jeden riadok v zozname projektov: názov, sadzba, súčet a tlačidlá
function polozkaProjektu(p) {
  const polozka = document.createElement('li');
  if (p.id === upravovanyProjektId || p.id === detailProjektuId) {
    polozka.className = 'upravovany';
  }

  const info = document.createElement('span');
  const nazov = document.createElement('strong');
  nazov.textContent = p.nazov;
  const sadzba = document.createElement('span');
  sadzba.textContent = ` – ${formatEur.format(p.sadzba)}/h`;
  info.append(nazov, sadzba);
  if (stopky !== null && stopky.projektId === p.id) {
    const stitok = document.createElement('span');
    stitok.className = 'stitok';
    stitok.textContent = jePauza() ? 'pauza' : 'beží';
    info.appendChild(stitok);
  }
  const suhrn = suhrnZaznamov(zaznamyProjektu(p.id));
  const sucet = document.createElement('span');
  sucet.className = 'projekt-sucet';
  sucet.textContent = suhrn.pocet === 0
    ? 'zatiaľ bez záznamov'
    : `${formatTrvanie(suhrn.minuty)} · ${formatEur.format(suhrn.suma)} · ${pocetZaznamov(suhrn.pocet)}`;
  info.appendChild(sucet);

  const akcie = document.createElement('span');
  akcie.className = 'akcie';
  if (!p.uzavrety) {
    const start = vytvorTlacidloProjektu('Štart', 'start', p);
    start.disabled = stopky !== null; // naraz bežia iba jedny stopky
    akcie.appendChild(start);
  }
  akcie.append(
    vytvorTlacidloProjektu(p.id === detailProjektuId ? 'Skryť detail' : 'Detail', 'detail', p),
    vytvorTlacidloProjektu('Upraviť', 'upravit', p),
    p.uzavrety
      ? vytvorTlacidloProjektu('Otvoriť znova', 'otvorit', p)
      : vytvorTlacidloProjektu('Uzavrieť', 'uzavriet', p),
    vytvorTlacidloProjektu('Zmazať', 'zmazat', p)
  );

  polozka.append(info, akcie);
  return polozka;
}

// Prekreslí celú kartu Projekty a stopky (aj výber projektu vo formulári)
function vykresliProjekty() {
  vykresliVyberProjektu();

  const otvorene = projekty.filter((p) => !p.uzavrety);
  const uzavrete = projekty.filter((p) => p.uzavrety);

  zoznamProjektov.replaceChildren(...otvorene.map(polozkaProjektu));
  ziadneProjekty.hidden = otvorene.length > 0;
  document.getElementById('ziadne-projekty-text').textContent = projekty.length === 0
    ? 'Zatiaľ nemáš žiadne projekty. Projekt je napr. zákazka pre jedného klienta – pri ňom spustíš stopky ' +
      'a appka ti spočíta, koľko času a peňazí na ňom máš.'
    : 'Nemáš žiadny rozpracovaný projekt. Uzavreté nájdeš nižšie.';

  uzavreteProjekty.hidden = uzavrete.length === 0;
  nadpisUzavretych.textContent = `Uzavreté projekty (${uzavrete.length})`;
  zoznamUzavretych.replaceChildren(...uzavrete.map(polozkaProjektu));

  vykresliDetailProjektu();
  vykresliStopky();
  vykresliRychlyStart();
}

// Detail projektu: súčty a tabuľka všetkých jeho záznamov (najnovšie hore)
function vykresliDetailProjektu() {
  const p = najdiProjekt(detailProjektuId);
  detailProjektu.replaceChildren();
  detailProjektu.hidden = p === null;
  if (p === null) {
    detailProjektuId = null;
    return;
  }

  const nadpis = document.createElement('h3');
  nadpis.textContent = `Detail: ${p.nazov}`;
  const jeho = zaznamyProjektu(p.id).sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id);
  const suhrn = suhrnZaznamov(jeho);
  const popis = document.createElement('p');
  popis.className = 'slabsi';
  if (jeho.length === 0) {
    popis.textContent = 'Projekt zatiaľ nemá žiadne záznamy. Klikni na Štart alebo ho vyber vo formulári záznamu.';
  } else {
    const najstarsi = jeho[jeho.length - 1].datum;
    const najnovsi = jeho[0].datum;
    popis.textContent = `Spolu ${formatTrvanie(suhrn.minuty)} · ${formatEur.format(suhrn.suma)} · ` +
      `${pocetZaznamov(suhrn.pocet)} · od ${formatDatum(najstarsi)} do ${formatDatum(najnovsi)}`;
  }
  detailProjektu.append(nadpis, popis);

  if (jeho.length > 0) {
    const obal = document.createElement('div');
    obal.className = 'tabulka-obal';
    const tabulkaDetailu = document.createElement('table');
    const hlavicka = document.createElement('thead');
    const riadokHlavicky = document.createElement('tr');
    for (const nazovStlpca of ['Dátum', 'Čas', 'Odpracované', 'Suma', 'Poznámka']) {
      riadokHlavicky.appendChild(bunkaVykazu('th', nazovStlpca));
    }
    // Nadpis stĺpca s tlačidlami je skrytý, ale čítačky obrazovky ho prečítajú
    const nadpisAkcie = document.createElement('span');
    nadpisAkcie.className = 'skryte';
    nadpisAkcie.textContent = 'Akcie';
    const bunkaNadpisuAkcie = document.createElement('th');
    bunkaNadpisuAkcie.appendChild(nadpisAkcie);
    riadokHlavicky.appendChild(bunkaNadpisuAkcie);
    hlavicka.appendChild(riadokHlavicky);

    const telo = document.createElement('tbody');
    for (const z of jeho) {
      const riadok = document.createElement('tr');
      pridajBunkuDatum(riadok, z.datum);
      pridajBunku(riadok, 'Čas', z.zaciatok !== undefined ? `${z.zaciatok} – ${z.koniec}` : '–', false);
      pridajBunku(riadok, 'Odpracované', formatTrvanie(minutyZaznamu(z)), true);
      pridajBunku(riadok, 'Suma', formatEur.format(z.suma), true);
      pridajBunku(riadok, 'Poznámka', z.zakazka || '–', false);
      const bunkaAkcie = document.createElement('td');
      bunkaAkcie.className = 'akcie';
      const upravit = vytvorTlacidlo('Upraviť', 'upravit-zaznam', z);
      bunkaAkcie.appendChild(upravit);
      riadok.appendChild(bunkaAkcie);
      telo.appendChild(riadok);
    }
    tabulkaDetailu.append(hlavicka, telo);
    obal.appendChild(tabulkaDetailu);
    detailProjektu.appendChild(obal);
  }

  const zavriet = document.createElement('button');
  zavriet.type = 'button';
  zavriet.className = 'tlacidlo-odkaz';
  zavriet.dataset.akcia = 'zavriet-detail';
  zavriet.textContent = 'Zavrieť detail';
  detailProjektu.appendChild(zavriet);
}

// Zobrazí chybové hlášky vo formulári projektu
function zobrazChybyProjektu(chyby) {
  const dvojice = [
    ['nazov', poleProjektNazov, 'chyba-projekt-nazov'],
    ['sadzba', poleProjektSadzba, 'chyba-projekt-sadzba'],
  ];
  for (const [kluc, pole, idChyby] of dvojice) {
    const hlaska = chyby[kluc] || '';
    document.getElementById(idChyby).textContent = hlaska;
    pole.setAttribute('aria-invalid', hlaska ? 'true' : 'false');
  }
  if (chyby.nazov) {
    poleProjektNazov.focus();
  } else if (chyby.sadzba) {
    poleProjektSadzba.focus();
  }
}

// Tlačidlá s uloženými sadzbami vo formulári projektu
function vykresliTlacidlaSadziebProjektu() {
  projektSadzbyTlacidla.replaceChildren();
  for (const s of sadzby) {
    const tlacidlo = document.createElement('button');
    tlacidlo.type = 'button';
    tlacidlo.className = 'tlacidlo-sadzba';
    tlacidlo.dataset.id = s.id;
    tlacidlo.textContent = `${s.nazov} – ${formatEur.format(s.suma)}`;
    const jeAktivna = aktivnaSadzbaProjektu !== null &&
      aktivnaSadzbaProjektu.nazov === s.nazov && aktivnaSadzbaProjektu.suma === s.suma;
    tlacidlo.setAttribute('aria-pressed', jeAktivna ? 'true' : 'false');
    projektSadzbyTlacidla.appendChild(tlacidlo);
  }
}

// Vyplní sadzbu vo formulári projektu (s = { nazov, suma } alebo null = prázdne políčko)
function vyberSadzbuProjektu(s) {
  poleProjektSadzba.value = s ? cisloDoPolicka(s.suma) : '';
  aktivnaSadzbaProjektu = s ? { nazov: s.nazov, suma: s.suma } : null;
  vykresliTlacidlaSadziebProjektu();
}

// Načíta projekt do formulára, aby sa dal upraviť
function zacniUpravuProjektu(id) {
  const p = najdiProjekt(id);
  if (!p) {
    return;
  }
  upravovanyProjektId = id;
  poleProjektNazov.value = p.nazov;
  poleProjektSadzba.value = cisloDoPolicka(p.sadzba);
  aktivnaSadzbaProjektu = p.sadzbaNazov ? { nazov: p.sadzbaNazov, suma: p.sadzba } : null;
  vykresliTlacidlaSadziebProjektu();
  zobrazChybyProjektu({});
  nadpisFormularaProjektu.textContent = 'Upraviť projekt';
  tlacidloUlozitProjekt.textContent = 'Uložiť zmeny';
  tlacidloZrusitProjekt.hidden = false;
  pridanieProjektu.open = true; // rozbalí formulár
  pridanieProjektu.scrollIntoView({ behavior: 'smooth', block: 'center' });
  poleProjektNazov.focus({ preventScroll: true });
  vykresliProjekty(); // zvýrazní upravovaný projekt
}

// Vráti formulár projektu do režimu "Nový projekt" (sadzba sa predvyplní predvolenou)
function ukonciUpravuProjektu() {
  upravovanyProjektId = null;
  poleProjektNazov.value = '';
  vyberSadzbuProjektu(sadzby.find((s) => s.id === predvolenaSadzbaId) || null);
  zobrazChybyProjektu({});
  nadpisFormularaProjektu.textContent = 'Nový projekt';
  tlacidloUlozitProjekt.textContent = 'Pridať projekt';
  tlacidloZrusitProjekt.hidden = true;
  vykresliProjekty();
}

// Zmaže projekt po potvrdení. Jeho záznamy ostanú, iba už nebudú patriť k projektu.
async function zmazProjekt(id) {
  const p = najdiProjekt(id);
  if (!p) {
    return;
  }
  if (stopky !== null && stopky.projektId === id) {
    zobrazSpravu('Pri tomto projekte bežia stopky. Najprv ich zastav alebo zahoď.', true);
    return;
  }
  const pocet = zaznamyProjektu(id).length;
  const potvrdene = await potvrd({
    nadpis: `Zmazať projekt „${p.nazov}“?`,
    text: (pocet > 0
      ? `Jeho záznamy (${pocet}) ostanú v prehľade aj v zárobku, iba už nebudú patriť k žiadnemu projektu.\n\n`
      : '') +
      'Tento krok sa nedá vrátiť. Ak projekt iba skončil, použi radšej „Uzavrieť“.',
    ano: 'Zmazať projekt',
    nebezpecne: true,
  });
  if (!potvrdene) {
    return;
  }
  for (const z of zaznamy) {
    if (z.projektId === id) {
      delete z.projektId; // delete odstráni z objektu celú vlastnosť
    }
  }
  ulozDoUloziska();
  projekty = projekty.filter((x) => x.id !== id);
  ulozProjekty();
  if (detailProjektuId === id) {
    detailProjektuId = null;
  }
  if (upravovanyProjektId === id) {
    ukonciUpravuProjektu();
  }
  vykresli();
  zobrazSpravu(`Projekt „${p.nazov}“ je zmazaný.`, false);
}

// Uzavrie projekt alebo ho otvorí znova (uzavretý = hotový, nedá sa preň spustiť stopky)
function nastavUzavrety(id, uzavrety) {
  const p = najdiProjekt(id);
  if (!p) {
    return;
  }
  if (uzavrety && stopky !== null && stopky.projektId === id) {
    zobrazSpravu('Pri tomto projekte bežia stopky. Najprv ich zastav.', true);
    return;
  }
  p.uzavrety = uzavrety;
  ulozProjekty();
  vykresliProjekty();
  zobrazSpravu(uzavrety ? `Projekt „${p.nazov}“ je uzavretý.` : `Projekt „${p.nazov}“ je znova otvorený.`, false);
}

// Uloženie projektu z formulára (nový alebo upravený)
formularProjektu.addEventListener('submit', (udalost) => {
  udalost.preventDefault();

  const nazov = poleProjektNazov.value.trim();
  const sadzba = precitajCislo(poleProjektSadzba.value);

  const chyby = {};
  if (nazov === '') {
    chyby.nazov = 'Napíš názov projektu, napr. Identita – Kaviareň Mlyn.';
  } else if (projekty.some((p) => p.id !== upravovanyProjektId && p.nazov.toLowerCase() === nazov.toLowerCase())) {
    chyby.nazov = 'Projekt s týmto názvom už máš.';
  }
  if (!(sadzba > 0)) {
    chyby.sadzba = 'Sadzba musí byť kladné číslo v eurách, napr. 25 alebo 30,50.';
  }
  zobrazChybyProjektu(chyby);
  if (Object.keys(chyby).length > 0) {
    return;
  }

  // Názov sadzby uložíme, iba ak si ju vybral kliknutím a sumu potom neprepísal
  const sadzbaNazov = aktivnaSadzbaProjektu !== null && aktivnaSadzbaProjektu.suma === sadzba
    ? aktivnaSadzbaProjektu.nazov
    : '';

  if (upravovanyProjektId !== null) {
    const p = najdiProjekt(upravovanyProjektId);
    if (p) {
      p.nazov = nazov;
      p.sadzba = sadzba;
      if (sadzbaNazov) {
        p.sadzbaNazov = sadzbaNazov;
      } else {
        delete p.sadzbaNazov;
      }
    }
    zobrazSpravu(`Projekt „${nazov}“ je upravený.`, false);
  } else {
    const novy = { id: dalsieIdProjektu++, nazov: nazov, sadzba: sadzba, uzavrety: false };
    if (sadzbaNazov) {
      novy.sadzbaNazov = sadzbaNazov;
    }
    projekty.push(novy);
    zobrazSpravu(`Projekt „${nazov}“ je pridaný. Klikni pri ňom na Štart.`, false);
  }

  ulozProjekty();
  ukonciUpravuProjektu();
  pridanieProjektu.open = false; // formulár sa zbalí
  vykresli();
});

tlacidloZrusitProjekt.addEventListener('click', ukonciUpravuProjektu);

// Kliknutie na sadzbu vo formulári projektu vyplní sumu
projektSadzbyTlacidla.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button');
  const s = tlacidlo ? sadzby.find((x) => x.id === Number(tlacidlo.dataset.id)) : null;
  if (s) {
    vyberSadzbuProjektu(s);
  }
});

// Keď sumu projektu prepíšeš ručne, vybraná sadzba sa "odznačí"
poleProjektSadzba.addEventListener('input', () => {
  if (aktivnaSadzbaProjektu !== null && precitajCislo(poleProjektSadzba.value) !== aktivnaSadzbaProjektu.suma) {
    aktivnaSadzbaProjektu = null;
    vykresliTlacidlaSadziebProjektu();
  }
});

// Kliknutie na tlačidlá pri projektoch (rozpracované aj uzavreté)
function klikVZoznameProjektov(udalost) {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo) {
    return;
  }
  const id = Number(tlacidlo.dataset.id);
  const akcia = tlacidlo.dataset.akcia;
  if (akcia === 'start') {
    spustiStopky(id);
  } else if (akcia === 'detail') {
    detailProjektuId = detailProjektuId === id ? null : id; // druhý klik detail zavrie
    vykresliProjekty();
  } else if (akcia === 'upravit') {
    zacniUpravuProjektu(id);
  } else if (akcia === 'uzavriet') {
    nastavUzavrety(id, true);
  } else if (akcia === 'otvorit') {
    nastavUzavrety(id, false);
  } else if (akcia === 'zmazat') {
    zmazProjekt(id);
  }
}
zoznamProjektov.addEventListener('click', klikVZoznameProjektov);
zoznamUzavretych.addEventListener('click', klikVZoznameProjektov);

// Kliknutie v detaile projektu: Upraviť záznam alebo Zavrieť detail
detailProjektu.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo) {
    return;
  }
  if (tlacidlo.dataset.akcia === 'zavriet-detail') {
    detailProjektuId = null;
    vykresliProjekty();
  } else if (tlacidlo.dataset.akcia === 'upravit-zaznam') {
    const z = zaznamy.find((x) => x.id === Number(tlacidlo.dataset.id));
    if (z) {
      vybranyMesiac = z.datum.slice(0, 7); // prehľad prepneme na mesiac záznamu
      vykresli();
      zacniUpravu(z.id);
    }
  }
});

// Tlačidlá "+ Nový projekt" v prázdnych stavoch: otvoria záložku Projekty a formulár nového projektu
document.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo || tlacidlo.dataset.akcia !== 'novy-projekt') {
    return;
  }
  prepniZalozku('projekty');
  pridanieProjektu.open = true;
  pridanieProjektu.scrollIntoView({ behavior: 'smooth', block: 'center' });
  poleProjektNazov.focus({ preventScroll: true });
});

// Výber projektu vo formulári záznamu vyplní aj sadzbu projektu
poleProjekt.addEventListener('change', () => {
  const p = najdiProjekt(Number(poleProjekt.value));
  if (!p) {
    return; // "Bez projektu" sadzbu nemení
  }
  polia.sadzba.value = cisloDoPolicka(p.sadzba);
  aktivnaSadzba = p.sadzbaNazov ? { nazov: p.sadzbaNazov, suma: p.sadzba } : null;
  document.getElementById('chyba-sadzba').textContent = '';
  polia.sadzba.setAttribute('aria-invalid', 'false');
  vykresliTlacidlaSadzieb();
});

// ===== Stopky =====

const blokStopiek = document.getElementById('stopky');
const stopkyProjekt = document.getElementById('stopky-projekt');
const stopkyCas = document.getElementById('stopky-cas');
const stopkyInfo = document.getElementById('stopky-info');
const stopkyPoznamka = document.getElementById('stopky-poznamka');
const stopkyPauza = document.getElementById('stopky-pauza');
const stopkyStop = document.getElementById('stopky-stop');
const stopkyZahodit = document.getElementById('stopky-zahodit');
const stopkyStav = document.getElementById('stopky-stav');
const stopkyPauzaText = document.getElementById('stopky-pauza-text');
const stopkyPauzaIkona = document.getElementById('stopky-pauza-ikona');
// Malé stopky v bočnom paneli (vidieť ich z každej záložky)
const panelStopky = document.getElementById('panel-stopky');
const panelStopkyText = document.getElementById('panel-stopky-text');

// Pôvodný názov stránky (počas behu stopiek je v ňom čas)
const NAZOV_STRANKY = document.title;

// Skontroluje uložené stopky. Vráti čisté stopky, alebo null, ak je v nich niečo zle.
function vycistiStopky(data) {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.pauzy) ||
      !Number.isInteger(data.projektId) || data.projektId <= 0 ||
      !Number.isFinite(data.start) || data.start <= 0) {
    return null;
  }
  const pauzy = [];
  let predchadzajuci = data.start; // pauzy musia ísť po sebe, nie skôr ako štart
  for (let i = 0; i < data.pauzy.length; i++) {
    const pauza = data.pauzy[i];
    if (typeof pauza !== 'object' || pauza === null ||
        !Number.isFinite(pauza.od) || pauza.od < predchadzajuci) {
      return null;
    }
    if (pauza.do === null) {
      // Neskončená pauza môže byť iba posledná (práve teraz je pauza)
      if (i !== data.pauzy.length - 1) {
        return null;
      }
    } else if (!Number.isFinite(pauza.do) || pauza.do < pauza.od) {
      return null;
    }
    pauzy.push({ od: pauza.od, do: pauza.do });
    predchadzajuci = pauza.do === null ? pauza.od : pauza.do;
  }
  const poznamka = typeof data.poznamka === 'string' ? data.poznamka.slice(0, 100) : '';
  return { projektId: data.projektId, start: data.start, pauzy: pauzy, poznamka: poznamka };
}

// Uloží stopky. Keď nebežia, kľúč z localStorage odstránime.
function ulozStopky() {
  if (stopky !== null) {
    ulozPolozku(KLUC_STOPKY, stopky);
    return;
  }
  if (!ukladanieZapnute) {
    return;
  }
  try {
    localStorage.removeItem(KLUC_STOPKY);
  } catch {
    // nevadí – pri ďalšom štarte sa prepíšu
  }
}

function nastavStopky(nove) {
  stopky = nove;
  ulozStopky();
}

// Je práve pauza? (posledná pauza ešte neskončila)
function jePauza() {
  return stopky !== null && stopky.pauzy.length > 0 && stopky.pauzy[stopky.pauzy.length - 1].do === null;
}

// Koniec práce: počas pauzy okamih, keď pauza začala; inak "teraz"
function koniecPrace(teraz) {
  return jePauza() ? stopky.pauzy[stopky.pauzy.length - 1].od : teraz;
}

// Koľko milisekúnd trvali skončené pauzy
function msPauz() {
  return stopky.pauzy.reduce((spolu, p) => (p.do === null ? spolu : spolu + p.do - p.od), 0);
}

// Koľko milisekúnd sa zatiaľ pracovalo (bez páuz)
function msPrace(teraz) {
  return Math.max(0, koniecPrace(teraz) - stopky.start - msPauz());
}

// Text bežiaceho času, napr. "1 h 25 min 07 s" alebo "4 min 09 s"
function textStopiek(ms) {
  const sekundy = Math.floor(ms / 1000);
  const h = Math.floor(sekundy / 3600);
  const m = Math.floor(sekundy / 60) % 60;
  const s = String(sekundy % 60).padStart(2, '0');
  return h > 0 ? `${h} h ${m} min ${s} s` : `${m} min ${s} s`;
}

// Ukáže alebo skryje rámik stopiek a nastaví tlačidlá
function vykresliStopky() {
  blokStopiek.hidden = stopky === null;
  panelStopky.hidden = stopky === null;
  if (stopky === null) {
    document.title = NAZOV_STRANKY;
    return;
  }
  stopkyProjekt.textContent = nazovProjektu(stopky.projektId);
  stopkyStav.textContent = jePauza() ? 'Pauza' : 'Beží';
  // Pri pauze bodka "nedýcha" (karta aj bočný panel); názov projektu v paneli sa ukáže po prejdení myšou
  blokStopiek.classList.toggle('pauza', jePauza());
  panelStopky.classList.toggle('pauza', jePauza());
  panelStopky.title = `Stopky – ${nazovProjektu(stopky.projektId)}`;
  stopkyPauzaText.textContent = jePauza() ? 'Pokračovať' : 'Pauza';
  stopkyPauzaIkona.setAttribute('href', jePauza() ? '#i-play' : '#i-pauza');
  // Poznámku neprepisujeme, kým do nej píšeš
  if (document.activeElement !== stopkyPoznamka) {
    stopkyPoznamka.value = stopky.poznamka;
  }
  aktualizujCasStopiek();
}

// Prepíše bežiaci čas, sumu a názov karty prehliadača (volá sa každú sekundu)
function aktualizujCasStopiek() {
  if (stopky === null) {
    return;
  }
  const teraz = Date.now();
  const ms = msPrace(teraz);
  const minuty = Math.floor(ms / 60000);
  const p = najdiProjekt(stopky.projektId);
  const suma = p ? naCenty((minuty / 60) * p.sadzba) : 0;

  stopkyCas.textContent = textStopiek(ms);
  panelStopkyText.textContent = (jePauza() ? 'Pauza · ' : '') + textStopiek(ms);
  // Ak stopky bežia od iného dňa, pri začiatku ukážeme aj dátum
  const datumStartu = datumZCasu(stopky.start);
  let info = `začiatok ${hodinaZCasu(stopky.start)}` +
    (datumStartu !== dnesnyDatum() ? ` (${formatDatum(datumStartu)})` : '');
  const minutyPauz = Math.round(msPauz() / 60000);
  if (minutyPauz > 0) {
    info += ` · pauzy ${formatTrvanie(minutyPauz)}`;
  }
  info += ` · zatiaľ ${formatEur.format(suma)}`;
  stopkyInfo.textContent = (jePauza() ? 'Pauza · ' : '') + info;

  // Čas aj v názve karty prehliadača (počas tlače výkazu ho nemeníme – je to názov PDF)
  if (!document.body.classList.contains('tlac-vykazu')) {
    const casText = minuty > 0 ? formatTrvanie(minuty) : '0 min';
    document.title = `${jePauza() ? '⏸' : '⏱'} ${casText} – ${NAZOV_STRANKY}`;
  }
}

// Štart stopiek pri projekte
function spustiStopky(id) {
  if (stopky !== null) {
    zobrazSpravu('Stopky už bežia. Najprv ich zastav.', true);
    return;
  }
  const p = najdiProjekt(id);
  if (!p || p.uzavrety) {
    return;
  }
  nastavStopky({ projektId: id, start: Date.now(), pauzy: [], poznamka: '' });
  stopkyPoznamka.value = '';
  vykresliProjekty();
  prepniZalozku('prehlad'); // bežiace stopky sú v Prehľade
  zobrazSpravu(`Stopky bežia – ${p.nazov}.`, false);
}

// Stop: z bežiacich stopiek vytvorí záznam
async function zastavStopky() {
  if (stopky === null) {
    return;
  }
  const p = najdiProjekt(stopky.projektId);
  if (!p) {
    nastavStopky(null);
    vykresliProjekty();
    zobrazSpravu('Projekt týchto stopiek sa nenašiel, záznam sa neuložil.', true);
    return;
  }
  const teraz = Date.now();
  const koniec = koniecPrace(teraz);
  const minutyPrace = Math.round(msPrace(teraz) / 60000);

  if (minutyPrace < 1) {
    const zahodit = await potvrd({
      nadpis: 'Zahodiť stopky?',
      text: 'Stopky bežali menej ako minútu, takže záznam by bol prázdny.',
      ano: 'Zahodiť',
      nie: 'Nechať bežať',
      nebezpecne: true,
    });
    if (zahodit && stopky !== null) {
      nastavStopky(null);
      vykresliProjekty();
      zobrazSpravu('Stopky sú zahodené.', false);
    }
    return;
  }
  if (minutyPrace > DLHE_STOPKY_HODINY * 60) {
    const ulozit = await potvrd({
      nadpis: 'Nezabudol si vypnúť stopky?',
      text: `Stopky bežia ${formatTrvanie(minutyPrace)}. Ak je to správne, ulož záznam – ` +
        'čas môžeš neskôr opraviť cez Upraviť. Inak stopky bežia ďalej.',
      ano: 'Uložiť záznam',
      nie: 'Ešte nie',
      ikona: 'pozor',
    });
    // Kým bolo okno otvorené, stopky mohol niekto zastaviť v inej karte prehliadača
    if (!ulozit || stopky === null) {
      return;
    }
  }

  // Spoločné údaje záznamu: dátum je deň štartu, sadzba a projekt podľa projektu
  const udaje = {
    datum: datumZCasu(stopky.start),
    zakazka: stopky.poznamka.trim(),
    sadzba: p.sadzba,
    sadzbaNazov: p.sadzbaNazov || '',
    projektId: p.id,
  };

  let zaznam = null;
  const cezPolnoc = datumZCasu(koniec) !== udaje.datum;
  if (!cezPolnoc) {
    // V ten istý deň: záznam od – do, pauzy spolu sa zapíšu ako prerušenie
    const minutyPauz = Math.round(msPauz() / 60000);
    const casy = {
      zaciatok: hodinaZCasu(stopky.start),
      koniec: hodinaZCasu(koniec),
      obed: false,
      prerusenie: minutyPauz > 0,
      prerusenieRezim: 'hodiny',
      prerusenieHodiny: minutyPauz / 60,
    };
    if (Object.keys(skontrolujCasy(casy)).length === 0) {
      zaznam = vytvorZaznam(dalsieId, { ...udaje, rezim: 'cas', ...casy });
    }
  }
  if (zaznam === null) {
    // Cez polnoc (alebo keď sa časy po zaokrúhlení na minúty nedajú zapísať): uložíme počet hodín
    zaznam = vytvorZaznam(dalsieId, { ...udaje, rezim: 'hodiny', hodiny: minutyPrace / 60 });
  }
  dalsieId++;
  zaznamy.push(zaznam);
  ulozDoUloziska();
  nastavStopky(null);

  vybranyMesiac = zaznam.datum.slice(0, 7); // prehľad prepneme na mesiac záznamu
  vykresli();
  zobrazSpravu(
    `Záznam je uložený: ${p.nazov}, ${formatTrvanie(minutyZaznamu(zaznam))}, ${formatEur.format(zaznam.suma)}.` +
    (cezPolnoc ? ' Práca išla cez polnoc, preto je uložená ako počet hodín.' : ''),
    false
  );
}

// Pauza / Pokračovať
stopkyPauza.addEventListener('click', () => {
  if (stopky === null) {
    return;
  }
  if (jePauza()) {
    stopky.pauzy[stopky.pauzy.length - 1].do = Date.now();
  } else {
    stopky.pauzy.push({ od: Date.now(), do: null });
  }
  ulozStopky();
  vykresliProjekty(); // štítok "beží" / "pauza" pri projekte
});

stopkyStop.addEventListener('click', zastavStopky);

stopkyZahodit.addEventListener('click', async () => {
  if (stopky === null) {
    return;
  }
  const potvrdene = await potvrd({
    nadpis: 'Zahodiť stopky?',
    text: `Odmeraný čas (${textStopiek(msPrace(Date.now()))}) sa neuloží. Tento krok sa nedá vrátiť.`,
    ano: 'Zahodiť',
    nebezpecne: true,
  });
  if (!potvrdene || stopky === null) {
    return;
  }
  nastavStopky(null);
  vykresliProjekty();
  zobrazSpravu('Stopky sú zahodené.', false);
});

// Poznámku k bežiacim stopkám ukladáme priebežne, aby neostala stratená po zatvorení appky
stopkyPoznamka.addEventListener('input', () => {
  if (stopky !== null) {
    stopky.poznamka = stopkyPoznamka.value;
    ulozStopky();
  }
});

// Každú sekundu prepíšeme bežiaci čas
setInterval(aktualizujCasStopiek, 1000);

// Strážca dňa: keď appka ostane otvorená cez polnoc (alebo počítač spal), všetko, čo závisí
// od dnešného dátumu ("Dnes", dlaždice za tento mesiac, graf, dátum vo formulári), sa prekreslí samo.
let denVykreslenia = dnesnyDatum();

function skontrolujNovyDen() {
  const dnes = dnesnyDatum();
  if (dnes === denVykreslenia) {
    return;
  }
  // Nový záznam mal predvolene starý "dnes" – posunieme ho (pri úprave záznamu dátum nemeníme)
  if (upravovaneId === null && polia.datum.value === denVykreslenia) {
    polia.datum.value = dnes;
  }
  denVykreslenia = dnes;
  vykresli();
}

setInterval(skontrolujNovyDen, 60000); // raz za minútu
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    skontrolujNovyDen(); // hneď po návrate do karty (časovače v skrytej karte idú pomalšie)
  }
});

// Ak je appka otvorená vo viacerých kartách prehliadača, zmeny z inej karty sa prenesú aj sem.
// (Udalosť "storage" príde iba z INEJ karty.) Inak by táto karta pri ďalšom uložení prepísala
// napr. záznam, ktorý vznikol Stopom v inej karte.
function precitajZoZmeny(text, vycisti) {
  try {
    return text === null ? null : vycisti(JSON.parse(text));
  } catch {
    return null;
  }
}

window.addEventListener('storage', (udalost) => {
  if (udalost.key === KLUC_STOPKY) {
    stopky = precitajZoZmeny(udalost.newValue, vycistiStopky);
  } else if (udalost.key === KLUC_ULOZISKA) {
    const nove = precitajZoZmeny(udalost.newValue, vycistiZoznam);
    if (nove === null) {
      return;
    }
    nastavZaznamy(nove);
    posunPocitadloProjektov();
    if (upravovaneId !== null && !zaznamy.some((x) => x.id === upravovaneId)) {
      ukonciUpravu();
    }
  } else if (udalost.key === KLUC_PROJEKTY) {
    const nove = precitajZoZmeny(udalost.newValue, vycistiProjekty);
    if (nove === null) {
      return;
    }
    nastavProjekty(nove);
  } else {
    return;
  }
  vykresli();
});

// ===== Sadzby (Nastavenia) =====

// Skontroluje sadzby z localStorage alebo zo zálohy.
// Vráti { zoznam, predvolenaId }, alebo null, ak je v nich niečo zle.
function vycistiSadzby(data) {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.zoznam)) {
    return null;
  }
  const zoznam = [];
  const pouziteId = new Set();
  for (const s of data.zoznam) {
    if (typeof s !== 'object' || s === null) {
      return null;
    }
    const nazov = typeof s.nazov === 'string' ? s.nazov.trim() : '';
    const jeSpravna =
      Number.isInteger(s.id) && s.id > 0 && !pouziteId.has(s.id) &&
      nazov !== '' && nazov.length <= MAX_DLZKA_NAZVU_SADZBY &&
      Number.isFinite(s.suma) && s.suma > 0;
    if (!jeSpravna) {
      return null;
    }
    pouziteId.add(s.id);
    zoznam.push({ id: s.id, nazov: nazov, suma: s.suma });
  }
  // Predvolená musí byť jedna zo zoznamu; inak vezmeme prvú (alebo žiadnu, ak je zoznam prázdny)
  let predvolenaId = data.predvolenaId;
  if (!pouziteId.has(predvolenaId)) {
    predvolenaId = zoznam.length > 0 ? zoznam[0].id : null;
  }
  return { zoznam: zoznam, predvolenaId: predvolenaId };
}

// Nastaví nové sadzby a posunie počítadlo id za najväčšie použité
function nastavSadzby(data) {
  sadzby = data.zoznam;
  predvolenaSadzbaId = data.predvolenaId;
  dalsieIdSadzby = sadzby.reduce((max, s) => Math.max(max, s.id), 0) + 1;
}

function ulozSadzby() {
  ulozPolozku(KLUC_SADZBY, { zoznam: sadzby, predvolenaId: predvolenaSadzbaId });
}

// Vyplní políčko sadzby vybranou sadzbou a zapamätá si jej názov
function vyberSadzbu(s) {
  polia.sadzba.value = cisloDoPolicka(s.suma);
  aktivnaSadzba = { nazov: s.nazov, suma: s.suma };
  // Stará chybová hláška pri sadzbe už neplatí
  document.getElementById('chyba-sadzba').textContent = '';
  polia.sadzba.setAttribute('aria-invalid', 'false');
  vykresliTlacidlaSadzieb();
}

// Vyplní políčko sadzby predvolenou sadzbou (ak nejakú máš)
function vyplnPredvolenuSadzbu() {
  const predvolena = sadzby.find((s) => s.id === predvolenaSadzbaId);
  if (predvolena) {
    vyberSadzbu(predvolena);
  }
}

// Názov sadzby, ktorý sa uloží k záznamu.
// Ak si sumu po kliknutí na sadzbu prepísal ručne, názov sa neuloží (už by nesedel).
function nazovSadzbyPreZaznam(suma) {
  if (aktivnaSadzba !== null && aktivnaSadzba.suma === suma) {
    return aktivnaSadzba.nazov;
  }
  return '';
}

// Tlačidlá s uloženými sadzbami pod políčkom sadzby
function vykresliTlacidlaSadzieb() {
  sadzbyTlacidla.replaceChildren();

  if (sadzby.length === 0) {
    // Zatiaľ žiadne sadzby – ponúkneme odkaz do Nastavení
    const odkaz = document.createElement('button');
    odkaz.type = 'button';
    odkaz.className = 'tlacidlo-odkaz';
    odkaz.dataset.akcia = 'otvorit-nastavenia';
    odkaz.textContent = '+ Uložiť sadzby na kliknutie';
    sadzbyTlacidla.appendChild(odkaz);
    return;
  }

  for (const s of sadzby) {
    const tlacidlo = document.createElement('button');
    tlacidlo.type = 'button';
    tlacidlo.className = 'tlacidlo-sadzba';
    tlacidlo.dataset.id = s.id;
    tlacidlo.textContent = `${s.nazov} – ${formatEur.format(s.suma)}`;
    // aria-pressed="true" = toto tlačidlo je práve vybrané (CSS ho zvýrazní)
    const jeAktivna = aktivnaSadzba !== null &&
      aktivnaSadzba.nazov === s.nazov && aktivnaSadzba.suma === s.suma;
    tlacidlo.setAttribute('aria-pressed', jeAktivna ? 'true' : 'false');
    sadzbyTlacidla.appendChild(tlacidlo);
  }
}

// Zoznam sadzieb v Nastaveniach
function vykresliZoznamSadzieb() {
  zoznamSadzieb.replaceChildren();
  ziadneSadzby.hidden = sadzby.length > 0;

  for (const s of sadzby) {
    const polozka = document.createElement('li');
    if (s.id === upravovanaSadzbaId) {
      polozka.className = 'upravovany';
    }

    const info = document.createElement('span');
    const nazov = document.createElement('strong');
    nazov.textContent = s.nazov;
    const suma = document.createElement('span');
    suma.textContent = ` – ${formatEur.format(s.suma)}`;
    info.append(nazov, suma);
    if (s.id === predvolenaSadzbaId) {
      const stitok = document.createElement('span');
      stitok.className = 'stitok';
      stitok.textContent = 'predvolená';
      info.appendChild(stitok);
    }

    const akcie = document.createElement('span');
    akcie.className = 'akcie';
    if (s.id !== predvolenaSadzbaId) {
      akcie.appendChild(vytvorTlacidloSadzby('Nastaviť ako predvolenú', 'predvolena', s));
    }
    akcie.append(vytvorTlacidloSadzby('Upraviť', 'upravit', s), vytvorTlacidloSadzby('Zmazať', 'zmazat', s));

    polozka.append(info, akcie);
    zoznamSadzieb.appendChild(polozka);
  }
}

// Malé tlačidlo pri sadzbe v Nastaveniach
function vytvorTlacidloSadzby(text, akcia, s) {
  const tlacidlo = document.createElement('button');
  tlacidlo.type = 'button';
  tlacidlo.className = akcia === 'zmazat' ? 'tlacidlo-male nebezpecne' : 'tlacidlo-male';
  tlacidlo.textContent = text;
  tlacidlo.dataset.akcia = akcia;
  tlacidlo.dataset.id = s.id;
  tlacidlo.setAttribute('aria-label', `${text} – sadzba ${s.nazov}`);
  pridajIkonu(tlacidlo, akcia);
  return tlacidlo;
}

function vykresliSadzby() {
  vykresliZoznamSadzieb();
  vykresliTlacidlaSadzieb();
  vykresliTlacidlaSadziebProjektu();
}

// Otvorí záložku Nastavenia a presunie sa k sadzbám
function otvorNastavenia() {
  prepniZalozku('nastavenia');
  nastavenia.scrollIntoView({ behavior: 'smooth', block: 'start' });
  poleNazovSadzby.focus({ preventScroll: true });
}

// Zobrazí chybové hlášky vo formulári sadzby
function zobrazChybySadzby(chyby) {
  const dvojice = [
    ['nazov', poleNazovSadzby, 'chyba-sadzba-nazov'],
    ['suma', poleSumaSadzby, 'chyba-sadzba-suma'],
  ];
  for (const [kluc, pole, idChyby] of dvojice) {
    const hlaska = chyby[kluc] || '';
    document.getElementById(idChyby).textContent = hlaska;
    pole.setAttribute('aria-invalid', hlaska ? 'true' : 'false');
  }
  if (chyby.nazov) {
    poleNazovSadzby.focus();
  } else if (chyby.suma) {
    poleSumaSadzby.focus();
  }
}

// Načíta sadzbu do formulára v Nastaveniach, aby sa dala upraviť
function zacniUpravuSadzby(id) {
  const s = sadzby.find((x) => x.id === id);
  if (!s) {
    return;
  }
  upravovanaSadzbaId = id;
  poleNazovSadzby.value = s.nazov;
  poleSumaSadzby.value = cisloDoPolicka(s.suma);
  zobrazChybySadzby({});
  nadpisSadzby.textContent = 'Upraviť sadzbu';
  tlacidloUlozitSadzbu.textContent = 'Uložiť zmeny';
  tlacidloZrusitSadzbu.hidden = false;
  poleNazovSadzby.focus();
  vykresliZoznamSadzieb();
}

// Vráti formulár sadzby do režimu "Nová sadzba"
function ukonciUpravuSadzby() {
  upravovanaSadzbaId = null;
  poleNazovSadzby.value = '';
  poleSumaSadzby.value = '';
  zobrazChybySadzby({});
  nadpisSadzby.textContent = 'Nová sadzba';
  tlacidloUlozitSadzbu.textContent = 'Pridať sadzbu';
  tlacidloZrusitSadzbu.hidden = true;
  vykresliZoznamSadzieb();
}

// Zmaže sadzbu po potvrdení
async function zmazSadzbu(id) {
  const s = sadzby.find((x) => x.id === id);
  if (!s) {
    return;
  }
  const potvrdene = await potvrd({
    nadpis: 'Zmazať sadzbu?',
    text: `Sadzba „${s.nazov}“ (${formatEur.format(s.suma)}) sa zmaže. ` +
      'Záznamy, pri ktorých je už uložená, sa nezmenia.',
    ano: 'Zmazať',
    nebezpecne: true,
  });
  if (!potvrdene) {
    return;
  }
  sadzby = sadzby.filter((x) => x.id !== id);
  if (upravovanaSadzbaId === id) {
    ukonciUpravuSadzby();
  }
  // Ak si zmazal predvolenú, predvolenou sa stane prvá zo zvyšných
  if (predvolenaSadzbaId === id) {
    predvolenaSadzbaId = sadzby.length > 0 ? sadzby[0].id : null;
  }
  ulozSadzby();
  vykresliSadzby();
  zobrazSpravu(`Sadzba „${s.nazov}“ je zmazaná.`, false);
}

// Uloženie sadzby z formulára v Nastaveniach (nová alebo upravená)
formularSadzby.addEventListener('submit', (udalost) => {
  udalost.preventDefault();

  const nazov = poleNazovSadzby.value.trim();
  const suma = precitajCislo(poleSumaSadzby.value);

  const chyby = {};
  if (nazov === '') {
    chyby.nazov = 'Napíš názov sadzby, napr. Víkend.';
  } else if (sadzby.some((s) => s.id !== upravovanaSadzbaId && s.nazov.toLowerCase() === nazov.toLowerCase())) {
    chyby.nazov = 'Sadzbu s týmto názvom už máš.';
  }
  if (!(suma > 0)) {
    chyby.suma = 'Suma musí byť kladné číslo v eurách, napr. 25 alebo 30,50.';
  }
  zobrazChybySadzby(chyby);
  if (Object.keys(chyby).length > 0) {
    return;
  }

  if (upravovanaSadzbaId !== null) {
    const s = sadzby.find((x) => x.id === upravovanaSadzbaId);
    if (s) {
      s.nazov = nazov;
      s.suma = suma;
    }
    ukonciUpravuSadzby();
    zobrazSpravu(`Sadzba „${nazov}“ je upravená.`, false);
  } else {
    const nova = { id: dalsieIdSadzby++, nazov: nazov, suma: suma };
    sadzby.push(nova);
    // Prvá sadzba sa stane predvolenou; ak je políčko sadzby prázdne, hneď ho vyplníme
    if (predvolenaSadzbaId === null) {
      predvolenaSadzbaId = nova.id;
      if (polia.sadzba.value.trim() === '') {
        vyberSadzbu(nova);
      }
    }
    poleNazovSadzby.value = '';
    poleSumaSadzby.value = '';
    poleNazovSadzby.focus();
    zobrazSpravu(`Sadzba „${nazov}“ je pridaná.`, false);
  }

  ulozSadzby();
  vykresliSadzby();
});

tlacidloZrusitSadzbu.addEventListener('click', ukonciUpravuSadzby);

// Kliknutie na tlačidlá pri sadzbách v Nastaveniach
zoznamSadzieb.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button[data-akcia]');
  if (!tlacidlo) {
    return;
  }
  const id = Number(tlacidlo.dataset.id);
  if (tlacidlo.dataset.akcia === 'predvolena') {
    predvolenaSadzbaId = id;
    ulozSadzby();
    vykresliSadzby();
    const s = sadzby.find((x) => x.id === id);
    zobrazSpravu(`Predvolená sadzba je teraz „${s.nazov}“.`, false);
  } else if (tlacidlo.dataset.akcia === 'upravit') {
    zacniUpravuSadzby(id);
  } else if (tlacidlo.dataset.akcia === 'zmazat') {
    zmazSadzbu(id);
  }
});

// Kliknutie na sadzbu pod políčkom sadzby vyplní sumu
sadzbyTlacidla.addEventListener('click', (udalost) => {
  const tlacidlo = udalost.target.closest('button');
  if (!tlacidlo) {
    return;
  }
  if (tlacidlo.dataset.akcia === 'otvorit-nastavenia') {
    otvorNastavenia();
    return;
  }
  const s = sadzby.find((x) => x.id === Number(tlacidlo.dataset.id));
  if (s) {
    vyberSadzbu(s);
  }
});

// Keď sumu prepíšeš ručne, vybraná sadzba sa "odznačí" (a jej názov sa k záznamu neuloží)
polia.sadzba.addEventListener('input', () => {
  if (aktivnaSadzba !== null && precitajCislo(polia.sadzba.value) !== aktivnaSadzba.suma) {
    aktivnaSadzba = null;
    vykresliTlacidlaSadzieb();
  }
});

// ===== Štart =====

const ulozeneZaznamy = nacitajPolozku(KLUC_ULOZISKA, vycistiZoznam, 'záznamy');
if (ulozeneZaznamy !== null) {
  nastavZaznamy(ulozeneZaznamy);
}
const ulozeneSadzby = nacitajPolozku(KLUC_SADZBY, vycistiSadzby, 'sadzby');
if (ulozeneSadzby !== null) {
  nastavSadzby(ulozeneSadzby);
}
const ulozeneJednorazove = nacitajPolozku(KLUC_JEDNORAZOVE, vycistiJednorazove, 'jednorazové položky');
if (ulozeneJednorazove !== null) {
  nastavJednorazove(ulozeneJednorazove);
}
const ulozenyProfil = nacitajPolozku(KLUC_PROFIL, vycistiProfil, 'údaje profilu');
if (ulozenyProfil !== null) {
  profil = ulozenyProfil;
}
vyplnProfil();
const ulozeneProjekty = nacitajPolozku(KLUC_PROJEKTY, vycistiProjekty, 'projekty');
if (ulozeneProjekty !== null) {
  nastavProjekty(ulozeneProjekty);
}
posunPocitadloProjektov();
const ulozeneStopky = nacitajPolozku(KLUC_STOPKY, vycistiStopky, 'stopky');
if (ulozeneStopky !== null) {
  if (najdiProjekt(ulozeneStopky.projektId)) {
    stopky = ulozeneStopky; // stopky bežia ďalej – čas sa dopočíta od uloženého štartu
  } else {
    zobrazSpravu('Bežiace stopky patria k projektu, ktorý sa nenašiel. Stopky som zrušil.', true);
    ulozStopky(); // stopky sú null -> kľúč sa odstráni
  }
}

// Vzhľad (tmavý režim, tekuté sklo) a naposledy otvorená záložka
nacitajTemu();
nacitajSklo();
let ulozenaZalozka = null;
try {
  ulozenaZalozka = localStorage.getItem(KLUC_ZALOZKA);
} catch {
  // nevadí – otvorí sa Prehľad
}
prepniZalozku(ulozenaZalozka);
dnesnyDen.textContent = `${denVTyzdni(dnesnyDatum())} ${formatDatum(dnesnyDatum())}`;

polia.datum.value = dnesnyDatum();
vyplnPredvolenuSadzbu();
nastavRezim(nacitajOblubenyRezim());
vykresliSadzby();
ukonciUpravuProjektu(); // pripraví formulár projektu (s predvolenou sadzbou)
vykresli();

// Dátový súbor: nájde zapamätaný súbor (beží na pozadí, appka sa medzitým už ukáže)
pripravDatovySubor();
