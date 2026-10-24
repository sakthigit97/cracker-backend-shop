interface CachedConfig {
    value: any;
    cachedAt: number;
}

export const notificationConfigCache: CachedConfig = {
    value: null,
    cachedAt: 0,
};

export function invalidateNotificationConfigCache() {
    notificationConfigCache.value = null;
    notificationConfigCache.cachedAt = 0;
}
