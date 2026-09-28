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
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colLetter(index) {
  let n = index
  let label = ''
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label
    n = Math.floor(n / 26) - 1
  }
  return label
}

function inlineCell(ref, value) {
  const text = escapeXml(value)
  const space = /^\s|\s$/.test(cellText(value)) ? ' xml:space="preserve"' : ''
  return `<c r="${ref}" t="inlineStr"><is><t${space}>${text}</t></is></c>`
}

function sheetXml(columns, rows) {
  const header = `<row r="1">${columns
    .map((column, index) => inlineCell(`${colLetter(index)}1`, column.label))
    .join('')}</row>`
  const body = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2
      const cells = columns
        .map((column, index) => inlineCell(`${colLetter(index)}${r}`, row[column.key]))
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${header}${body}</sheetData></worksheet>`
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let crc = i
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (0xedb88320 ^ (crc >>> 1)) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value) {
  return [value & 0xff, (value >>> 8) & 0xff]
}

function u32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function zipStore(files) {
  const encoder = new TextEncoder()
  const locals = []
  const centrals = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data
    const crc = crc32(data)
    const local = concatBytes([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      new Uint8Array(u16(20)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u32(crc)),
      new Uint8Array(u32(data.length)),
      new Uint8Array(u32(data.length)),
      new Uint8Array(u16(name.length)),
      new Uint8Array(u16(0)),
      name,
      data,
    ])
    locals.push(local)
    centrals.push(concatBytes([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      new Uint8Array(u16(20)),
      new Uint8Array(u16(20)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u32(crc)),
      new Uint8Array(u32(data.length)),
      new Uint8Array(u32(data.length)),
      new Uint8Array(u16(name.length)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u16(0)),
      new Uint8Array(u32(0)),
      new Uint8Array(u32(offset)),
      name,
    ]))
    offset += local.length
  }

  const central = concatBytes(centrals)
  const end = concatBytes([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    new Uint8Array(u16(0)),
    new Uint8Array(u16(0)),
    new Uint8Array(u16(files.length)),
    new Uint8Array(u16(files.length)),
    new Uint8Array(u32(central.length)),
    new Uint8Array(u32(offset)),
    new Uint8Array(u16(0)),
  ])
  return concatBytes([...locals, central, end])
}

function buildXlsx(columns, rows) {
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: sheetXml(columns, rows),
    },
  ])
}

export function exportFileName(type) {
  const now = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${type}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.xlsx`
}

export function downloadExcel(filename, columns, rows) {
  const bytes = buildXlsx(columns, rows)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.replace(/\.xls$/i, '.xlsx')
  if (!link.download.toLowerCase().endsWith('.xlsx')) link.download = `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(link.href)
}

