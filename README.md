# SauvegardePro

Logiciel de sauvegarde et de synchronisation de donnees pour Windows, entierement en francais : sauvegarde de disques, partitions ou dossiers vers un NAS, un disque externe ou tout stockage local/reseau.

## Fonctionnalites

- Sauvegarde **complete**, **incrementielle** (versions liees par hardlinks NTFS, sans doublon disque) et **synchronisation miroir** (ajout/mise a jour/suppression a l'identique de la source).
- Sources et destinations multiples ; detection automatique des disques internes/externes (PowerShell/`Get-Volume`) et des NAS du reseau local (SSDP/UPnP + balayage du port 445).
- Declenchement manuel, planifie (quotidien, hebdomadaire, par intervalle) ou au demarrage de l'application.
- Verification d'integrite post-copie (SHA-256, relecture reelle du fichier ecrit).
- Reprise automatique apres interruption (crash, coupure de courant) sans jamais laisser de fichier a moitie ecrit.
- Disjoncteur de securite en mode miroir : une suppression massive et inattendue demande une confirmation explicite avant d'agir.
- Filtres d'exclusion (extensions, dossiers, fichiers), limitation de debit, nombre de versions a conserver, notifications, journal detaille et historique des executions.

## Prerequis de developpement

- Node.js 24+, npm 11+ (Windows).

## Installation des dependances

```bash
npm install
```

## Developpement

```bash
npm run dev
```

Lance l'application avec rechargement a chaud (main, preload et interface).

## Verification du moteur (hors interface)

```bash
npx tsx scripts/tests/test-engine.ts
```

Exerce reellement le moteur de sauvegarde (les 3 modes, la reprise apres interruption, la verification d'integrite, le disjoncteur miroir, la limitation de debit) sur de vrais fichiers temporaires, sans passer par l'interface graphique. A relancer apres toute modification du moteur.

## Compilation et build

```bash
npm run build
```

Compile le processus principal, le preload et l'interface (verification TypeScript incluse).

## Generation de l'installateur Windows

```bash
npm run dist
```

Produit un installateur NSIS (`SauvegardePro-<version>-Installation.exe`) dans `dist/`. L'installateur n'est pas signe numeriquement : Windows SmartScreen peut afficher un avertissement au premier lancement (normal en l'absence de certificat de signature de code).

## Architecture

```
src/
  shared/      Types et contrat IPC partages entre le processus principal et l'interface
  main/
    db/        Base SQLite embarquee (sql.js) : jobs, historique, manifestes de versions
    backup/    Moteur de sauvegarde (scanner, copie atomique, integrite, garde-fous, modes)
    discovery/ Detection des disques et des NAS
    scheduler/ Planification des sauvegardes
    ipc/       Ponts IPC exposes a l'interface
    app/       Assemblage de l'application (bootstrap, service de sauvegarde)
  preload/     Pont contextBridge securise
  renderer/    Interface React + Tailwind
scripts/
  generate-icon.mjs   Generation de l'icone de l'application
  tests/test-engine.ts  Verification de bout en bout du moteur
```
