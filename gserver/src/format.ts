import {Range} from 'vscode-languageserver';

const formatConf = [
    { text: 'Feature:', indents: 0 },
    { text: 'Scenario:', indents: 1 },
    { text: 'Given', indents: 2 },
    { text: 'When', indents: 2 },
    { text: 'Then', indents: 2 },
    { text: 'And', indents: 2 },
    { text: 'But', indents: 2 },
    { text: '#', indents: 2 }
];

export function format(indent: string, range: Range, text: string): string {

    //Get text array
    let textArr = text.split(/\r?\n/g);

    //Get formatted array
    let indentsCount = 0;
    let newTextArr = textArr.map(line => {
        if (line.search(/^\s*$/) !== -1) {
            return '';
        } else {
            let foundFormat = formatConf.find(conf => {
                return (line.search(new RegExp('^\\s*' + conf.text)) !== -1);
            });
            if (foundFormat) {
                indentsCount = foundFormat.indents;
            }
            return line.replace(/^\s*/, indent.repeat(indentsCount));
        }
    });

    //Return formatted text
    return newTextArr.join('\r\n');
}
