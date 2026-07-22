export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Permiso {
  id: string;
  codigo: string;
  descripcion?: string | null;
}

export interface RolConPermisos extends Rol {
  editable: boolean;
  permisoIds: string[];
}

export interface MatrizPermisos {
  permisos: Permiso[];
  roles: RolConPermisos[];
}
