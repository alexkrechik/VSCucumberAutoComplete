import {
    Definition,
    CompletionItem,
    Diagnostic
} from 'vscode-languageserver';

export interface Element {
    id: string,
    reg: RegExp,
    text: string,
    desc: string,
    def: Definition
}

abstract class ElementsHandler <D> {

    //All the elements will be placed here
    elements: Element[];

    //Populate an elements on start
    constructor(data: D) {
        this.populate(data);
    }

    //Populate an elements arr using options data
    abstract populate(data: D): void;

    //Return null if line is correct or diagnostic with warning if not
    abstract validate(line: string, lineNum: number): Diagnostic | null;

    //get element by position in line specified
    abstract getDefinition(line: string, char: number): Definition | null;

    //Get list of completion items differs from line and position
    abstract getCompletion(line: string, char: number): CompletionItem[] | void;

    //Just return an item
    abstract getCompletionResolve(item: CompletionItem): CompletionItem[];

}

export default ElementsHandler;
