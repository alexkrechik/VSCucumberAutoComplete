import * as fs from 'fs';
import * as strip from 'strip-comments';
import { Range } from 'vscode-languageserver';
import * as md5 from 'md5';

export function getOSPath(path: string): string {
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

export function getMD5Id(str: string): string {
    return md5(str);
}

export function escapeRegExp(str: string): string {
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