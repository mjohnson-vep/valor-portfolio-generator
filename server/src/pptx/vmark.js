const EMU_PER_INCH = 914400;

// The Valor "V" wordmark, traced as a single 7-point freeform (viewBox 3892x4501,
// same path used in v1's SVG watermark). Injected as native DrawingML custom
// geometry so it stays a crisp vector shape — no server-side canvas/rasterizer
// dependency needed.
const V_PATH_W = 3892;
const V_PATH_H = 4501;
const V_POINTS = [
  [0, 0],
  [1946, 4501],
  [3892, 0],
  [3100, 0],
  [1946, 3200],
  [792, 0],
];

function buildVMarkShapeXml({ id, xEmu, yEmu, cxEmu, cyEmu, color }) {
  const pathPoints = V_POINTS.map(([x, y], i) => {
    const tag = i === 0 ? 'a:moveTo' : 'a:lnTo';
    return `<${tag}><a:pt x="${x}" y="${y}"/></${tag}>`;
  }).join('');

  return (
    `<p:sp>` +
    `<p:nvSpPr><p:cNvPr id="${id}" name="Valor V Mark"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>` +
    `<a:xfrm><a:off x="${xEmu}" y="${yEmu}"/><a:ext cx="${cxEmu}" cy="${cyEmu}"/></a:xfrm>` +
    `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="0" b="0"/>` +
    `<a:pathLst><a:path w="${V_PATH_W}" h="${V_PATH_H}">${pathPoints}<a:close/></a:path></a:pathLst>` +
    `</a:custGeom>` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:ln><a:noFill/></a:ln>` +
    `</p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>` +
    `</p:sp>`
  );
}

// A large single-color V, fully visible on the right side of the slide. v1's
// original formula (ported as-is here initially) positioned the shape mostly
// off-canvas — PowerPoint only ever rendered a thin diagonal sliver of it,
// never the recognizable V. This keeps the whole mark on-slide instead.
async function addVMarkToSlide(zip, slideFileName, { slideWidthIn, slideHeightIn, heightIn, color, shapeId }) {
  const vHeightIn = Math.min(heightIn, slideHeightIn * 0.95);
  const vWidthIn = vHeightIn * (V_PATH_W / V_PATH_H);
  const xIn = slideWidthIn - vWidthIn - 0.2;
  const yIn = (slideHeightIn - vHeightIn) / 2;

  const shapeXml = buildVMarkShapeXml({
    id: shapeId,
    xEmu: Math.round(xIn * EMU_PER_INCH),
    yEmu: Math.round(yIn * EMU_PER_INCH),
    cxEmu: Math.round(vWidthIn * EMU_PER_INCH),
    cyEmu: Math.round(vHeightIn * EMU_PER_INCH),
    color,
  });

  const slideFile = zip.file(slideFileName);
  const slideXml = await slideFile.async('string');
  const patched = slideXml.replace('</p:spTree>', shapeXml + '</p:spTree>');
  zip.file(slideFileName, patched);
}

module.exports = { addVMarkToSlide };
