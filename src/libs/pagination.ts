export function encodeCursor(key: Record<string, any> | undefined) {
    if (!key) return null;
    return Buffer.from(JSON.stringify(key)).toString("base64");
}

export function decodeCursor(cursor?: string) {
    if (!cursor) return undefined;
    try {
        return JSON.parse(
            Buffer.from(cursor, "base64").toString("utf-8")
        );
    } catch {
        return undefined;
    }
}