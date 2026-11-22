# Živnosť prehľad

Webová appka pre živnostníkov, ktorá eviduje odpracované hodiny a zárobok a orientačne odhadne dane a odvody, všetko v prehliadači a bez registrácie.

**Živá ukážka:**

https://ondrod.github.io/zivnost-prehlad/

## Hlavné funkcie

- **Evidencia práce:** čas „od – do“ s automatickým odrátaním obeda a prerušení, alebo priamo počet hodín (h + min).
- **Sadzby:** uložené hodinové sadzby, jedna predvolená, rýchly výber jedným klikom.
- **Projekty a stopky:** Štart / Pauza / Stop pri projekte vytvorí záznam. Stopky bežia ďalej aj po zatvorení appky.
- **Prehľad:** dlaždice za mesiac (odpracované, zárobok, odvody, daň), posledné záznamy a graf za 12 mesiacov (SVG, bez knižníc).
- **Jednorazové položky:** sumy mimo hodín (napr. nafta), pripočítajú sa k zárobku mesiaca.
- **Výkaz práce:** mesačný výkaz pre zákazníka na tlač alebo do PDF.
- **Dane a odvody:** orientačný odhad zdravotného a sociálneho poistenia a dane z príjmu podľa slovenských pravidiel. Sadzby sú po rokoch v jednom objekte, takže sa dajú ľahko aktualizovať. *Len orientačne, nie je to daňové poradenstvo.*
- **Záloha:** export a import do súboru `.json` s kontrolou tvaru dát, v Chrome/Edge aj automatické ukladanie do súboru a pripomienka zálohy.
- **Vzhľad:** svetlý a tmavý režim, efekt „tekuté sklo“, mobilná verzia s lištou dole, overený kontrast textu.

## Použité technológie

- **HTML, CSS a čistý JavaScript**, bez frameworkov, knižníc a build krokov (3 súbory: `index.html`, `style.css`, `app.js`)
- **localStorage** na ukladanie dát, **IndexedDB** a **File System Access API** na automatické ukladanie do súboru
- Žiadny server ani externé zdroje (CDN, fonty, analytika), takže appka funguje aj offline

## Ako spustiť lokálne

1. Stiahni repozitár (`git clone …` alebo „Code → Download ZIP“).
2. Otvor súbor `index.html` v prehliadači (dvojklik).

Nič sa neinštaluje. Dáta zostávajú iba v tvojom prehliadači, preto si občas stiahni zálohu (Nastavenia → Záloha dát).

## Screenshoty

<!-- Sem pridaj obrázky, napr.:
![Prehľad](screenshoty/prehlad.png)
![Dane a odvody](screenshoty/dane.png)
![Mobil – tmavý režim](screenshoty/mobil-tmavy.png)
-->

_Pripravujem: Prehľad · Záznamy · Projekty so stopkami · Dane a odvody · mobil v tmavom režime._

## Ako vznikla

Appku som postavil s pomocou AI, konkrétne s **Claude Code** (AI asistent na programovanie od spoločnosti Anthropic), ako začiatočník v programovaní. Postupovali sme po fázach podľa plánu. Pravidlá projektu (iba lokálne, bez knižníc, bezpečné vkladanie textu cez `textContent`, kontrola dát pri importe, potvrdenia pred mazaním) sú zapísané v súbore [`CLAUDE.md`](CLAUDE.md), ktorý AI číta pri každej práci. Každú zmenu sme overili kontrolou syntaxe, simuláciou logiky v Node.js, testami v Chrome bez okna a kontrolou kontrastu v oboch témach.

Zákonné sadzby pre dane a odvody sme overovali na úradných weboch (Finančná správa, Sociálna poisťovňa, zdravotné poisťovne).
