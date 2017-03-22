import * as fs from 'fs';

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
    return fs.readFileSync(filePath, 'utf8');
}

export function clearComments(text: string): string {

    //Replace multi-line comments like /* <COMMENT> */
    text = text.replace(/\/\*[\s\S]*?\*\/(\n\r?)?/g, '');

    //Replace lines, thet begin from '//' or '#'
    text = text.replace(/(?:\n\r?)?\s*(?:\/\/|#).*(\n\r?)?/g, '$1');

    //Return our multi-line text without comments
    return text;

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
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}