# Analiza rozbieżności CTL/ATL/Forma: CyclingForge vs interval.icu

## Dane z porównania (16 lutego)

| Metryka | interval.icu | CyclingForge | Stosunek |
|---------|--------------|--------------|----------|
| CTL (Wytrenowanie) | 27.2 | 53 | 1.95x |
| ATL (Zmęczenie) | 34.8 | 58 | 1.67x |
| Forma (TSB) | -7.6 | -5 | — |

## Wnioski

### 1. Spójność wewnętrzna
- interval.icu: TSB = 27.2 - 34.8 = -7.6 ✓
- CyclingForge: TSB = 53 - 58 = -5 ✓

Oba systemy poprawnie liczą TSB = CTL - ATL.

### 2. Główna przyczyna: **FTP**

TSS = (czas × NP × IF) / (FTP × 3600) × 100, gdzie IF = NP/FTP  
→ TSS ∝ NP²/FTP²

TSS jest **odwrotnie proporcjonalne do kwadratu FTP**. Niższe FTP → wyższe TSS → wyższe CTL i ATL.

**interval.icu** używa **eFTP** (szacowanego z krzywej mocy), które często jest **wyższe** niż ręcznie ustawione FTP.  
**CyclingForge** używa FTP z profilu użytkownika.

**Przykład:** Jeśli w CyclingForge FTP=250 W, a w interval.icu eFTP=350 W:
- Stosunek TSS: (350/250)² ≈ 1.96 – prawie dokładnie ~2×
- CTL i ATL w CyclingForge będą ~2× wyższe niż w interval.icu

### 3. Formuły

**TSS (Coggan):** implementacja poprawna:
```
TSS = (duration_seconds × NP × IF) / (FTP × 36)
    = (duration × NP × IF) × 100 / (FTP × 3600)
```

**CTL/ATL:** czynnik 1 - exp(-1/T), zgodnie z Coggan/Allen.

### 4. Hipotezy do weryfikacji (instrumentacja)

| ID | Hipoteza | Sposób weryfikacji |
|----|----------|--------------------|
| H1 | Różnica FTP (CF vs eFTP) | Log `userFtp` vs eFTP z interval.icu |
| H2 | Różne daty/strefy czasowe | Log `sampleFirst`/`sampleLast` dat |
| H3 | TSS liczone ze starym FTP | Re-sync po zmianie FTP |
| H4 | Różny zestaw aktywności | Log `activitiesCount`, `totalTss` |
| H5 | Błąd w formułach CTL/ATL | Porównanie z wzorcem |

## FTP w momencie aktywności (historia FTP)

**Tak** – interval.icu używa FTP/eFTP obowiązującego **w dniu danej aktywności**. Jeśli zmieniałeś FTP (np. po teście), interval.icu stosuje historyczną wartość do każdej aktywności. CyclingForge obecnie używa **aktualnego FTP z profilu** przy każdej synchronizacji – wszystkie aktywności mają TSS liczone z tym samym FTP. To może dawać różnice przy zmianach FTP w czasie.

**Potencjalna poprawka:** historia FTP (data, wartość) i używanie FTP obowiązującego w dniu każdej aktywności przy liczeniu TSS – do rozważenia jako dalsze usprawnienie.

## Rekomendacje

1. **Porównaj FTP** – sprawdź eFTP w interval.icu (Settings → Power) i FTP w CyclingForge (Profil). Ustaw w CyclingForge wartość zbliżoną do eFTP.
2. **Po zmianie FTP** – wykonaj ponowną synchronizację aktywności, aby przeliczyć TSS.
3. **Historia FTP** – w przyszłości wsparcie dla historii FTP, aby TSS liczyć z FTP obowiązującego w dniu danej aktywności.
