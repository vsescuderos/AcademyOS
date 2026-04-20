# AcademyOS — Security Model

Modelo de seguridad del MVP. Define la frontera de aislamiento, los roles, los permisos y las invariantes que nunca pueden romperse. Sirve como base directa para implementar políticas RLS en Supabase sin ambigüedades.

No contiene SQL. El modelo es tecnológicamente agnóstico dentro de Supabase, pero cada regla aquí definida tiene una traducción directa a una política RLS o a una restricción de schema.

---

## 1. Frontera de seguridad — Tenant Boundary

### El tenant como unidad absoluta de aislamiento

En AcademyOS, el **tenant es la academia**. Cada academia es un contexto completamente aislado: sus datos, usuarios, grupos, alumnos y pagos no existen para ningún otro tenant.

El identificador de tenant es `academy_id`. Este campo está presente en **todas** las tablas de negocio y es el primer filtro aplicado en cualquier operación de lectura o escritura.

### Cómo se garantiza el aislamiento

**A nivel de base de datos:**
- Cada tabla de negocio tiene una columna `academy_id` que actúa como barrera de tenant.
- Las políticas RLS de Supabase filtran por `academy_id` antes de cualquier otra condición.
- El `academy_id` que se aplica en las políticas nunca viene del cliente. Se obtiene del perfil del usuario autenticado (`profiles.academy_id` donde `profiles.id = auth.uid()`), que es un dato server-side controlado por la base de datos.

**A nivel de aplicación:**
- El frontend nunca envía `academy_id` como parámetro de filtro en operaciones críticas.
- El frontend nunca construye condiciones de seguridad. Solo presenta datos que el servidor ya ha filtrado.
- El cliente Supabase opera con el JWT del usuario autenticado, que Supabase valida en cada request. Nunca se usa la service role key en el cliente.

### Implicaciones

- Un usuario con credenciales válidas de la academia A, aunque conozca el `academy_id` de la academia B, no puede leer, escribir ni enumerar datos de B. La RLS lo impide a nivel de motor de base de datos, antes de que llegue cualquier lógica de aplicación.
- Si un usuario no tiene entrada en `profiles`, o su perfil no tiene `academy_id` asignado, todas las políticas RLS le devuelven vacío. No existe acceso implícito.
- Las queries que hacen JOIN entre tablas deben propagar el filtro `academy_id` en cada tabla del JOIN. Un JOIN que no filtra correctamente en todas las tablas puede filtrar datos de otro tenant.

---

## 2. Roles del sistema

AcademyOS tiene tres roles en el MVP. Cada rol tiene un ámbito y unas responsabilidades distintas.

### `superadmin`

**Responsabilidades:**
- Gestión de la plataforma a nivel global (no a nivel de negocio de una academia concreta).
- Creación y administración de tenants (academias) directamente en la plataforma.
- Resolución de incidencias que requieren visibilidad cross-tenant.

**Ámbito:**
- Opera fuera del contexto de cualquier academia específica.
- No participa en los flujos operativos del MVP (asistencia, pagos, grupos).
- No es un rol al que acceda un usuario final de una academia.

**Nivel de acceso:**
- Acceso de lectura a todas las tablas de la plataforma para gestión y diagnóstico.
- No ejecuta operaciones de negocio sobre datos de academias en el flujo normal.
- En el MVP, este rol lo ejerce el equipo técnico directamente sobre Supabase (dashboard, migraciones). No tiene interfaz de usuario propia.

---

### `director`

**Responsabilidades:**
- Configurar y administrar su academia.
- Dar de alta profesores, grupos y alumnos.
- Registrar y validar pagos manuales.
- Consultar el estado operativo de su academia (asistencia, pagos).

**Ámbito:**
- Limitado estrictamente a los datos de su propia academia (`academy_id`).
- No puede ver ni intuir la existencia de otras academias.

**Nivel de acceso:**
- Lectura y escritura completa sobre todos los datos de su academia.
- Es el único rol con permiso para crear, modificar y validar pagos.
- Puede consultar cualquier sesión de asistencia y cualquier registro de pago de su academia.
- No puede escalar sus propios privilegios ni los de otros usuarios.

---

### `profesor`

**Responsabilidades:**
- Registrar la asistencia de los alumnos de los grupos que tiene asignados.
- Crear y modificar alumnos dentro de su academia.

**Ámbito:**
- Para asistencia: limitado a los grupos donde `groups.profesor_id = auth.uid()`.
- Para alumnos: limitado a los alumnos de su academia (`academy_id`).
- No accede a grupos ni perfiles que no sean el suyo propio.

**Nivel de acceso:**
- Lectura de sus grupos asignados y de los alumnos de esos grupos.
- Creación y modificación de alumnos dentro de su academia.
- Inserción y lectura de sesiones de asistencia para sus grupos.
- Inserción y lectura de registros de asistencia para las sesiones de sus grupos.
- **Sin acceso de ningún tipo a pagos.**
- No puede crear ni modificar grupos ni perfiles (propios o ajenos).

---

## 3. Matriz de permisos

Operaciones: **R** = leer, **C** = crear, **U** = modificar, **D** = eliminar, **—** = sin acceso.

| Entidad | Superadmin | Director | Profesor |
|---|---|---|---|
| `academies` | R (todas) | R (propia) | R (nombre propio, lectura mínima) |
| `profiles` | R (todas) | R+C+U (los de su academia) | R (propio únicamente) |
| `groups` | R (todas) | R+C+U+D (los de su academia) | R (solo los asignados) |
| `students` | R (todas) | R+C+U+D (los de su academia) | R+C+U (los de su academia) |
| `group_students` | R (todas) | R+C+D (los de su academia) | R (solo en grupos asignados) |
| `attendance_sessions` | R (todas) | R (las de su academia) | R+C (solo en grupos asignados) |
| `attendance_records` | R (todas) | R (los de su academia) | R+C (solo en sus sesiones) |
| `payments` | R (todas) | R+C+U (los de su academia) | — |

**Notas críticas de la matriz:**
- El Director no puede eliminar pagos. Los pagos son registros contables que deben permanecer. Solo puede crearlos y validarlos (UPDATE de `status`).
- El Profesor puede crear y modificar alumnos (`students`) dentro de su academia, pero no puede eliminarlos ni modificar su `academy_id`.
- El Profesor nunca toca `groups` ni `profiles` en escritura. Su relación con grupos es de solo lectura: los grupos le vienen asignados por el Director.
- El Profesor no hace UPDATE sobre `attendance_sessions`. Solo INSERT (crear la sesión) y SELECT.
- Ningún rol de usuario final (director, profesor) puede modificar su propio `role` ni su `academy_id` en `profiles`.

---

## 4. Invariantes de seguridad

Estas reglas **nunca pueden romperse**. Una implementación que viole cualquiera de ellas no es aceptable, independientemente del contexto o la conveniencia técnica.

### INV-1: Ningún dato cruza tenants
Todo acceso a datos de negocio —SELECT, INSERT, UPDATE o DELETE— aplica un filtro por `academy_id` derivado del perfil del usuario autenticado. No existe ninguna query de negocio que devuelva datos de múltiples academias mezclados.

### INV-2: El `academy_id` lo establece el servidor, nunca el cliente
El cliente no puede decidir a qué `academy_id` pertenece una operación. El `academy_id` efectivo siempre se resuelve server-side, leyendo `profiles.academy_id` donde `profiles.id = auth.uid()`. Cualquier `academy_id` enviado por el cliente en el body de una operación de escritura es ignorado o sobrescrito por el servidor.

### INV-3: El rol lo establece el servidor, nunca el cliente
El cliente no envía su rol como parámetro. Las políticas RLS leen `profiles.role` donde `profiles.id = auth.uid()` para determinar qué operaciones están permitidas. El frontend no toma decisiones de seguridad basadas en un rol que él mismo conoce.

### INV-4: Todo acceso pasa por RLS, sin excepciones en el flujo de negocio
Ninguna query de negocio usa la service role key ni funciones `SECURITY DEFINER` sin revisión explícita. El anon key no tiene acceso a tablas de negocio. Toda operación de usuario autenticado pasa por las políticas RLS.

### INV-5: No existe confianza implícita en el frontend
El frontend no oculta botones como única medida de seguridad. La ausencia de un botón de "Validar pago" en la vista del Profesor es UX, no seguridad. La seguridad real es que la operación falla en la base de datos si un Profesor la intenta, independientemente de si llegó desde el frontend o desde una petición directa a la API.

### INV-6: Un Profesor solo opera asistencia en grupos explícitamente asignados
La asignación de un Profesor a un grupo es una relación explícita (`groups.profesor_id = auth.uid()`). Para asistencia, no existe un acceso genérico de Profesor a "cualquier grupo de su academia". Si un grupo no tiene al Profesor asignado, el Profesor no puede crear sesiones ni registros para él. Para alumnos, el Profesor puede crear y modificar dentro del ámbito de su academia, pero no puede asignarlos a grupos por sí mismo.

### INV-7: Los campos de auditoría los escribe el servidor
`registered_by`, `validated_by`, `registered_at`, `validated_at` en `payments`; `created_by` en `attendance_sessions`. Ninguno de estos campos es enviado por el cliente. El servidor los establece usando `auth.uid()` y `now()` en el momento de la operación.

### INV-8: Un usuario sin perfil no accede a nada
Si `auth.uid()` no tiene una entrada en `profiles`, todas las políticas RLS que dependen de `profiles` devuelven vacío. No existe acceso por defecto para un usuario autenticado sin perfil asignado.

### INV-9: El reporte no bypasea RLS
La consulta que construye el reporte operativo (Slice C) aplica el filtro `academy_id` en cada tabla del JOIN. No existe una vista agregada, función o endpoint que devuelva datos sin este filtro. Los datos del reporte son exactamente los mismos datos que el Director vería tabla por tabla.

---

## 5. Modelo de aplicación de seguridad en Supabase

### Cadena de identidad

```
auth.users (Supabase Auth)
    │
    │  id = auth.uid()
    ▼
profiles
    ├── academy_id  →  identifica el tenant del usuario
    └── role        →  determina qué puede hacer
```

Todas las políticas RLS parten de esta cadena. La pregunta que responde cada política es: *¿el usuario autenticado (`auth.uid()`) pertenece a la misma academia que el dato que intenta acceder, y su rol le permite esta operación?*

### Estructura de validación en cada política

Toda política de negocio valida en este orden:

1. **Tenant check:** `academy_id` del dato = `academy_id` del perfil del usuario autenticado.
2. **Role check:** `role` del perfil del usuario autenticado tiene permiso para esta operación en esta tabla.
3. **Scope check (solo Profesor en asistencia):** el dato pertenece al grupo asignado al Profesor (`groups.profesor_id = auth.uid()`).

### Relación entre tablas de negocio y tenant

Todas las tablas de negocio tienen `academy_id`:

```
academies
    │
    ├── profiles        (academy_id, role, id=auth.uid())
    ├── groups          (academy_id, profesor_id)
    │       └── group_students   (group_id → academy_id heredado)
    ├── students        (academy_id)
    ├── attendance_sessions  (academy_id, group_id)
    │       └── attendance_records   (academy_id, session_id)
    └── payments        (academy_id, student_id)
```

El `academy_id` en tablas dependientes (`attendance_records`, `group_students`) es redundante por diseño: permite que las políticas RLS filtren directamente sin hacer joins adicionales, lo que simplifica las políticas y elimina vectores de ataque por joins mal construidos.

### Comportamiento del frontend bajo este modelo

- El frontend nunca asume permisos. Si una operación está permitida, la base de datos la ejecuta y devuelve datos. Si no, devuelve vacío o error.
- Las rutas protegidas verifican que existe una sesión activa y que el perfil del usuario tiene el rol esperado. Si no, redirigen a login o a una pantalla de error. Esta verificación es UX; la seguridad real está en RLS.
- El cliente Supabase usa el JWT del usuario (no la service role key). El JWT expira y Supabase lo renueva automáticamente. El frontend no gestiona tokens manualmente.
- Los componentes de UI que muestran u ocultan elementos según el rol (botón "Validar pago" solo para Director) se basan en el rol leído del perfil desde la base de datos, no en un estado local que el usuario pueda manipular.

---

## 6. Ejemplos de acceso permitido y denegado

### Caso 1
**Actor:** Profesor (academia A, asignado al Grupo Avanzado)
**Acción:** Abrir el listado de alumnos del Grupo Avanzado y registrar asistencia
**Resultado:** Permitido
**Motivo técnico:** `groups.profesor_id = auth.uid()` → el Profesor puede leer ese grupo. `attendance_sessions.academy_id` coincide con `profiles.academy_id` del Profesor → INSERT permitido. Los `attendance_records` se crean con `academy_id` del Profesor.

---

### Caso 2
**Actor:** Profesor (academia A, asignado al Grupo Avanzado)
**Acción:** Intentar leer el listado de alumnos del Grupo Básico (misma academia, otro profesor)
**Resultado:** Denegado — la query devuelve vacío
**Motivo técnico:** La política RLS de `groups` para el Profesor filtra por `groups.profesor_id = auth.uid()`. El Grupo Básico tiene un `profesor_id` distinto → la fila no pasa el filtro → 0 resultados devueltos.

---

### Caso 3
**Actor:** Profesor (academia A)
**Acción:** Crear un nuevo alumno en su academia
**Resultado:** Permitido
**Motivo técnico:** La política de INSERT sobre `students` permite al Profesor crear alumnos cuyo `academy_id = profiles.academy_id` del usuario autenticado. El Profesor pertenece a la academia A → INSERT permitido con `academy_id = A`.

---

### Caso 4
**Actor:** Profesor (academia A)
**Acción:** Intentar crear un nuevo grupo
**Resultado:** Denegado — error de política RLS
**Motivo técnico:** La política de INSERT sobre `groups` requiere `profiles.role = 'director'`. El perfil del Profesor tiene `role = 'profesor'` → la condición falla → operación rechazada.

---

### Caso 5
**Actor:** Profesor (academia A)
**Acción:** Intentar hacer INSERT en `payments` para registrar un pago de un alumno
**Resultado:** Denegado — error de política RLS
**Motivo técnico:** La política de INSERT sobre `payments` requiere `profiles.role = 'director'`. El perfil del Profesor tiene `role = 'profesor'` → la condición falla → operación rechazada.

---

### Caso 6
**Actor:** Director (academia A)
**Acción:** Leer todos los pagos de su academia y validar un pago pendiente
**Resultado:** Permitido
**Motivo técnico:** La política de SELECT y UPDATE sobre `payments` requiere `payments.academy_id = profiles.academy_id` y `profiles.role = 'director'`. Ambas condiciones se cumplen → operación permitida.

---

### Caso 7
**Actor:** Director (academia A)
**Acción:** Intentar leer pagos de la academia B (conociendo su `academy_id`)
**Resultado:** Denegado — la query devuelve vacío
**Motivo técnico:** La política RLS de `payments` resuelve el `academy_id` del usuario desde `profiles` usando `auth.uid()`. El Director de la academia A tiene `profiles.academy_id = A`. Los pagos de la academia B tienen `academy_id = B`. La condición de igualdad falla → 0 resultados. No hay error explícito; el filtro simplemente no devuelve esas filas.

---

### Caso 8
**Actor:** Usuario autenticado en Supabase Auth sin entrada en `profiles`
**Acción:** Cualquier SELECT sobre `groups`, `students`, `payments` o cualquier tabla de negocio
**Resultado:** Denegado — todas las queries devuelven vacío
**Motivo técnico:** Las políticas RLS buscan `profiles.academy_id` donde `profiles.id = auth.uid()`. Si no existe entrada en `profiles`, la subquery devuelve NULL. La condición `academy_id = NULL` nunca es verdadera → 0 resultados en todas las tablas.

---

### Caso 9
**Actor:** Profesor (academia A)
**Acción:** Intentar crear un `attendance_record` para un alumno de un grupo que no le está asignado, enviando directamente la petición a la API de Supabase (sin pasar por el frontend)
**Resultado:** Denegado
**Motivo técnico:** La política de INSERT sobre `attendance_records` valida que el `session_id` pertenece a una sesión cuyo `group_id` tiene `groups.profesor_id = auth.uid()`. Si el Profesor no está asignado a ese grupo, la condición falla → INSERT rechazado incluso llegando directamente a la API.

---

### Caso 10
**Actor:** Director (academia B)
**Acción:** Intentar hacer UPDATE sobre un pago de la academia A (enviando directamente una petición PATCH con el `id` del pago)
**Resultado:** Denegado — UPDATE afecta 0 filas
**Motivo técnico:** La política de UPDATE sobre `payments` filtra por `payments.academy_id = profiles.academy_id`. El Director de la academia B tiene `profiles.academy_id = B`. El pago objetivo tiene `academy_id = A`. La condición falla → el UPDATE no encuentra filas → 0 rows affected. No hay error de permisos explícito, pero el cambio no se aplica.

---

## Resumen de decisiones de diseño

| Decisión | Razón |
|---|---|
| `academy_id` en todas las tablas de negocio | Permite que cada política RLS sea autocontenida sin joins de seguridad |
| `academy_id` redundante en `attendance_records` y `group_students` | Elimina la necesidad de joins en las políticas, reduce la superficie de ataque |
| El servidor establece `registered_by`, `validated_by`, `academy_id` en escrituras | El cliente no puede falsificar autoría ni cruzar tenants en escritura |
| El Profesor tiene scope por `profesor_id` explícito en `groups` (para asistencia) | Claridad absoluta de asignación; no existe "acceso general de Profesor a asistencia de su academia" |
| El Profesor puede crear/modificar alumnos pero no grupos ni perfiles | El alta operativa de alumnos es una tarea de aula; la estructura organizativa (grupos, roles) es responsabilidad del Director |
| Los pagos no tienen DELETE | Los pagos son registros contables; errores se gestionan con estados, no con borrado |
| RLS activa por defecto, sin excepciones en flujo de usuario | Ninguna tabla de negocio es accesible sin pasar por políticas |
