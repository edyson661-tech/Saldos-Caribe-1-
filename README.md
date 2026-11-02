# Visor de Ejecución SGR – Región Caribe 1

Dashboard web interactivo para consultar los datos de ejecución del Sistema General de Regalías.

## Abrirlo en Visual Studio Code

1. Abre Visual Studio Code.
2. Selecciona **Archivo > Abrir carpeta...** y elige la carpeta de este proyecto.
3. En el panel **Explorador**, abre `index.html`.
4. Instala la extensión **Live Server** de Ritwick Dey si aún no la tienes.
5. Haz clic derecho dentro de `index.html` y elige **Open with Live Server**. El navegador abrirá el tablero.
6. El archivo `datos_sgr.xlsx` se carga automáticamente.

Inicia la página con Live Server para que el visor pueda leer el Excel incluido.

## Funciones

- Filtros encadenados por departamento y municipio.
- Panel principal con filtros encadenados por departamento y municipio.
- Presupuesto, recursos asignados y saldo pendiente, con porcentajes calculados sobre el presupuesto de inversión.
- Gráfico de barras horizontales apiladas para ejecución por departamento y gráfico circular de saldo pendiente por concepto de gasto, con detalle por color, valor y porcentaje.
- Sección **Detalle por concepto de gasto** ordenada por presupuesto de mayor a menor, con columnas de departamento, municipio, tipo (identificado con íconos para departamentos y municipios), concepto, presupuesto, asignado, pendiente y una barra pequeña con el porcentaje asignado en cada registro.
- Cuatro pestañas: **📋 Ejecución por Concepto**, **💰 Fuentes de Financiación**, **🏆 Rankings** y **⚖️ Balance por Fuentes**.
- La vista de fuentes compara saldo, presupuesto y recursos asignados por fondo/departamento; incluye la composición por concepto y el porcentaje asignado.
- Los rankings muestran los 15 municipios y departamentos con mayor saldo pendiente, mayor recurso aprobado y menor recurso aprobado; destacan los tres primeros puestos con medallas e incluyen debajo de cada entidad una barra proporcional al mayor saldo de la tabla.
- La vista de balance compara presupuesto, recursos asignados y saldo pendiente por fondo. Incluye un tema oscuro opcional.

Los datos se procesan localmente en el navegador; no se envían a un servidor. SheetJS y Chart.js se cargan desde CDN, por lo que se requiere conexión a internet para utilizar todas las funciones. El visor usa Calibri Light, disponible como fuente del sistema.

Los filtros de departamento y municipio afectan todas las vistas. Los rankings separan registros `Municipio` y `Departamento` usando la columna `Tipo`; el ranking de menor recurso aprobado incluye registros con valor cero.

El archivo de datos también incluye las hojas **💰 Fuentes de financiación**, **🏆 Rankings** y **⚖️ Balance por Fuentes**, calculadas para los datos incluidos en el libro.

## Estructura esperada del Excel

La primera hoja debe tener encabezados en la primera fila. El visor identifica estas columnas:

- `Departamento`
- `Municipio`
- `Fondo`
- `Concepto de gasto`
- `Presupuesto de inversión`
- `Recursos aprobados y Asignados en SPGR`
- `Saldo pendiente de asignación`
- `Presupuesto de inversión proyectado`

También usa `Tipo` cuando está presente. Los encabezados no distinguen mayúsculas ni tildes.
