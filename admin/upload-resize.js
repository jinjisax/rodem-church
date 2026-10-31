/* 관리 화면에서 사진을 올릴 때, 너무 큰 사진(휴대폰 원본 등)을 자동으로 줄여 줍니다.
   - 가로·세로 중 긴 쪽이 2000px 을 넘거나 1MB 가 넘는 JPG/PNG 만 줄입니다 (주보 1403px 은 그대로).
   - 결과는 JPG(품질 85)입니다. GIF·SVG 등은 건드리지 않습니다. */
(function () {
  var MAX = 2000, LIMIT = 1024 * 1024, DONE = '__resized';

  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png)$/.test(file.type)) return resolve(file);
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight, scale = Math.min(1, MAX / Math.max(w, h));
        if (scale === 1 && file.size <= LIMIT) return resolve(file);
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          if (!b || b.size >= file.size) return resolve(file);
          resolve(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || input.type !== 'file' || input[DONE] || !input.files || !input.files.length) return;
    e.stopImmediatePropagation();
    Promise.all(Array.prototype.map.call(input.files, shrink)).then(function (files) {
      var dt = new DataTransfer();
      files.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
      input[DONE] = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input[DONE] = false;
    });
  }, true);
})();
