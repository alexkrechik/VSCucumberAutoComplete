import { BaseSettings, Settings } from './types';

export function normalizeSettings(baseSettings: BaseSettings): Settings {
    return {
        ...baseSettings,
        steps: new Array<string>()
            .concat(baseSettings?.steps ?? [])
            .filter((step) => typeof step === 'string' && step.trim().length > 0),
    };
}
