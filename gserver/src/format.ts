import { Range } from 'vscode-languageserver';

interface FormatConf {
    text: string,
    indents: number
}

const FORMAT_CONF: FormatConf[] = [
    { text: 'Feature:', indents: 0 },
    { text: 'Scenario:', indents: 1 },
    { text: 'Background:', indents: 1 },
    { text: 'Scenario Outline:', indents: 1 },
    { text: 'Examples:', indents: 2 },
    { text: 'Given', indents: 2 },
    { text: 'When', indents: 2 },
    { text: 'Then', indents: 2 },
    { text: 'And', indents: 2 },
    { text: 'But', indents: 2 },
    { text: '#', indents: 2 },
    { text: '@', indents: 2 },
    { text: '|', indents: 3 },
    { text: '"""', indents: 3 },
];

export function format(indent: string, range: Range, text: string): string {

    //Get text array
    let textArr = text.split(/\r?\n/g);

    //Get formatted array
    let newTextArr = textArr.map(line => {
        if (~line.search(/^\s*$/)) {
            return '';
        } else {
            let foundFormat = FORMAT_CONF.find(conf => line.search(new RegExp('^\\s*' + conf.text)) !== -1);
            let indentsCount = foundFormat ? foundFormat.indents : 0;
            return line.replace(/^\s*/, indent.repeat(indentsCount));
        }
    });

    //Return formatted text
    return newTextArr.join('\r\n');
}
