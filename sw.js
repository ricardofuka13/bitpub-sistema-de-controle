/* Antigo service worker da raiz: remove a si mesmo e limpa o cache. O sistema de comandas agora fica em /sistema/. */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}).then(function(){return self.registration.unregister()}).then(function(){return self.clients.matchAll({type:'window'})}).then(function(cs){cs.forEach(function(c){try{c.navigate(c.url)}catch(x){}})}))});
