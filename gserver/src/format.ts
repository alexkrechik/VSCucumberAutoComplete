import { escapeRegExp } from './util';

type FormatConfVal = number | 'relative' | 'relativeUp';

interface FormatConf {
    [key: string]: FormatConfVal
}

interface ResolvedFormat {
    symbol: string;
    value: FormatConfVal;
}

const FORMAT_CONF: FormatConf = {
    'Ability': 0,
    'Business Need': 0,
    'Feature:': 0,
    'Rule:': 1,
    'Scenario:': 1,
    'Example:': 1,
    'Background:': 1,
    'Scenario Outline:': 1,
    'Examples:': 2,
    'Given': 2,
    'When': 2,
    'Then': 2,
    'And': 2,
    'But': 2,
    '\\*': 2,
    '\\|': 3,
    '"""': 3,
    '#': 'relative',
    '@': 'relative',
};

const cjkRegex = /[\u3000-\u9fff\uac00-\ud7af\uff01-\uff60]/g;


function findIndentation(line: string, settings: Settings): FormatConfVal | null {
    const format = findFormat(line, settings);
    return format ? format.value : null;
}

function findFormat(line: string, settings: Settings): ResolvedFormat | null {
    const settingsFormatConf = settings.cucumberautocomplete.formatConfOverride || {};
    const fnFormatFinder = (conf: FormatConf): ResolvedFormat | null => {
        const symbol = Object.keys(conf).find(key => !!~line.search(new RegExp(escapeRegExp('^\\s*' + key))));
        return symbol ? { symbol, value: conf[symbol] } : null;
    };
    const settingsFormat = fnFormatFinder(settingsFormatConf);
    const presetFormat = fnFormatFinder(FORMAT_CONF);
    return (settingsFormat === null) ? presetFormat : settingsFormat;
}

export function clearText(text: string) {
    //Remove all the unnecessary spaces in the text
    return text
        .split(/\r?\n/g)
        .map((line, i, textArr) => {
            //Return empty string if it contains from spaces only
            if (~line.search(/^\s*$/)) return '';
            //Remove spaces in the end of string
            line = line.replace(/\s*$/, '');
            return line;
        })
        .join('\r\n');
}

export function correctIndents(text, indent, settings: Settings) {
    let commentsMode = false;
    const defaultIndentation = 0;
    let insideRule = false;
    const ruleValue = findFormat('Rule:', settings).value;
    const ruleIndentation = typeof ruleValue === 'number' ? ruleValue : 0;
    return text
        .split(/\r?\n/g)
        .map((line, i, textArr) => {
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
            if (format && format.symbol === 'Rule:') {
                insideRule = true;
            }
            let indentCount;
            if (~line.search(/^\s*$/)) { indentCount = 0; }
            else if (format && typeof format.value === 'number') {
                indentCount = format.value + (insideRule && format.symbol !== 'Rule:' ? ruleIndentation : 0);
            } else {
                const lookup = (format && format.value === 'relativeUp') ? textArr.slice(0, i).reverse() : textArr.slice(i + 1);
                const relativeLine = lookup.find((l) => typeof findIndentation(l, settings) === 'number');
                if (relativeLine) {
                    if (format && format.symbol !== 'Rule:' && findFormat(relativeLine, settings).symbol === 'Rule:') { insideRule = false; }
                    const relativeLineIndentation = findIndentation(relativeLine, settings);
                    indentCount = relativeLineIndentation === null ? defaultIndentation : relativeLineIndentation;
                } else {
                    indentCount = defaultIndentation;
                }

                indentCount += (insideRule ? ruleIndentation : 0);
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
            } else {
                if (!~l.search(/^\s*#/)) {
                    blockNum++;
                }
            }
            return res;
        }, []);

    //Get max value for each table cell
    const maxes = blocks.reduce((res, b) => {
        const block = b.block;
        if (res[block]) {
            res[block] = res[block].map((v, i) => Math.max(v, stringBytesLen(b.data[i])));
        } else {
            res[block] = b.data.map(v => stringBytesLen(v));
        }
        return res;
    }, []);

    //Change all the 'block' lines in our document using correct distance between words
    blocks.forEach(block => {
        let change = block.data
            .map((d, i) => ` ${d}${' '.repeat(maxes[block.block][i] - stringBytesLen(d))} `)
            .join('|');
        change = `|${change}|`;
        textArr[block.line] = textArr[block.line].replace(/\|.*/, change);
    });

    return textArr.join('\r\n');
}


function formatJson(textBody: string, indent: string) {
    let rxTextBlock = /^\s*"""([\s\S.]*?)"""/gm;
    let rxQuoteBegin = /"""/g;

    let textArr = textBody.match(rxTextBlock);

    if (textArr === null) {
        return textBody;
    }

    for (let txt of textArr) {
        let preJson = txt.replace(rxQuoteBegin, '');
        let taggedMap = {};
        let taggedTexts;
        while ((taggedTexts = /<.*?>/g.exec(preJson)) !== null) {
            taggedTexts.forEach(function (tag, index) {
                let uuid = createUUID();

                taggedMap[uuid] = tag;
                preJson = preJson.replace(tag, uuid);
            });
        }
        if (!isJson(preJson)) {
            continue;
        }

        let rxIndentTotal = /^([\s\S]*?)"""/;
        let textIndentTotal = txt.match(rxIndentTotal);
        let textIndent = textIndentTotal[0].replace('"""', '').replace(/\n/g, '');

        let jsonTxt = JSON.stringify(JSON.parse(preJson), null, indent);
        jsonTxt = '\n"""\n' + jsonTxt + '\n"""';
        jsonTxt = jsonTxt.replace(/^/gm, textIndent);

        // Restore tagged json
        for (let uuid in taggedMap) {
            if (taggedMap.hasOwnProperty(uuid)) {
                jsonTxt = jsonTxt.replace(uuid, taggedMap[uuid]);
            }
        }
        textBody = textBody.replace(txt, jsonTxt);
    }
    return textBody;
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function createUUID() {
    return (Math.floor(Math.random() * 1000000000)).toString();
}

// Consider a CJK character is 2 spaces
function stringBytesLen(str: string) {
    return str.length + (str.match(cjkRegex) || []).length;
}

export function format(indent: string, text: string, settings: Settings): string {

    //Insert correct indents for all the lined differs from string start
    text = correctIndents(text, indent, settings);

    //We should format all the tables present
    text = formatTables(text);

    // JSON beautifier
    text = formatJson(text, indent);

    return text;

}
