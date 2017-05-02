import * as fs from 'fs';
import * as strip from 'strip-comments';
import { Range } from 'vscode-languageserver';

export function getOSPath(path) {
    /* Add suffics for the provided path
     * 'file://' for the non-windows OS's or file:/// for Windows */
    if (/^win/.test(require('process').platform)) {
        return 'file:///' + path;
    } else {
        return 'file:' + path;
    }
}

export function getFileContent(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return '';
    }
}

export function clearComments(text: string): string {
    return strip(text, { silent: true, preserveNewlines: true });
}

//get unique id for the elements ids
let id = {
    x: 0,
    get() {
        return this.x++;
    }
};

export function getId() {
    return id.get();
}

export function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\$&');
}

export function getTextRange(filePath: string, text: string): Range {
    let fileContent = this.getFileContent(filePath);
    let contentArr = fileContent.split(/\r?\n/g);
    for (let i = 0; i < contentArr.length; i++) {
        let find = contentArr[i].indexOf(text);
        if (find > -1) {
            return {
                start: { line: i, character: find },
                end: { line: i, character: find + text.length }
            }
        }
    }
}