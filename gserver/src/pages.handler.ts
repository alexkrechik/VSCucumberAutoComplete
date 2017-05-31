import {
    getOSPath,
    getFileContent,
    clearComments,
    getMD5Id
} from './util';

import {
    Definition,
    CompletionItem,
    Position,
    Location,
    Range,
    Diagnostic,
    DiagnosticSeverity,
    CompletionItemKind,
    TextEdit
} from 'vscode-languageserver';

import * as glob from 'glob';

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

type FeaturePosition = { page: string, object: string } | { page: string } | null;

export default class PagesHandler {

    elements: Page[];

    getElements(page?: string, pageObject?: string): Page[] | Page | PageObject | null {
        if (page !== undefined) {
            let pageElement = this.elements.find((e) => {
                return e.text === page;
            });
            if (!pageElement) {
                return null;
            }
            if (pageObject !== undefined) {
                let pageObjectElement = pageElement.objects.find((e) => {
                    return e.text === pageObject;
                });
                return pageObjectElement || null;
            } else {
                return pageElement;
            }
        } else {
            return this.elements;
        }
    }

    constructor(root: string, settings: PagesSettings) {
        this.populate(root, settings);
    }

    getPoMatch(line: string): RegExpMatchArray {
        return line.match(/^(?:(?:.*?[\s\.])|.{0})([a-zA-z][^\s\.]*)\s*[:=\(]/);
    }

    getPageObjects(text: string, path: string): PageObject[] {
        let res = [];
        let textArr = text.split(/\r?\n/g);
        textArr.forEach((line, i) => {
            let poMatch = this.getPoMatch(line);
            if (poMatch) {
                let pos = Position.create(i, 0);
                let text = poMatch[1];
                if (!res.find(v => { return v.text === text; })) {
                    res.push({
                        id: 'pageObject' + getMD5Id(text),
                        text: text,
                        desc: line,
                        def: Location.create(getOSPath(path), Range.create(pos, pos))
                    });
                }
            }
        });
        return res;
    }

    getPage(name: string, path: string): Page {
        let files = glob.sync(path);
        if (files.length) {
            let file = files[0];
            let text = getFileContent(files[0]);
            text = clearComments(text);
            let zeroPos = Position.create(0, 0);
            return {
                id: 'page' + getMD5Id(name),
                text: name,
                desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
                def: Location.create(getOSPath(file), Range.create(zeroPos, zeroPos)),
                objects: this.getPageObjects(text, file)
            };
        }
    }

    populate(root: string, settings: PagesSettings): void {
        this.elements = [];
        Object.keys(settings).forEach(p => {
            let path = root + '/' + settings[p];
            this.elements.push(this.getPage(p, path));
        });
    }

    validate(line: string, lineNum: number): Diagnostic[] {
        let res = [];
        if (~line.search(/"[^"]*"."[^"]*"/)) {
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
                                end: { line: lineNum, character: curr - 1 }
                            },
                            message: `Was unable to find page "${page}"`,
                            source: 'cucumberautocomplete'
                        });
                    } else if (!this.getElements(page, pageObject)) {
                        res.push({
                            severity: DiagnosticSeverity.Warning,
                            range: {
                                start: { line: lineNum, character: curr + 2 },
                                end: { line: lineNum, character: curr + 3 + pageObject.length - 1 }
                            },
                            message: `Was unable to find page object "${pageObject}" for page "${page}"`,
                            source: 'cucumberautocomplete'
                        });
                    }
                }
                curr += l.length + 1;
            });
        }
        return res;
    }

    getFeaturePosition(line: string, char: number): FeaturePosition {
        let startLine = line.slice(0, char);
        let endLine = line.slice(char).replace(/".*/, '');
        let match = startLine.match(/"/g);
        if (match && match.length % 2) {
            let poMatch = startLine.match(/"(?:([^"]*)"\.")?([^"]*)$/);
            if (poMatch[1]) {
                return {
                    page: poMatch[1],
                    object: poMatch[2] + endLine
                };
            } else {
                return {
                    page: poMatch[2] + endLine
                };
            }
        } else {
            return null;
        }
    }

    getDefinition(line: string, char: number): Definition | null {
        let position = this.getFeaturePosition(line, char);
        if (position) {
            if (position['object']) {
                let el = this.getElements(position['page'], position['object']);
                return el ? el['def'] : null;
            } else {
                let el = this.getElements(position['page']);
                return el ? el['def'] : null;
            }
        } else {
            return null;
        }
    };

    getPageCompletion(line: string, position: Position, page: Page): CompletionItem {
        let search = line.search(/"([^"]*)"$/);
        if (search > 0 && position.character === (line.length - 1)) {
            let start = Position.create(position.line, search);
            let end = Position.create(position.line, line.length);
            let range = Range.create(start, end);
            return {
                label: page.text,
                kind: CompletionItemKind.Function,
                data: page.id,
                command: {title: 'cursorMove', command: 'cursorMove', arguments: [{to: 'right', by: 'wrappedLine', select: false, value: 1}]},
                insertText: page.text + '".'
            };
        } else {
            return {
                label: page.text,
                kind: CompletionItemKind.Function,
                data: page.id
            };
        }
    }

    getPageObjectCompletion(line: string, position: Position, pageObject: PageObject): CompletionItem {
        let insertText = '';
        if (line.length === position.character) {
            insertText = '" ';
        }
        return {
            label: pageObject.text,
            kind: CompletionItemKind.Function,
            data: pageObject.id,
            insertText: pageObject.text + insertText
        };
    }

    getCompletion(line: string, position: Position): CompletionItem[] | null {
        let fPosition = this.getFeaturePosition(line, position.character);
        let page = fPosition['page'];
        let object = fPosition['object'];
        if (object !== undefined && page !== undefined) {
            let pageElement = this.getElements(page);
            if (pageElement) {
                return pageElement['objects'].map(this.getPageObjectCompletion.bind(null, line, position));
            } else {
                return null;
            }
        } else if (page !== undefined) {
            return this.getElements()['map'](this.getPageCompletion.bind(null, line, position));
        } else {
            return null;
        }
    };

    getCompletionResolve(item: CompletionItem): CompletionItem {
        return item;
    };

}