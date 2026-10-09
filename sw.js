/* BitPub: guarda o programa para abrir rápido e atualiza em segundo plano.
   Os dados (comandas, estoque) nunca passam por aqui: vão direto ao banco. */
var CACHE='bitpub-v3';
var FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;
  var u=new URL(r.url);
  var fonts=/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(/\/(rest|auth)\/v1\//.test(u.pathname))return;               // dados do banco: nunca
  if(u.origin!==self.location.origin&&!fonts)return;           // nada de dados do banco no cache
  if(u.origin===self.location.origin&&/config\.js$/.test(u.pathname)){ // config: sempre a mais nova
    e.respondWith(fetch(r).catch(function(){return caches.match(r)}));return;
  }
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(r,{ignoreSearch:true}).then(function(hit){
      var net=fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(function(){return hit});
      return hit||net;
    });
  }));
});
