
/**
 * Gets a generic ProxyHandler who's purpose is to intercept object methods.
 * 
 * @template T The type of object being proxied
 * @return {*}  {ProxyHandler<T>}
 */
function getGenericFunctionInterceptor<T extends Function>(): ProxyHandler<T> {
	const handler: ProxyHandler<T> = {
		apply(target: T, thisArg: any, argArray: any[]): any {
			const objName = Object.getPrototypeOf(thisArg)?.constructor?.name || 'N/A';
			try {
				console.log(`[${objName}.${target.name}] Invoking ${target.name}`);
				return target.apply(thisArg, argArray);
			} catch (e) {
				console.log(`[${objName}.${target.name}] Exception intercepted- ${e}`);
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
function wrapAllMethods(target: any): any {
	const methods = getObjectMethods(target);
	for (const methodName of methods) {
		target[methodName] = new Proxy(target[methodName], getGenericFunctionInterceptor());
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
export function createApiProxy<TApi>(apiObject: TApi): any {
	return new Proxy(wrapAllMethods(apiObject), getGenericFunctionInterceptor());
}