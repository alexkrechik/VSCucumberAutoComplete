export type StepSettings = string[];

export type PagesSettings = {
    [page: string]: string
};

export type CustomParameter = {
    isRegexp?: false,
    parameter: string,
    value: string,
} | {
    isRegexp: true,
    parameter: string,
    value: string,
    flags?: string;
};

type FormatConfVal = number | 'relative' | 'relativeUp';

export interface FormatConf {
    [key: string]: FormatConfVal
}

export interface BaseSettings {
    customParameters: CustomParameter[],
    formatConfOverride: FormatConf,
    gherkinDefinitionPart?: string,
    onTypeFormat: boolean,
    pages: PagesSettings,
    pureTextSteps: boolean
    skipDocStringsFormat: boolean,
    smartSnippets: boolean,
    stepRegExSymbol?: string
    steps: string | string[],
    stepsInvariants: boolean,
    strictGherkinCompletion: boolean,
    strictGherkinValidation: boolean,
    syncfeatures: boolean | string,
}

export interface Settings {
    customParameters: CustomParameter[],
    formatConfOverride: FormatConf,
    gherkinDefinitionPart?: string,
    onTypeFormat: boolean,
    pages: PagesSettings,
    pureTextSteps: boolean
    skipDocStringsFormat: boolean,
    smartSnippets: boolean,
    stepRegExSymbol?: string
    steps: StepSettings,
    stepsInvariants: boolean,
    strictGherkinCompletion: boolean,
    strictGherkinValidation: boolean,
    syncfeatures: boolean | string,
}
