import fs from "fs";
import path from "path";
import sharp from "sharp";

const publicDir = path.resolve("public");
const iconPath = path.join(publicDir, "icon-512.png");
const splashPath = path.join(publicDir, "apple-splash.png");

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.log("No icon-512.png found, skipping");
    return;
  }

  // Create a 1170x2532 canvas with clean white background and centered 200x200 icon
  const iconBuffer = await sharp(iconPath)
    .resize(220, 220, { fit: "contain" })
    .toBuffer();

  await sharp({
    create: {
      width: 1170,
      height: 2532,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: iconBuffer,
        top: Math.round((2532 - 220) / 2) - 80,
        left: Math.round((1170 - 220) / 2),
      },
    ])
    .png()
    .toFile(splashPath);

  console.log("Successfully created public/apple-splash.png");
}

main().catch(console.error);
