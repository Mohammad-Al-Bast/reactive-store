import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  adminProductListQuerySchema,
  categoryUpsertSchema,
  PRODUCT_IMAGE_MAX_BYTES,
  productUpsertSchema,
} from '@reactive-store/shared';
import type { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CatalogAdminService } from './catalog-admin.service.js';

const uuid = new ParseUUIDPipe();

/** Product and category editing. Under /api/admin, so the global guard requires a signed-in admin. */
@Controller('admin')
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Post('categories')
  createCategory(@Body(new ZodValidationPipe(categoryUpsertSchema)) body: z.output<typeof categoryUpsertSchema>) {
    return this.catalog.saveCategory(null, body);
  }

  @Put('categories/:id')
  saveCategory(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(categoryUpsertSchema)) body: z.output<typeof categoryUpsertSchema>,
  ) {
    return this.catalog.saveCategory(id, body);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Param('id', uuid) id: string) {
    return this.catalog.deleteCategory(id);
  }

  @Get('products')
  products(@Query(new ZodValidationPipe(adminProductListQuerySchema)) query: z.output<typeof adminProductListQuerySchema>) {
    return this.catalog.products(query);
  }

  @Get('products/:id')
  product(@Param('id', uuid) id: string) {
    return this.catalog.product(id);
  }

  @Post('products')
  createProduct(@Body(new ZodValidationPipe(productUpsertSchema)) body: z.output<typeof productUpsertSchema>) {
    return this.catalog.saveProduct(null, body);
  }

  @Put('products/:id')
  saveProduct(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(productUpsertSchema)) body: z.output<typeof productUpsertSchema>,
  ) {
    return this.catalog.saveProduct(id, body);
  }

  @Delete('products/:id')
  @HttpCode(204)
  deleteProduct(@Param('id', uuid) id: string) {
    return this.catalog.deleteProduct(id);
  }

  /** Multipart upload, field "file". Converted to WebP; returns the updated product. */
  @Post('products/:id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 } }))
  addImage(@Param('id', uuid) id: string, @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined) {
    return this.catalog.addImage(id, file);
  }

  @Delete('products/:id/images/:imageId')
  removeImage(@Param('id', uuid) id: string, @Param('imageId', uuid) imageId: string) {
    return this.catalog.removeImage(id, imageId);
  }
}
