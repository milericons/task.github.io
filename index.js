const STORAGE_KEY = "miler-task-activities";
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

function setMessage(message, isError = false) {
    formMessageText.textContent = message;
    formMessage.hidden = !message;
    formMessage.classList.toggle("is-error", isError);
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
    emptyState.hidden = total > 0;
    if (window.MillerIcons) window.MillerIcons.scan(activityList);
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

const activities = loadActivities();
dateInput.value = localDateString();
renderActivities();

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