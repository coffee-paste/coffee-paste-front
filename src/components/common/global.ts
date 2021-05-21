
class GlobalConfig {

    private channelSession: string;


    public get ChannelSession(): string {
        return this.channelSession || '';
    }

    public set ChannelSession(channelSession: string) {
        this.channelSession = channelSession;
    }

}

export const globalConfig = new GlobalConfig();