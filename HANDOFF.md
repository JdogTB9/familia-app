# HANDOFF — FamiliaApp
> Leer al inicio de la siguiente sesión para restaurar contexto.

## Estado actual (2026-09-25)

### Funcionalidades completas ✅
- **Comida** — planificación semanal con quién come qué
- **Coche** — reservas de los 3 coches (Rhodius, Mitsu, Seat)
- **Eventos** — calendario familiar
- **Compra** — lista por subsecciones con checkboxes; botón "Desmarcar comprados" (quita checks, mantiene ítems)
- **Notificaciones push** — OneSignal v16, funcionando en iPhone y Android (4+ dispositivos)
- **"Últimos movimientos"** — log de actividad en Inicio; Compra excluida
- **"Para quién"** — log correcto cuando un miembro actúa por otro

### En curso / abierto
- **Nueva sección**: pendiente. Descartadas: tablón, gastos, tareas, estado/paradero, votaciones, películas, música, cumpleaños, contraseñas.

## Decisiones clave de la sesión

| Decisión | Motivo |
|---|---|
| `once()` + union merge para eventos | `on('value')` entregaba datos parciales en red corporativa |
| Service worker en raíz (`OneSignalSDKWorker.js`) | Subpath `/onesignal/` impedía crear push subscriptions (fuera de scope) |
| Segmento `"Total Subscriptions"` en OneSignal | `"Subscribed Users"` no existe en esta app — error silencioso durante semanas |
| `filters` por tag `miembro` para excluir emisor | `excluded_external_user_ids` no funciona porque `login()` no vincula el External ID; los tags se guardan por suscripción sin depender del External ID |
| Compra excluida de logActivity | Demasiadas acciones → spam en log y notificaciones |
| `api/notify.js` en Vercel | REST API Key de OneSignal nunca en cliente ni GitHub |

## Próximos pasos concretos
1. Decidir qué sección nueva añadir (pregunta abierta al usuario)
2. Considerar excluir al emisor de su propia notificación de forma más robusta (actualmente por External ID, pero las subscriptions anónimas siempre reciben)
3. Cuando haya más suscriptores: el segmento `"Engaged Subscriptions"` (3 push subs) podría ser mejor que `"Total Subscriptions"` (5) para evitar molestar a usuarios inactivos

## Contexto técnico rápido
- Repo: `JdogTB9/familia-app` (GitHub) → auto-deploy en Vercel
- URL prod: `https://familia-app-eta.vercel.app`
- Firebase: `familia-app-2175d`, RTDB europe-west1
- OneSignal App ID: `9508f369-0b2b-4e37-9de4-d6ae4ae61fbb`
- Var entorno Vercel: `ONESIGNAL_REST_API_KEY` ✅ configurada
