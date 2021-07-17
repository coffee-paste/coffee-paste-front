export interface ITypedEvent<TSender, TArgs> {
	attach(handler: TypedEventHandler<TSender, TArgs>): void;
	detach(handler: TypedEventHandler<TSender, TArgs>): void;
	attachWeak(handler: TypedEventHandler<TSender, TArgs>): void;
	detachWeak(handler: TypedEventHandler<TSender, TArgs>): void;
}

export type TypedEventHandler<TSender, TArgs> = (sender: TSender, args: TArgs) => void | Promise<void>;

export type EventInvocationOpts = {
	swallowExceptions: boolean;
};

const DEFAULT_EVENT_INVOCATION_OPTS: EventInvocationOpts = {
	swallowExceptions: true,
};

// Will this throw on unsupported browsers? Need to check...
let GLOBAL_LISTENERS_REGISTRY: FinalizationRegistry;

if (!FinalizationRegistry) {
	console.warn(
		'[TypedEventHandler.ts_Hoist] FinalizationRegistry is undefined- the current browser',
		'may be outdated. Weak handlers will not function and memory leaks may occur'
	);
} else {
	GLOBAL_LISTENERS_REGISTRY = new FinalizationRegistry(
		(heldValue: { eventSource: ITypedEvent<unknown, unknown>; handler: TypedEventHandler<unknown, unknown> }) => {
			heldValue.eventSource.detach(heldValue.handler);
		}
	);
}

export class TypedEvent<TSender, TArgs> implements ITypedEvent<TSender, TArgs> {
	private _handlers: Set<TypedEventHandler<TSender, TArgs>> = new Set<TypedEventHandler<TSender, TArgs>>();

	public attach(handler: TypedEventHandler<TSender, TArgs>): void {
		this._handlers.add(handler);
	}

	public detach(handler: TypedEventHandler<TSender, TArgs>): void {
		this._handlers.delete(handler);
	}

	public attachWeak(handler: TypedEventHandler<TSender, TArgs>): void {
		if (!GLOBAL_LISTENERS_REGISTRY) {
			console.warn(
				'[TypedEvent.attachWeak] Weak references are not supported by the current browser.',
				'Registering a strong reference instead. Memory leaks may occur'
			);
			this.attach(handler);
			return;
		}

		const wrapper = this.wrapHandler(handler);
		GLOBAL_LISTENERS_REGISTRY.register(this, handler, handler);
		this._handlers.add(wrapper);
	}

	public detachWeak(handler: TypedEventHandler<TSender, TArgs>): void {
		if (!GLOBAL_LISTENERS_REGISTRY) {
			// WeakRef/Registry not supported. Treat as a normal handler as attachWeak already did the same
			this.detach(handler);
			return;
		}
		const wrapper = this.wrapHandler(handler);
		GLOBAL_LISTENERS_REGISTRY.unregister(handler);
		this._handlers.delete(wrapper);
	}

	private wrapHandler(handler: TypedEventHandler<TSender, TArgs>): TypedEventHandler<TSender, TArgs> {
		const ref = new WeakRef(handler);
		return (sender: TSender, e: TArgs) => {
			ref.deref()?.(sender, e);
		};
	}

	public async invokeAsync(sender: TSender, args: TArgs, options: EventInvocationOpts = DEFAULT_EVENT_INVOCATION_OPTS): Promise<void> {
		for (const handler of this._handlers) {
			this.tryInvokeInternal(handler, sender, args).catch((err) => {
				console.error(`[TypedEvent.invokeAsync_Catch] Faulted during invocation of an event handler. Error: ${err}`);
				if (options.swallowExceptions === false) {
					throw err;
				}
			});
		}
	}

	private async tryInvokeInternal(handler: TypedEventHandler<TSender, TArgs>, sender: TSender, args: TArgs): Promise<boolean> {
		try {
			await handler(sender, args);
			return true;
		} catch (err) {
			console.error(`[TypedEvent.tryInvokeInternal] Failed during invocation of event handler - ${err}`);
			return false;
		}
	}
}
