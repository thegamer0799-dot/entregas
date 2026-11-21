const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '..', 'build');
const SVG = path.join(BUILD, 'icon.svg');

(async () => {
  // PNG 512 (Linux, e base para ICO)
  await sharp(SVG).resize(512, 512).png().toFile(path.join(BUILD, 'icon.png'));
  console.log('✓ icon.png');

  // PNGs em vários tamanhos (para icns e ico)
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const tmp = path.join(BUILD, '_tmp');
  fs.mkdirSync(tmp, { recursive: true });

  for (const s of sizes) {
    await sharp(SVG)
      .resize(s, s)
      .png()
      .toFile(path.join(tmp, `icon-${s}.png`));
  }
  console.log('✓ PNGs intermediários');

  // ICO para Windows (usa png-to-ico se disponível, senão avisa)
  try {
    const pngToIco = require('png-to-ico');
    const ico = await pngToIco([
      path.join(tmp, 'icon-16.png'),
      path.join(tmp, 'icon-24.png'),
      path.join(tmp, 'icon-32.png'),
      path.join(tmp, 'icon-48.png'),
      path.join(tmp, 'icon-64.png'),
      path.join(tmp, 'icon-128.png'),
      path.join(tmp, 'icon-256.png'),
    ]);
    fs.writeFileSync(path.join(BUILD, 'icon.ico'), ico);
    console.log('✓ icon.ico');
  } catch (e) {
    console.warn('! png-to-ico não instalado — rode: npm i -D png-to-ico');
  }

  // ICNS para macOS
  try {
    const png2icons = require('png2icons');
    const iconset = [16, 32, 64, 128, 256, 512, 1024].map((s) => ({
      size: s,
      buffer: fs.readFileSync(path.join(tmp, `icon-${s}.png`)),
    }));
    // png2icons espera um buffer; usamos o maior para gerar
    const big = fs.readFileSync(path.join(tmp, 'icon-1024.png'));
    const icns = png2icons.createICNS(big, png2icons.BILINEAR, 0);
    if (icns) {
      fs.writeFileSync(path.join(BUILD, 'icon.icns'), icns);
      console.log('✓ icon.icns');
    }
  } catch (e) {
    console.warn('! png2icons não instalado — rode: npm i -D png2icons');
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nÍcones gerados em /build');
})();
