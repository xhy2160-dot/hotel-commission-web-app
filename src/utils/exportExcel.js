function cellText(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const pad = (num) => String(num).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
  }
  if (typeof value === 'object') {
    if (value.label !== undefined) return String(value.label ?? '')
    return ''
  }
  return String(value)
}

function escapeXml(value) {
  return cellText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportFileName(type) {
  const now = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${type}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.xls`
}

function xmlCell(value) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

export function downloadExcel(filename, columns, rows) {
  const header = `<Row>${columns.map((column) => xmlCell(column.label)).join('')}</Row>`
  const body = rows.map((row) => `<Row>${columns.map((column) => xmlCell(row[column.key])).join('')}</Row>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>${header}${body}</Table>
  </Worksheet>
</Workbook>`
  const blob = new Blob([`\ufeff${xml}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  link.click()
  URL.revokeObjectURL(link.href)
}
