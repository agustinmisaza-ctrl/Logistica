
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  // Extract headers from the first object keys
  const headers = Object.keys(data[0]).join(';');
  
  // Map rows
  const rows = data.map(obj => {
    return Object.values(obj).map(val => {
      // Handle nulls/undefined and clean strings for CSV safety
      const cleaned = val === null || val === undefined ? '' : String(val).replace(/(\r\n|\n|\r|;)/gm, " ");
      return `"${cleaned}"`;
    }).join(';');
  }).join('\n');

  const csvContent = "\uFEFF" + headers + "\n" + rows; // Add BOM for Excel UTF-8 support
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printReport = () => {
  window.print();
};
