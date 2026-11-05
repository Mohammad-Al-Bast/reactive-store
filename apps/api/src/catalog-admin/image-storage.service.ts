import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from '@reactive-store/shared';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

export const UPLOADS_URL_PREFIX = '/uploads/';

/** Where uploads live on disk (UPLOAD_DIR, default ./uploads). A persistent volume in production. */
export function uploadDir(config: ConfigService) {
  return resolve(config.get<string>('UPLOAD_DIR') || 'uploads');
}

/**
 * Product photos: checked, converted to WebP (max 1600px, metadata such as GPS
 * stripped) and saved under UPLOAD_DIR/products, served at /uploads/products/….
 */
@Injectable()
export class ImageStorage {
  private readonly logger = new Logger(ImageStorage.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = uploadDir(config);
  }

  async saveProductImage(file: { buffer: Buffer; mimetype: string; size: number } | undefined): Promise<string> {
    if (!file) throw new BadRequestException('Choose an image to upload.');
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) throw new BadRequestException('The image is larger than 8 MB.');
    if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Upload a JPEG, PNG, WebP or AVIF image.');
    }

    let webp: Buffer;
    try {
      // The declared type can lie; sharp reads the actual content and rejects anything else.
      const meta = await sharp(file.buffer).metadata();
      if (!meta.format || !['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) throw new Error(meta.format);
      webp = await sharp(file.buffer, { failOn: 'error' })
        .rotate() // apply the camera orientation before metadata is dropped
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException("That file isn't a readable image.");
    }

    const dir = join(this.root, 'products');
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(join(dir, name), webp);
    return `${UPLOADS_URL_PREFIX}products/${name}`;
  }

  /** Deletes an uploaded file. Built-in images (e.g. /images/…) are left alone. */
  async remove(url: string) {
    if (!url.startsWith(`${UPLOADS_URL_PREFIX}products/`)) return;
    const name = url.slice(`${UPLOADS_URL_PREFIX}products/`.length);
    if (!/^[0-9a-f-]{36}\.webp$/.test(name)) return;
    await unlink(join(this.root, 'products', name)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') this.logger.warn(`Couldn't delete ${url}: ${err.message}`);
    });
  }
}
