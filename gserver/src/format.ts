import { Range } from 'vscode-languageserver';
import { escapeRegExp } from './util';

type FormatConfVal = number | 'relative';

interface FormatConf {
    [key: string]: FormatConfVal
}

const FORMAT_CONF: FormatConf = {
    'Feature:': 0,
    'Scenario:': 1,
    'Background:': 1,
    'Scenario Outline:': 1,
    'Examples:': 2,
    'Given': 2,
    'When': 2,
    'Then': 2,
    'And': 2,
    'But': 2,
    '\\|': 3,
    '"""': 3,
    '#': 'relative',
    '@': 'relative',
};

function findFormat(line: string, settings: Settings): FormatConfVal | null {
    const settingsFormatConf = settings.cucumberautocomplete.formatConfOverride || {};
    const fnFormatFinder = (conf: FormatConf) => {
        const key = Object.keys(conf).find(key => !!~line.search(new RegExp(escapeRegExp('^\\s*' + key))));
        return key ? conf[key] : null;
    };
    const settingsFormat = fnFormatFinder(settingsFormatConf);
    const pesetFormat = fnFormatFinder(FORMAT_CONF);
    return settingsFormat || pesetFormat;
}

function correctIndents(text, indent, settings: Settings) {
    let commentsMode = false;
    return text
        .split(/\r?\n/g)
        .map((line, i, textArr) => {
            //Return empty string if it contains from spaces only
            if (~line.search(/^\s*$/)) return '';
            //Remove spaces in the end of string
            line = line.replace(/\s*$/, '');
            //Lines, that placed between comments, should not be formatted
            if (settings.cucumberautocomplete.skipDocStringsFormat) {
                if (~line.search(/^\s*'''\s*/) || ~line.search(/^\s*"""\s*/)) {
                    commentsMode = !commentsMode;
                } else {
                    if (commentsMode === true) return line;
                }
            }
            //Now we should find current line format
            const format = findFormat(line, settings);
            let indentCount;
            if (typeof format === 'number') {
                indentCount = format;
            } else {
                // Actually we could use 'relative' type of formatting for both - relative and unknown strings
                // In future this behaviour could be reviewed
                const nextLine = textArr.slice(i + 1).find(l => findFormat(l, settings) !== null);
                indentCount = nextLine ? findFormat(nextLine, settings) || 0 : 0;
            }
            return line.replace(/^\s*/, indent.repeat(indentCount));
        })
        .join('\r\n');
}

interface Block {
    line: number,
    block: number,
    data: string[]
}

function formatTables(text) {

    let blockNum = 0;
    let textArr = text.split(/\r?\n/g);

    //Get blocks with data in cucumber tables
    const blocks: Block[] = textArr
        .reduce((res, l, i, arr) => {
            if (~l.search(/^\s*\|/)) {
                res.push({
                    line: i,
                    block: blockNum,
                    data: l.split(/\s*\|\s*/).reduceRight((accumulator, current, index, arr) => {
                        if (index > 0 && index < arr.length - 1) {
                            if (current.endsWith('\\')) {
                                accumulator[0] = current + '|' + accumulator[0];
                            } else {
                                accumulator.unshift(current);
                            }
                        }
                        return accumulator;
                    }, [])
                });
                if (i < arr.length - 1 && !~arr[i + 1].search(/^\s*\|/)) {
                    blockNum++;
                }
            }
            return res;
        }, []);

    //Get max value for each table cell
    const maxes = blocks.reduce((res, b) => {
        const block = b.block;
        if (res[block]) {
            res[block] = res[block].map((v, i) => Math.max(v, b.data[i].length));
        } else {
            res[block] = b.data.map(v => v.length);
        }
        return res;
    }, []);

    //Change all the 'block' lines in our document using correct distance between words
    blocks.forEach(block => {
        let change = block.data
            .map((d, i) => ` ${d}${' '.repeat(maxes[block.block][i] - d.length)} `)
            .join('|');
        change = `|${change}|`;
        textArr[block.line] = textArr[block.line].replace(/\|.*/, change);
    });

    return textArr.join('\r\n');
}

export function format(indent: string, text: string, settings: Settings): string {

    //Insert correct indents for all the lined differs from string start
    text = correctIndents(text, indent, settings);

    //We should format all the tables present
    text = formatTables(text);

    return text;

}
