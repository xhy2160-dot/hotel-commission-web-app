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