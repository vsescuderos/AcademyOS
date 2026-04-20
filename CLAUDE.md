# CLAUDE.md — AcademyOS

Guía operativa para Claude Code en este repositorio. Cargada automáticamente en cada sesión.

---

## 1. Misión del proyecto

AcademyOS es un SaaS multi-tenant que centraliza la gestión operativa de academias pequeñas y medianas: alumnos, grupos, asistencia y pagos. Reemplaza WhatsApp + Excel con una herramienta cohesiva.

**El MVP cubre:** alta de academia, gestión de profesores, grupos, alumnos, registro de asistencia, pagos manuales y reporte operativo básico.

**El MVP NO cubre:** pasarelas de pago, portal de familias, facturación legal, calendarios/horarios, analítica avanzada.


---

## 2. Stack obligatorio

- **Frontend:** Next.js 14 + App Router + TypeScript
- **Backend/DB:** Supabase — PostgreSQL + Auth + RLS
- **Control de versiones:** GitHub (flujo GitHub-first)
- **Linting:** ESLint (next/core-web-vitals) + Prettier

No introducir nuevas dependencias sin justificación explícita. No salirse de este stack.

---

## 3. Dominios del sistema

| Dominio | Responsabilidad | Límite |
|---|---|---|
| `tenants` | Crear y leer academias | No gestiona usuarios ni datos operativos |
| `users` | Perfiles, roles, invitación de profesores | No gestiona auth directamente |
| `groups` | CRUD de grupos, asignación de profesor | No gestiona asistencia ni alumnos directamente |
| `students` | Alta y edición de alumnos | No gestiona auth (alumnos no son usuarios) |
| `attendance` | Sesiones de clase y registros por alumno | Solo en grupos asignados al profesor |
| `payments` | Registro y validación de pagos manuales | Solo Director. Sin pasarelas ni facturas |

---

## 4. Vertical slices del MVP

**Slice A — Asistencia**
Profesor marca asistencia en sus grupos. Director consulta en modo lectura.
Entidades: `groups`, `students`, `group_students`, `attendance_sessions`, `attendance_records`

**Slice B — Pago manual**
Director registra y valida pagos manuales por alumno (efectivo).
Entidades: `students`, `payments`

**Slice C — Pago tarjeta + Reporte**
Extiende Slice B con método `card`. Director consulta reporte operativo agregado.
Entidades: todo lo anterior combinado en consulta. Sin tabla nueva.

Orden de ejecución: A → B → C. Ver `docs/vertical-slices.md` para criterios de aceptación.

---

## 5. Reglas de seguridad (zero-trust)

- `academy_id` es la frontera absoluta de tenant. Toda operación filtra por él.
- `academy_id` lo resuelve el servidor desde `profiles` (`auth.uid()`). El cliente nunca lo envía.
- El rol lo establece el servidor. El frontend no toma decisiones de seguridad.
- Todo acceso pasa por RLS. Sin excepciones. Sin service role key en cliente.
- Un Profesor solo opera asistencia en grupos donde `groups.profesor_id = auth.uid()`.
- Profesor no tiene ningún acceso a `payments`.
- Un usuario sin entrada en `profiles` no accede a nada.

Ver `docs/security-model.md` para invariantes completas y ejemplos permitido/denegado.

---

## 6. Modelo de datos

- Todas las tablas de negocio tienen `academy_id NOT NULL`.
- `academy_id` es redundante en `group_students`, `attendance_records` — es intencional (RLS directa sin joins).
- `profiles.id = auth.uid()`. No hay user_id separado.
- `students` ≠ `profiles`. Los alumnos no se autentican.

**Fuentes canónicas de verdad:**
- Asistencia → `attendance_records` (UNIQUE por `session_id + student_id`)
- Pagos → `payments` (estados: `pending` → `validated`)
- Reportes → derivados en consulta. No son tablas. No son fuente de verdad.

Ver `docs/data-model-logical.md` para campos, relaciones e invariantes completas.

---

## 7. Contexto en Claude Code

- Trabajar por archivo o módulo pequeño. Un prompt = un cambio concreto.
- Antes de implementar, preguntar: ¿qué slice cubre esto? ¿qué criterio de aceptación?
- Siempre referenciar los docs base: `mvp-definition`, `vertical-slices`, `security-model`, `data-model-logical`.
- No asumir contexto implícito. Si algo no está en los docs, preguntar antes de inventar.
- Si el cambio toca RLS o schema: leer `security-model.md` antes de proponer.

---

## 8. Convención de archivos

- Un archivo = una responsabilidad clara.
- Máximo 200–300 líneas por archivo. Si se supera, dividir.
- Estructura por dominio, no por tipo de archivo.
- Claridad > abstracción prematura. No crear abstracciones para un único uso.
- No crear helpers genéricos sin un caso de uso real en el MVP.

---

## 9. Reglas de desarrollo

- No implementar lógica sin entender el slice y su criterio de aceptación.
- No romper RLS ni debilitar el aislamiento de tenant bajo ningún concepto.
- No introducir dependencias no justificadas.
- No añadir features fuera del MVP actual aunque parezcan útiles.
- Todo código escrito pensando en multitenancy desde el primer momento.
- Si una operación puede afectar datos de otro tenant, es un bug, no un feature.
- El flujo completo debe poder demostrarse desde la UI sin scripts ni acceso directo a DB.
