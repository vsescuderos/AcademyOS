# AcademyOS MVP Definition

## 1. Problema que resuelve AcademyOS
AcademyOS resuelve el problema operativo de academias pequeñas y medianas que gestionan alumnos, grupos, asistencia y pagos de forma manual, dispersa o poco fiable, usando WhatsApp, hojas de cálculo, papel y herramientas desconectadas entre sí. Esto provoca errores de seguimiento, falta de visibilidad sobre impagos, dificultad para saber quién asiste realmente a clase, procesos administrativos lentos y poca trazabilidad para directores y profesores.

El MVP de AcademyOS busca centralizar en una sola aplicación los flujos esenciales del negocio académico diario: alta de academia, gestión básica de profesores, creación de grupos y alumnos, registro de asistencia, registro de pagos manuales y validación administrativa de esos pagos. El objetivo no es digitalizar todo el negocio desde el primer día, sino cubrir el núcleo operativo mínimo que permita a una academia trabajar mejor que con Excel y WhatsApp.

## 2. Usuario principal
El usuario principal del MVP es el **Director de la academia**.

Es quien:
- crea y configura la academia;
- da de alta a profesores;
- organiza grupos y alumnos;
- registra o supervisa pagos;
- valida el estado administrativo de cobros;
- necesita visibilidad rápida del estado de asistencia y pagos.

Como usuario secundario, el **Profesor** participa en el flujo operativo marcando asistencia de los alumnos asignados a sus grupos.

## 3. Flujo MVP extremo a extremo
El flujo extremo a extremo del MVP es el siguiente:

1. Un Director accede a la plataforma y crea su academia.
2. El sistema crea el tenant de la academia y deja aislados sus datos.
3. El Director invita o registra a un Profesor dentro de su academia.
4. El Director crea uno o varios grupos.
5. El Director registra alumnos y los asigna a un grupo.
6. El Profesor accede y visualiza únicamente los grupos y alumnos que le correspondan.
7. El Profesor registra la asistencia de los alumnos en una sesión de clase.
8. El Director registra un pago manual asociado a un alumno.
9. El Director valida administrativamente ese pago.
10. El Director consulta un reporte simple con estado de asistencia y estado de pago por alumno o grupo.

Este flujo debe funcionar de forma coherente, segura y trazable dentro de un entorno multi-tenant con permisos por rol.

## 4. No-objetivos del MVP
Los siguientes puntos quedan explícitamente fuera del alcance del MVP:

1. **Automatización completa de pagos online** con pasarelas, cobros recurrentes o reconciliación bancaria automática.
2. **Portal de familias o alumnos** con acceso propio, seguimiento académico o comunicación bidireccional.
3. **Facturación avanzada**, generación de facturas legales, impuestos, abonos o contabilidad integrada.
4. **Planificación académica avanzada**, como horarios complejos, calendario lectivo, sustituciones o gestión de aulas.
5. **Analítica avanzada o cuadros de mando complejos**, más allá de reportes operativos básicos de asistencia y pagos.

## 5. Criterio de éxito del MVP
El MVP se considerará exitoso si una academia real o simulada puede ejecutar de principio a fin su operación mínima diaria sin depender de herramientas externas para el núcleo del proceso.

Esto significa que:
- el Director puede crear y administrar su academia sin intervención manual del equipo técnico;
- puede dar de alta profesores, grupos y alumnos;
- el Profesor puede marcar asistencia de forma segura;
- el Director puede registrar y validar pagos manuales;
- los datos quedan correctamente aislados por tenant;
- los permisos por rol impiden accesos no autorizados;
- el sistema ofrece una vista clara del estado operativo básico del negocio.

A nivel de producto, el MVP debe demostrar utilidad inmediata, reducción de fricción administrativa y una arquitectura suficientemente sólida como para evolucionar sin rehacer la base.

## 6. Condición exacta para considerar el MVP “listo para demo”
El MVP estará “listo para demo” únicamente cuando se cumplan **todas** las condiciones siguientes:

- existe autenticación funcional;
- existe modelo multi-tenant operativo;
- las políticas RLS están activas y verificadas;
- el rol Director solo ve y gestiona datos de su academia;
- el rol Profesor solo ve y opera sobre los grupos/alumnos autorizados;
- el Director puede crear academia, profesor, grupo y alumno desde la interfaz;
- el Profesor puede registrar asistencia desde la interfaz;
- el Director puede registrar y validar un pago manual desde la interfaz;
- existe al menos un reporte visible de asistencia y estado de pago;
- el flujo completo puede demostrarse en menos de 10 minutos sin usar scripts manuales, acceso directo a base de datos ni arreglos temporales;
- no hay errores bloqueantes en autenticación, permisos, escritura de datos o navegación principal;
- el proyecto puede arrancarse localmente con instrucciones reproducibles y quedar desplegable sobre una base técnica limpia.

## 7. Definición práctica de demo aprobada
La demo se considera aprobada si, partiendo de una academia vacía, se puede mostrar en directo:

- creación de academia;
- alta de profesor;
- creación de grupo;
- alta y asignación de alumno;
- marcaje de asistencia;
- registro de pago manual;
- validación del pago;
- consulta final del estado del alumno en asistencia y pagos.

No escribas código ni inventes features fuera del MVP. No metas analytics, notificaciones ni calendarios aún.
Si cualquiera de esos pasos falla, requiere intervención manual fuera del producto o rompe el aislamiento de datos, el MVP no debe considerarse listo.
