/**
 * Hook personalizado para manejar filtros de usuarios con nuqs
 * Demuestra el uso de query params type-safe para filtros, búsqueda y paginación
 */

'use client';

import { useQueryStates } from 'nuqs';

import {
  pageParser,
  pageSizeParser,
  searchParser,
  sortParser,
  sortDirectionParser,
  userRoleFilterParser,
  statusFilterParser,
  type PageSizeOption
} from '@repo/data';

/**
 * Hook para manejar todos los filtros de la tabla de usuarios
 * Usa nuqs para sincronizar automáticamente con la URL
 * 
 * @example
 * ```tsx
 * function UsersTable() {
 *   const { filters, setFilters, resetFilters } = useUserFilters();
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={filters.search} 
 *         onChange={(e) => setFilters({ search: e.target.value })}
 *       />
 *       <p>Page: {filters.page}, Results: {filters.pageSize}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      page: pageParser,
      pageSize: pageSizeParser,
      search: searchParser,
      sort: sortParser,
      sortDirection: sortDirectionParser,
      role: userRoleFilterParser,
      status: statusFilterParser
    },
    {
      // Usar history: 'push' para agregar a la historia del navegador
      // Permite usar el botón de atrás para volver a filtros anteriores
      history: 'push',
      
      // Shallow routing (por defecto en los parsers)
      // No vuelve a ejecutar getServerSideProps/Server Components
      shallow: true,
      
      // Scroll: false para no hacer scroll al tope al cambiar filtros
      scroll: false
    }
  );

  /**
   * Resetear todos los filtros a sus valores por defecto
   */
  const resetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 10,
      search: '',
      sort: 'createdAt',
      sortDirection: 'desc',
      role: null,
      status: null
    });
  };

  /**
   * Resetear solo la paginación (útil cuando se cambian otros filtros)
   */
  const resetPagination = () => {
    setFilters({ page: 1 });
  };

  /**
   * Cambiar página con validación
   */
  const changePage = (newPage: number) => {
    if (newPage >= 1) {
      setFilters({ page: newPage });
    }
  };

  /**
   * Cambiar tamaño de página y resetear a página 1
   */
  const changePageSize = (newSize: PageSizeOption) => {
    setFilters({ pageSize: newSize, page: 1 });
  };

  /**
   * Cambiar ordenamiento y resetear a página 1
   */
  const changeSort = (column: string, direction?: 'asc' | 'desc') => {
    setFilters({
      sort: column,
      sortDirection: direction || filters.sortDirection,
      page: 1
    });
  };

  return {
    filters,
    setFilters,
    resetFilters,
    resetPagination,
    changePage,
    changePageSize,
    changeSort
  };
}
