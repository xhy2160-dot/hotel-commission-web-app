export const formatDate = dateString => {
    const rawDate = new Date(dateString);

    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(rawDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export const formatLocalTime = (dateInput) => {
    if (!dateInput) return ''
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return String(dateInput)

    const pad = (num) => String(num).padStart(2, '0')

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export const  formatLocalISO=(unixTimestamp) =>{
    if (!unixTimestamp) return '';

    const date = new Date(unixTimestamp * 1000);

    const pad = (num) => String(num).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const  formatToLocalTime = (isoString) =>{
    if (!isoString) return '';

    const date = new Date(isoString);

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true // Set to false for 24-hour format
    });
}

export function pickTimeValue(row, keys = []) {
    if (row === null || row === undefined) return null
    if (typeof row !== 'object' || row instanceof Date) return row
    for (const key of keys) {
        const value = row[key]
        if (value !== undefined && value !== null && value !== '') return value
    }
    return null
}

export function formatAnyTime(value) {
    if (value === null || value === undefined || value === '') return ''
    if (value instanceof Date) return formatLocalTime(value)
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
        const num = Number(value)
        if (!Number.isFinite(num) || num === 0) return ''
        return num > 1e12 ? formatLocalTime(num) : formatLocalISO(num)
    }
    return formatLocalTime(value)
}

export function formatRowTime(row, keys) {
    return formatAnyTime(pickTimeValue(row, keys))
}