function getGenericFunctionInterceptor<T extends Function>(): ProxyHandler<T> {
	const handler: ProxyHandler<T> = {
		apply(target: T, thisArg: any, argArray: any[]): any {
			const objName = Object.getPrototypeOf(thisArg)?.constructor?.name || 'N/A';
			try {
				console.log(`[${objName}.${target.name}] Intercepted execution of method ${target.name}`);
				return target.apply(thisArg, argArray);
			} catch (e) {
				console.log(`[${objName}.${target.name}] Exception intercepted- ${e}`);
			}
		}
	}
	return handler;
}

function getObjectMethods(obj: object) {
	let properties = new Set<string>()
	let currentObj = obj
	for (let i = 0; i < 2; i++) {
		Object.getOwnPropertyNames(currentObj).map(item => properties.add(item));
		currentObj = Object.getPrototypeOf(currentObj);
	}

	return [...properties.keys()].filter(item => {
		const propType = typeof (obj as any)[item]
		return propType === 'function' && item !== 'fetch' && item !== 'constructor';
	});
}

function wrapAllMethods(target: any) {
	const methods = getObjectMethods(target);
	for (const methodName of methods) {
		target[methodName] = new Proxy(target[methodName], getGenericFunctionInterceptor());
	}
	return target;
}

export function createApiProxy<TApi>(apiObject: TApi) {
	return new Proxy(wrapAllMethods(apiObject), getGenericFunctionInterceptor());
}