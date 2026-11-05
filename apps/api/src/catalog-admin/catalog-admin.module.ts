import { Module } from '@nestjs/common';
import { CatalogAdminController } from './catalog-admin.controller.js';
import { CatalogAdminService } from './catalog-admin.service.js';
import { ImageStorage } from './image-storage.service.js';
import { WebRevalidator } from './web-revalidator.service.js';

@Module({
  controllers: [CatalogAdminController],
  providers: [CatalogAdminService, ImageStorage, WebRevalidator],
})
export class CatalogAdminModule {}
