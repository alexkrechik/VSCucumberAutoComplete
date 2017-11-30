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

    constructor(root: string, settings: Settings) {
        this.populate(root, settings.cucumberautocomplete.pages);
    }

    getElements(page?: string, pageObject?: string): Page[] | Page | PageObject | null {
        if (page !== undefined) {
            const pageElement = this.elements.find(e => e.text === page);
            if (!pageElement) {
                return null;
            }
            if (pageObject !== undefined) {
                const pageObjectElement = pageElement.objects.find(e => e.text === pageObject);
                return pageObjectElement || null;
            } else {
                return pageElement;
            }
        } else {
            return this.elements;
        }
    }

    getPoMatch(line: string): RegExpMatchArray {
        return line.match(/^(?:(?:.*?[\s\.])|.{0})([a-zA-z][^\s\.]*)\s*[:=\(]/);
    }

    getPageObjects(text: string, path: string): PageObject[] {
        const textArr = text.split(/\r?\n/g);
        return textArr.reduce((res, line, i) => {
            const poMatch = this.getPoMatch(line);
            if (poMatch) {
                const pos = Position.create(i, 0);
                const text = poMatch[1];
                if (!res.find(v => v.text === text)) {
                    res.push({
                        id: 'pageObject' + getMD5Id(text),
                        text: text,
                        desc: line,
                        def: Location.create(getOSPath(path), Range.create(pos, pos))
                    });
                }
            }
            return res;
        }, []);
    }

    getPage(name: string, path: string): Page {
        const files = glob.sync(path);
        if (files.length) {
            const file = files[0];
            const text = clearComments(getFileContent(files[0]));
            const zeroPos = Position.create(0, 0);
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
        this.elements = Object.keys(settings).map(p => this.getPage(p, root + '/' + settings[p]));
    }

    validate(line: string, lineNum: number): Diagnostic[] {
        if (~line.search(/"[^"]*"."[^"]*"/)) {
            return line.split('"').reduce((res, l, i, lineArr) => {
                if (l === '.') {
                    const curr = lineArr.slice(0, i).reduce((a, b, j) => a + b.length + 1, 0);
                    const page = lineArr[i - 1];
                    const pageObject = lineArr[i + 1];
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
                return res;
            }, []);
        } else {
            return [];
        }
    }

    getFeaturePosition(line: string, char: number): FeaturePosition {
        const startLine = line.slice(0, char);
        const endLine = line.slice(char).replace(/".*/, '');
        const match = startLine.match(/"/g);
        if (match && match.length % 2) {
            const [, page, object] = startLine.match(/"(?:([^"]*)"\.")?([^"]*)$/);
            if (page) {
                return {
                    page: page,
                    object: object + endLine
                };
            } else {
                return {
                    page: object + endLine
                };
            }
        } else {
            return null;
        }
    }

    getDefinition(line: string, char: number): Definition | null {
        const position = this.getFeaturePosition(line, char);
        if (position) {
            if (position['object']) {
                const el = this.getElements(position['page'], position['object']);
                return el ? el['def'] : null;
            } else {
                const el = this.getElements(position['page']);
                return el ? el['def'] : null;
            }
        } else {
            return null;
        }
    };

    getPageCompletion(line: string, position: Position, page: Page): CompletionItem {
        const search = line.search(/"([^"]*)"$/);
        if (search > 0 && position.character === (line.length - 1)) {
            const start = Position.create(position.line, search);
            const end = Position.create(position.line, line.length);
            const range = Range.create(start, end);
            return {
                label: page.text,
                kind: CompletionItemKind.Function,
                data: page.id,
                command: { title: 'cursorMove', command: 'cursorMove', arguments: [{ to: 'right', by: 'wrappedLine', select: false, value: 1 }] },
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
        const insertText = line.length === position.character ? '" ' : '';
        return {
            label: pageObject.text,
            kind: CompletionItemKind.Function,
            data: pageObject.id,
            insertText: pageObject.text + insertText,
            documentation: pageObject.desc,
            detail: pageObject.desc
        };
    }

    getCompletion(line: string, position: Position): CompletionItem[] | null {
        const fPosition = this.getFeaturePosition(line, position.character);
        const page = fPosition['page'];
        const object = fPosition['object'];
        if (object !== undefined && page !== undefined) {
            const pageElement = this.getElements(page);
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