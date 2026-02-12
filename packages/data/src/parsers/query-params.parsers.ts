/**
 * Parsers personalizados para query params usando nuqs
 * Estos parsers se integran con Zod y son type-safe
 */

import {
  createParser,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  parseAsArrayOf,
  type ParserBuilder
} from 'nuqs';
import {
  USER_ROLE_VALUES,
  MERCHANT_SUPPLIER_STATUS_VALUES,
  type UserRole,
  type MerchantSupplierStatus
} from '@repo/core';

/**
 * Parser para paginación - página actual
 * Valor por defecto: 1
 * Rango válido: >= 1
 */
export const pageParser = parseAsInteger.withDefault(1).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Tamaños de página permitidos
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Parser para tamaño de página (items por página)
 * Valor por defecto: 10
 * Opciones válidas: 10, 25, 50, 100
 */
export const pageSizeParser = createParser({
  parse: (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return null;
    // Valida que sea una opción permitida
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(num)
      ? (num as PageSizeOption)
      : null;
  },
  serialize: (value: PageSizeOption) => value.toString()
}).withDefault(10 as PageSizeOption).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para búsqueda general
 * Valor por defecto: cadena vacía
 */
export const searchParser = parseAsString.withDefault('').withOptions({
  clearOnDefault: true,
  shallow: true,
  throttleMs: 300 // Debounce de 300ms para búsquedas
});

/**
 * Parser para ordenamiento de columnas
 * Formato: "columnName" o "-columnName" (prefijo - para descendente)
 */
export const sortParser = parseAsString.withDefault('createdAt').withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para dirección de ordenamiento
 * Valores: 'asc' | 'desc'
 */
export const sortDirectionParser = parseAsStringEnum<'asc' | 'desc'>([
  'asc',
  'desc'
]).withDefault('desc').withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para filtro de rol de usuario
 * Usa USER_ROLE_VALUES de @repo/core para evitar duplicación
 */
export const userRoleFilterParser = parseAsStringEnum<UserRole>(
  USER_ROLE_VALUES
).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para filtro de estado (basado en MerchantSupplierStatus)
 * Usa MERCHANT_SUPPLIER_STATUS_VALUES de @repo/core para evitar duplicación
 */
export const statusFilterParser = parseAsStringEnum<MerchantSupplierStatus>(
  MERCHANT_SUPPLIER_STATUS_VALUES
).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para múltiples IDs (ejemplo: filtrar por múltiples usuarios)
 */
export const idsParser = parseAsArrayOf(parseAsString).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser personalizado para fechas en formato ISO
 */
export const dateParser = createParser({
  parse: (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },
  serialize: (date: Date) => date.toISOString()
}).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para rango de fechas
 */
export const dateRangeParser = createParser({
  parse: (value: string) => {
    if (!value) return null;
    const [start, end] = value.split(',');
    if (!start || !end) return null;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }
    
    return { start: startDate, end: endDate };
  },
  serialize: (range: { start: Date; end: Date }) => 
    `${range.start.toISOString()},${range.end.toISOString()}`
}).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Parser para valores booleanos
 * Acepta: 'true', '1', 'yes' como true
 */
export const booleanParser = createParser({
  parse: (value: string) => {
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  },
  serialize: (value: boolean) => value ? 'true' : 'false'
}).withOptions({
  clearOnDefault: true,
  shallow: true
});

/**
 * Tipos inferidos para TypeScript
 */
export type PageParam = ReturnType<typeof pageParser.parseServerSide>;
export type PageSizeParam = ReturnType<typeof pageSizeParser.parseServerSide>;
export type SearchParam = ReturnType<typeof searchParser.parseServerSide>;
export type SortParam = ReturnType<typeof sortParser.parseServerSide>;
export type SortDirectionParam = ReturnType<typeof sortDirectionParser.parseServerSide>;
export type UserRoleFilterParam = ReturnType<typeof userRoleFilterParser.parseServerSide>;
export type StatusFilterParam = ReturnType<typeof statusFilterParser.parseServerSide>;
export type IdsParam = ReturnType<typeof idsParser.parseServerSide>;
export type DateParam = ReturnType<typeof dateParser.parseServerSide>;
export type DateRangeParam = ReturnType<typeof dateRangeParser.parseServerSide>;
export type BooleanParam = ReturnType<typeof booleanParser.parseServerSide>;
