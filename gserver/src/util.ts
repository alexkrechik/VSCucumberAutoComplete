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

export function clearGherkinComments(text: string): string {
    //Clear all the multiline comments between ''' and """
    let commentsMode = false;
    text = text
        .split(/\r?\n/g)
        .map(l => {
            if (~l.search(/^\s*'''\s*/) || ~l.search(/^\s*"""\s*/)) {
                commentsMode = !commentsMode;
                return l;
            } else {
                return commentsMode ? '' : l;
            }
        })
        .join('\r\n');
    //Clear all the other comments
    return strip(text, { silent: true, preserveNewlines: true });
}

export function getMD5Id(str: string): string {
    return md5(str);
}

export function escapeRegExp(str: string): string {
    // 'Escape' symbols would be ignored by `new RegExp`, but will allow to skip errors 
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\$&');
}

export function escapeRegExpToGetTextSymbols(str: string): string {
    // Proper, double regExp to use special RegExp symbols as a text
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export function getTextRange(filePath: string, text: string): Range {
    const fileContent = this.getFileContent(filePath);
    const contentArr = fileContent.split(/\r?\n/g);
    for (let i = 0; i < contentArr.length; i++) {
        const find = contentArr[i].indexOf(text);
        if (find > -1) {
            return {
                start: { line: i, character: find },
                end: { line: i, character: find + text.length }
            };
        }
    }
}

export function getSortPrefix(num: number, count: number): string {
    const LETTERS_NUM = 26;
    const Z_CODE = 90;
    let res = '';
    for (let i = count - 1; i >= 0; i--) {
        const powNum = Math.pow(LETTERS_NUM, i);
        const letterCode = Math.floor(num / powNum);
        const letterNum = Z_CODE - letterCode;
        const letter = String.fromCharCode(letterNum);
        num = num - powNum * letterCode;
        res += letter;
    }
    return res;
}