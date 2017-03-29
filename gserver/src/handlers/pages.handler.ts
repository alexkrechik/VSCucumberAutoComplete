import { getOSPath, getFileContent, clearComments, getId } from '../util';

import {
    Definition,
    CompletionItem,
    Position,
    Location,
    Range,
    Diagnostic,
    DiagnosticSeverity
} from 'vscode-languageserver';

import ElementsHandler, { Element } from './elements.handler';

export type PagesSettings = {
    [page: string]: string
};

export type Page = {
    id: string,
    text: string,
    desc: string,
    def: Definition,
    objects: PageObject[]
};

export type PageObject = {
    id: string,
    text: string,
    desc: string,
    def: Definition
};

export default class PagesHandler {

    private elements: Page[];

    getElements(page?: string, pageObject?: string): Page[] | Page | PageObject {
        if (page) {
            let pageElement = this.elements.find((e) => {
                return e.text === page;
            });
            if (pageObject) {
                return pageElement.objects.find((e) => {
                    return e.text === pageObject;
                });
            } else {
                return pageElement;
            }
        } else {
            return this.elements;
        }
    }

    constructor(settings: PagesSettings) {
        this.populate(settings);
    }

    getPoMatch(line: string): RegExpMatchArray {
        return line.match(/^(?:(?:.*?[\s\.])|.{0})([a-zA-z][^\s\.]*)\s*[:=]/);
    }

    private getPageObjects(text: string, path: string): PageObject[] {
        let res = [];
        text.split(/\r?\n/g).forEach((line, i) => {
            let poMatch = this.getPoMatch(line);
            if (poMatch) {
                let pos = Position.create(i, 0);
                if (!res.find(v => { return v.text === poMatch[1]; })) {
                    res.push({
                        id: 'pageObject' + getId(),
                        text: poMatch[1],
                        desc: line,
                        def: Location.create(getOSPath(path), Range.create(pos, pos))
                    });
                }
            }
        });
        return res;
    }

    private getPage(name: string, path: string): Page {
        let text = getFileContent(path);
        text = clearComments(text);
        let zeroPos = Position.create(0, 0);
        return {
            id: 'page' + getId(),
            text: name,
            desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
            def: Location.create(getOSPath(path), Range.create(zeroPos, zeroPos)),
            objects: this.getPageObjects(text, path)
        };
    }

    populate(settings: PagesSettings): void {
        this.elements = [];
        Object.keys(settings).forEach(p => {
            let path = settings[p];
            this.elements.push(this.getPage(p, path));
        });
    }

    validate(line: string, lineNum: number): Diagnostic[] | null {
        let res = [];
        if (~line.search(/"[^"^\s]*"."[^"^\s]*"/)) {
            let lineArr = line.split('"');
            let curr = 0;
            lineArr.forEach((l, i) => {
                if (l === '.') {
                    let page = lineArr[i - 1];
                    let pageObject = lineArr[i + 1];
                    if (!this.getElements(page)) {
                        res.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: lineNum, character: curr - page.length - 1 },
                                end: { line: lineNum, character: curr + 3 + pageObject.length }
                            },
                            message: `Was unable to find page "${page}"`,
                            source: 'ex'
                        });
                    } else if (!this.getElements(page, pageObject)) {
                        res.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: lineNum, character: curr + 2 },
                                end: { line: lineNum, character: curr + 3 + pageObject.length }
                            },
                            message: `Was unable to find page object "${pageObject}" for page "${page}"`,
                            source: 'ex'
                        });
                    }
                }
                curr += l.length + 1;
            });
        }
        return res.length ? res : null;
    }

    getDefinition(line: string, char: number): Definition | null {
        return null;
    };

    getCompletion(line: string, char: number): CompletionItem[] | null {
        return null;
    };

    getCompletionResolve(item: CompletionItem): CompletionItem {
        return item;
    };

}