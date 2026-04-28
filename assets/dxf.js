/* Minimal DXF parser + renderer for drill-point comparison.
 * Handles common 2D entities: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE(+VERTEX).
 * Not a full DXF implementation — splines, blocks/inserts, text, etc. are skipped.
 */
(function () {
  function parseDXF(text) {
    const lines = text.split(/\r\n|\r|\n/);
    // Collect code/value pairs
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = parseInt(lines[i].trim(), 10);
      if (Number.isNaN(code)) continue;
      pairs.push({ code, value: lines[i + 1] });
    }

    // Find start of ENTITIES section
    let idx = 0;
    while (idx < pairs.length - 1) {
      if (pairs[idx].code === 0 && pairs[idx].value.trim() === 'SECTION' &&
          pairs[idx + 1].code === 2 && pairs[idx + 1].value.trim() === 'ENTITIES') {
        idx += 2; break;
      }
      idx++;
    }

    const entities = [];
    let cur = null;
    let polyVerts = null;  // for POLYLINE via VERTEX

    function flush() {
      if (!cur) return;
      if (cur.type === 'POLYLINE' && polyVerts) {
        cur.vertices = polyVerts;
      }
      // Only keep entities with usable geometry
      if (isRenderable(cur)) entities.push(cur);
      cur = null; polyVerts = null;
    }

    while (idx < pairs.length) {
      const { code, value } = pairs[idx];
      const sv = value.trim();

      if (code === 0) {
        if (sv === 'SEQEND') { idx++; continue; }
        if (sv === 'VERTEX') {
          idx++;
          // Collect vertex coords until next 0 code
          const vx = { x: 0, y: 0 };
          while (idx < pairs.length && pairs[idx].code !== 0) {
            const p = pairs[idx];
            if (p.code === 10) vx.x = parseFloat(p.value);
            else if (p.code === 20) vx.y = parseFloat(p.value);
            idx++;
          }
          if (polyVerts) polyVerts.push(vx);
          continue;
        }
        flush();
        if (sv === 'ENDSEC' || sv === 'EOF') break;
        cur = { type: sv };
        if (sv === 'LWPOLYLINE') cur.vertices = [];
        if (sv === 'POLYLINE') polyVerts = [];
        idx++;
        continue;
      }

      if (!cur) { idx++; continue; }

      const v = parseFloat(value);
      if (cur.type === 'LINE') {
        if (code === 10) cur.x1 = v;
        else if (code === 20) cur.y1 = v;
        else if (code === 11) cur.x2 = v;
        else if (code === 21) cur.y2 = v;
      } else if (cur.type === 'CIRCLE') {
        if (code === 10) cur.cx = v;
        else if (code === 20) cur.cy = v;
        else if (code === 40) cur.r = v;
      } else if (cur.type === 'ARC') {
        if (code === 10) cur.cx = v;
        else if (code === 20) cur.cy = v;
        else if (code === 40) cur.r = v;
        else if (code === 50) cur.startAngle = v;
        else if (code === 51) cur.endAngle = v;
      } else if (cur.type === 'LWPOLYLINE') {
        if (code === 10) cur.vertices.push({ x: v });
        else if (code === 20) {
          const last = cur.vertices[cur.vertices.length - 1];
          if (last && last.y === undefined) last.y = v;
        } else if (code === 70) {
          cur.closed = (parseInt(value, 10) & 1) === 1;
        }
      } else if (cur.type === 'POLYLINE') {
        if (code === 70) cur.closed = (parseInt(value, 10) & 1) === 1;
      } else if (cur.type === 'ELLIPSE') {
        if (code === 10) cur.cx = v;
        else if (code === 20) cur.cy = v;
        else if (code === 11) cur.majorX = v;
        else if (code === 21) cur.majorY = v;
        else if (code === 40) cur.ratio = v;
        else if (code === 41) cur.startParam = v;
        else if (code === 42) cur.endParam = v;
      }
      idx++;
    }
    flush();

    // Collect representative (x,y) points per entity. Use 2 points per shape
    // so that one-off entities (like a single huge construction arc) don't
    // dominate the percentile statistics any more than a normal LINE would.
    const xs = [], ys = [];
    const push = (x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); }
    };
    for (const e of entities) {
      if (e.type === 'LINE') { push(e.x1, e.y1); push(e.x2, e.y2); }
      else if (e.type === 'CIRCLE' || e.type === 'ARC') {
        push(e.cx - e.r, e.cy - e.r); push(e.cx + e.r, e.cy + e.r);
      } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        for (const v of (e.vertices || [])) {
          if (v.y !== undefined) push(v.x, v.y);
        }
      } else if (e.type === 'ELLIPSE') {
        const mag = Math.hypot(e.majorX || 0, e.majorY || 0);
        push(e.cx - mag, e.cy - mag); push(e.cx + mag, e.cy + mag);
      }
    }

    // Robust bbox: drop coordinates outside [Q1 − 3·IQR, Q3 + 3·IQR] to ignore
    // stray construction lines / hidden reference arcs that would otherwise
    // explode the bbox and shrink the auto-fit scale to nothing.
    const robustRange = (arr) => {
      if (arr.length === 0) return null;
      const sorted = arr.slice().sort((a, b) => a - b);
      const q = (p) => {
        const i = (sorted.length - 1) * p;
        const lo = Math.floor(i), hi = Math.ceil(i);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
      };
      const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
      // Fall back to full range if everything is collinear (iqr === 0).
      if (iqr === 0) return { lo: sorted[0], hi: sorted[sorted.length - 1] };
      const lo = q1 - 3 * iqr, hi = q3 + 3 * iqr;
      let mn = Infinity, mx = -Infinity;
      for (const v of sorted) {
        if (v >= lo && v <= hi) { if (v < mn) mn = v; if (v > mx) mx = v; }
      }
      // Safety net — if filter removed everything (shouldn't happen) use full.
      if (mn === Infinity) return { lo: sorted[0], hi: sorted[sorted.length - 1] };
      return { lo: mn, hi: mx };
    };
    const xr = robustRange(xs);
    const yr = robustRange(ys);
    const bbox = (xr && yr && xr.lo < xr.hi)
      ? { minX: xr.lo, minY: yr.lo, maxX: xr.hi, maxY: yr.hi, w: xr.hi - xr.lo, h: yr.hi - yr.lo }
      : null;

    return { entities, bbox };
  }

  function isRenderable(e) {
    if (e.type === 'LINE') return e.x1 !== undefined && e.x2 !== undefined;
    if (e.type === 'CIRCLE' || e.type === 'ARC') return e.cx !== undefined && e.r !== undefined;
    if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      return (e.vertices || []).filter(v => v.y !== undefined).length >= 2;
    }
    if (e.type === 'ELLIPSE') return e.cx !== undefined && e.majorX !== undefined;
    return false;
  }

  // Render parsed DXF onto a canvas at the given placement.
  // placement: { cx, cy (screen px, center), scale, rotationRad, color, lineWidth, alpha }
  function drawDXF(ctx, dxf, placement) {
    if (!dxf || !dxf.bbox) return;
    const { entities, bbox } = dxf;
    const { cx, cy, scale, rotationRad, color, lineWidth, alpha } = placement;
    const cosR = Math.cos(rotationRad || 0);
    const sinR = Math.sin(rotationRad || 0);
    const bx = bbox.minX + bbox.w / 2;
    const by = bbox.minY + bbox.h / 2;

    // world -> screen: translate bbox centre to origin, scale (with DXF y-up
    // -> canvas y-down flip), rotate, translate to placement.
    function ws(px, py) {
      const lx = (px - bx) * scale;
      const ly = -(py - by) * scale;
      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;
      return [cx + rx, cy + ry];
    }

    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 1;
    ctx.strokeStyle = color || '#ff0000';
    ctx.lineWidth = lineWidth || 2;
    ctx.beginPath();

    for (const e of entities) {
      if (e.type === 'LINE') {
        const [sx, sy] = ws(e.x1, e.y1);
        const [ex, ey] = ws(e.x2, e.y2);
        ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
      } else if (e.type === 'CIRCLE') {
        drawEllipseApprox(ctx, ws, e.cx, e.cy, e.r, e.r, 0, 0, Math.PI * 2);
      } else if (e.type === 'ARC') {
        const sa = (e.startAngle || 0) * Math.PI / 180;
        const ea = (e.endAngle || 360) * Math.PI / 180;
        let end = ea;
        if (end < sa) end += Math.PI * 2;
        drawEllipseApprox(ctx, ws, e.cx, e.cy, e.r, e.r, 0, sa, end);
      } else if (e.type === 'ELLIPSE') {
        const rMaj = Math.hypot(e.majorX, e.majorY);
        const rMin = rMaj * (e.ratio || 1);
        const rot = Math.atan2(e.majorY, e.majorX);
        const sp = e.startParam == null ? 0 : e.startParam;
        const ep = e.endParam == null ? Math.PI * 2 : e.endParam;
        drawEllipseApprox(ctx, ws, e.cx, e.cy, rMaj, rMin, rot, sp, ep);
      } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        const vs = (e.vertices || []).filter(v => v.y !== undefined);
        if (vs.length < 2) continue;
        const [x0, y0] = ws(vs[0].x, vs[0].y);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < vs.length; i++) {
          const [xi, yi] = ws(vs[i].x, vs[i].y);
          ctx.lineTo(xi, yi);
        }
        if (e.closed) {
          const [xc, yc] = ws(vs[0].x, vs[0].y);
          ctx.lineTo(xc, yc);
        }
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  // Approximate a (possibly rotated) ellipse arc by polyline segments so
  // we can feed it through the worldToScreen mapping for rotation/scale.
  function drawEllipseApprox(ctx, ws, cx, cy, rMaj, rMin, rot, startAngle, endAngle) {
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    const arcLen = Math.abs(endAngle - startAngle);
    const segs = Math.max(16, Math.ceil(arcLen / (Math.PI / 32)));
    for (let i = 0; i <= segs; i++) {
      const t = startAngle + (endAngle - startAngle) * (i / segs);
      const lx = rMaj * Math.cos(t);
      const ly = rMin * Math.sin(t);
      const px = cx + lx * cosR - ly * sinR;
      const py = cy + lx * sinR + ly * cosR;
      const [sx, sy] = ws(px, py);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
  }

  window.DrillDXF = { parseDXF, drawDXF };
})();
