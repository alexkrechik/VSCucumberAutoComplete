type StepSettings = string[];

type PagesSettings = {
    [page: string]: string
};

type CustomParameter = {
    parameter: string,
    value: string
};

type FormatConf = {
    text: string,
    type: string,
    indents?: number,
}

interface Settings {
    cucumberautocomplete: {
        steps?: StepSettings,
        pages?: PagesSettings,
        syncfeatures?: boolean | string,
        strictGherkinCompletion?: boolean,
        smartSnippets?: boolean,
        stepsInvariants?: boolean,
        customParameters?: CustomParameter[],
        skipDocStringsFormat?: boolean,
        formatConf?: FormatConf[]
    }
}