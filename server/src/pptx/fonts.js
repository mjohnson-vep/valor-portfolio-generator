const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

// Only the three weights actually used in the deck (regular body copy, bold
// headers/company names, italic website links) get embedded — matching v1.
const EMBEDDED_FONTS = {
  EuropaRegular: 'EuropaRegular.otf',
  EuropaBold: 'EuropaBold.otf',
  EuropaRegularItalic: 'EuropaRegularItalic.otf',
};

// Embeds the Europa OTF files into the PPTX zip so the deck renders correctly
// on machines that don't have Europa installed, mirroring the font-embedding
// hack from the standalone v1 HTML tool (PptxGenJS has no native API for this).
async function embedFonts(zip) {
  for (const [name, filename] of Object.entries(EMBEDDED_FONTS)) {
    const fontPath = path.join(FONTS_DIR, filename);
    const fontBuffer = fs.readFileSync(fontPath);
    zip.file(`ppt/fonts/${name}.fntdata`, fontBuffer);
  }

  const contentTypesFile = zip.file('[Content_Types].xml');
  const contentTypesXml = await contentTypesFile.async('string');
  if (!contentTypesXml.includes('.fntdata')) {
    const patched = contentTypesXml.replace(
      '<Default Extension="rels"',
      '<Default Extension="fntdata" ContentType="application/x-fontdata"/><Default Extension="rels"'
    );
    zip.file('[Content_Types].xml', patched);
  }

  const presentationFile = zip.file('ppt/presentation.xml');
  const presentationXml = await presentationFile.async('string');
  if (!presentationXml.includes('embeddedFont')) {
    const fontDecls =
      '<p:embeddedFontLst>' +
      '<p:embeddedFont><p:font typeface="Europa"/><p:regular r:id="rIdFont1"/></p:embeddedFont>' +
      '<p:embeddedFont><p:font typeface="Europa" b="1"/><p:bold r:id="rIdFont2"/></p:embeddedFont>' +
      '<p:embeddedFont><p:font typeface="Europa" i="1"/><p:italic r:id="rIdFont3"/></p:embeddedFont>' +
      '</p:embeddedFontLst>';
    const patchedPresentation = presentationXml.replace('</p:presentation>', fontDecls + '</p:presentation>');
    zip.file('ppt/presentation.xml', patchedPresentation);

    const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
    const presRelsXml = await presRelsFile.async('string');
    const fontRels =
      '<Relationship Id="rIdFont1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="../fonts/EuropaRegular.fntdata"/>' +
      '<Relationship Id="rIdFont2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="../fonts/EuropaBold.fntdata"/>' +
      '<Relationship Id="rIdFont3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="../fonts/EuropaRegularItalic.fntdata"/>';
    const patchedRels = presRelsXml.replace('</Relationships>', fontRels + '</Relationships>');
    zip.file('ppt/_rels/presentation.xml.rels', patchedRels);
  }
}

module.exports = { embedFonts };
