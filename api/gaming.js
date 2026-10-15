export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { limit = '6', game = 'all' } = req.query;
  const POPULAIRE_DOUALA = ['fifa','fc 25','fc25','free fire','freefire','valorant','fortnite','cod','warzone','gta','gta 6','pubg','efootball','minecraft','roblox'];

  // SOURCE 1: Reddit multi-subreddit (ce qui buzz)
  const fetchReddit = async () => {
    try {
      const subs = 'gaming+GTA6+Fifa+ValorantCompetitive+FreeFire+FortNiteBR+CODWarzone+PUBG';
      const r = await fetch(`https://www.reddit.com/r/${subs}/hot.json?limit=20`, { headers: { 'User-Agent': 'GamePulseFR/2.0' } });
      if(!r.ok) return [];
      const j = await r.json();
      return j.data.children.map(p => ({
        titre_en: p.data.title,
        source: `Reddit r/${p.data.subreddit}`,
        url: `https://reddit.com${p.data.permalink}`,
        viral_score: p.data.score + p.data.num_comments*3,
        upvotes: p.data.score,
        comments: p.data.num_comments,
        jeu_detecte: POPULAIRE_DOUALA.find(k => p.data.title.toLowerCase().includes(k)) || 'gaming',
        type: 'reddit'
      }));
    } catch { return []; }
  };

  // SOURCE 2: GameSpot News RSS via rss2json
  const fetchGameSpot = async () => {
    try {
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.gamespot.com/feeds/mashup/');
      if(!r.ok) return [];
      const j = await r.json();
      return (j.items||[]).slice(0,10).map(it => ({
        titre_en: it.title,
        source: 'GameSpot',
        url: it.link,
        viral_score: 5000 + Math.floor(Math.random()*3000),
        upvotes: 0,
        comments: 0,
        jeu_detecte: POPULAIRE_DOUALA.find(k => it.title.toLowerCase().includes(k)) || 'gaming',
        type: 'news'
      }));
    } catch { return []; }
  };

  // SOURCE 3: IGN Gaming
  const fetchIGN = async () => {
    try {
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.ign.com/ign/games-all');
      if(!r.ok) return [];
      const j = await r.json();
      return (j.items||[]).slice(0,10).map(it => ({
        titre_en: it.title,
        source: 'IGN',
        url: it.link,
        viral_score: 4500 + Math.floor(Math.random()*3000),
        upvotes: 0,
        comments: 0,
        jeu_detecte: POPULAIRE_DOUALA.find(k => it.title.toLowerCase().includes(k)) || 'gaming',
        type: 'news'
      }));
    } catch { return []; }
  };

  const generateEditorial = (titre_fr, resume, source, url, jeu) => {
    const bullets = [
      `Nouvelle annonce — ${resume.slice(0,120)}...`,
      `Communauté en feu — Le sujet fait déjà réagir les joueurs à Douala et partout dans le monde.`,
      `Disponibilité — Plus d'infos et gameplay à découvrir dès maintenant.`,
      `Rendez-vous à suivre — On vous tient au courant sur Glotello et GamePulse.`
    ];
    const tags = `#${jeu.replace(/ /g,'')} #Gaming #DoualaGaming #Glotello`;
    return `🎮 ${titre_fr}

${resume}

AU PROGRAMME :

⚔️ ${bullets[0]}

🔥 ${bullets[1]}

🎮 ${bullets[2]}

📅 ${bullets[3]}

📰 Source : ${source}
🔗 ${url}

${tags}`;
  };

  try {
    const [reddit, gamespot, ign] = await Promise.all([fetchReddit(), fetchGameSpot(), fetchIGN()]);
    let all = [...reddit, ...gamespot, ...ign];

    // Filtre: garde seulement ce qui est populaire à Douala OU très viral (>4000)
    all = all.filter(i => POPULAIRE_DOUALA.some(k => i.titre_en.toLowerCase().includes(k)) || i.viral_score > 4000);

    // Dédoublonne par titre similaire
    const seen = new Set();
    all = all.filter(i => {
      const key = i.titre_en.toLowerCase().slice(0,30);
      if(seen.has(key)) return false;
      seen.add(key); return true;
    });

    // Tri par viral
    all.sort((a,b) => b.viral_score - a.viral_score);

    // Filtrage par jeu si demandé ?game=fifa
    if(game !== 'all'){
      all = all.filter(i => i.jeu_detecte.toLowerCase().includes(game.toLowerCase()) || i.titre_en.toLowerCase().includes(game.toLowerCase()));
    }

    all = all.slice(0, parseInt(limit));

    // Traduction + format éditorial Yvan
    const translated = await Promise.all(all.map(async item => {
      let titre_fr = item.titre_en;
      let resume_fr = item.titre_en;
      try {
        const tr = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.titre_en)}&langpair=en|fr`);
        const tj = await tr.json();
        if(tj.responseData?.translatedText) {
          titre_fr = tj.responseData.translatedText;
          if(!titre_fr.includes('!')) titre_fr += ' !';
          resume_fr = titre_fr + " La communauté s'enflamme autour de cette annonce qui concerne les joueurs de " + item.jeu_detecte.toUpperCase() + ".";
        }
      } catch {}

      return {
        ...item,
        titre_fr,
        resume_fr,
        whatsapp_text: generateEditorial(titre_fr, resume_fr, item.source, item.url, item.jeu_detecte),
        popular_douala: POPULAIRE_DOUALA.some(k => item.titre_en.toLowerCase().includes(k))
      };
    }));

    return res.status(200).json({
      status: 'ok_multi_source',
      sources: ['Reddit (multi-sub)', 'GameSpot', 'IGN'],
      jeux_couverts: POPULAIRE_DOUALA,
      count: translated.length,
      filtre: 'viral + populaire Douala',
      format: 'editorial_Yvan',
      data: translated
    });

  } catch(e){
    return res.status(500).json({ error: e.message, sources_attempted: 3 });
  }
}