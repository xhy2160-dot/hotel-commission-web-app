function escapeCell(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function exportFileName(type) {
  const now = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${type}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.xls`
}

export function downloadExcel(filename, columns, rows) {
  const head = columns.map((column) => `<th>${escapeCell(column.label)}</th>`).join('')
  const body = rows.map((row) => {
    const cells = columns.map((column) => `<td style="mso-number-format:'\\@';">${escapeCell(row[column.key])}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  const html = `<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
