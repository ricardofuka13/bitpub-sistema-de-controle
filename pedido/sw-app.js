/* Service worker minimo: permite instalar o site como app. Nao guarda nada em cache, o site sempre vem da rede. */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(){});
