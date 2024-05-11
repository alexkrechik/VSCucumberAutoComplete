import { escapeRegExp } from './util';

const givenWords = escapeRegExp('Gegewe|بفرض|Dau|Dada|Daus|Dadas|Դիցուք|Dáu|Daos|Daes|Y\'know|Tutaq ki|Verilir|Dato|Дадено|Donat|Donada|Atès|Atesa|假如|假设|假定|假設|Sipoze|Sipoze ke|Sipoze Ke|Zadan|Zadani|Zadano|Pokud|Za předpokladu|Givet|Gegeven|Stel|😐|Given|Donitaĵo|Komence|Eeldades|Oletetaan|Soit|Etant donné que|Etant donné qu\'|Etant donné|Etant donnée|Etant donnés|Etant données|Étant donné que|Étant donné qu\'|Étant donné|Étant donnée|Étant donnés|Étant données|Dado|Dados|მოცემული|Angenommen|Gegeben sei|Gegeben seien|Gegebensei|Gegebenseien|Δεδομένου|આપેલ છે|בהינתן|अगर|यदि|चूंकि|Amennyiben|Adott|Ef|Dengan|Cuir i gcás go|Cuir i gcás nach|Cuir i gcás gur|Cuir i gcás nár|Data|Dati|Date|前提|Nalika|Nalikaning|ನೀಡಿದ|ghu\' noblu\'|DaH ghu\' bejlu\'|조건|먼저|I CAN HAZ|Kad|Duota|ugeholl|Дадена|Dadeno|Dadena|Diberi|Bagi|Өгөгдсөн нь|Анх|Gitt|Thurh|Þurh|Ðurh|ਜੇਕਰ|ਜਿਵੇਂ ਕਿ|با فرض|Gangway!|Zakładając|Mając|Zakładając, że|Date fiind|Dat fiind|Dată fiind|Dati fiind|Dați fiind|Daţi fiind|Допустим|Дано|Пусть|Givun|Youse know when youse got|За дато|За дате|За дати|Za dato|Za date|Za dati|Pokiaľ|Za predpokladu|Dano|Podano|Zaradi|Privzeto|கொடுக்கப்பட்ட|Әйтик|చెప్పబడినది|กำหนดให้|Diyelim ki|Припустимо|Припустимо, що|Нехай|اگر|بالفرض|فرض کیا|Агар|Biết|Cho|Anrhegedig a');
const whenWords = escapeRegExp('Wanneer|متى|عندما|Cuan|Եթե|Երբ|Cuando|It\'s just unbelievable|Əgər|Nə vaxt ki|Kada|Когато|Quan|当|當|Lè|Le|Kad|Když|Når|Als|🎬|When|Se|Kui|Kun|Quand|Lorsque|Lorsqu\'|Cando|როდესაც|Wenn|Όταν|ક્યારે|כאשר|जब|कदा|Majd|Ha|Amikor|Þegar|Ketika|Nuair a|Nuair nach|Nuair ba|Nuair nár|Quando|もし|Manawa|Menawa|ಸ್ಥಿತಿಯನ್ನು|qaSDI\'|만일|만약|WEN|Ja|Kai|wann|Кога|Koga|Apabila|Хэрэв|Tha|Þa|Ða|ਜਦੋਂ|هنگامی|Blimey!|Jeżeli|Jeśli|Gdy|Kiedy|Cand|Când|Когда|Если|Wun|Youse know like when|Када|Кад|Keď|Ak|Ko|Ce|Če|Kadar|När|எப்போது|Әгәр|ఈ పరిస్థితిలో|เมื่อ|Eğer ki|Якщо|Коли|جب|Агар|Khi|Pryd');
const thenWords = escapeRegExp('Dan|اذاً|ثم|Alavez|Allora|Antonces|Ապա|Entós|But at the end of the day I reckon|O halda|Zatim|То|Aleshores|Cal|那么|那麼|Lè sa a|Le sa a|Onda|Pak|Så|🙏|Then|Do|Siis|Niin|Alors|Entón|Logo|მაშინ|Dann|Τότε|પછી|אז|אזי|तब|तदा|Akkor|Þá|Maka|Ansin|ならば|Njuk|Banjur|ನಂತರ|vaj|그러면|DEN|Tad|Tada|dann|Тогаш|Togash|Kemudian|Тэгэхэд|Үүний дараа|Tha|Þa|Ða|Tha the|Þa þe|Ða ðe|ਤਦ|آنگاه|Let go and haul|Wtedy|Então|Entao|Atunci|Затем|Тогда|Dun|Den youse gotta|Онда|Tak|Potom|Nato|Potem|Takrat|Entonces|அப்பொழுது|Нәтиҗәдә|అప్పుడు|ดังนั้น|O zaman|Тоді|پھر|تب|Унда|Thì|Yna');
const andWords = escapeRegExp('En|و|Y|E|Եվ|Ya|Too right|Və|Həm|A|И|而且|并且|同时|並且|同時|Ak|Epi|A také|Og|😂|And|Kaj|Ja|Et que|Et qu\'|Et|და|Und|Και|અને|וגם|और|तथा|És|Dan|Agus|かつ|Lan|ಮತ್ತು|\'ej|latlh|그리고|AN|Un|Ir|an|a|Мөн|Тэгээд|Ond|7|ਅਤੇ|Aye|Oraz|Si|Și|Şi|К тому же|Также|An|A tiež|A taktiež|A zároveň|In|Ter|Och|மேலும்|மற்றும்|Һәм|Вә|మరియు|และ|Ve|І|А також|Та|اور|Ва|Và');
const butWords = escapeRegExp('Maar|لكن|Pero|Բայց|Peru|Yeah nah|Amma|Ancaq|Ali|Но|Però|但是|Men|Ale|😔|But|Sed|Kuid|Mutta|Mais que|Mais qu\'|Mais|მაგ­რამ|Aber|Αλλά|પણ|אבל|पर|परन्तु|किन्तु|De|En|Tapi|Ach|Ma|しかし|但し|ただし|Nanging|Ananging|ಆದರೆ|\'ach|\'a|하지만|단|BUT|Bet|awer|mä|No|Tetapi|Гэхдээ|Харин|Ac|ਪਰ|اما|Avast!|Mas|Dar|А|Иначе|Buh|Али|Toda|Ampak|Vendar|ஆனால்|Ләкин|Әмма|కాని|แต่|Fakat|Ama|Але|لیکن|Лекин|Бирок|Аммо|Nhưng|Ond');
const otherWords = escapeRegExp('\\*');
export const allGherkinWords = `${givenWords}|${whenWords}|${thenWords}|${andWords}|${butWords}|${otherWords}`;

const givenWordsArr = givenWords.split('|');
const whenWordsArr = whenWords.split('|');
const thenWordsArr = thenWords.split('|');
const andWordsArr = andWords.split('|');
const butWordsArr = butWords.split('|');

const givenWordsArrLower = givenWords.toLowerCase().split('|');
const whenWordsArrLower = whenWords.toLowerCase().split('|');
const thenWordsArrLower = thenWords.toLowerCase().split('|');
const andWordsArrLower = andWords.toLowerCase().split('|');
const butWordsArrLower = butWords.toLowerCase().split('|');

export enum GherkinType {
    Given,
    When,
    Then,
    And,
    But,
    Other
}

export const getGherkinType = (word: string): GherkinType => {
    if (~givenWordsArr.indexOf(word)) {
        return GherkinType.Given;
    }
    if (~whenWordsArr.indexOf(word)) {
        return GherkinType.When;
    }
    if (~thenWordsArr.indexOf(word)) {
        return GherkinType.Then;
    }
    if (~andWordsArr.indexOf(word)) {
        return GherkinType.And;
    }
    if (~butWordsArr.indexOf(word)) {
        return GherkinType.But;
    }
    return GherkinType.Other;
};

export const getGherkinTypeLower = (word: string): GherkinType => {
    const lowerWord = word.toLowerCase();
    if (~givenWordsArrLower.indexOf(lowerWord)) {
        return GherkinType.Given;
    }
    if (~whenWordsArrLower.indexOf(lowerWord)) {
        return GherkinType.When;
    }
    if (~thenWordsArrLower.indexOf(lowerWord)) {
        return GherkinType.Then;
    }
    if (~andWordsArrLower.indexOf(lowerWord)) {
        return GherkinType.And;
    }
    if (~butWordsArrLower.indexOf(lowerWord)) {
        return GherkinType.But;
    }
    return GherkinType.Other;
};
