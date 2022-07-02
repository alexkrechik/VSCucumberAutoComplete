type StepSettings = string[];

type PagesSettings = {
    [page: string]: string
};

type CustomParameter = {
    parameter: string | RegExp,
    value: string
};

type FormatConf = {
    [key: string]: number | 'relative'
};

interface Settings {
    cucumberautocomplete: {
        steps?: StepSettings,
        pages?: PagesSettings,
        syncfeatures?: boolean | string,
        strictGherkinCompletion?: boolean,
        strictGherkinValidation?: boolean,
        smartSnippets?: boolean,
        stepsInvariants?: boolean,
        customParameters?: CustomParameter[],
        skipDocStringsFormat?: boolean,
        formatConfOverride?: FormatConf[],
        onTypeFormat?: boolean,
        gherkinDefinitionPart?: string,
        stepRegExSymbol?: string,
        allowDuplicates?: boolean
    }
}