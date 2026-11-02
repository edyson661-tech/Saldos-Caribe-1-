const PAGE_SIZE = 12;

const moneyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const compactMoneyFormat = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormat = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

const elements = {
  dataStatus: document.querySelector("#data-status"),
  statusDot: document.querySelector(".status-dot"),
  errorMessage: document.querySelector("#error-message"),
  departmentFilter: document.querySelector("#department-filter"),
  municipalityFilter: document.querySelector("#municipality-filter"),
  filterSummary: document.querySelector("#filter-summary"),
  budgetValue: document.querySelector("#budget-value"),
  budgetPercent: document.querySelector("#budget-percent"),
  budgetBar: document.querySelector("#budget-bar"),
  assignedValue: document.querySelector("#assigned-value"),
  assignedPercent: document.querySelector("#assigned-percent"),
  assignedBar: document.querySelector("#assigned-bar"),
  balanceValue: document.querySelector("#balance-value"),
  balancePercent: document.querySelector("#balance-percent"),
  balanceBar: document.querySelector("#balance-bar"),
  tableBody: document.querySelector("#records-body"),
  tableCount: document.querySelector("#table-count"),
  pageSummary: document.querySelector("#page-summary"),
  previousPage: document.querySelector("#previous-page"),
  nextPage: document.querySelector("#next-page"),
  departmentChart: document.querySelector("#department-chart"),
  conceptChart: document.querySelector("#concept-chart"),
  departmentChartWrap: document.querySelector("#department-chart-wrap"),
  conceptChartWrap: document.querySelector("#concept-chart-wrap"),
  conceptLegend: document.querySelector("#concept-legend"),
  fundingBody: document.querySelector("#funding-body"),
  fundingCount: document.querySelector("#funding-count"),
  compositionBody: document.querySelector("#composition-body"),
  conceptCount: document.querySelector("#concept-count"),
  highestBalanceBody: document.querySelector("#highest-balance-body"),
  highestApprovedBody: document.querySelector("#highest-approved-body"),
  lowestApprovedBody: document.querySelector("#lowest-approved-body"),
  departmentHighestBalanceBody: document.querySelector("#department-highest-balance-body"),
  departmentHighestApprovedBody: document.querySelector("#department-highest-approved-body"),
  departmentLowestApprovedBody: document.querySelector("#department-lowest-approved-body"),
  fundSourceChart: document.querySelector("#fund-source-chart"),
  fundExecutionChart: document.querySelector("#fund-execution-chart"),
  balanceSourceChart: document.querySelector("#balance-source-chart"),
  balanceExecutionChart: document.querySelector("#balance-execution-chart"),
  balanceDepartmentChart: document.querySelector("#balance-department-chart"),
};

let records = [];
let currentPage = 1;
let charts = {};
let fundingMetric = "balance";
const conceptColors = [
  "#1565c0",
  "#e65100",
  "#2e7d32",
  "#7b1fa2",
  "#00838f",
  "#c62828",
  "#6d4c41",
  "#3949ab",
  "#558b2f",
  "#ad1457",
  "#ef6c00",
  "#0277bd",
  "#9e9d24",
  "#5e35b1",
  "#00897b",
  "#d81b60",
  "#546e7a",
];
const departmentColors = new Map([
  ["cesar", "#556b2f"],
  ["la guajira", "#f28c28"],
  ["magdalena", "#17365d"],
  ["atlantico", "#7b2cbf"],
]);
const otherDepartmentColor = "#607d8b";

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function parseAmount(value, rowNumber, label) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let text = String(value).trim().replace(/[^\d,.-]/g, "");
  if (!text) return 0;

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma !== -1) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if ((text.match(/\./g) || []).length > 1) {
    text = text.replace(/\./g, "");
  }

  const amount = Number(text);
  if (!Number.isFinite(amount)) {
    throw new Error(`El valor de "${label}" en la fila ${rowNumber} no es un número válido.`);
  }
  return amount;
}

function getColumnIndexes(headerRow) {
  const headers = headerRow.map(normalizeHeader);
  const find = (name) => headers.indexOf(normalizeHeader(name));
  const columns = {
    department: find("Departamento"),
    municipality: find("Municipio"),
    fund: find("Fondo"),
    concept: find("Concepto de gasto"),
    type: find("Tipo"),
    budget: find("Presupuesto de inversión"),
    assigned: find("Recursos aprobados y Asignados en SPGR"),
    balance: find("Saldo pendiente de asignación"),
    projected: find("Presupuesto de inversión proyectado"),
  };
  const required = [
    ["department", "Departamento"],
    ["municipality", "Municipio"],
    ["fund", "Fondo"],
    ["concept", "Concepto de gasto"],
    ["budget", "Presupuesto de inversión"],
    ["assigned", "Recursos aprobados y Asignados en SPGR"],
    ["balance", "Saldo pendiente de asignación"],
    ["projected", "Presupuesto de inversión proyectado"],
  ];
  const missing = required.filter(([key]) => columns[key] === -1).map(([, label]) => label);
  if (missing.length) {
    throw new Error(`No se encontraron estas columnas obligatorias: ${missing.join(", ")}.`);
  }
  return columns;
}

function readRows(rows) {
  if (!rows.length || !rows[0]) {
    throw new Error("La primera hoja del archivo no contiene encabezados.");
  }

  const columns = getColumnIndexes(rows[0]);
  const parsed = [];

  rows.slice(1).forEach((row, index) => {
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) return;

    const rowNumber = index + 2;
    const department = String(row[columns.department] ?? "").trim();
    const municipality = String(row[columns.municipality] ?? "").trim();
    const fund = String(row[columns.fund] ?? "").trim();
    if (!department && !municipality && !fund) return;

    parsed.push({
      department: department || "Sin departamento",
      municipality: municipality || "Sin municipio",
      fund: fund || "Sin fondo",
      concept: columns.concept === -1 ? "" : String(row[columns.concept] ?? "").trim(),
      type: columns.type === -1 ? "Sin tipo" : String(row[columns.type] ?? "").trim() || "Sin tipo",
      budget: parseAmount(row[columns.budget], rowNumber, "Presupuesto de inversión"),
      assigned: parseAmount(row[columns.assigned], rowNumber, "Recursos asignados"),
      balance: parseAmount(row[columns.balance], rowNumber, "Saldo pendiente"),
      projected: parseAmount(row[columns.projected], rowNumber, "Presupuesto proyectado"),
    });
  });

  if (!parsed.length) {
    throw new Error("No se encontraron registros con departamento, municipio o fondo.");
  }
  return parsed;
}

async function loadWorkbook(file) {
  elements.errorMessage.hidden = true;
  elements.dataStatus.textContent = `Leyendo ${file.name}...`;
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("El archivo no contiene hojas de cálculo.");

    const importedRecords = readRows(
      XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: true }),
    );
    records = importedRecords;
    currentPage = 1;
    populateFilters();
    updateDashboard();
    elements.dataStatus.textContent = `${file.name} · ${numberFormat.format(records.length)} registros`;
    elements.statusDot.classList.add("is-ready");
  } catch (error) {
    elements.dataStatus.textContent = "No se pudo cargar el archivo";
    elements.errorMessage.textContent =
      error instanceof Error ? error.message : "Ocurrió un error inesperado al leer el archivo.";
    elements.errorMessage.hidden = false;
  }
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"));
}

function setOptions(select, values, allLabel) {
  const selected = select.value;
  select.replaceChildren(new Option(allLabel, ""));
  values.forEach((value) => select.add(new Option(value, value)));
  select.value = values.includes(selected) ? selected : "";
}

function populateFilters() {
  const departments = uniqueSorted(records.map((record) => record.department));
  elements.departmentFilter.disabled = false;
  setOptions(elements.departmentFilter, departments, "Todos los departamentos");
  updateMunicipalityOptions();
}

function updateMunicipalityOptions() {
  const department = elements.departmentFilter.value;
  const municipalities = uniqueSorted(
    records
      .filter((record) => !department || record.department === department)
      .map((record) => record.municipality),
  );
  elements.municipalityFilter.disabled = false;
  setOptions(elements.municipalityFilter, municipalities, "Todos los municipios");
}

function getFilteredRecords() {
  const department = elements.departmentFilter.value;
  const municipality = elements.municipalityFilter.value;
  return records.filter(
    (record) =>
      (!department || record.department === department) &&
      (!municipality || record.municipality === municipality),
  );
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

function formatMoney(value) {
  return moneyFormat.format(value);
}

function updateMetrics(filtered) {
  const budget = sumBy(filtered, "budget");
  const assigned = sumBy(filtered, "assigned");
  const balance = sumBy(filtered, "balance");
  const assignedPercent = budget === 0 ? 0 : (assigned / budget) * 100;
  const balancePercent = budget === 0 ? 0 : (balance / budget) * 100;
  const formatPercent = (value) =>
    `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;

  elements.budgetValue.textContent = formatMoney(budget);
  elements.assignedValue.textContent = formatMoney(assigned);
  elements.balanceValue.textContent = formatMoney(balance);
  elements.budgetPercent.textContent = "100%";
  elements.assignedPercent.textContent = formatPercent(assignedPercent);
  elements.balancePercent.textContent = formatPercent(balancePercent);
  elements.budgetBar.style.width = "100%";
  elements.assignedBar.style.width = `${Math.min(Math.max(assignedPercent, 0), 100)}%`;
  elements.balanceBar.style.width = `${Math.min(Math.max(balancePercent, 0), 100)}%`;

  const municipalityCount = new Set(filtered.map((record) => record.municipality)).size;
  elements.filterSummary.textContent = `${numberFormat.format(filtered.length)} registros · ${numberFormat.format(
    municipalityCount,
  )} municipios`;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 7,
          boxHeight: 7,
          padding: 17,
          color: "#71818c",
          font: { family: '"Calibri Light", Calibri, sans-serif', size: 10 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatMoney(context.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: "#82919a",
          font: { family: '"Calibri Light", Calibri, sans-serif', size: 9 },
          callback: (value) => compactMoneyFormat.format(value),
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#71818c",
          font: { family: '"Calibri Light", Calibri, sans-serif', size: 10 },
        },
        border: { display: false },
      },
    },
  };
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => chart.destroy());
  charts = {};
}

function renderCharts(filtered) {
  if (!filtered.length) return;

  const departments = [...new Set(filtered.map((record) => record.department))]
    .map((department) => {
      const rows = filtered.filter((record) => record.department === department);
      return {
        department,
        assigned: sumBy(rows, "assigned"),
        balance: sumBy(rows, "balance"),
        budget: sumBy(rows, "budget"),
      };
    })
    .sort((a, b) => b.budget - a.budget);

  const concepts = [...new Set(filtered.map((record) => record.concept || "Sin concepto"))]
    .map((concept) => {
      const rows = filtered.filter((record) => (record.concept || "Sin concepto") === concept);
      return {
        concept,
        budget: sumBy(rows, "budget"),
        balance: sumBy(rows, "balance"),
      };
    })
    .sort((a, b) => b.budget - a.budget);

  const chartHeight = Math.max(340, departments.length * 31 + 90, concepts.length * 25 + 90);
  elements.departmentChartWrap.style.height = `${chartHeight}px`;
  elements.conceptChartWrap.style.height = "300px";
  charts.department = new Chart(elements.departmentChart, {
    type: "bar",
    data: {
      labels: departments.map((item) => item.department),
      datasets: [
        {
          label: "Asignado",
          data: departments.map((item) => item.assigned),
          backgroundColor: departments.map(
            (item) => departmentColors.get(normalizeHeader(item.department)) ?? otherDepartmentColor,
          ),
          borderRadius: 4,
          barPercentage: 0.7,
          maxBarThickness: 28,
        },
        {
          label: "Pendiente",
          data: departments.map((item) => item.balance),
          backgroundColor: "#a8d08d",
          borderRadius: 4,
          barPercentage: 0.7,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      scales: {
        x: {
          ...chartOptions().scales.x,
          stacked: true,
        },
        y: { ...chartOptions().scales.y, stacked: true },
      },
      plugins: {
        ...chartOptions().plugins,
        tooltip: {
          callbacks: {
            label: (context) => {
              const department = departments[context.dataIndex];
              const amount = context.raw;
              const percent = department.budget === 0 ? 0 : (amount / department.budget) * 100;
              return `${context.dataset.label}: ${formatMoney(amount)} (${percent.toLocaleString(
                "es-CO",
                { maximumFractionDigits: 1 },
              )}% del presupuesto)`;
            },
          },
        },
      },
    },
  });

  charts.concept = new Chart(elements.conceptChart, {
    type: "doughnut",
    data: {
      labels: concepts.map((item) => item.concept),
      datasets: [
        {
          label: "Saldo pendiente de asignación",
          data: concepts.map((item) => item.balance),
          backgroundColor: concepts.map((_, index) => conceptColors[index % conceptColors.length]),
          borderColor: getComputedStyle(document.documentElement).getPropertyValue("--white").trim(),
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => concepts[items[0].dataIndex].concept,
            label: (context) => {
              const totalBalance = sumBy(concepts, "balance");
              const percent = totalBalance === 0 ? 0 : (context.raw / totalBalance) * 100;
              return `${formatMoney(context.raw)} (${formatPercent(percent)})`;
            },
          },
        },
      },
    },
  });

  const totalConceptBalance = sumBy(concepts, "balance");
  elements.conceptLegend.innerHTML = concepts
    .map((item, index) => {
      const percent = totalConceptBalance === 0 ? 0 : (item.balance / totalConceptBalance) * 100;
      const color = conceptColors[index % conceptColors.length];
      return `
        <div class="concept-legend-item">
          <span class="concept-legend-swatch" style="--concept-color: ${color}" aria-hidden="true"></span>
          <span class="concept-legend-copy">
            <span class="concept-legend-name" title="${escapeHtml(item.concept)}">${escapeHtml(item.concept)}</span>
            <span class="concept-legend-value">${formatMoney(item.balance)} · ${formatPercent(percent)}</span>
          </span>
        </div>`;
    })
    .join("");

}

function renderFundingCharts(filtered) {
  if (!filtered.length) return;
  const funds = [...aggregateBy(filtered, (record) => record.fund || "Sin fondo").entries()]
    .map(([fund, values]) => ({ fund, ...values }))
    .sort((a, b) => b.budget - a.budget);
  const departments = uniqueSorted(filtered.map((record) => record.department));
  const colors = ["#3185a5", "#3e9a80", "#d59a43", "#6177ad", "#bd6f52"];
  const metric = fundingMetric;

  charts.fundSource = new Chart(elements.fundSourceChart, {
    type: "bar",
    data: {
      labels: funds.map((item) => item.fund),
      datasets: departments.map((department, index) => ({
        label: department,
        data: funds.map((fund) =>
          sumBy(
            filtered.filter(
              (record) => record.fund === fund.fund && record.department === department,
            ),
            metric,
          ),
        ),
        backgroundColor: colors[index % colors.length],
        borderRadius: 3,
      })),
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      scales: {
        x: { ...chartOptions().scales.x, stacked: true },
        y: { ...chartOptions().scales.y, stacked: true },
      },
    },
  });

  charts.fundExecution = new Chart(elements.fundExecutionChart, {
    type: "bar",
    data: {
      labels: funds.map((item) => item.fund),
      datasets: [
        {
          label: "Asignado del presupuesto",
          data: funds.map((item) => (item.budget === 0 ? 0 : (item.assigned / item.budget) * 100)),
          backgroundColor: "#3e9a80",
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      plugins: { ...chartOptions().plugins, legend: { display: false } },
      scales: {
        x: {
          ...chartOptions().scales.x,
          ticks: {
            ...chartOptions().scales.x.ticks,
            callback: (value) => `${Number(value).toLocaleString("es-CO")}%`,
          },
        },
        y: chartOptions().scales.y,
      },
    },
  });
}

function renderBalanceCharts(filtered) {
  if (!filtered.length) return;
  const funds = [...aggregateBy(filtered, (record) => record.fund || "Sin fondo").entries()]
    .map(([fund, values]) => ({ fund, ...values }))
    .sort((a, b) => b.budget - a.budget);
  const departments = uniqueSorted(filtered.map((record) => record.department));
  const colors = ["#3185a5", "#3e9a80", "#d59a43", "#6177ad", "#bd6f52"];

  charts.balanceSource = new Chart(elements.balanceSourceChart, {
    type: "bar",
    data: {
      labels: funds.map((item) => item.fund),
      datasets: [
        {
          label: "Presupuesto",
          data: funds.map((item) => item.budget),
          backgroundColor: "#3185a5",
          borderRadius: 3,
        },
        {
          label: "Asignado",
          data: funds.map((item) => item.assigned),
          backgroundColor: "#3e9a80",
          borderRadius: 3,
        },
        {
          label: "Saldo pendiente",
          data: funds.map((item) => item.balance),
          backgroundColor: "#d59a43",
          borderRadius: 3,
        },
      ],
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      plugins: {
        ...chartOptions().plugins,
        tooltip: {
          callbacks: {
            label: (context) => {
              const fund = funds[context.dataIndex];
              return `${context.dataset.label}: ${formatMoney(context.raw)} · Presupuesto: ${formatMoney(fund.budget)}`;
            },
          },
        },
      },
    },
  });

  charts.balanceExecution = new Chart(elements.balanceExecutionChart, {
    type: "bar",
    data: {
      labels: funds.map((item) => item.fund),
      datasets: [
        {
          label: "Ejecución",
          data: funds.map((item) => (item.budget === 0 ? 0 : (item.assigned / item.budget) * 100)),
          backgroundColor: "#3185a5",
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      plugins: { ...chartOptions().plugins, legend: { display: false } },
      scales: {
        x: {
          ...chartOptions().scales.x,
          ticks: {
            ...chartOptions().scales.x.ticks,
            callback: (value) => `${Number(value).toLocaleString("es-CO")}%`,
          },
        },
        y: chartOptions().scales.y,
      },
    },
  });

  charts.balanceDepartments = new Chart(elements.balanceDepartmentChart, {
    type: "bar",
    data: {
      labels: departments,
      datasets: funds.map((fund, index) => ({
        label: fund.fund,
        data: departments.map((department) =>
          sumBy(
            filtered.filter(
              (record) => record.fund === fund.fund && record.department === department,
            ),
            "balance",
          ),
        ),
        backgroundColor: colors[index % colors.length],
        borderRadius: 3,
      })),
    },
    options: {
      ...chartOptions(),
      indexAxis: "y",
      scales: {
        x: { ...chartOptions().scales.x, stacked: true },
        y: { ...chartOptions().scales.y, stacked: true },
      },
    },
  });
}

function renderTable(filtered) {
  const sortedRecords = [...filtered].sort((a, b) => b.budget - a.budget);
  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = sortedRecords.slice(start, start + PAGE_SIZE);

  elements.tableCount.textContent = `${numberFormat.format(filtered.length)} registros`;
  elements.pageSummary.textContent = filtered.length
    ? `Mostrando ${numberFormat.format(start + 1)}–${numberFormat.format(
        Math.min(start + PAGE_SIZE, filtered.length),
      )} de ${numberFormat.format(filtered.length)}`
    : "Sin registros para los filtros seleccionados";
  elements.previousPage.disabled = currentPage <= 1;
  elements.nextPage.disabled = currentPage >= pageCount;

  if (!pageRows.length) {
    elements.tableBody.innerHTML =
      '<tr class="table-empty"><td colspan="8">No hay registros para esta selección.</td></tr>';
    return;
  }

  elements.tableBody.innerHTML = pageRows
    .map(
      (record) => `
        <tr>
          <td>${escapeHtml(record.department)}</td>
          <td>${escapeHtml(record.municipality)}</td>
          <td>${renderTypeLabel(record.type)}</td>
          <td title="${escapeHtml(record.concept)}">${escapeHtml(record.concept || "—")}</td>
          <td class="numeric">${formatMoney(record.budget)}</td>
          <td class="numeric">${formatMoney(record.assigned)}</td>
          <td class="numeric">${formatMoney(record.balance)}</td>
          <td>${renderAssignedPercentage(record.assigned, record.budget)}</td>
        </tr>`,
    )
    .join("");
}

function renderTypeLabel(type) {
  const normalizedType = normalizeHeader(type);
  const typeIcon =
    normalizedType === "departamento"
      ? `<svg class="type-icon department-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 20h16M6 20V8l6-4 6 4v12M9 10h.01M15 10h.01M9 14h.01M15 14h.01M11 20v-3h2v3" />
        </svg>`
      : normalizedType === "municipio"
        ? `<svg class="type-icon municipality-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>`
        : "";

  if (!typeIcon) return escapeHtml(type);

  return `
    <span class="record-type-label">
      ${typeIcon}
      <span>${escapeHtml(type)}</span>
    </span>`;
}

function renderAssignedPercentage(assigned, budget) {
  const percentage = budget > 0 ? (assigned / budget) * 100 : 0;
  const barWidth = Math.min(Math.max(percentage, 0), 100);

  return `
    <div class="table-progress" role="progressbar" aria-label="Porcentaje asignado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${barWidth.toFixed(1)}" aria-valuetext="${formatPercent(percentage)}">
      <span class="table-progress-track">
        <span class="table-progress-fill" style="width: ${barWidth}%"></span>
      </span>
      <span class="table-progress-label">${formatPercent(percentage)}</span>
    </div>`;
}

function aggregateBy(items, keyOf) {
  const groups = new Map();
  items.forEach((item) => {
    const key = keyOf(item);
    let group = groups.get(key);
    if (!group) {
      group = {
        budget: 0,
        assigned: 0,
        balance: 0,
        count: 0,
      };
      groups.set(key, group);
    }
    group.budget += item.budget;
    group.assigned += item.assigned;
    group.balance += item.balance;
    group.count += 1;
  });
  return groups;
}

function formatPercent(value) {
  return `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

function renderFundingSummary(filtered) {
  const funds = [
    ...aggregateBy(
      filtered,
      (record) => JSON.stringify([record.fund || "Sin fondo", record.department]),
    ).entries(),
  ]
    .map(([key, values]) => {
      const [fund, department] = JSON.parse(key);
      return { fund, department, ...values };
    })
    .sort(
      (a, b) =>
        b.balance - a.balance ||
        a.fund.localeCompare(b.fund, "es") ||
        a.department.localeCompare(b.department, "es"),
    );
  const totalBudget = sumBy(filtered, "budget");
  const concepts = [
    ...aggregateBy(filtered, (record) => record.concept || "Sin concepto").entries(),
  ]
    .map(([concept, values]) => ({ concept, ...values }))
    .sort((a, b) => b.budget - a.budget || a.concept.localeCompare(b.concept, "es"));

  elements.fundingCount.textContent = `${numberFormat.format(funds.length)} registros`;
  elements.conceptCount.textContent = `${numberFormat.format(concepts.length)} conceptos`;
  elements.fundingBody.innerHTML = funds.length
    ? funds
        .map((fund) => {
            return `
            <tr>
              <td>${escapeHtml(fund.fund)}</td>
              <td>${escapeHtml(fund.department)}</td>
              <td class="numeric">${formatMoney(fund.budget)}</td>
              <td class="numeric">${formatMoney(fund.assigned)}</td>
              <td class="numeric">${formatMoney(fund.balance)}</td>
              <td class="numeric">${formatPercent(
                fund.budget === 0 ? 0 : (fund.assigned / fund.budget) * 100,
              )}</td>
            </tr>`;
        })
        .join("")
    : '<tr class="table-empty"><td colspan="6">No hay fuentes para los filtros seleccionados.</td></tr>';

  elements.compositionBody.innerHTML = concepts.length
    ? concepts
        .map((concept) => {
          const share = totalBudget === 0 ? 0 : (concept.budget / totalBudget) * 100;
          return `
            <tr>
              <td title="${escapeHtml(concept.concept)}">${escapeHtml(concept.concept)}</td>
              <td class="numeric">${formatMoney(concept.budget)}</td>
              <td class="numeric">${formatPercent(share)}</td>
            </tr>`;
        })
        .join("")
    : '<tr class="table-empty"><td colspan="3">No hay conceptos para los filtros seleccionados.</td></tr>';
}

function renderRankingTable(body, rows, key, includesMunicipality = true) {
  const topRows = rows.slice(0, 15);
  if (!topRows.length) {
    body.innerHTML =
      `<tr class="table-empty"><td colspan="${includesMunicipality ? 4 : 3}">No hay registros territoriales para los filtros seleccionados.</td></tr>`;
    return;
  }
  const maxBalance = Math.max(0, ...topRows.map((row) => row.balance));
  body.innerHTML = topRows
    .map(
      (row, index) => {
        const place = index + 1;
        const medal = ["🥇", "🥈", "🥉"][index];
        const balancePercent =
          maxBalance === 0 ? 0 : Math.min(100, Math.max(0, (row.balance / maxBalance) * 100));
        const balanceBar = `
          <span
            class="ranking-balance-track"
            role="img"
            aria-label="Saldo pendiente de asignación: ${escapeHtml(formatMoney(row.balance))}"
            title="Saldo pendiente de asignación: ${escapeHtml(formatMoney(row.balance))}"
          >
            <span class="ranking-balance-fill" style="width: ${balancePercent}%"></span>
          </span>`;
        const entityName = (name) => `
          <span class="ranking-entity">
            <span>${escapeHtml(name)}</span>
            ${balanceBar}
          </span>`;

        return `
        <tr>
          <td class="ranking-position">
            <span class="ranking-place" role="img" aria-label="Puesto ${place}">
              ${medal ? `<span aria-hidden="true">${medal}</span>` : place}
            </span>
          </td>
          <td>${includesMunicipality ? escapeHtml(row.department) : entityName(row.department)}</td>
          ${includesMunicipality ? `<td>${entityName(row.municipality)}</td>` : ""}
          <td class="numeric">${formatMoney(row[key])}</td>
        </tr>`;
      },
    )
    .join("");
}

function renderRankings(filtered) {
  const municipalities = filtered.filter(
    (record) => normalizeHeader(record.type) === normalizeHeader("Municipio"),
  );
  const departments = filtered.filter(
    (record) => normalizeHeader(record.type) === normalizeHeader("Departamento"),
  );
  const municipalityRanking = [
    ...aggregateBy(
      municipalities,
      (record) => JSON.stringify([record.department, record.municipality]),
    ).entries(),
  ].map(([key, values]) => {
    const [department, municipality] = JSON.parse(key);
    return { department, municipality, assigned: values.assigned, balance: values.balance };
  });
  const departmentRanking = [
    ...aggregateBy(departments, (record) => record.department).entries(),
  ].map(([department, values]) => ({
    department,
    assigned: values.assigned,
    balance: values.balance,
  }));
  const tieBreak = (a, b) =>
    a.department.localeCompare(b.department, "es") ||
    (a.municipality || "").localeCompare(b.municipality || "", "es");

  renderRankingTable(
    elements.highestBalanceBody,
    [...municipalityRanking].sort((a, b) => b.balance - a.balance || tieBreak(a, b)),
    "balance",
  );
  renderRankingTable(
    elements.highestApprovedBody,
    [...municipalityRanking].sort((a, b) => b.assigned - a.assigned || tieBreak(a, b)),
    "assigned",
  );
  renderRankingTable(
    elements.lowestApprovedBody,
    [...municipalityRanking].sort((a, b) => a.assigned - b.assigned || tieBreak(a, b)),
    "assigned",
  );
  renderRankingTable(
    elements.departmentHighestBalanceBody,
    [...departmentRanking].sort((a, b) => b.balance - a.balance || tieBreak(a, b)),
    "balance",
    false,
  );
  renderRankingTable(
    elements.departmentHighestApprovedBody,
    [...departmentRanking].sort((a, b) => b.assigned - a.assigned || tieBreak(a, b)),
    "assigned",
    false,
  );
  renderRankingTable(
    elements.departmentLowestApprovedBody,
    [...departmentRanking].sort((a, b) => a.assigned - b.assigned || tieBreak(a, b)),
    "assigned",
    false,
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function updateDashboard() {
  const filtered = getFilteredRecords();
  updateMetrics(filtered);
  renderTable(filtered);
  renderFundingSummary(filtered);
  renderRankings(filtered);
  destroyCharts();
  if (!filtered.length) return;

  const activePanel = document.querySelector(".tab-panel:not([hidden])");
  if (activePanel?.id === "dashboard-view") renderCharts(filtered);
  if (activePanel?.id === "funding-view") renderFundingCharts(filtered);
  if (activePanel?.id === "balance-view") renderBalanceCharts(filtered);
}

function activateTab(tabName) {
  document.querySelectorAll(".view-tab").forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `${tabName}-view`;
  });
  updateDashboard();
}

document.querySelectorAll(".view-tab").forEach((tab, index, tabs) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(index + offset + tabs.length) % tabs.length];
    activateTab(nextTab.dataset.tab);
    nextTab.focus();
  });
});

document.querySelectorAll(".metric-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    fundingMetric = tab.dataset.fundingMetric;
    document.querySelectorAll(".metric-tab").forEach((button) => {
      button.classList.toggle("is-active", button === tab);
    });
    updateDashboard();
  });
});

document.querySelector("#theme-toggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const isDark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  button.setAttribute("aria-pressed", String(isDark));
});

elements.departmentFilter.addEventListener("change", () => {
  updateMunicipalityOptions();
  currentPage = 1;
  updateDashboard();
});

elements.municipalityFilter.addEventListener("change", () => {
  currentPage = 1;
  updateDashboard();
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  elements.departmentFilter.value = "";
  updateMunicipalityOptions();
  elements.municipalityFilter.value = "";
  currentPage = 1;
  updateDashboard();
});

elements.previousPage.addEventListener("click", () => {
  currentPage -= 1;
  renderTable(getFilteredRecords());
});

elements.nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderTable(getFilteredRecords());
});

async function loadBundledWorkbook() {
  try {
    const response = await fetch("./datos_sgr.xlsx");
    if (!response.ok) {
      throw new Error(`No fue posible abrir el Excel incluido (HTTP ${response.status}).`);
    }
    const file = await response.blob();
    await loadWorkbook(new File([file], "datos_sgr.xlsx"));
  } catch (error) {
    elements.dataStatus.textContent = "No se pudieron cargar los datos";
    elements.errorMessage.textContent =
      error instanceof Error
        ? `${error.message} Inicia la página con Live Server y verifica que datos_sgr.xlsx esté en la misma carpeta.`
        : "Inicia la página con Live Server y verifica que datos_sgr.xlsx esté en la misma carpeta.";
    elements.errorMessage.hidden = false;
  }
}

if (typeof XLSX === "undefined" || typeof Chart === "undefined") {
  elements.dataStatus.textContent = "Faltan las librerías del visor";
  elements.errorMessage.textContent =
    "No se pudieron cargar SheetJS y Chart.js. Comprueba tu conexión a internet y vuelve a abrir la página.";
  elements.errorMessage.hidden = false;
} else {
  loadBundledWorkbook();
}
