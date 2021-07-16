export interface ITypedEvent<TSender, TArgs> {
	attach(handler: TypedEventHandler<TSender, TArgs>): void;
	detach(handler: TypedEventHandler<TSender, TArgs>): void;
}

export type TypedEventHandler<TSender, TArgs> = (sender: TSender, args: TArgs) => void | Promise<void>;

export type EventInvocationOpts = {
	swallowExceptions: boolean;
};

const DEFAULT_EVENT_INVOCATION_OPTS: EventInvocationOpts = {
	swallowExceptions: true,
};

export class TypedEvent<TSender, TArgs> implements ITypedEvent<TSender, TArgs> {
	private _handlers: Set<TypedEventHandler<TSender, TArgs>> = new Set<TypedEventHandler<TSender, TArgs>>();

	public attach(handler: TypedEventHandler<TSender, TArgs>): void {
		this._handlers.add(handler);
	}

	public detach(handler: TypedEventHandler<TSender, TArgs>): void {
		this._handlers.delete(handler);
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
