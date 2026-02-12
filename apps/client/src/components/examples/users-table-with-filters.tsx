/**
 * Componente de ejemplo que demuestra el uso de nuqs para filtros y paginación
 * Este componente muestra las mejores prácticas de React con URL state management
 */

'use client';

import { useEffect, useState } from 'react';


import { PAGE_SIZE_OPTIONS, type PageSizeOption } from '@repo/data';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useUserFilters } from '@/hooks/use-user-filters';

import type { MerchantSupplierStatus, UserRole } from '@repo/core';

// Mock de datos - en producción vendría de la API
const mockUsers = [
  { id: '1', name: 'Juan Pérez', email: 'juan@example.com', role: 'ADMIN', status: 'ACTIVE' },
  { id: '2', name: 'María García', email: 'maria@example.com', role: 'USER', status: 'ACTIVE' },
  { id: '3', name: 'Carlos López', email: 'carlos@example.com', role: 'USER', status: 'INACTIVE' },
  { id: '4', name: 'Ana Martínez', email: 'ana@example.com', role: 'USER', status: 'ACTIVE' },
  { id: '5', name: 'Luis Rodríguez', email: 'luis@example.com', role: 'ADMIN', status: 'ACTIVE' }
];

/**
 * Componente que demuestra:
 * 1. Sincronización automática de filtros con URL
 * 2. Type-safe query params usando nuqs
 * 3. Búsqueda con debounce (300ms)
 * 4. Paginación
 * 5. Filtros por rol y estado
 * 6. Reseteo de filtros
 * 7. Navegación con botón de atrás del navegador
 */
export function UsersTableWithFilters() {
  const {
    filters,
    setFilters,
    resetFilters,
    changePage,
    changePageSize,
    changeSort
  } = useUserFilters();

  const [filteredUsers, setFilteredUsers] = useState(mockUsers);
  const [totalPages, setTotalPages] = useState(1);

  // Aplicar filtros cada vez que cambien
  useEffect(() => {
    let result = [...mockUsers];

    // Filtro de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        user =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de rol
    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }

    // Filtro de estado
    if (filters.status) {
      result = result.filter(user => user.status === filters.status);
    }

    // Ordenamiento
    result.sort((a, b) => {
      const aValue = a[filters.sort as keyof typeof a] || '';
      const bValue = b[filters.sort as keyof typeof b] || '';
      const comparison = aValue > bValue ? 1 : -1;
      return filters.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Calcular paginación
    const total = Math.ceil(result.length / filters.pageSize);
    setTotalPages(total);

    // Aplicar paginación
    const start = (filters.page - 1) * filters.pageSize;
    const end = start + filters.pageSize;
    result = result.slice(start, end);

    setFilteredUsers(result);
  }, [filters]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tabla de Usuarios con Filtros (nuqs)</CardTitle>
        <CardDescription>
          Ejemplo de filtros type-safe sincronizados con la URL. 
          Prueba cambiar filtros y usar el botón de atrás del navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda con debounce */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <Input
              placeholder="Nombre o email..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
            />
          </div>

          {/* Filtro de rol */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rol</label>
            <Select
              value={filters.role || 'all'}
              onValueChange={(value) => 
                setFilters({ 
                  role: value === 'all' ? null : (value as UserRole), 
                  page: 1 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">Usuario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ 
                  status: value === 'all' ? null : (value as MerchantSupplierStatus), 
                  page: 1 
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="INACTIVE">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resetear filtros */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="w-full"
            >
              Resetear Filtros
            </Button>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th 
                  className="cursor-pointer p-4 text-left font-medium hover:bg-muted"
                  onClick={() => changeSort('name')}
                >
                  Nombre
                  {filters.sort === 'name' && (
                    <span className="ml-2">
                      {filters.sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th 
                  className="cursor-pointer p-4 text-left font-medium hover:bg-muted"
                  onClick={() => changeSort('email')}
                >
                  Email
                  {filters.sort === 'email' && (
                    <span className="ml-2">
                      {filters.sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="p-4 text-left font-medium">Rol</th>
                <th className="p-4 text-left font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">{user.name}</td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Resultados por página:
            </span>
            <Select
              value={filters.pageSize.toString()}
              onValueChange={(value) => changePageSize(parseInt(value) as PageSizeOption)}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(filters.page - 1)}
              disabled={filters.page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {filters.page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(filters.page + 1)}
              disabled={filters.page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>

        {/* Información de los filtros actuales (para debugging) */}
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer font-medium">
            Ver query params actuales
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
