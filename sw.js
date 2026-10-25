/* Trình chiếu ảnh dạy học · bộ nhớ đệm để mở được khi mất mạng.
   Trang chính: lấy bản mới trên mạng trước, mất mạng thì dùng bản đã lưu.
   Biểu tượng, file khai báo: dùng bản đã lưu. Phông chữ Google: dùng bản lưu, cập nhật ngầm.
   Đổi số phiên bản V mỗi lần sửa sw.js. */
const V = 'trinh-chieu-v1';
const FONT = 'trinh-chieu-fonts';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== FONT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      e.respondWith(timeout(fetch(req), 4000).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); }
        return res;
      }).catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); }
      return res;
    })));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  /* Ảnh Google Drive, trang web nhúng: đi thẳng ra mạng như bình thường */
});
