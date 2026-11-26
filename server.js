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
    const headers = {Authorization:`Bearer ${access_token}`};
    const playing = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {headers});
    if (!playing.ok && playing.status !== 204) throw new Error('Spotify playback request failed');
    const data = playing.status === 204 ? null : await playing.json();
    let track = data?.currently_playing_type === 'track' ? data.item : null;
    if (!track) {
      const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {headers});
      if (!recent.ok) throw new Error('Spotify recent playback request failed');
      const history = await recent.json();
      track = history.items?.[0]?.track;
    }
    if (!track) return res.end(JSON.stringify({status:'idle'}));
    res.end(JSON.stringify({status:'playing', title:track.name, artist:track.artists.map(a=>a.name).join(', '), url:track.external_urls?.spotify || null}));
  } catch { res.writeHead(502); res.end(JSON.stringify({status:'unavailable'})); }
}).listen(process.env.PORT || 10000, '0.0.0.0');
