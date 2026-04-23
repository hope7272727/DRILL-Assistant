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

  // Detect the dominant bright-line angle in degrees.
  // The returned angle uses the same convention as our render code:
  // assigning it to `state.angle` rotates the image so the bright line
  // becomes horizontal (i.e., it already accounts for canvas y-flip).
  function detectAngle(data, w, h, threshold) {
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 200000)));
    let mx = 0, my = 0, n = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > threshold) { mx += x; my += y; n++; }
      }
    }
    if (n < 50) return { angle: 0, brightCount: n, threshold };
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

    // Major-axis angle of the 2D covariance matrix in image coords (y-down).
    // Negate to match our positive-CCW canvas convention.
    const angleRad = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    let result = -angleRad * 180 / Math.PI;
    // For drill tips, the cutting-edge highlight runs PERPENDICULAR to the
    // major axis of bright pixels (the flutes stack on both sides of the
    // edge). So target the minor axis = add 90° and normalize to [-90, 90].
    result += 90;
    if (result > 90) result -= 180;
    else if (result < -90) result += 180;
    return { angle: result, brightCount: n, threshold };
  }

  // Adaptive variant: pick a threshold that keeps the top ~1% brightest
  // pixels (typically the specular highlight on the cutting edge), then
  // run PCA. Kept for reference / other uses.
  function detectAngleAuto(data, w, h) {
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 300000)));
    const hist = new Array(256).fill(0);
    let total = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        hist[lum]++;
        total++;
      }
    }
    const target = Math.max(100, Math.floor(total * 0.01));
    let cumul = 0, threshold = 255;
    for (let v = 255; v >= 0; v--) {
      cumul += hist[v];
      if (cumul >= target) { threshold = Math.max(180, v); break; }
    }
    return detectAngle(data, w, h, threshold);
  }

  // Drill-point alignment by horizontal brightness boundary:
  // Reference photos show a crisp step between an upper half and a lower
  // half of the drill silhouette. We find the rotation angle that
  // maximises the row-average brightness step (a 1D Radon-style search).
  // Returns angle in our state.angle convention (positive = visually CCW).
  function detectAngleBoundary(data, w, h, opts) {
    opts = opts || {};
    const rangeDeg = opts.range || 30;   // ± search range
    const stepDeg = opts.step || 0.5;    // search resolution
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 120000)));
    const halfW = w / 2, halfH = h / 2;

    // Precompute luminance samples and their centred coords so we can
    // re-project under each candidate angle without re-reading pixel data.
    const N = Math.ceil(h / stride) * Math.ceil(w / stride);
    const lum = new Float32Array(N);
    const cx = new Float32Array(N);
    const cy = new Float32Array(N);
    let k = 0;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        lum[k] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        cx[k] = x - halfW;
        cy[k] = y - halfH;
        k++;
      }
    }
    const M = k;

    let bestAngle = 0, bestScore = -Infinity;

    for (let aDeg = -rangeDeg; aDeg <= rangeDeg + 1e-6; aDeg += stepDeg) {
      const rad = aDeg * Math.PI / 180;
      const sinT = Math.sin(rad), cosT = Math.cos(rad);
      // Range of projected y after rotation
      const maxYp = halfW * Math.abs(sinT) + halfH * Math.abs(cosT);
      const nBins = Math.max(16, Math.ceil(2 * maxYp) + 1);
      const offset = maxYp;
      const rowSum = new Float64Array(nBins);
      const rowCnt = new Uint32Array(nBins);

      for (let j = 0; j < M; j++) {
        const yp = -cx[j] * sinT + cy[j] * cosT;
        const bin = Math.floor(yp + offset);
        if (bin >= 0 && bin < nBins) {
          rowSum[bin] += lum[j];
          rowCnt[bin]++;
        }
      }

      // Row averages, only where we have enough samples
      const minSamples = 5;
      const avg = new Float64Array(nBins);
      const has = new Uint8Array(nBins);
      for (let b = 0; b < nBins; b++) {
        if (rowCnt[b] >= minSamples) {
          avg[b] = rowSum[b] / rowCnt[b];
          has[b] = 1;
        }
      }

      // Maximum step: difference of mean brightness in windows above/below
      const win = 10;
      const needed = Math.max(5, win - 3);
      let maxStep = 0;
      for (let b = win; b < nBins - win; b++) {
        let above = 0, aboveN = 0, below = 0, belowN = 0;
        for (let t = 1; t <= win; t++) {
          if (has[b - t]) { above += avg[b - t]; aboveN++; }
          if (has[b + t]) { below += avg[b + t]; belowN++; }
        }
        if (aboveN >= needed && belowN >= needed) {
          const s = Math.abs(below / belowN - above / aboveN);
          if (s > maxStep) maxStep = s;
        }
      }

      if (maxStep > bestScore) {
        bestScore = maxStep;
        bestAngle = aDeg;
      }
    }

    return { angle: bestAngle, score: bestScore };
  }

  // Render `image` rotated by `angleDeg` onto `canvas`, sized to fit while
  // preserving aspect ratio. Empty area filled with bgCss.
  // Convention: positive angleDeg = visually counter-clockwise.
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
    detectAngleAuto,
    detectAngleBoundary,
    renderRotated,
    exportRotated,
    imageData,
  };
})();
