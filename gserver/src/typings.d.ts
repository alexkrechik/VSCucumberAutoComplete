type StepSettings = string[];

type PagesSettings = {
    [page: string]: string
};

interface Settings {
    cucumberautocomplete: {
        steps?: StepSettings,
        pages?: PagesSettings,
        syncfeatures?: boolean | string,
        strictGherkinCompletion?: boolean
    }
}