interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

interface CacheOptions {
	defaultTTL?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

class CacheManager {
	private store: Map<string, CacheEntry<unknown>> = new Map();
	private defaultTTL: number;

	constructor(options: CacheOptions = {}) {
		this.defaultTTL = options.defaultTTL ?? DEFAULT_TTL_MS;
	}

	generateKey(prefix: string, params: Record<string, unknown>): string {
		const sortedParams = Object.keys(params)
			.sort()
			.reduce(
				(acc, key) => {
					const value = params[key];
					if (value !== undefined && value !== null) {
						acc[key] = value;
					}
					return acc;
				},
				{} as Record<string, unknown>,
			);
		return `${prefix}:${JSON.stringify(sortedParams)}`;
	}

	get<T>(key: string): T | undefined {
		const entry = this.store.get(key);
		if (!entry) {
			return undefined;
		}

		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return undefined;
		}

		return entry.value as T;
	}

	set<T>(key: string, value: T, ttlMs?: number): void {
		const ttl = ttlMs ?? this.defaultTTL;
		const entry: CacheEntry<T> = {
			value,
			expiresAt: Date.now() + ttl,
		};
		this.store.set(key, entry);
	}

	delete(key: string): boolean {
		return this.store.delete(key);
	}

	clear(): void {
		this.store.clear();
	}

	clearExpired(): number {
		const now = Date.now();
		let cleared = 0;
		for (const [key, entry] of this.store.entries()) {
			if (now > entry.expiresAt) {
				this.store.delete(key);
				cleared++;
			}
		}
		return cleared;
	}

	size(): number {
		return this.store.size;
	}
}

export const cache = new CacheManager();

export { CacheManager };
