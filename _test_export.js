const XLSX = require(process.env.TEMP + "\\xlsx.full.min.js");

const activities = [
    { id: "a", type: "Desarrollo", description: "Implementé el formulario", date: "2026-10-19" },
    { id: "b", type: "Publicidad", description: "Campaña de octubre", date: "2026-10-05" },
    { id: "c", type: "Mantenimiento", description: "=SUM(A1:A2) prueba inyección", date: "2026-09-30" },
    { id: "d", type: "Diseño gráfico", description: "Línea\ncon salto\ttab y <html>", date: "2026-01-02" }
];

const sortedActivities = [...activities].sort((f, s) => s.date.localeCompare(f.date));
const rows = [
    ["Fecha", "Tipo de actividad", "Descripción"],
    ...sortedActivities.map((a) => {
        const [year, month, day] = a.date.split("-").map(Number);
        return [new Date(year, month - 1, day), a.type, a.description];
    })
];
const worksheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
worksheet["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 72 }];
worksheet["!autofilter"] = { ref: `A1:C${rows.length}` };

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Actividades");
const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
require("fs").writeFileSync(process.env.TEMP + "\\out.xlsx", out);

const wb2 = XLSX.readFile(process.env.TEMP + "\\out.xlsx", { cellDates: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
console.log("range:", ws2["!ref"]);
for (const cell of ["A1", "A2", "A3", "A4", "A5", "C4"]) {
    console.log(cell, JSON.stringify(ws2[cell]));
}
console.log("autofilter:", JSON.stringify(ws2["!autofilter"]));
