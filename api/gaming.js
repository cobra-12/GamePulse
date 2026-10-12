
// api/gaming.js - VRAIE API GamePulse FR
// Déployée sur Vercel en tant que https://ton-projet.vercel.app/api/gaming

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'gaming', lang = 'fr' } = req.query;

  try {
    // 1. Fetch temps réel depuis Reddit (multi-subreddits)
    const subs = ['gaming', 'GTA6', 'ValorantCompetitive', 'NintendoSwitch2', 'Games', 'pcgaming'];
    const redditPromises = subs.slice(0, 3).map(sub => 
      fetch(`https://www.reddit.com/r/${sub}/new.json?limit=5`, {
        headers: { 'User-Agent': 'GamePulseFR/1.0' }
      }).then(r => r.json()).catch(()=>null)
    );
    
    const redditResults = await Promise.all(redditPromises);
    let rawItems = [];
    
    redditResults.forEach(data => {
      if(data?.data?.children){
        data.data.children.forEach(post => {
          const p = post.data;
          if(p.score > 5){
            rawItems.push({
              titre_original: p.title,
              langue_originale: 'en',
              jeu: p.subreddit,
              source: `r/${p.subreddit}`,
              upvotes: p.score,
              url: `https://reddit.com${p.permalink}`,
              image: p.thumbnail?.startsWith('http') ? p.thumbnail : null,
              timestamp: new Date(p.created_utc * 1000).toISOString()
            });
          }
        });
      }
    });

    // Filtrage par recherche
    if(q && q !== 'gaming'){
      rawItems = rawItems.filter(i => 
        i.titre_original.toLowerCase().includes(q.toLowerCase()) ||
        i.jeu.toLowerCase().includes(q.toLowerCase())
      );
    }

    rawItems = rawItems.slice(0, 15);

    // 2. Traduction en FR via MyMemory (gratuit, pas de clé)
    const translated = await Promise.all(rawItems.map(async (item) => {
      try {
        // Détection rapide si déjà FR
        if(/[àâéèêëîïôùûüÿç]/i.test(item.titre_original) || item.titre_original.toLowerCase().includes(' le ') ){
          return { ...item, titre_fr: item.titre_original, traduit: false, langue_originale: 'fr' };
        }
        
        const transRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.titre_original)}&langpair=en|fr`
        );
        const transData = await transRes.json();
        const fr = transData.responseData?.translatedText || item.titre_original;
        
        return { 
          ...item, 
          titre_fr: fr, 
          traduit: true,
          langue_originale: transData.responseData?.detectedLanguage || 'en'
        };
      } catch(e){
        return { ...item, titre_fr: item.titre_original, traduit: false };
      }
    }));

    return res.status(200).json({
      status: 'ok',
      count: translated.length,
      traduit_en: 'fr',
      real_time: true,
      source: 'reddit-live + mymemory-translate',
      query: q,
      data: translated
    });

  } catch(error){
    return res.status(500).json({ error: error.message, status: 'failed' });
  }
}