import * as fs from 'fs';
import * as strip from 'strip-comments';

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
    return strip(text, {silent: true, preserveNewlines: true});

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