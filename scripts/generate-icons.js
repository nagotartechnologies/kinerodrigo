const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public');
const iconPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  console.log('🎨 Generando iconos PWA...\n');

  if (!fs.existsSync(iconPath)) {
    console.error('❌ Error: No se encontró icon.svg en la carpeta public');
    console.log('💡 Crea un archivo icon.svg o reemplázalo con tu logo');
    return;
  }

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(iconPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 79, g: 70, b: 229, alpha: 1 } // #4F46E5
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generar favicon
  try {
    await sharp(iconPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✅ Generado: favicon.ico');
  } catch (error) {
    console.error('❌ Error generando favicon:', error.message);
  }

  console.log('\n🎉 ¡Iconos PWA generados exitosamente!');
  console.log('💡 Puedes reemplazar icon.svg con tu propio logo y volver a ejecutar este script');
}

generateIcons().catch(console.error);
