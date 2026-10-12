
# GamePulse FR - Déploiement

## 1. Vraie API incluse: /api/gaming.js
- Fetch Reddit temps réel (6 subreddits gaming)
- Traduit auto EN->FR via MyMemory (gratuit)
- Endpoint: /api/gaming?q=Fortnite

## 2. Comment installer (définitif)

### Option A - Vercel (1 clic, recommandé):
1. Va sur vercel.com > New Project > Upload ce dossier gamepulse-deploy
2. Deploy -> tu obtiens https://gamepulse-fr.vercel.app
3. Ouvre ce lien sur ton téléphone Android
4. Chrome > ⋮ > Installer l'application -> C'est installé en vraie PWA plein écran

### Option B - Netlify Drop:
1. Va sur app.netlify.com/drop
2. Glisse le dossier public
3. Même étape d'installation

### Pourquoi ça refusait avant?
- Pas de manifest.json
- Pas de service worker
- Lien container:// pas https -> Android bloque l'install. Maintenant avec Vercel en https, ça passe.

## 3. L'app installée fait quoi?
- Se lance comme une app native
- Appelle /api/gaming toutes les 30 sec
- Traduit tout en français automatiquement
