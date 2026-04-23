/* Drill-point auto-alignment: detect the bright cutting-edge line via brightness
 * threshold + 2D PCA, then rotate the image so that line is horizontal. */
(function () {
  // Sample background color from the four image corners (5x5 region average).
  function sampleBg(data, w, h) {
    const sample = (cx, cy) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = Math.max(0, cy - 2); y <= Math.min(h - 1, cy + 2); y++) {
        for (let x = Math.max(0, cx - 2); x <= Math.min(w - 1, cx + 2); x++) {
          const i = (y * w + x) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      return [r / n, g / n, b / n];
    };
    const corners = [
      sample(2, 2), sample(w - 3, 2),
      sample(2, h - 3), sample(w - 3, h - 3),
    ];
    const r = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
    const g = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
    const b = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);
    return { r, g, b, css: `rgb(${r},${g},${b})` };
  }

  // Detect the dominant bright-line angle (degrees) via PCA.
  function detectAngle(data, w, h, threshold) {
    // Stride-sample so very large images stay fast.
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 200000)));
    let mx = 0, my = 0, n = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > threshold) { mx += x; my += y; n++; }
      }
    }
    if (n < 50) return { angle: 0, brightCount: n };
    mx /= n; my /= n;

    let cxx = 0, cxy = 0, cyy = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > threshold) {
          const dx = x - mx, dy = y - my;
          cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
        }
      }
    }
    cxx /= n; cyy /= n; cxy /= n;

    // Major-axis angle of the 2D covariance matrix.
    const angleRad = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const angleDeg = angleRad * 180 / Math.PI;
    return { angle: angleDeg, brightCount: n };
  }

  // Render `image` rotated by `angleDeg` (CCW positive in math sense) onto `canvas`,
  // sized to fit while preserving aspect ratio. Empty area filled with bgCss.
  function renderRotated(image, canvas, angleDeg, bgCss) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = bgCss;
    ctx.fillRect(0, 0, W, H);

    const iw = image.naturalWidth, ih = image.naturalHeight;
    const scale = Math.min(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-angleDeg * Math.PI / 180);
    ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  // Produce a full-resolution rotated canvas suitable for download/export.
  function exportRotated(image, angleDeg, bgCss) {
    const iw = image.naturalWidth, ih = image.naturalHeight;
    const cv = document.createElement('canvas');
    cv.width = iw; cv.height = ih;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = bgCss;
    ctx.fillRect(0, 0, iw, ih);
    ctx.save();
    ctx.translate(iw / 2, ih / 2);
    ctx.rotate(-angleDeg * Math.PI / 180);
    ctx.drawImage(image, -iw / 2, -ih / 2);
    ctx.restore();
    return cv;
  }

  // Read full-res ImageData for analysis.
  function imageData(image) {
    const w = image.naturalWidth, h = image.naturalHeight;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(image, 0, 0);
    return cv.getContext('2d').getImageData(0, 0, w, h);
  }

  window.DrillAlign = {
    sampleBg,
    detectAngle,
    renderRotated,
    exportRotated,
    imageData,
  };
})();
