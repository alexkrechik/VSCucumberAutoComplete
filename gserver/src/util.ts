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
    let match = text.match(/(\/\*[\s\S]*?\*\/(?:\n\r?)?)/g);
    match && match.forEach(m => {
        let numMatch = m.match(/\n/g);
        let n = numMatch ? numMatch.length : 1;
        text = text.replace(m, '\n'.repeat(n));
    })

    //Replace lines, thet begin from '//' or '#'
    text = text.replace(/.*(\/\/|#).*/g, '');

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
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\$&');
}