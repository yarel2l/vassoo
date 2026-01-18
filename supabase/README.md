# Supabase Database Setup

Este directorio contiene toda la configuración de base de datos para el Multivendor Store.

## 📁 Estructura de Archivos

```
supabase/
├── README.md              # Este archivo
├── schema.sql             # ✨ Schema consolidado (~2800 líneas)
├── seed.sql               # ✨ Datos iniciales consolidados
├── config.toml            # Configuración de Supabase
├── migrations/            # Migraciones originales (35+ archivos)
├── seed/                  # Seeds originales
└── functions/             # Edge Functions
```

## 🚀 Instalación Rápida

### Opción 1: Instalación Limpia (Recomendada)

Usa los archivos consolidados para una instalación más simple:

#### Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Anota la URL y la `anon key` / `service_role key`

#### Paso 2: Ejecutar Schema

En el **SQL Editor** de Supabase Dashboard:

```sql
-- Copiar y pegar el contenido completo de schema.sql
-- Este archivo crea TODA la estructura de la base de datos:
-- - Extensiones (uuid-ossp, postgis, pg_trgm, pgcrypto)
-- - Tipos ENUM
-- - Tablas (50+)
-- - Índices y Foreign Keys
-- - Triggers y Funciones
-- - Row Level Security (RLS) Policies
-- - Storage Buckets
```

#### Paso 3: Crear Usuarios de Prueba

En **Authentication > Users**, crea estos usuarios:

| Email | Password | Descripción |
|-------|----------|-------------|
| `admin@vassoo.com` | `Admin123!@#` | Administrador de la plataforma |
| `storeowner@vassoo.com` | `Store123!@#` | Dueño de tienda demo |

#### Paso 4: Ejecutar Seed Data

En el **SQL Editor** de Supabase Dashboard:

```sql
-- Copiar y pegar el contenido completo de seed.sql
-- Este archivo crea:
-- - 51 Estados de USA
-- - Tarifas de plataforma por defecto
-- - Categorías y marcas de productos
-- - Configuración de la plataforma
-- - Contenido de páginas (CMS)
-- - Datos de demostración (tienda, productos)
```

#### Paso 5: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

---

### Opción 2: Usando Migraciones (Para desarrollo)

Si prefieres usar el sistema de migraciones de Supabase CLI:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Enlazar con tu proyecto
supabase link --project-ref <tu-project-ref>

# Ejecutar migraciones
supabase db push

# O para desarrollo local
supabase start
supabase db reset
```

---

## 📊 Estructura de la Base de Datos

### Extensiones Utilizadas

| Extensión | Uso |
|-----------|-----|
| `uuid-ossp` | Generación de UUIDs |
| `postgis` | Datos geoespaciales (ubicaciones, delivery radius) |
| `pg_trgm` | Búsqueda fuzzy de texto |
| `pgcrypto` | Encriptación de datos sensibles |

### Tablas Principales

#### Core/Auth
- `profiles` - Perfiles de usuario extendidos
- `platform_admins` - Administradores de la plataforma
- `user_addresses` - Direcciones de usuario

#### Multi-tenant
- `tenants` - Organizaciones (tiendas, delivery companies)
- `tenant_memberships` - Membresías de usuarios en tenants
- `tenant_invitations` - Invitaciones pendientes

#### Tiendas
- `stores` - Información de tiendas
- `store_locations` - Ubicaciones físicas
- `store_schedules` - Horarios de operación
- `store_delivery_settings` - Configuración de delivery

#### Productos
- `master_products` - Catálogo maestro de productos
- `store_inventories` - Inventario por tienda
- `product_categories` - Categorías
- `product_brands` - Marcas

#### Promociones
- `store_promotions` - Promociones de tiendas
- `flash_sales` - Ventas flash
- `coupons` - Cupones de descuento
- `mix_match_deals` - Ofertas mix & match

#### Órdenes
- `orders` - Pedidos
- `order_items` - Items del pedido
- `order_status_history` - Historial de estados
- `order_audit_log` - Auditoría de cambios

#### Delivery
- `delivery_drivers` - Conductores
- `deliveries` - Entregas
- `delivery_location_history` - Tracking de ubicación

#### Jurisdicción (USA)
- `us_states` - Estados de USA
- `jurisdictions` - Jurisdicciones fiscales
- `tax_rates` - Tasas de impuestos

### Diagrama de Relaciones Simplificado

```
profiles (users)
    │
    ├─── platform_admins
    │
    ├─── tenant_memberships ─── tenants
    │                               │
    │                               ├─── stores
    │                               │      │
    │                               │      ├─── store_locations
    │                               │      ├─── store_inventories
    │                               │      └─── store_schedules
    │                               │
    │                               └─── delivery_companies
    │                                      │
    │                                      └─── delivery_drivers
    │
    ├─── orders ─── order_items
    │      │
    │      └─── deliveries
    │
    └─── user_favorites
```

---

## 🔐 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las políticas principales:

- **Profiles**: Usuarios solo ven/editan su propio perfil
- **Stores**: Lectura pública, escritura solo por miembros del tenant
- **Orders**: Usuarios ven sus pedidos, tiendas ven pedidos de su tienda
- **Inventories**: Lectura pública, gestión por tienda

---

## 🔄 Funciones y Triggers Principales

### Funciones de Negocio

| Función | Descripción |
|---------|-------------|
| `search_products_v2()` | Búsqueda avanzada con fuzzy matching |
| `find_stores_nearby()` | Buscar tiendas por ubicación |
| `calculate_order_totals()` | Calcular totales de orden |
| `validate_order_for_checkout()` | Validar orden antes de pago |
| `assign_delivery_driver()` | Asignar driver a entrega |

### Triggers

| Trigger | Descripción |
|---------|-------------|
| `on_auth_user_created` | Crea perfil al registrar usuario |
| `trigger_update_order_totals` | Actualiza totales cuando cambian items |
| `trigger_inventory_change` | Registra cambios de inventario |
| `trigger_order_status_change` | Registra cambios de estado |

---

## 🗄️ Storage Buckets

| Bucket | Uso | Acceso |
|--------|-----|--------|
| `products` | Imágenes de productos | Público |
| `stores` | Logos y fotos de tiendas | Público |
| `profiles` | Avatares de usuarios | Público |
| `documents` | Documentos privados | Autenticado |
| `id-verification` | Documentos de verificación | Privado |

---

## 📝 Notas Importantes

1. **PostGIS**: Asegúrate de que PostGIS esté habilitado en tu proyecto Supabase
2. **Extensiones**: El schema habilita automáticamente las extensiones necesarias
3. **RLS**: Todas las tablas tienen RLS habilitado por seguridad
4. **Usuarios demo**: Los usuarios de prueba requieren creación manual en Auth

---

## 🔧 Solución de Problemas

### Error: Extension "postgis" not found
```sql
-- En el SQL Editor
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Error: Permission denied
Asegúrate de usar la `service_role` key para operaciones administrativas.

### Error: RLS policy violation
Verifica que el usuario tenga los permisos necesarios o usa `service_role`.

---

## 📚 Archivos de Referencia

- [schema.sql](./schema.sql) - Schema completo consolidado
- [seed.sql](./seed.sql) - Datos iniciales
- [migrations/](./migrations/) - Migraciones individuales (referencia)
- [ORDER_FULFILLMENT_FLOW.md](../docs/ORDER_FULFILLMENT_FLOW.md) - Flujo de órdenes
