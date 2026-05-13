# Auditoría Operativa y Arquitectónica — SPS 704 OS
*Sistema Táctico de Gestión de Seguridad y Control de Personal*

> [!NOTE]
> Este documento representa una radiografía completa del estado actual de la plataforma SPS 704 OS. Detalla los roles, la arquitectura de interfaces, y el propósito táctico y técnico de cada función desarrollada hasta el Sprint 4.

## 1. Visión General del Sistema
SPS 704 OS es una plataforma **Enterprise-Grade de Misión Crítica**, estructurada como una Aplicación Web Progresiva (PWA). Está diseñada para garantizar el rastreo ininterrumpido de operadores de seguridad y brindar a la gerencia un control espacial, forense y administrativo en tiempo real. 

Utiliza un stack avanzado: **Next.js 16, Supabase (con PostGIS para inteligencia espacial), Mapbox GL JS para renderizado geoespacial y Framer Motion para fluidez UI**.

---

## 2. Roles de Usuario y Flujos Principales

El sistema está estrictamente dividido en dos experiencias (UX) segregadas según el perfil de seguridad:

### A. Perfil Operador (Guardia / Personal Policial)
* **Objetivo:** Ejecución de rondines, reporte de incidentes y transmisión de telemetría constante con el menor nivel de fricción posible. 
* **Diseño:** Interfaz oscura, táctica, optimizada para uso en exteriores (alto contraste) e interacción a una sola mano (Bottom Sheets).

### B. Perfil Gerente (Supervisor / Centro de Monitoreo)
* **Objetivo:** Visibilidad omnisciente, inteligencia espacial en tiempo real, auditoría forense y gestión administrativa de los recursos.
* **Diseño:** Paneles de alta densidad de información (Glassmorphism), mapas 3D renderizados a 60fps y alertas críticas modales.

---

## 3. Módulo del Operador (Patrol Experience)

El Operador tiene una interfaz minimalista focalizada en la ejecución. No hay menús complejos, sino una única vista principal (`/operador/fichaje`) gestionada por estados interactivos.

### Funciones y UI del Operador
1. **Dynamic Island (Telemetría Superior)**
   * **Qué hace:** Muestra la precisión del GPS (en metros), el estado de sincronización de red (Online/Offline) y la distancia restante al objetivo asignado.
   * **Por qué:** Da retroalimentación constante al operador sobre la calidad de su señal, evitando excusas de "falso abandono" por pérdida de satélite.
2. **Mapa de Interpolación (MobileLeaflet)**
   * **Qué hace:** Muestra un mapa 3D centrado en el usuario. Utiliza `useAnimatedPosition` para generar un movimiento fluido (flyTo/easeTo) y rota la cámara según la dirección en la que camina el operador.
   * **Por qué:** Evita saltos bruscos en el mapa (efecto teletransportación) generados por el GPS del celular, ofreciendo una experiencia premium estilo "Uber".
3. **Tactical Bottom Sheet (Fichaje & Controles)**
   * **Qué hace:** Un panel deslizable con 3 estados de "snap" (oculto, medio, completo). Contiene el botón principal de "Iniciar/Finalizar Turno" y el nombre del objetivo asignado.
   * **Por qué:** Permite limpiar la vista del mapa para ubicación espacial, pero mantiene los controles de misión a un toque del pulgar de distancia.
4. **Sistema de Geocercado (Geofence)**
   * **Qué hace:** Al intentar "Iniciar Turno", valida matemáticamente que el operador esté dentro del radio del objetivo (ej. 150m). Si no lo está, rechaza el fichaje.
   * **Por qué:** Impide el fraude laboral (fichar desde la casa o el transporte).
5. **Botón de Pánico (Atención Crítica)**
   * **Qué hace:** Un botón rojo que requiere pulsación larga (3 segundos) para activarse. Produce feedback háptico (vibración) y lanza una alerta silenciosa al servidor.
   * **Por qué:** Protege al operador en situaciones de rehén o emboscada. El retardo de 3 segundos previene falsos positivos por toques accidentales en el bolsillo.
6. **Background Tracker (Wake Lock)**
   * **Qué hace:** Mediante Service Workers e IndexedDB, mantiene el GPS activo enviando puntos cada pocos segundos aunque la pantalla se apague. Agrupa los puntos (batch de 10) para ahorrar batería.
   * **Por qué:** Android/iOS matan las apps en segundo plano. Esto asegura que el "rastro" del guardia nunca se pierda.

---

## 4. Módulo del Gerente (Command Center)

El centro neurálgico de la plataforma. Diseñado con una barra lateral izquierda de navegación rápida.

### Menú Principal y Submenús

#### 1. Mapa Táctico (`/gerente`)
* **Qué hace:** Un mapa global que renderiza polígonos (objetivos) y puntos móviles (personal activo). 
* **Por qué:** Otorga "Conciencia Situacional" (Situational Awareness). El gerente ve dónde está todo su personal en tiempo real.
* **Sub-funciones:**
  * **Listener de Emergencias:** Al recibir un pánico, bloquea la pantalla con un modal rojo pulsante, suena una alarma sonora (`emergency.mp3`) y envía Push Notification al SO del gerente. Garantiza respuesta inmediata.
  * **Creación de Objetivos:** Permite crear nuevos polígonos tocando el mapa o buscando direcciones con geocodificación de alta precisión de Mapbox. Usa la ubicación actual del gerente si está en el sitio físico evaluando al cliente.

#### 2. Objetivos (`/gerente/objetivos`)
* **Qué hace:** Listado maestro (CRM) de los clientes/edificios custodiados. Permite asignar guardias a objetivos específicos.
* **Por qué:** Administra la infraestructura estática de la empresa de seguridad.

#### 3. Personal (`/gerente/personal`)
* **Qué hace:** Listado de los operadores. Perfil detallado de cada uno (foto, nombre, DNI, rol).
* **Por qué:** Gestión de recursos humanos y auditoría de la "Fuerza Táctica".

#### 4. Libro de Guardia (`/gerente/libro`)
* **Qué hace:** El "Smart Log" de la plataforma. Registra todos los eventos: fichajes, rondines, novedades, abandonos y pánicos.
* **Por qué:** Es la herramienta probatoria legal y administrativa de la empresa.
* **Resolución de Alta Definición (Smart Reporting):**
  * **Cálculo de Abandono:** La API cruza datos automáticamente e indica no solo que el guardia se fue de la zona, sino *cuántos minutos y segundos exactos* estuvo fuera del perímetro.
  * **Reincidencia:** Analiza los últimos 7 días y estampa una etiqueta roja "Reincidente (X)" si el guardia comete fallas constantes.
  * **Zonificación Táctica:** Usa PostGIS (`ST_Contains`) para cruzar la coordenada GPS con los polígonos internos y estampar en texto en qué zona exacta ocurrió el evento (ej: "Estacionamiento Sur" en vez de coordenadas crudas).

#### 5. Planillas / Reportes (`/gerente/planillas`)
* **Qué hace:** Agrupa horas trabajadas, ausentismos y genera un "scorecard" de efectividad operativa.
* **Por qué:** Fundamental para la liquidación de sueldos (Nómina) y para presentar informes de cumplimiento al cliente final (facturación).

#### 6. Herramientas / Presupuesto (`/gerente/herramientas/presupuesto`)
* **Qué hace:** Generador automatizado de propuestas comerciales PDF para clientes nuevos.
* **Por qué:** Permite estandarizar la imagen corporativa de "Adicionales Santa Fe / 704" al emitir cotizaciones por servicios de vigilancia.

---

## 5. Auditoría de Base de Datos y Arquitectura (Supabase)

La plataforma descansa sobre bases sólidas preparadas para alta concurrencia y datos geográficos masivos:

> [!TIP]
> **PostGIS habilitado:** La tabla `objective_zones` y `objectives` almacenan geometrías espaciales que permiten cálculos de Point-In-Polygon y distancias Haversine nativas en milisegundos.

* **Patrol Trace Buffer:** La tabla de seguimiento satelital no se bombardea punto a punto. La PWA guarda 10 coordenadas localmente y las dispara juntas, reduciendo en un 90% la carga sobre el servidor y optimizando costos.
* **Realtime Sockets:** Toda la plataforma se comunica vía WebSockets. Cuando un operador aprieta un botón, el mapa del gerente y su Libro de Guardia se actualizan sin tener que recargar la página.
* **Deep Relational APIs:** El backend unificó las consultas (JOINs) para que el Frontend ya no manipule IDs técnicos (UUIDs), sino objetos JSON enriquecidos (Nombres, Avatares, Zonas calculadas).

### Conclusión de Auditoría
El sistema ha migrado exitosamente de un prototipo transaccional a una herramienta de **Inteligencia Táctica Operativa**. Las políticas de resiliencia Offline (IndexedDB), las advertencias visuales semánticas (badges, duraciones) y los mecanismos de emergencia automatizados colocan al SPS 704 OS en el rango más alto del software de gestión de seguridad privada.
