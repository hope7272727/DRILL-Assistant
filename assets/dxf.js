/* Minimal DXF parser + renderer for drill-point comparison.
 * Handles common 2D entities: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE(+VERTEX),
 * ELLIPSE, SPLINE. Per-entity color (AutoCAD Color Index) and per-layer color
 * are extracted so each segment renders in its source color when present.
 * Not a full DXF implementation — blocks/inserts, text, hatches, etc. are skipped.
 */
(function () {
  // AutoCAD Color Index → CSS color. 0=ByBlock and 256=ByLayer return null so
  // the renderer can fall back to the layer or user-set default.
  const ACI = {
    1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff',
    5: '#0000ff', 6: '#ff00ff', 7: '#ffffff',
    8: '#808080', 9: '#c0c0c0',
  };
  function aciToCss(aci) {
    if (aci == null || aci === 0 || aci === 256) return null;
    if (ACI[aci]) return ACI[aci];
    return null; // unknown ACI → caller fallback
  }

  function parseDXF(text) {
    const lines = text.split(/\r\n|\r|\n/);
    // Collect code/value pairs
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = parseInt(lines[i].trim(), 10);
      if (Number.isNaN(code)) continue;
      pairs.push({ code, value: lines[i + 1] });
    }

    // -------- LAYER table parsing (to resolve ByLayer entity colors) --------
    const layerColors = {}; // name -> css color string
    {
      let i = 0;
      // Find TABLES section
      while (i < pairs.length - 1) {
        if (pairs[i].code === 0 && pairs[i].value.trim() === 'SECTION' &&
            pairs[i + 1].code === 2 && pairs[i + 1].value.trim() === 'TABLES') {
          i += 2; break;
        }
        i++;
      }
      // Walk TABLES section, capture LAYER records
      while (i < pairs.length) {
        const p = pairs[i];
        const sv = p.value.trim();
        if (p.code === 0 && sv === 'ENDSEC') break;
        if (p.code === 0 && sv === 'LAYER') {
          let name = null, color = null;
          i++;
          while (i < pairs.length && pairs[i].code !== 0) {
            if (pairs[i].code === 2) name = pairs[i].value.trim();
            else if (pairs[i].code === 62) color = parseInt(pairs[i].value, 10);
            i++;
          }
          if (name && color != null) {
            const css = aciToCss(Math.abs(color));
            if (css) layerColors[name] = css;
          }
          continue;
        }
        i++;
      }
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
        if (sv === 'SPLINE') { cur.controlPts = []; cur.fitPts = []; cur.knots = []; }
        idx++;
        continue;
      }

      if (!cur) { idx++; continue; }

      // Common entity attributes (apply to every entity type).
      if (code === 8) { cur.layer = value.trim(); idx++; continue; }
      if (code === 62) { cur.color = parseInt(value, 10); idx++; continue; }

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
      } else if (cur.type === 'SPLINE') {
        // 10/20 = control point, 11/21 = fit point, 71 = degree, 70 = flags (1=closed)
        if (code === 10) cur._cpX = v;
        else if (code === 20 && cur._cpX !== undefined) {
          cur.controlPts.push({ x: cur._cpX, y: v });
          cur._cpX = undefined;
        } else if (code === 11) cur._fpX = v;
        else if (code === 21 && cur._fpX !== undefined) {
          cur.fitPts.push({ x: cur._fpX, y: v });
          cur._fpX = undefined;
        } else if (code === 40) cur.knots.push(v);
        else if (code === 71) cur.degree = parseInt(value, 10);
        else if (code === 70) cur.closed = (parseInt(value, 10) & 1) === 1;
      }
      idx++;
    }
    flush();

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const upd = (x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    for (const e of entities) {
      if (e.type === 'LINE') { upd(e.x1, e.y1); upd(e.x2, e.y2); }
      else if (e.type === 'CIRCLE' || e.type === 'ARC') {
        upd(e.cx - e.r, e.cy - e.r); upd(e.cx + e.r, e.cy + e.r);
      } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        for (const v of (e.vertices || [])) {
          if (v.y !== undefined) upd(v.x, v.y);
        }
      } else if (e.type === 'ELLIPSE') {
        const mag = Math.hypot(e.majorX || 0, e.majorY || 0);
        upd(e.cx - mag, e.cy - mag); upd(e.cx + mag, e.cy + mag);
      } else if (e.type === 'SPLINE') {
        for (const p of (e.controlPts || [])) { if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) upd(p.x, p.y); }
        for (const p of (e.fitPts || [])) { if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) upd(p.x, p.y); }
      }
    }
    const bbox = (minX < maxX)
      ? { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
      : null;

    return { entities, bbox, layerColors };
  }

  function isRenderable(e) {
    if (e.type === 'LINE') return e.x1 !== undefined && e.x2 !== undefined;
    if (e.type === 'CIRCLE' || e.type === 'ARC') return e.cx !== undefined && e.r !== undefined;
    if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      return (e.vertices || []).filter(v => v.y !== undefined).length >= 2;
    }
    if (e.type === 'ELLIPSE') return e.cx !== undefined && e.majorX !== undefined;
    if (e.type === 'SPLINE') return (e.controlPts && e.controlPts.length >= 2) || (e.fitPts && e.fitPts.length >= 2);
    return false;
  }

  // Approximate a SPLINE with line segments using de Boor's algorithm on the
  // control points + knot vector. If knots/degree missing, fall back to the
  // fit points (which the spline interpolates through).
  function evalSpline(e, samples) {
    const cps = e.controlPts || [];
    const knots = e.knots || [];
    const degree = e.degree || 3;
    if (cps.length < degree + 1 || knots.length < cps.length + degree + 1) return null;
    const tMin = knots[degree];
    const tMax = knots[knots.length - degree - 1];
    if (!(tMax > tMin)) return null;
    const maxSpan = cps.length - 1; // clamp so cps[span - degree + j] is always in range
    const out = [];
    for (let i = 0; i <= samples; i++) {
      // Pull samples slightly inside [tMin, tMax) so the span search never lands past the last valid span.
      let t = tMin + (tMax - tMin) * (i / samples);
      if (t >= tMax) t = tMax - (tMax - tMin) * 1e-9;
      let span = degree;
      while (span < maxSpan && knots[span + 1] <= t) span++;
      // de Boor recursion
      const d = [];
      let valid = true;
      for (let j = 0; j <= degree; j++) {
        const cp = cps[span - degree + j];
        if (!cp) { valid = false; break; }
        d[j] = { x: cp.x, y: cp.y };
      }
      if (!valid) continue;
      for (let r = 1; r <= degree; r++) {
        for (let j = degree; j >= r; j--) {
          const i0 = span - degree + j;
          const denom = (knots[i0 + degree - r + 1] - knots[i0]);
          if (denom === 0) continue;
          const a = (t - knots[i0]) / denom;
          d[j].x = (1 - a) * d[j - 1].x + a * d[j].x;
          d[j].y = (1 - a) * d[j - 1].y + a * d[j].y;
        }
      }
      out.push({ x: d[degree].x, y: d[degree].y });
    }
    return out.length >= 2 ? out : null;
  }

  // Render parsed DXF onto a canvas at the given placement.
  // placement: { cx, cy (screen px, center), scale, rotationRad, color, lineWidth, alpha }
  function drawDXF(ctx, dxf, placement) {
    if (!dxf || !dxf.entities || !dxf.entities.length) return;
    const { entities } = dxf;
    const { cx, cy, scale, rotationRad, color, lineWidth, alpha } = placement;
    const cosR = Math.cos(rotationRad || 0);
    const sinR = Math.sin(rotationRad || 0);
    // Anchor at the DXF coordinate origin (0,0). Cleaned DXFs should have the
    // drill center placed at (0,0); see DXF saving convention.
    const bx = 0;
    const by = 0;

    // world -> screen: translate bbox centre to origin, scale (with DXF y-up
    // -> canvas y-down flip), rotate, translate to placement.
    function ws(px, py) {
      const lx = (px - bx) * scale;
      const ly = -(py - by) * scale;
      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;
      return [cx + rx, cy + ry];
    }

    const layerColors = (dxf && dxf.layerColors) || {};
    const defaultColor = color || '#00ff00';
    function effectiveColor(e) {
      // Per-entity ACI color wins (unless ByLayer / ByBlock).
      const c = aciToCss(e.color);
      if (c) return c;
      // ByLayer fallback.
      if (e.layer && layerColors[e.layer]) return layerColors[e.layer];
      return defaultColor;
    }

    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 1;
    ctx.lineWidth = lineWidth || 2;

    // Issue one stroke per entity so per-entity colors take effect.
    function startStroke(e) {
      ctx.strokeStyle = effectiveColor(e);
      ctx.beginPath();
    }
    function endStroke() { ctx.stroke(); }

    for (const e of entities) {
      if (e.type === 'LINE') {
        startStroke(e);
        const [sx, sy] = ws(e.x1, e.y1);
        const [ex, ey] = ws(e.x2, e.y2);
        ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
        endStroke();
      } else if (e.type === 'CIRCLE') {
        startStroke(e);
        drawEllipseApprox(ctx, ws, e.cx, e.cy, e.r, e.r, 0, 0, Math.PI * 2);
        endStroke();
      } else if (e.type === 'ARC') {
        startStroke(e);
        const sa = (e.startAngle || 0) * Math.PI / 180;
        const ea = (e.endAngle || 360) * Math.PI / 180;
        let end = ea;
        if (end < sa) end += Math.PI * 2;
        drawEllipseApprox(ctx, ws, e.cx, e.cy, e.r, e.r, 0, sa, end);
        endStroke();
      } else if (e.type === 'ELLIPSE') {
        startStroke(e);
        const rMaj = Math.hypot(e.majorX, e.majorY);
        const rMin = rMaj * (e.ratio || 1);
        const rot = Math.atan2(e.majorY, e.majorX);
        const sp = e.startParam == null ? 0 : e.startParam;
        const ep = e.endParam == null ? Math.PI * 2 : e.endParam;
        drawEllipseApprox(ctx, ws, e.cx, e.cy, rMaj, rMin, rot, sp, ep);
        endStroke();
      } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        const vs = (e.vertices || []).filter(v => v.y !== undefined);
        if (vs.length < 2) continue;
        startStroke(e);
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
        endStroke();
      } else if (e.type === 'SPLINE') {
        // Try de Boor evaluation against control points + knots; fall back to
        // straight-line interpolation through the fit points.
        let pts = evalSpline(e, 64);
        if (!pts && e.fitPts && e.fitPts.length >= 2) pts = e.fitPts;
        if (!pts || pts.length < 2) continue;
        startStroke(e);
        const [x0, y0] = ws(pts[0].x, pts[0].y);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
          const [xi, yi] = ws(pts[i].x, pts[i].y);
          ctx.lineTo(xi, yi);
        }
        endStroke();
      }
    }

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
