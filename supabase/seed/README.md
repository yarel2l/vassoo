# 🧪 Configuración de Datos de Prueba

Para probar los dashboards administrativos, sigue estos pasos:

## Paso 1: Crear Usuarios en Supabase Auth

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication > Users**
3. Haz clic en **Add User** y crea estos usuarios:

### Usuario Administrador
- **Email**: `admin@vassoo.com`
- **Password**: `Admin123!@#`
- ✓ Marca "Auto Confirm User"

### Usuario Propietario de Tienda
- **Email**: `storeowner@vassoo.com`
- **Password**: `Store123!@#`
- ✓ Marca "Auto Confirm User"

## Paso 2: Ejecutar Script de Datos

1. Ve a **SQL Editor** en Supabase
2. Copia y pega el contenido de `/supabase/seed/001_demo_data.sql`
3. Ejecuta el script

## Paso 3: Verificar Datos

Ejecuta estas queries para verificar:

```sql
-- Verificar admin
SELECT * FROM platform_admins;

-- Verificar tienda
SELECT * FROM stores;

-- Verificar productos
SELECT * FROM master_products;

-- Verificar inventario
SELECT * FROM store_inventories;
```

## Paso 4: Probar en la App

### Como Administrador:
1. Inicia sesión con `admin@vassoo.com`
2. Navega a `/dashboard/admin` (próximamente)
3. Deberías ver el panel de administración de la plataforma

### Como Propietario de Tienda:
1. Inicia sesión con `storeowner@vassoo.com`
2. Navega a `/dashboard/store`
3. Deberías ver el dashboard de "Premium Spirits NYC"

---

## Datos de la Tienda Demo

| Campo | Valor |
|-------|-------|
| **Nombre** | Premium Spirits NYC |
| **Slug** | premium-spirits-nyc |
| **Dirección** | 123 Main Street, New York, NY 10001 |
| **Teléfono** | +1 555-123-4567 |
| **Licencia** | NY-LIQ-2024-001234 |
| **Rating** | 4.8 ⭐ (234 reviews) |
| **Delivery Fee** | $4.99 |
| **Min Order** | $25.00 |

## Productos Demo

| SKU | Producto | Precio |
|-----|----------|--------|
| JW-BLUE-750 | Johnnie Walker Blue Label | $189.99 |
| MC-BRUT-750 | Moët & Chandon Brut Impérial | $54.99 |
| HY-XO-750 | Hennessy XO | $199.99 |
| GG-VDK-750 | Grey Goose Vodka | $34.99 |
| DJ-1942-750 | Don Julio 1942 | $169.99 |
| PT-SLV-750 | Patrón Silver | $49.99 |
| MC-18-750 | The Macallan 18 Year | $299.99 |
| RM-XO-750 | Rémy Martin XO | $179.99 |
| BV-RSRV-750 | BV Reserve Cabernet | $44.99 |
| VP-CLQT-750 | Veuve Clicquot Yellow Label | $59.99 |
