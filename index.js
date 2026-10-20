const STORAGE_KEY = "miler-task-activities";
const EXCELJS_FALLBACK_URL = "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js";
const ACTIVITY_TYPES = {
    "Desarrollo": "code",
    "Diseño gráfico": "palette",
    "Publicidad": "megaphone",
    "Mantenimiento": "tools"
};

const form = document.querySelector("#activity-form");
const typeSelect = document.querySelector("#type-select");
const typeTrigger = document.querySelector("#type-trigger");
const typeOptionsContainer = document.querySelector("#type-options");
const typeOptions = [...typeOptionsContainer.querySelectorAll(".select-option")];
const typeValue = document.querySelector("#type-value");
const typeLeading = document.querySelector("#type-leading");
const descriptionInput = document.querySelector("#activity-description");
const dateInput = document.querySelector("#activity-date");
const characterCount = document.querySelector("#character-count");
const formMessage = document.querySelector("#form-message");
const formMessageText = document.querySelector("#form-message-text");
const activityList = document.querySelector("#activity-list");
const emptyState = document.querySelector("#empty-state");
const activityCount = document.querySelector("#activity-count");
const exportButton = document.querySelector("#export-button");
const exportMessage = document.querySelector("#export-message");
const exportProgress = document.querySelector("#export-progress");
const progressFill = document.querySelector("#progress-fill");
const actionsMenu = document.querySelector("#actions-menu");
const actionsTrigger = document.querySelector("#actions-trigger");
const actionsOptions = document.querySelector("#actions-options");
const actionOptions = [...actionsOptions.querySelectorAll(".action-option")];
const importButton = document.querySelector("#import-button");
const importInput = document.querySelector("#import-input");
const themeToggle = document.querySelector("#theme-toggle");

let selectedType = "";
let storageReady = true;

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;
}

let messageHideTimer = null;

function setMessage(message, isError = false) {
    formMessageText.textContent = message;
    formMessage.hidden = !message;
    formMessage.classList.toggle("is-error", isError);

    clearTimeout(messageHideTimer);
    if (message && !isError) {
        messageHideTimer = setTimeout(() => setMessage(""), 4000);
    }
}

function isActivity(value) {
    if (
        value === null
        || typeof value !== "object"
        || typeof value.date !== "string"
        || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
    ) return false;

    return value !== null
        && typeof value.id === "string"
        && Object.hasOwn(ACTIVITY_TYPES, value.type)
        && typeof value.description === "string"
        && value.description.trim().length > 0
        && value.description.length <= 500
        && isValidDateString(value.date);
}

function loadActivities() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) return [];

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || !parsed.every(isActivity)) {
            throw new Error("El formato de las actividades guardadas no es válido.");
        }
        return parsed;
    } catch (error) {
        storageReady = false;
        console.error("No se pudieron cargar las actividades guardadas.", error);
        setMessage("No se pudieron cargar tus datos guardados. Revisa el almacenamiento local antes de continuar.", true);
        return [];
    }
}

function persistActivities(nextActivities) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextActivities));
        return true;
    } catch (error) {
        console.error("No se pudieron guardar las actividades.", error);
        setMessage("No se pudo guardar. Comprueba el espacio disponible y los permisos del navegador.", true);
        return false;
    }
}

function formatDate(date) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
}

function makeIcon(name, className) {
    const icon = document.createElement("span");
    icon.className = `miller-icon ${className}`;
    icon.dataset.icon = name;
    icon.setAttribute("aria-hidden", "true");
    return icon;
}

function createActivityCard(activity) {
    const card = document.createElement("article");
    card.className = "activity-card";
    card.dataset.type = activity.type;

    const iconWrap = document.createElement("span");
    iconWrap.className = "activity-icon";
    iconWrap.append(makeIcon(ACTIVITY_TYPES[activity.type], ""));

    const details = document.createElement("div");
    details.className = "activity-details";

    const meta = document.createElement("div");
    meta.className = "activity-meta";

    const category = document.createElement("span");
    category.className = "activity-category";
    category.textContent = activity.type;

    const date = document.createElement("time");
    date.className = "activity-date";
    date.dateTime = activity.date;
    date.textContent = formatDate(activity.date);

    const description = document.createElement("p");
    description.className = "activity-description";
    description.textContent = activity.description;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.deleteId = activity.id;
    deleteButton.setAttribute("aria-label", `Eliminar actividad de ${activity.type}, ${formatDate(activity.date)}`);
    deleteButton.append(makeIcon("close", ""));

    meta.append(category, date);
    details.append(meta, description);
    card.append(iconWrap, details, deleteButton);
    return card;
}

function renderActivities() {
    const sortedActivities = [...activities].sort((first, second) => {
        return second.date.localeCompare(first.date);
    });

    activityList.replaceChildren(...sortedActivities.map(createActivityCard));
    const total = activities.length;
    activityCount.textContent = String(total);
    exportButton.disabled = total === 0;
    emptyState.hidden = total > 0;
    if (window.MillerIcons) window.MillerIcons.scan(activityList);
}

function ensureExcelJS() {
    if (window.ExcelJS) return Promise.resolve(true);

    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = EXCELJS_FALLBACK_URL;
        script.onload = () => resolve(Boolean(window.ExcelJS));
        script.onerror = () => resolve(false);
        document.head.append(script);
    });
}

function runExportProgress(duration = 1100) {
    return new Promise((resolve) => {
        exportProgress.hidden = false;
        progressFill.style.transition = "none";
        progressFill.style.width = "0%";

        const start = performance.now();
        const step = (now) => {
            const ratio = Math.min((now - start) / duration, 1);
            progressFill.style.width = `${Math.round(ratio * 100)}%`;
            if (ratio < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

async function exportActivitiesToExcel() {
    exportMessage.hidden = true;
    exportMessage.textContent = "";

    if (activities.length === 0) return;

    exportButton.disabled = true;
    try {
        const [libraryReady] = await Promise.all([
            ensureExcelJS(),
            runExportProgress(2000)
        ]);

        if (!libraryReady) {
            exportMessage.textContent = "No se pudo cargar el exportador de Excel. Comprueba tu conexión e inténtalo de nuevo.";
            exportMessage.hidden = false;
            return;
        }

        const workbook = new window.ExcelJS.Workbook();
        workbook.creator = "Miler Task";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Actividades", {
            views: [{ state: "frozen", ySplit: 1 }]
        });
        sheet.columns = [
            { header: "Fecha", key: "date", width: 14 },
            { header: "Tipo de actividad", key: "type", width: 22 },
            { header: "Descripción", key: "description", width: 72 }
        ];
        sheet.autoFilter = "A1:C1";

        const thinBorder = { style: "thin", color: { argb: "FFD9E0D7" } };
        const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
        const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF416749" } };
        const stripeFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF4EC" } };

        const headerRow = sheet.getRow(1);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
            cell.fill = headerFill;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            cell.border = cellBorder;
            cell.alignment = { vertical: "middle" };
        });

        const sortedActivities = [...activities].sort((first, second) => second.date.localeCompare(first.date));
        sortedActivities.forEach((activity, index) => {
            const [year, month, day] = activity.date.split("-").map(Number);
            const row = sheet.addRow({
                date: new Date(Date.UTC(year, month - 1, day)),
                type: activity.type,
                description: activity.description
            });
            row.eachCell((cell) => {
                cell.border = cellBorder;
                if (index % 2 === 1) cell.fill = stripeFill;
            });
            row.getCell(1).numFmt = "dd/mm/yyyy";
            row.getCell(3).alignment = { wrapText: true, vertical: "top" };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `actividades-empresa-${localDateString()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
        console.error("No se pudo generar el archivo Excel de actividades.", error);
        exportMessage.textContent = "No se pudo generar el archivo Excel. Inténtalo de nuevo.";
        exportMessage.hidden = false;
    } finally {
        exportProgress.hidden = true;
        progressFill.style.width = "0%";
        exportButton.disabled = activities.length === 0;
    }
}

function cellTextValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
        if (value instanceof Date) return value;
        if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
        if (value.text !== undefined) return String(value.text ?? "");
        if (value.result !== undefined) return value.result;
    }
    return value;
}

function parseImportedDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const utcDate = new Date(Math.round((value - 25569) * 86400000));
        if (Number.isNaN(utcDate.getTime())) return null;
        return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
    }

    if (typeof value !== "string") return null;

    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return isValidDateString(text) ? text : null;

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return isValidDateString(isoDate) ? isoDate : null;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return localDateString(parsed);
}

async function importActivitiesFromExcel(file) {
    exportMessage.hidden = true;
    exportMessage.textContent = "";

    if (!file) return;

    if (!storageReady) {
        setMessage("No se puede importar hasta resolver el problema con los datos locales.", true);
        return;
    }

    if (!(await ensureExcelJS())) {
        setMessage("No se pudo cargar el lector de Excel. Comprueba tu conexión e inténtalo de nuevo.", true);
        return;
    }

    try {
        const buffer = await file.arrayBuffer();
        const workbook = new window.ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.worksheets[0];
        if (!sheet || sheet.actualRowCount === 0) {
            setMessage("El archivo no contiene actividades.", true);
            return;
        }

        const headers = [];
        sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnIndex) => {
            headers[columnIndex] = String(cellTextValue(cell.value) ?? "").trim().toLowerCase();
        });

        const dateColumn = headers.findIndex((header) => header === "fecha");
        const typeColumn = headers.findIndex((header) => header === "tipo de actividad");
        const descriptionColumn = headers.findIndex((header) => header === "descripción" || header === "descripcion");

        if (dateColumn === -1 || typeColumn === -1 || descriptionColumn === -1) {
            setMessage("El archivo no tiene el formato esperado. Usa un archivo exportado desde esta app (Fecha, Tipo de actividad, Descripción).", true);
            return;
        }

        const knownTypes = new Set(Object.keys(ACTIVITY_TYPES));
        const existingKeys = new Set(activities.map((activity) => `${activity.date}|${activity.type}|${activity.description}`));
        const imported = [];
        let ignored = 0;

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const date = parseImportedDate(cellTextValue(row.getCell(dateColumn).value));
            const type = String(cellTextValue(row.getCell(typeColumn).value) ?? "").trim();
            const description = String(cellTextValue(row.getCell(descriptionColumn).value) ?? "").trim();

            if (!date || !knownTypes.has(type) || !description || description.length > 500) {
                ignored += 1;
                return;
            }

            const key = `${date}|${type}|${description}`;
            if (existingKeys.has(key)) {
                ignored += 1;
                return;
            }

            existingKeys.add(key);
            imported.push({ id: crypto.randomUUID(), type, description, date });
        });

        if (imported.length === 0) {
            setMessage(ignored > 0 ? "No se importaron actividades: no hay filas válidas nuevas en el archivo." : "El archivo no contiene actividades.", true);
            return;
        }

        const nextActivities = [...imported, ...activities];
        if (!persistActivities(nextActivities)) return;

        activities.splice(0, activities.length, ...nextActivities);
        renderActivities();

        const importedLabel = imported.length === 1 ? "1 actividad" : `${imported.length} actividades`;
        const ignoredLabel = ignored > 0 ? ` · ${ignored} fila${ignored === 1 ? "" : "s"} ignorada${ignored === 1 ? "" : "s"}` : "";
        setMessage(`Se importaron ${importedLabel}${ignoredLabel}.`);
    } catch (error) {
        console.error("No se pudo importar el archivo Excel.", error);
        setMessage("No se pudo leer el archivo. Comprueba que sea un .xlsx válido.", true);
    } finally {
        importInput.value = "";
    }
}

function openTypeOptions(focusIndex = -1) {
    typeOptionsContainer.hidden = false;
    typeTrigger.setAttribute("aria-expanded", "true");
    if (focusIndex >= 0) typeOptions[focusIndex].focus();
}

function closeTypeOptions(returnFocus = false) {
    typeOptionsContainer.hidden = true;
    typeTrigger.setAttribute("aria-expanded", "false");
    if (returnFocus) typeTrigger.focus();
}

function chooseType(option) {
    selectedType = option.dataset.value;
    typeValue.textContent = selectedType;
    typeLeading.replaceChildren(makeIcon(option.dataset.icon, ""));
    typeOptions.forEach((item) => {
        item.setAttribute("aria-selected", String(item === option));
    });
    closeTypeOptions(true);
    if (window.MillerIcons) window.MillerIcons.scan(typeLeading);
}

const THEME_STORAGE_KEY = "miler-task-theme";
const THEME_ORDER = ["light", "dark", "system"];
const THEME_LABELS = {
    light: "Cambiar a tema oscuro",
    dark: "Cambiar a tema del sistema",
    system: "Cambiar a tema claro"
};
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
let themeMode = "system";

function resolveTheme(mode) {
    if (mode === "system") return systemThemeQuery.matches ? "dark" : "light";
    return mode;
}

function applyTheme(mode) {
    themeMode = mode;
    const isDark = resolveTheme(mode) === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const iconName = mode === "system" ? "contrast" : isDark ? "sun" : "moon";
    themeToggle.replaceChildren(makeIcon(iconName, ""));
    themeToggle.setAttribute("aria-label", THEME_LABELS[mode]);
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.dataset.mode = mode;
    if (window.MillerIcons) window.MillerIcons.scan(themeToggle);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.content = isDark ? "#101410" : "#f6f7f5";
}

function getInitialTheme() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (THEME_ORDER.includes(stored)) return stored;
    } catch (error) {
        console.warn("No se pudo leer la preferencia de tema.", error);
    }
    return "system";
}

applyTheme(getInitialTheme());

systemThemeQuery.addEventListener("change", () => {
    if (themeMode === "system") applyTheme("system");
});

themeToggle.addEventListener("click", () => {
    const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(themeMode) + 1) % THEME_ORDER.length];
    applyTheme(nextTheme);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
        console.warn("No se pudo guardar la preferencia de tema.", error);
    }
});

const activities = loadActivities();
dateInput.value = localDateString();
renderActivities();

exportButton.addEventListener("click", exportActivitiesToExcel);

importButton.addEventListener("click", () => importInput.click());

importInput.addEventListener("change", () => {
    const [file] = importInput.files;
    if (file) importActivitiesFromExcel(file);
});

function openActionsMenu(focusIndex = -1) {
    actionsOptions.hidden = false;
    actionsTrigger.setAttribute("aria-expanded", "true");
    if (focusIndex >= 0) actionOptions[focusIndex].focus();
}

function closeActionsMenu(returnFocus = false) {
    actionsOptions.hidden = true;
    actionsTrigger.setAttribute("aria-expanded", "false");
    if (returnFocus) actionsTrigger.focus();
}

actionsTrigger.addEventListener("click", () => {
    const isOpen = actionsTrigger.getAttribute("aria-expanded") === "true";
    if (isOpen) {
        closeActionsMenu();
    } else {
        openActionsMenu();
    }
});

actionsTrigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openActionsMenu(event.key === "ArrowDown" ? 0 : actionOptions.length - 1);
    }
});

actionOptions.forEach((option, index) => {
    option.addEventListener("click", () => closeActionsMenu());
    option.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeActionsMenu(true);
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            actionOptions[(index + step + actionOptions.length) % actionOptions.length].focus();
        } else if (event.key === "Home") {
            event.preventDefault();
            actionOptions[0].focus();
        } else if (event.key === "End") {
            event.preventDefault();
            actionOptions[actionOptions.length - 1].focus();
        }
    });
});

document.addEventListener("click", (event) => {
    if (!actionsMenu.contains(event.target)) closeActionsMenu();
});

typeTrigger.addEventListener("click", () => {
    const isOpen = typeTrigger.getAttribute("aria-expanded") === "true";
    if (isOpen) {
        closeTypeOptions();
    } else {
        openTypeOptions();
    }
});

typeTrigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openTypeOptions(event.key === "ArrowDown" ? 0 : typeOptions.length - 1);
    }
});

typeOptions.forEach((option, index) => {
    option.addEventListener("click", () => chooseType(option));
    option.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeTypeOptions(true);
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            typeOptions[(index + step + typeOptions.length) % typeOptions.length].focus();
        } else if (event.key === "Home") {
            event.preventDefault();
            typeOptions[0].focus();
        } else if (event.key === "End") {
            event.preventDefault();
            typeOptions[typeOptions.length - 1].focus();
        }
    });
});

document.addEventListener("click", (event) => {
    if (!typeSelect.contains(event.target)) closeTypeOptions();
});

descriptionInput.addEventListener("input", () => {
    characterCount.textContent = `${descriptionInput.value.length} / 500`;
    descriptionInput.setAttribute("aria-invalid", String(descriptionInput.value.length > 500));
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    setMessage("");

    if (!storageReady) {
        setMessage("No se puede guardar hasta resolver el problema con los datos locales.", true);
        return;
    }

    if (!selectedType) {
        setMessage("Selecciona un tipo de actividad.", true);
        typeTrigger.focus();
        return;
    }

    const description = descriptionInput.value.trim();
    if (!description) {
        setMessage("Escribe una descripción para la actividad.", true);
        descriptionInput.focus();
        return;
    }

    if (description.length > 500) {
        setMessage("La descripción no puede superar los 500 caracteres.", true);
        descriptionInput.focus();
        return;
    }

    if (!isValidDateString(dateInput.value)) {
        setMessage("Selecciona una fecha válida.", true);
        dateInput.focus();
        return;
    }

    const nextActivities = [{
        id: crypto.randomUUID(),
        type: selectedType,
        description,
        date: dateInput.value
    }, ...activities];

    if (!persistActivities(nextActivities)) return;
    activities.splice(0, activities.length, ...nextActivities);
    renderActivities();
    form.reset();
    selectedType = "";
    typeValue.textContent = "Selecciona una categoría";
    typeLeading.replaceChildren(makeIcon("code", ""));
    typeOptions.forEach((option) => option.setAttribute("aria-selected", "false"));
    dateInput.value = localDateString();
    characterCount.textContent = "0 / 500";
    setMessage("Actividad guardada correctamente.");
    if (window.MillerIcons) window.MillerIcons.scan(typeLeading);
});

activityList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const nextActivities = activities.filter((activity) => activity.id !== button.dataset.deleteId);
    if (nextActivities.length === activities.length || !persistActivities(nextActivities)) return;

    activities.splice(0, activities.length, ...nextActivities);
    renderActivities();
    setMessage("Actividad eliminada.");
});