# AcademyOS — Vertical Slices del MVP

Este documento define los tres slices de desarrollo del MVP de AcademyOS. Cada slice es un corte vertical completo: incluye backend (tablas, RLS, lógica de negocio) y frontend (interfaz funcional). El orden de los slices refleja la prioridad de ejecución y su dependencia incremental.

Los slices son consistentes con el flujo extremo a extremo definido en `mvp-definition.md` y no introducen ningún feature fuera de ese alcance.

---

## Slice A — Registro de Asistencia

### Actor
- **Principal:** Profesor (registra la asistencia de su grupo)
- **Secundario:** Director (puede consultar el registro resultante)

### Trigger
El Profesor accede a la vista de uno de sus grupos y abre una sesión de asistencia para la clase del día.

### Datos tocados

| Tabla | Operación | Descripción |
|---|---|---|
| `groups` | READ | El Profesor consulta los grupos donde `profesor_id = auth.uid()` |
| `students` | READ | Alumnos vinculados al grupo via `group_students` |
| `group_students` | READ | Relación muchos-a-muchos entre grupos y alumnos |
| `attendance_sessions` | INSERT / READ | Sesión de clase para un grupo y fecha concretos |
| `attendance_records` | INSERT / READ | Registro de presencia/ausencia por alumno y sesión |

**RLS crítica:**
- `groups`: Profesor solo ve filas donde `profesor_id = auth.uid()` o `academy_id = [su academia]`
- `attendance_sessions`: INSERT y SELECT restringidos a `academy_id` del usuario autenticado
- `attendance_records`: INSERT y SELECT restringidos a `academy_id`; el Profesor no puede crear registros de grupos que no le pertenecen

### Criterios de aceptación

**Backend:**
- [ ] Un Profesor autenticado no puede hacer SELECT sobre grupos de otra academia (RLS activa y verificada)
- [ ] `attendance_sessions` exige unicidad de `(group_id, date)` — no se pueden duplicar sesiones del mismo grupo el mismo día
- [ ] `attendance_records.status` acepta únicamente los valores: `present`, `absent`, `late`
- [ ] INSERT en `attendance_records` falla si `session_id` no pertenece a la misma `academy_id` del usuario
- [ ] El Director puede hacer SELECT sobre todas las sesiones y registros de su academia
- [ ] El Profesor no puede hacer SELECT sobre sesiones de grupos que no le están asignados

**Frontend:**
- [ ] El Profesor ve una lista con solo sus grupos al entrar a la sección de asistencia
- [ ] Al abrir un grupo, se muestra la lista de alumnos del grupo con selector de estado (Presente / Ausente / Tarde)
- [ ] El Profesor puede guardar la sesión con un clic; la UI confirma el guardado exitoso
- [ ] Si ya existe una sesión para ese grupo y fecha, la UI la carga con los registros previos (no crea duplicado)
- [ ] El Director puede acceder a la misma vista en modo lectura para cualquier grupo de su academia

### Demo visible
1. Profesor inicia sesión → ve solo sus grupos asignados
2. Abre "Grupo Avanzado — Lunes" → aparece lista de alumnos
3. Marca: Ana → Presente, Luis → Ausente, Marta → Tarde
4. Pulsa "Guardar asistencia" → confirmación en pantalla
5. Director entra a la misma sesión → ve los mismos registros sin posibilidad de editar

---

## Slice B — Registro y Validación de Pago Manual

### Actor
- **Principal:** Director (registra y valida pagos)
- El Profesor no tiene acceso a ninguna operación de pagos

### Trigger
El Director accede al perfil de un alumno o al módulo de pagos y registra manualmente que ese alumno ha realizado un pago.

### Datos tocados

| Tabla | Operación | Descripción |
|---|---|---|
| `students` | READ | El Director selecciona el alumno al que se asocia el pago |
| `payments` | INSERT / UPDATE / READ | Registro del pago con importe, concepto, método, estado y trazabilidad de quién lo registró y validó |

**Esquema relevante de `payments`:**
```
id              uuid PK
academy_id      uuid FK → academies
student_id      uuid FK → students
amount          numeric(10,2)
concept         text
method          text CHECK ('cash')   -- Slice B solo cubre efectivo
status          text CHECK ('pending', 'validated')
registered_by   uuid FK → profiles
validated_by    uuid FK → profiles (nullable)
registered_at   timestamptz
validated_at    timestamptz (nullable)
```

**RLS crítica:**
- `payments`: todas las operaciones (SELECT, INSERT, UPDATE) restringidas a `academy_id = [academia del usuario autenticado]`
- Solo el rol `director` puede hacer INSERT y UPDATE sobre `payments`
- El rol `profesor` no tiene ningún permiso sobre esta tabla

### Criterios de aceptación

**Backend:**
- [ ] Un Profesor autenticado recibe error de permiso al intentar INSERT o SELECT sobre `payments` de cualquier academia
- [ ] El campo `registered_by` se establece automáticamente como `auth.uid()` — el frontend no lo envía
- [ ] Un pago recién creado tiene `status = 'pending'` y `validated_by = NULL`
- [ ] La validación consiste en un UPDATE que establece `status = 'validated'`, `validated_by = auth.uid()` y `validated_at = now()`
- [ ] Un Director de la academia B no puede hacer SELECT ni UPDATE sobre pagos de la academia A (RLS)
- [ ] `amount` no acepta valores negativos ni nulos

**Frontend:**
- [ ] El Director puede abrir el formulario de registro de pago desde el perfil del alumno
- [ ] El formulario requiere: alumno (preseleccionado si viene del perfil), importe, concepto, fecha
- [ ] Al guardar, el pago aparece en la lista del alumno con estado "Pendiente de validación"
- [ ] El Director puede pulsar "Validar pago" sobre un pago pendiente; el estado cambia a "Validado" con fecha y nombre del validador visibles
- [ ] No existe botón de validar pagos en la vista del Profesor (el rol no lo permite)

### Demo visible
1. Director entra al perfil de alumno "Carlos Ruiz" → sección Pagos vacía
2. Pulsa "Registrar pago" → rellena: 80 €, "Mensualidad abril", efectivo, fecha de hoy
3. Guarda → pago aparece con estado "Pendiente"
4. Pulsa "Validar" sobre ese pago → estado cambia a "Validado — por Director, 14/04/2026"
5. Se intenta reproducir la acción desde la sesión del Profesor → botón no existe / acción bloqueada

---

## Slice C — Pago con Tarjeta + Reporte Operativo

### Actor
- **Principal:** Director (registra pago con método tarjeta y consulta el reporte)

### Trigger
- El Director registra un pago indicando que el medio fue tarjeta (no efectivo)
- El Director accede al reporte operativo de su academia para revisar el estado de asistencia y pagos por alumno o grupo

### Datos tocados

| Tabla | Operación | Descripción |
|---|---|---|
| `payments` | INSERT / READ | Extiende el campo `method` para aceptar `'card'` además de `'cash'` |
| `students` | READ | Datos de cada alumno para el reporte |
| `groups` | READ | Agrupación de alumnos en el reporte |
| `group_students` | READ | Relación para construir el reporte por grupo |
| `attendance_sessions` | READ | Total de sesiones por grupo en el período |
| `attendance_records` | READ | Registros de presencia para calcular % de asistencia por alumno |

**Cambio incremental en `payments`:**
```
method  text CHECK ('cash', 'card')   -- se extiende desde Slice B
```

**RLS crítica:**
- El reporte solo puede contener datos cuyo `academy_id` coincida con el Director autenticado
- No existe endpoint ni vista que cruce datos de múltiples academias

### Criterios de aceptación

**Backend:**
- [ ] `payments.method` acepta `'card'`; la constraint CHECK se actualiza sin romper registros previos de Slice B
- [ ] El reporte se construye con una consulta que agrega por alumno: total de sesiones, sesiones con `status = 'present'`, porcentaje de asistencia, último pago (importe + fecha + método), estado del último pago
- [ ] La consulta del reporte aplica el filtro `academy_id` en todas las tablas involucradas (sin joins que puedan filtrar datos cross-tenant)
- [ ] El reporte no requiere ninguna función SQL privilegiada ni bypass de RLS

**Frontend:**
- [ ] El formulario de pago (Slice B) incluye selector de método: Efectivo / Tarjeta
- [ ] El método seleccionado es visible en el historial de pagos del alumno
- [ ] Existe una página de Reporte accesible solo para el Director
- [ ] El reporte muestra una tabla con columnas: Alumno, Grupo, Asistencia (X/Y sesiones — Z%), Último pago, Método, Estado del pago
- [ ] El reporte puede filtrarse por grupo
- [ ] El reporte se carga directamente desde la interfaz sin acceso a base de datos ni scripts externos

### Demo visible
1. Director registra nuevo pago para alumno "Ana Torres" → selecciona método Tarjeta → guarda
2. Historial de Ana muestra dos pagos: uno en Efectivo (Slice B), otro en Tarjeta (Slice C)
3. Director navega a "Reporte" → carga tabla con todos los alumnos de su academia
4. Tabla muestra: Ana Torres — Grupo Avanzado — 8/10 sesiones (80%) — último pago 80 € tarjeta — Validado
5. Director filtra por "Grupo Básico" → la tabla se actualiza mostrando solo los alumnos de ese grupo
6. Se verifica que el reporte de la academia B (en otra sesión) no muestra los datos de la academia A

---

## Dependencias entre slices

```
Slice A  ──→  Slice B  ──→  Slice C
               (requiere       (extiende B
               autenticación   y consume A
               y alumnos       para el reporte)
               de Slice A)
```

Slice A puede desarrollarse en paralelo con la configuración del tenant y la gestión de alumnos/grupos, ya que solo necesita que existan `groups`, `students` y `group_students` poblados. Slice B depende de que existan alumnos. Slice C depende de que B esté completo y de que A haya generado datos de asistencia.

---

## Lo que estos slices NO cubren

Coherente con `mvp-definition.md §4`:

- Pasarelas de pago, cobros recurrentes o reconciliación bancaria
- Portal de familias o alumnos
- Generación de facturas legales
- Horarios, calendarios o planificación académica avanzada
- Analítica más allá del reporte operativo básico definido en Slice C
