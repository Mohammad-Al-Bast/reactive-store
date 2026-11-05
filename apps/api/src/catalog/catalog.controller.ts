import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  cartResolveRequestSchema,
  localeSchema,
  productListQuerySchema,
  slugSchema,
  type CartResolveRequest,
  type Locale,
  type ProductListQuery,
} from '@reactive-store/shared';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CatalogService } from './catalog.service.js';

const localeQuerySchema = z.object({ locale: localeSchema.optional() });

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories(@Query(new ZodValidationPipe(localeQuerySchema)) query: { locale?: Locale }) {
    return this.catalog.categories(query.locale);
  }

  @Get('products')
  products(@Query(new ZodValidationPipe(productListQuerySchema)) query: ProductListQuery) {
    return this.catalog.products(query);
  }

  @Get('products/:slug')
  product(
    @Param('slug', new ZodValidationPipe(slugSchema)) slug: string,
    @Query(new ZodValidationPipe(localeQuerySchema)) query: { locale?: Locale },
  ) {
    return this.catalog.product(slug, query.locale);
  }

  @Post('cart/resolve')
  @HttpCode(200)
  resolveCart(@Body(new ZodValidationPipe(cartResolveRequestSchema)) body: CartResolveRequest) {
    return this.catalog.resolveCart(body);
  }
}
