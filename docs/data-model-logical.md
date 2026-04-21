# AcademyOS — Modelo de Datos Lógico (MVP)

Modelo de datos lógico del MVP. Define las entidades, sus relaciones, los campos críticos, la fuente canónica de verdad y las invariantes que deben cumplirse. Orientado a implementación directa en Supabase (PostgreSQL + RLS).

No incluye SQL. El SQL de creación de tablas y políticas RLS va en los archivos de migración de Supabase.

---

## 1. Entidades del MVP

### `academies` — Tenant

Es la raíz del sistema multi-tenant. Cada academia es un tenant independiente. Todos los datos de negocio cuelgan de esta entidad.

**Propósito en el negocio:** representa la academia como organización. Una academia tiene su propio Director, sus profesores, sus grupos y sus alumnos. Sus datos son completamente invisibles para cualquier otra academia.

---

### `profiles` — Usuarios del sistema

Extiende `auth.users` de Supabase con los datos de negocio del usuario: a qué academia pertenece activamente y qué rol tiene. Es el puente entre la identidad de autenticación y el modelo de datos.

**Propósito en el negocio:** determina quién es el usuario dentro del sistema, qué academia ve en este momento y qué puede hacer. Sin un perfil válido, un usuario autenticado no tiene acceso a nada.

**Decisión de diseño:** `profiles.id` es igual a `auth.uid()`. No se crea un `user_id` separado. Esto simplifica las políticas RLS, que pueden usar `auth.uid()` directamente para localizar el perfil del usuario autenticado.

**Para el Director:** `profiles.academy_id` representa la **academia activa** en la sesión actual. El Director puede tener varias academias (ver `director_academies`), pero las políticas RLS filtran siempre por la academia activa. Cambiar de academia actualiza este campo.

---

### `director_academies` — Relación Director ↔ Academias

Tabla de unión que registra todas las academias que un Director puede gestionar. Permite que un Director sea propietario de múltiples academias manteniendo el aislamiento total entre ellas.

**Propósito en el negocio:** un Director puede crear y administrar varias academias (por ejemplo, una sede principal y una filial). En cada sesión trabaja sobre una sola academia activa, determinada por `profiles.academy_id`. La tabla `director_academies` es la fuente de verdad de a qué academias tiene acceso un Director.

**Decisión de diseño:** la academia activa se almacena en `profiles.academy_id` en lugar de en una cookie de sesión, para que las políticas RLS continúen funcionando sin cambios. Al cambiar de academia, el servidor actualiza `profiles.academy_id` previa verificación de que el Director tiene acceso en `director_academies`.

---

### `groups` — Grupos de alumnos

Un grupo es la unidad operativa de enseñanza: un conjunto de alumnos asignado a un Profesor. Es el contexto en el que ocurre la asistencia.

**Propósito en el negocio:** organiza a los alumnos en unidades manejables. El Profesor trabaja siempre en el contexto de un grupo. Un grupo tiene un único Profesor responsable en el MVP.

---

### `students` — Alumnos

Representa a los alumnos de la academia. Son entidades de datos, no usuarios del sistema: no tienen cuenta en `auth.users` ni acceso a la aplicación en el MVP.

**Propósito en el negocio:** es la entidad central del negocio. Todo lo operativo —asistencia y pagos— gira alrededor del alumno. Se gestiona de forma independiente a los grupos porque un alumno puede cambiar de grupo o existir sin estar en ninguno temporalmente.

**Decisión de diseño:** `students` está separado de `profiles` / `auth.users` deliberadamente. Mezclarlos obligaría a crear cuentas de autenticación para personas que no usan la aplicación. La separación mantiene el sistema de autenticación limpio y permite evolucionar hacia un portal de alumnos sin romper el modelo base.

---

### `group_students` — Membresía de alumnos en grupos

Tabla de unión que modela la relación N:M entre grupos y alumnos. Un alumno puede pertenecer a más de un grupo dentro de la misma academia.

**Propósito en el negocio:** define qué alumnos están matriculados en cada grupo. Es la base sobre la que el Profesor ve su lista de alumnos al registrar asistencia.

---

### `attendance_sessions` — Sesiones de clase

Representa una clase concreta: un grupo en una fecha determinada. Es el contexto en el que se registra la asistencia individual de cada alumno.

**Propósito en el negocio:** agrupa todos los registros de asistencia de una clase. Permite saber cuántas clases ha habido para un grupo y en qué fechas. Actúa como "cabecera" del parte de asistencia.

**Decisión de diseño:** separar la sesión de los registros individuales (dos tablas en lugar de una) permite:
1. Registrar que una clase ocurrió aunque todos los alumnos faltaran.
2. Garantizar unicidad a nivel de sesión (`group_id` + `date`) de forma simple.
3. El Profesor abre una sesión y marca a todos los alumnos en un único flujo, sin crear un registro por alumno de forma independiente.

---

### `attendance_records` — Registros de asistencia individuales

Un registro por alumno por sesión. Contiene el estado de ese alumno en esa clase concreta.

**Propósito en el negocio:** es la fuente de verdad de si un alumno asistió, faltó o llegó tarde a una clase. Desde aquí se calculan los porcentajes de asistencia del reporte.

---

### `payments` — Pagos manuales

Registra los pagos que el Director asocia a un alumno. Incluye trazabilidad de quién lo registró y quién lo validó.

**Propósito en el negocio:** permite al Director hacer seguimiento de cobros sin depender de una hoja de cálculo. Cada pago tiene un ciclo de vida mínimo: se registra como pendiente y se valida cuando el Director confirma el cobro. Es un registro contable simplificado, no una pasarela de pago.

---

## 2. Relaciones entre entidades

### Diagrama de relaciones

```
academies
    │
    ├──(1:N)── profiles         (usuarios de la academia)
    │               │
    │               └── [rol: profesor] ──(1:N)── groups
    │
    ├──(1:N)── groups
    │               │
    │               └──(N:M via group_students)── students
    │               │
    │               └──(1:N)── attendance_sessions
    │                               │
    │                               └──(1:N)── attendance_records
    │                                               │
    │                                               └──(N:1)── students
    │
    ├──(1:N)── students
    │               │
    │               └──(1:N)── payments
    │
    └──(1:N)── payments
```

### Relaciones clave

| Relación | Tipo | Descripción |
|---|---|---|
| `profiles` (director) ↔ `academies` | N:M via `director_academies` | Un Director puede gestionar múltiples academias |
| `academies` → `profiles` | 1:N | Una academia tiene múltiples usuarios con roles |
| `academies` → `groups` | 1:N | Una academia tiene múltiples grupos |
| `academies` → `students` | 1:N | Una academia tiene múltiples alumnos |
| `profiles` (profesor) → `groups` | 1:N | Un Profesor puede tener múltiples grupos asignados |
| `groups` ↔ `students` | N:M | Un alumno puede estar en varios grupos; un grupo tiene varios alumnos |
| `groups` → `attendance_sessions` | 1:N | Un grupo puede tener múltiples sesiones (una por clase) |
| `attendance_sessions` → `attendance_records` | 1:N | Una sesión tiene un registro por alumno del grupo |
| `students` → `attendance_records` | 1:N | Un alumno aparece en múltiples registros de asistencia |
| `students` → `payments` | 1:N | Un alumno puede tener múltiples pagos registrados |

### Justificación de decisiones relacionales

**Por qué `group_students` y no un array en `groups`:**
La relación N:M requiere una tabla de unión para poder consultar en ambas direcciones eficientemente: "qué alumnos hay en este grupo" y "en qué grupos está este alumno". También permite añadir metadatos de la matrícula (fecha de alta) sin denormalizar.

**Por qué `attendance_sessions` + `attendance_records` y no una sola tabla:**
Una tabla plana de tipo `(student_id, group_id, date, status)` no permitiría saber si una clase ocurrió sin alumnos presentes, dificultaría la unicidad correcta y mezclaría dos conceptos distintos: la sesión (evento grupal) y el registro individual. La separación refleja el modelo real del negocio.

**Por qué `students` no hereda de `profiles`:**
Los alumnos no son usuarios del sistema en el MVP. Forzar esa relación crearía cuentas de autenticación innecesarias y acoplaría dos modelos con ciclos de vida distintos. El desacoplamiento permite al Director crear alumnos sin que ellos tengan que registrarse.

---

## 3. Campos críticos por entidad

### `academies`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador del tenant |
| `name` | text NOT NULL | Nombre visible de la academia |
| `created_at` | timestamptz | Fecha de creación del tenant |

---

### `profiles`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK = auth.uid() | Mismo ID que el usuario en Supabase Auth |
| `academy_id` | uuid FK → academies NULLABLE | Academia activa del usuario (tenant actual de la sesión) |
| `role` | text NOT NULL | Rol del usuario: `director`, `profesor`, `superadmin` |
| `full_name` | text NOT NULL | Nombre completo del usuario |
| `email` | text | Denormalizado desde auth.users para facilitar listados |
| `created_at` | timestamptz | Fecha de creación del perfil |

**Restricciones:**
- `role` solo acepta los valores `director`, `profesor`, `superadmin` (CHECK constraint).
- `academy_id` puede ser NULL para el Director (si aún no ha creado ninguna academia). Para el Profesor, siempre tiene valor.
- Ningún usuario puede modificar su propio `role` directamente (gestionado por RLS). El cambio de `academy_id` del Director se hace exclusivamente mediante la acción `cambiarAcademia` que verifica `director_academies`.

---

### `director_academies`

| Campo | Tipo | Descripción |
|---|---|---|
| `director_id` | uuid PK+FK → profiles | Director propietario |
| `academy_id` | uuid PK+FK → academies | Academia gestionada |
| `created_at` | timestamptz | Fecha de asociación |

**Restricciones:**
- PK compuesta `(director_id, academy_id)`: un Director no puede estar vinculado dos veces a la misma academia.
- CASCADE en ambas FK: si se elimina un Director o una Academia, el vínculo desaparece automáticamente.
- RLS: un Director solo puede leer sus propios vínculos (`director_id = auth.uid()`).

---

### `groups`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador del grupo |
| `academy_id` | uuid FK → academies NOT NULL | Tenant al que pertenece el grupo |
| `profesor_id` | uuid FK → profiles NOT NULL | Profesor responsable del grupo |
| `name` | text NOT NULL | Nombre del grupo (ej: "Grupo Avanzado — Lunes") |
| `created_at` | timestamptz | Fecha de creación |

**Restricciones:**
- `profesor_id` debe ser un perfil con `role = 'profesor'` y mismo `academy_id` que el grupo.
- El nombre del grupo debe ser único dentro de la misma academia: UNIQUE (`academy_id`, `name`).

---

### `students`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador del alumno |
| `academy_id` | uuid FK → academies NOT NULL | Tenant al que pertenece el alumno |
| `full_name` | text NOT NULL | Nombre completo del alumno |
| `email` | text | Contacto opcional |
| `phone` | text | Contacto opcional |
| `created_at` | timestamptz | Fecha de alta |
| `updated_at` | timestamptz | Última modificación |

**Restricciones:**
- Un alumno pertenece a exactamente una academia. No puede cambiar de `academy_id`.
- `full_name` no puede ser vacío.

---

### `group_students`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador de la membresía |
| `group_id` | uuid FK → groups NOT NULL | Grupo al que pertenece el alumno |
| `student_id` | uuid FK → students NOT NULL | Alumno matriculado |
| `academy_id` | uuid FK → academies NOT NULL | Redundante: facilita RLS sin joins |
| `enrolled_at` | timestamptz | Fecha de matriculación en el grupo |

**Restricciones:**
- UNIQUE (`group_id`, `student_id`): un alumno no puede estar matriculado dos veces en el mismo grupo.
- `group_id` y `student_id` deben pertenecer al mismo `academy_id`. Un alumno de la academia A no puede estar en un grupo de la academia B.

---

### `attendance_sessions`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador de la sesión |
| `academy_id` | uuid FK → academies NOT NULL | Tenant. Redundante para RLS directa |
| `group_id` | uuid FK → groups NOT NULL | Grupo al que corresponde la sesión |
| `date` | date NOT NULL | Fecha de la clase |
| `created_by` | uuid FK → profiles NOT NULL | Profesor que abrió la sesión |
| `created_at` | timestamptz | Timestamp de creación del registro |

**Restricciones:**
- UNIQUE (`group_id`, `date`): no puede haber dos sesiones del mismo grupo en la misma fecha.
- `created_by` debe ser el `profesor_id` del grupo (o el Director). Verificado por RLS.

---

### `attendance_records`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador del registro |
| `academy_id` | uuid FK → academies NOT NULL | Redundante: facilita RLS directa |
| `session_id` | uuid FK → attendance_sessions NOT NULL | Sesión a la que pertenece el registro |
| `student_id` | uuid FK → students NOT NULL | Alumno al que corresponde |
| `status` | text NOT NULL | Estado de asistencia: `present`, `absent`, `late` |
| `created_at` | timestamptz | Timestamp de creación del registro |

**Restricciones:**
- UNIQUE (`session_id`, `student_id`): un alumno tiene exactamente un registro por sesión. No puede marcarse dos veces.
- `status` solo acepta `present`, `absent`, `late` (CHECK constraint).
- `student_id` debe pertenecer al mismo `academy_id` que la sesión.

---

### `payments`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | Identificador del pago |
| `academy_id` | uuid FK → academies NOT NULL | Tenant al que pertenece el pago |
| `student_id` | uuid FK → students NOT NULL | Alumno al que se asocia el pago |
| `amount` | numeric(10,2) NOT NULL | Importe del pago |
| `concept` | text NOT NULL | Descripción del pago (ej: "Mensualidad abril") |
| `method` | text NOT NULL | Medio de pago: `cash`, `card` |
| `status` | text NOT NULL | Estado del pago: `pending`, `validated` |
| `registered_by` | uuid FK → profiles NOT NULL | Director que registró el pago |
| `validated_by` | uuid FK → profiles | Director que validó el pago (nullable) |
| `registered_at` | timestamptz NOT NULL | Momento del registro |
| `validated_at` | timestamptz | Momento de la validación (nullable) |
| `created_at` | timestamptz | Timestamp de creación del registro |

**Restricciones:**
- `amount` > 0: no se admiten pagos negativos ni nulos.
- `method` solo acepta `cash`, `card` (CHECK constraint).
- `status` solo acepta `pending`, `validated` (CHECK constraint).
- `registered_by` y `validated_by` deben ser perfiles con `role = 'director'` del mismo `academy_id`.
- `validated_by` y `validated_at` son NULL hasta que el pago se valida. Ambos se establecen juntos.
- Los pagos no se eliminan. No existe DELETE en el flujo normal.

---

## 4. Fuente canónica de datos

### Asistencia

**Fuente de verdad:** `attendance_records`.

Una asistencia válida es exactamente un registro en `attendance_records` con:
- `session_id` que apunta a una `attendance_session` real y activa.
- `student_id` que pertenece a la misma academia y está matriculado en el grupo de esa sesión.
- `status` con un valor válido: `present`, `absent` o `late`.

**Cómo se evita la duplicidad:**
- La constraint UNIQUE (`session_id`, `student_id`) en `attendance_records` impide que el mismo alumno tenga dos registros en la misma sesión.
- La constraint UNIQUE (`group_id`, `date`) en `attendance_sessions` impide que haya dos sesiones del mismo grupo el mismo día, lo que eliminaría la ambigüedad sobre a cuál pertenece el registro.

**No existe otra tabla de asistencia.** Los porcentajes de asistencia, totales y medias se calculan en tiempo de consulta sobre `attendance_records` + `attendance_sessions`. No se materializan en tablas separadas.

---

### Pagos

**Fuente de verdad:** `payments`.

**Estados posibles:**

```
[INSERT] → pending → [UPDATE por Director] → validated
```

- `pending`: el Director ha registrado el pago pero aún no lo ha validado formalmente. Puede representar un pago esperado o un cobro registrado que requiere confirmación.
- `validated`: el Director ha confirmado que el pago es correcto. Se registra quién validó (`validated_by`) y cuándo (`validated_at`).

**Qué significa "validado":** el Director ha revisado el pago y lo marca como cobrado y conforme. En el MVP, esta acción es puramente administrativa: no genera factura, no activa ningún proceso externo. Es el equivalente digital de marcar una fila en una hoja de cálculo como "pagado".

No existe estado `rejected` ni `cancelled` en el MVP. Un error en un pago se gestiona con un nuevo registro correcto, no eliminando el anterior.

---

### Reportes

**Los reportes no son una tabla.** Son el resultado de combinar las tablas existentes en tiempo de consulta.

El reporte operativo del Director (Slice C) combina:
- `students` → datos del alumno (nombre)
- `groups` + `group_students` → grupo al que pertenece
- `attendance_sessions` + `attendance_records` → total de sesiones y presencias
- `payments` → último pago, método y estado

**El reporte nunca es fuente de verdad.** Si hay discrepancia entre el reporte y los datos de las tablas base, las tablas base tienen razón. El reporte es una vista derivada, siempre recalculada.

No se crean vistas materializadas ni tablas de agregación para el MVP.

---

## 5. Invariantes de datos

Reglas que el modelo debe cumplir en todo momento. Combinan constraints de base de datos, validaciones de RLS y lógica de negocio.

### ID-1: Toda entidad de negocio tiene `academy_id`
Las tablas `groups`, `students`, `group_students`, `attendance_sessions`, `attendance_records` y `payments` tienen `academy_id NOT NULL`. `profiles.academy_id` puede ser NULL para un Director sin academia aún creada. No existe un registro operativo (grupos, alumnos, asistencia, pagos) sin tenant asignado.

### ID-2: Un alumno pertenece a exactamente un tenant
`students.academy_id` es inmutable una vez creado el registro. Un alumno no puede transferirse entre academias ni existir en dos academias simultáneamente.

### ID-3: No puede existir un grupo sin Profesor asignado
`groups.profesor_id` es NOT NULL. Un grupo siempre tiene un Profesor responsable en el MVP.

### ID-4: Un alumno no puede estar dos veces en el mismo grupo
UNIQUE (`group_id`, `student_id`) en `group_students`. La matriculación es única por combinación grupo-alumno.

### ID-5: No puede haber dos sesiones del mismo grupo el mismo día
UNIQUE (`group_id`, `date`) en `attendance_sessions`. Si el Profesor intenta abrir una sesión para un grupo en una fecha ya registrada, la operación falla. El sistema devuelve la sesión existente.

### ID-6: Un alumno tiene exactamente un registro de asistencia por sesión
UNIQUE (`session_id`, `student_id`) en `attendance_records`. No puede marcarse como presente y ausente en la misma clase.

### ID-7: Los datos de grupos y alumnos deben pertenecer al mismo tenant
Un alumno de la academia A no puede matricularse en un grupo de la academia B. La constraint se aplica verificando que `group_students.student_id` y `group_students.group_id` comparten el mismo `academy_id`. Lo mismo aplica a `attendance_records`: `session_id` y `student_id` deben pertenecer al mismo `academy_id`.

### ID-8: Un pago siempre está asociado a un alumno y a un tenant
`payments.student_id` y `payments.academy_id` son NOT NULL. No existe un pago huérfano.

### ID-9: La validación de un pago es atómica
`validated_by` y `validated_at` se establecen juntos al validar. Si uno está presente el otro también. No puede haber un pago con `validated_by` pero sin `validated_at`, ni viceversa.

### ID-10: Los campos de auditoría los establece el servidor
`registered_by`, `validated_by`, `created_by` (en sesiones) y todos los campos `*_at` se escriben desde el servidor usando `auth.uid()` y `now()`. El cliente no los envía.

---

## 6. Consideraciones para RLS

### Tablas que requieren RLS obligatoria

| Tabla | Razón |
|---|---|
| `profiles` | Contiene el rol y la academia de cada usuario. No puede ser accesible sin restricción |
| `groups` | Datos de estructura de la academia |
| `students` | Datos personales de alumnos |
| `group_students` | Membresías que determinan el scope del Profesor |
| `attendance_sessions` | Registros de clase con implicaciones de privacidad |
| `attendance_records` | Datos de asistencia individual de alumnos |
| `payments` | Datos financieros sensibles |

`academies` tiene RLS más permisiva (un usuario puede leer el nombre de su propia academia), pero nunca permite acceso cross-tenant.

### Campo de filtrado primario

`academy_id` es el campo de aislamiento en todas las tablas. Toda política RLS parte de:

```
academy_id = (SELECT academy_id FROM profiles WHERE id = auth.uid())
```

Este lookup se hace dentro de la política, no lo calcula el cliente.

### Campo de filtrado secundario (Profesor en asistencia)

Para operaciones de escritura del Profesor sobre `attendance_sessions` y `attendance_records`, se aplica además:

```
group_id → groups.profesor_id = auth.uid()
```

El Profesor solo puede crear sesiones y registros en grupos donde está asignado como `profesor_id`.

### Campos redundantes y su función en RLS

`academy_id` aparece en `group_students`, `attendance_sessions` y `attendance_records` aunque podría derivarse por JOIN. Esta redundancia es intencionada:

- Permite escribir políticas RLS simples con un único filtro directo.
- Elimina la posibilidad de ataques por joins mal construidos que "filtren" datos de otro tenant.
- Las políticas RLS de Supabase se ejecutan por fila. Un filtro directo sobre `academy_id` en la propia tabla es más seguro y más eficiente que un subquery con JOIN.

### Conexión con el modelo de seguridad

Este modelo de datos es la implementación directa de las reglas definidas en `security-model.md`:

| Regla de seguridad | Implementación en el modelo |
|---|---|
| INV-1: ningún dato cruza tenants | `academy_id NOT NULL` en todas las tablas + RLS por `academy_id` |
| INV-2: `academy_id` lo establece el servidor | Se deriva de `profiles` en la política, no viene del cliente |
| INV-6: Profesor opera solo en grupos asignados | `groups.profesor_id = auth.uid()` como condición adicional en RLS de sesiones y registros |
| INV-7: campos de auditoría los escribe el servidor | `registered_by`, `validated_by`, `created_by` establecidos en el servidor |
| INV-8: usuario sin perfil no accede a nada | Si `profiles` no devuelve fila para `auth.uid()`, todas las políticas devuelven vacío |
