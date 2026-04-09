const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const archiver = require('archiver');
const config = require('../server/config');
const { ensureInDirectory, safeRandomName } = require('../utils/fileSafety');

const outputRoot = config.paths.outputsDir;

const runCommand = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      error.message = `Failed to run ${command}: ${error.message}`;
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`${command} failed with code ${code}`);
        error.status = 500;
        error.details = stderr.slice(0, 800);
        reject(error);
      } else {
        resolve();
      }
    });
  });

const makeJobDir = async () => {
  const dir = ensureInDirectory(path.join(outputRoot, safeRandomName()), outputRoot);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
};

const listFilesWithExtension = async (dir, extension) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map((entry) => path.join(dir, entry.name))
    .sort();
};

const convertPdfToImageSet = async (inputPath, mode = 'png') => {
  const jobDir = await makeJobDir();
  const basePrefix = ensureInDirectory(path.join(jobDir, 'page'), jobDir);

  const args = [
    '-r',
    String(config.pdfRenderDpi),
    mode === 'jpeg' ? '-jpeg' : '-png',
    inputPath,
    basePrefix
  ];

  if (mode === 'jpeg') {
    args.splice(3, 0, '-jpegopt', `quality=${config.pdfJpegQuality}`);
  }

  await runCommand('pdftoppm', args, jobDir);

  const files = await listFilesWithExtension(jobDir, mode === 'jpeg' ? '.jpg' : '.png');

  if (files.length === 0) {
    const error = new Error('No converted pages generated');
    error.status = 500;
    throw error;
  }

  return { jobDir, files };
};

const convertImagesToPdf = async (imagePaths) => {
  const jobDir = await makeJobDir();
  const outPath = ensureInDirectory(path.join(jobDir, 'converted.pdf'), jobDir);

  const pdfDoc = await PDFDocument.create();

  for (const imagePath of imagePaths) {
    const imageBytes = await fs.readFile(imagePath);
    const metadata = await sharp(imageBytes).metadata();

    let image;
    if (metadata.format === 'png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }

  const bytes = await pdfDoc.save();
  await fs.writeFile(outPath, bytes, { mode: 0o600 });

  return { jobDir, files: [outPath] };
};

const compressPdf = async (inputPath) => {
  const jobDir = await makeJobDir();
  const outPath = ensureInDirectory(path.join(jobDir, 'compressed.pdf'), jobDir);

  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-dPDFSETTINGS=/${config.pdfCompressionPreset}`,
    `-sOutputFile=${outPath}`,
    inputPath
  ];

  await runCommand('gs', args, jobDir);

  return { jobDir, files: [outPath] };
};

const createZip = async (files, name = 'converted-files.zip') => {
  const firstDir = path.dirname(files[0]);
  const zipPath = ensureInDirectory(path.join(firstDir, name), firstDir);

  await new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(zipPath, { mode: 0o600 });
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    files.forEach((filePath, index) => {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: `${String(index + 1).padStart(3, '0')}-${fileName}` });
    });

    archive.finalize();
  });

  return zipPath;
};

module.exports = {
  convertPdfToImageSet,
  convertImagesToPdf,
  compressPdf,
  createZip
};
