const isISODate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const toISODate = (value) => {
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    return String(value ?? "").slice(0, 10);
};

const getTodayAtOffset = (offsetMinutes = 0) =>
    new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString().slice(0, 10);

module.exports = { isISODate, toISODate, getTodayAtOffset };
