import { globalConfig } from "@/components/common/global";
import { LocalStorageKey, removeLocalStorageItem } from "./local-storage";

/**
 * Gets a generic ProxyHandler who's purpose is to intercept object methods.
 * 
 * @template T The type of object being proxied
 * @return {*}  {ProxyHandler<T>}
 */
function getGenericFunctionInterceptor<T extends Function>(): ProxyHandler<T> {
	const handler: ProxyHandler<T> = {
		async apply(target: T, thisArg: any, argArray: any[]) {
			const objName = Object.getPrototypeOf(thisArg)?.constructor?.name || 'N/A';
			try {
				console.log(`[${objName}.${target.name}] Invoking ${target.name}`);
				return await target.apply(thisArg, argArray);
			} catch (e) {
				if(e?.status === 401) {
					console.log(`[${objName}.${target.name}] User unauthorized, deleting profile & redirecting to login page`);
					removeLocalStorageItem(LocalStorageKey.Profile);
					window.location.href = `${globalConfig.BaseDashboardUri}/#/login`;
				}
				console.log(`[${objName}.${target.name}] Exception intercepted- ${e?.statusText || e?.message || e}`);
				throw e;
			}
		}
	}
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
function getObjectMethods(obj: object): string[] {
	let properties = new Set<string>()
	let currentObj = obj
	for (let i = 0; i < 2; i++) {
		Object.getOwnPropertyNames(currentObj).map(item => properties.add(item));
		currentObj = Object.getPrototypeOf(currentObj);
	}

	// Filter all props and return only relevant functions
	return [...properties.keys()].filter(item => {
		const propType = typeof (obj as any)[item]
		return propType === 'function' && item !== 'fetch' && item !== 'constructor';
	});
}

/**
 * Wraps the given object's methods with a generic interceptor
 *
 * @param {*} target The object who's methods are to be wrapped
 * @return {*} The given 'target' object, who's function's have been wrapped with a generic interceptor
 */
export function wrapAllMethods<T extends object>(target: T, interceptor: ProxyHandler<Function>): any {
	const methods = getObjectMethods(target);
	return wrapObjectMethods(target, interceptor, methods as (keyof T)[]);
}

export function wrapObjectMethods<T extends object>(target: T, interceptor: ProxyHandler<Function>, methodsToWrap: (keyof T)[]): any {
	for (const methodName of methodsToWrap) {
		(target as any)[methodName] = new Proxy((target as any)[methodName], interceptor);
	}
	return target;
}

/**
 * Wraps the given API with a dynamic, method intercepting proxy
 *
 * @export
 * @template TApi A Swagger-generated API object type
 * @param {TApi} apiObject An API object instance to wrap
 * @return {*} The given 'apiObject' wrapped with a dynamic proxy
 */
export function createApiProxy<TApi extends object>(apiObject: TApi): any {
	const stdInterceptor: ProxyHandler<Function> = getGenericFunctionInterceptor();
	return new Proxy(wrapAllMethods(apiObject, stdInterceptor), stdInterceptor);
}