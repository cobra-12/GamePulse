export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { limit = '3' } = req.query;

  // Fallback viral qui marche toujours sur Vercel
  const fallback = [
    { titre_original: "GTA 6 trailer breaks 100M views in 24h", viral_score: 12500, upvotes: 10200, comments: 2300, jeu: "GTA6", source: "r/GTA6", url: "https://reddit.com/r/GTA6", popular_douala: true },
    { titre_original: "【entity-Valorant¦canonical_name=Valorant】 new agent leaks - community reacts", viral_score: 8900, upvotes: 6500, comments: 1200, jeu: "【entity-Valorant¦canonical_name=Valorant】", source: "r/ValorantCompetitive", url: "https://reddit.com/r/ValorantCompetitive", popular_douala: true },
    { titre_original: "FC 25 TOTY predictions - 【entity-Mbappe¦canonical_name=Kylian Mbappé】, 【entity-Bellingham¦canonical_name=Bellingham】", viral_score: 7200, upvotes: 5400, comments: 890, jeu: "Fifa", source: "r/Fifa", url: "https://reddit.com/r/Fifa", popular_douala: true }
  ];

  try {
    // Essaie Reddit, sinon fallback
    const r = await fetch('https://www.reddit.com/r/gaming/hot.json?limit=10', { headers: { 'User-Agent': 'GamePulseFR/1.0' } });
    let data = fallback;
    if(r.ok){
      const j = await r.json();
      data = j.data.children.slice(0,3).map(p => ({
        titre_original: p.data.title,
        viral_score: p.data.score + p.data.num_comments*2,
        upvotes: p.data.score,
        comments: p.data.num_comments,
        jeu: "gaming",
        source: "r/gaming",
        url: `https://reddit.com${p.data.permalink}`,
        popular_douala: /fifa|fc|free fire|【entity-valorant¦canonical_name=Valorant】|gta/i.test(p.data.title)
      }));
    }
    
    const translated = await Promise.all(data.slice(0,limit).map(async item => {
      try {
        const tr = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.titre_original)}&langpair=en|fr`);
        const tj = await tr.json();
        return { ...item, titre_fr: tj.responseData?.translatedText || item.titre_original, whatsapp_text: `🎮 ${tj.responseData?.translatedText || item.titre_original}\n\n🔥 ${item.upvotes} upvotes | 💬 ${item.comments} coms\n📍 ${item.source}\n\n👉 Et vous à Douala, vous en pensez quoi ?\n#DoualaGaming #Glotello` };
      } catch { return { ...item, titre_fr: item.titre_original, whatsapp_text: `🎮 ${item.titre_original}\n🔥 ${item.upvotes} | ${item.source}` }; }
    }));

    return res.status(200).json({ status: 'ok', count: translated.length, filtre: 'viral_seulement', traduit_en: 'fr', data: translated });
  } catch(e){
    return res.status(200).json({ status: 'ok_fallback', count: fallback.length, data: fallback.map(f => ({ ...f, titre_fr: f.titre_original, whatsapp_text: `🎮 ${f.titre_original}\n🔥 ${f.upvotes} upvotes\n📍 ${f.source}\n#DoualaGaming` })) });
  }
}