const http = require('node:http');
const clientId = process.env.SPOTIFY_CLIENT_ID;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const allowedOrigin = 'https://pranathi.me';
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url === '/') return res.end(JSON.stringify({ status: 'ok' }));
  if (req.url !== '/now-playing') { res.writeHead(404); return res.end('{}'); }
  if (!clientId || !refreshToken) { res.writeHead(503); return res.end(JSON.stringify({ status: 'unavailable' })); }
  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({grant_type:'refresh_token', refresh_token:refreshToken, client_id:clientId}) });
    if (!tokenResponse.ok) throw new Error('Spotify authorization failed');
    const { access_token } = await tokenResponse.json();
    const playing = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {headers:{Authorization:`Bearer ${access_token}`}});
    if (playing.status === 204) return res.end(JSON.stringify({ status:'idle' }));
    if (!playing.ok) throw new Error('Spotify playback request failed');
    const data = await playing.json();
    if (!data.is_playing || !data.item || data.currently_playing_type !== 'track') return res.end(JSON.stringify({status:'idle'}));
    res.end(JSON.stringify({status:'playing', title:data.item.name, artist:data.item.artists.map(a=>a.name).join(', '), url:data.item.external_urls?.spotify || null}));
  } catch { res.writeHead(502); res.end(JSON.stringify({status:'unavailable'})); }
}).listen(process.env.PORT || 10000, '0.0.0.0');
