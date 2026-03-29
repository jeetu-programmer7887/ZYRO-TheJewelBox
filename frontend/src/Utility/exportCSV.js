export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;

  // 1. Extract headers from the first object keys
  const headers = Object.keys(data[0]).join(",");

  // 2. Map data rows
  const rows = data.map(obj => {
    return Object.values(obj)
      .map(val => {
        // Handle strings with commas by wrapping in quotes
        let str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",");
  });

  // 3. Combine headers and rows
  const csvContent = [headers, ...rows].join("\n");

  // 4. Create a blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toLocaleDateString()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};