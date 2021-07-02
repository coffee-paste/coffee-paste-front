import { globalConfig } from '@/components/common/global';
import { LocalStorageKey, removeLocalStorageItem } from './local-storage';

/**
 * Gets a generic ProxyHandler who's purpose is to intercept object methods.
 *
 * @template T The type of object being proxied
 * @return {*}  {ProxyHandler<T>}
 */
function getGenericFunctionInterceptor<T extends () => void>(): ProxyHandler<T> {
	const handler: ProxyHandler<T> = {
		async apply(target: T, thisArg: unknown, argArray: []) {
			const objName = Object.getPrototypeOf(thisArg)?.constructor?.name || 'N/A';
			try {
				console.log(`[${objName}.${target.name}] Invoking ${target.name}`);
				// eslint-disable-next-line @typescript-eslint/return-await
				return await target.apply(thisArg, argArray);
			} catch (e) {
				if (e?.status === 401) {
					console.log(`[${objName}.${target.name}] User unauthorized, deleting profile & redirecting to login page`);
					removeLocalStorageItem(LocalStorageKey.Profile);
					window.location.href = `${globalConfig.BaseDashboardUri}/#/login`;
				}
				console.log(`[${objName}.${target.name}] Exception intercepted- ${e?.statusText || e?.message || e}`);
				throw e;
			}
		},
	};
	return handler;
}

/**
 * Gets an array of an ApiObject's functions.
 * @description Context sensitive- function dives relies on the API objects being shallow.
 * Can be upgraded, if necessary, to recurse until the BaseAPI prototype is encountered
 *
 * @param {object} obj The API object to get the methods of
 * @return {*}  {string[]}
 */
function getObjectMethods(obj: unknown): string[] {
	const properties = new Set<string>();
	let currentObj = obj;
	for (let i = 0; i < 2; i++) {
		Object.getOwnPropertyNames(currentObj).map((item) => properties.add(item));
		currentObj = Object.getPrototypeOf(currentObj);
	}

	// Filter all props and return only relevant functions
	return [...properties.keys()].filter((item) => {
		const propType = typeof (obj as Record<string, unknown>)[item];
		return propType === 'function' && item !== 'fetch' && item !== 'constructor';
	});
}

export function wrapObjectMethods<T extends Record<string, unknown>>(
	target: T,
	interceptor: ProxyHandler<() => void>,
	methodsToWrap: (keyof T)[]
): Record<string, unknown> {
	for (const methodName of methodsToWrap) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const functions = target as any;
		// eslint-disable-next-line no-param-reassign
		functions[methodName] = new Proxy(target[methodName] as Record<string, unknown>, interceptor as unknown as ProxyHandler<Record<string, unknown>>);
	}
	return target;
}

/**
 * Wraps the given object's methods with a generic interceptor
 *
 * @param {*} target The object who's methods are to be wrapped
 * @return {*} The given 'target' object, who's function's have been wrapped with a generic interceptor
 */
export function wrapAllMethods<T extends Record<string, unknown>>(target: T, interceptor: ProxyHandler<() => void>): Record<string, unknown> {
	const methods = getObjectMethods(target);
	return wrapObjectMethods(target, interceptor, methods as (keyof T)[]);
}

/**
 * Wraps the given API with a dynamic, method intercepting proxy
 *
 * @export
 * @template TApi A Swagger-generated API object type
 * @param {TApi} apiObject An API object instance to wrap
 * @return {*} The given 'apiObject' wrapped with a dynamic proxy
 */
export function createApiProxy<TApi extends Record<string, unknown>>(apiObject: TApi): unknown {
	const stdInterceptor: ProxyHandler<() => unknown> = getGenericFunctionInterceptor();
	return new Proxy(wrapAllMethods(apiObject, stdInterceptor), stdInterceptor as unknown as ProxyHandler<Record<string, unknown>>);
}
