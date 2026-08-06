export function money(n: number): string {
    return Number(n).toFixed(2);
}

export function qty(n: number): string {
    return Number(n).toFixed(4);
}

export function unit(n: number): string {
    return Number(n).toFixed(10);
}

export function percent(n: number): string {
    return Number(n).toFixed(4);
}

export function pad(n: number | string, len: number): string {
    return String(n).padStart(len, "0");
}

export function isoDateTime(d = new Date(), offset = "-03:00"): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${offset}`;
}

export function randomCNF(): string {
    return String(Math.floor(10_000_000 + Math.random() * 89_999_999));
}
