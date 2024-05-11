import PagesHandler from '../src/pages.handler';

const settings = {
  steps: [],
  pages: {
    page: '/data/page.objects.js',
    page2: '/data/*.java',
  },
};

const pagesHandler = new PagesHandler(__dirname, settings);

describe('getPoMatch', () => {
  describe('diff input PO lines', () => {
    const diffStrings = [
      'var a = 1',
      'const a=1',
      'a: 1',
      'test.a = 1',
      'public a(){}',
    ];
    diffStrings.forEach((l) => {
      it(`should get "a" page object from "${l}" line`, () => {
        const match = pagesHandler.getPoMatch(l);
        expect(match).not.toBeNull();
        expect(match![1]).toStrictEqual('a');
      });
    });
  });
  describe('non PO lines', () => {
    const nonPoLines = ['var a ? 1', 'var a 1 =', '?a: 1'];
    nonPoLines.forEach((l) => {
      it(`should not get match from "${l}" string`, () => {
        const match = pagesHandler.getPoMatch(l);
        expect(match).toBeNull();
      });
    });
  });
});

describe('getElements', () => {
  it('should return all the elements if no parameters provided', () => {
    const res = pagesHandler.elements;
    expect(res).toHaveLength(2);
    expect(res[0].text === 'page');
  });
  it('should return page if provided', () => {
    const res = pagesHandler.getPageElement('page');
    expect(res).not.toBeNull();
    expect(res!['id']).toContain('page');
    expect(res!['text']).toStrictEqual('page');
    expect(res!['objects']).toHaveLength(2);
  });
  it('should return page object if provided', () => {
    const res = pagesHandler.getPageObjectElement('page', 'a');
    expect(res).not.toBeNull();
    expect(res!['id']).toContain('pageObject');
    expect(res!['text']).toStrictEqual('a');
  });
  it('should return null if wrong page/page object provided', () => {
    expect(pagesHandler.getPageElement('page55')).toBeNull();
    expect(pagesHandler.getPageObjectElement('page', 'x')).toBeNull();
    expect(pagesHandler.getPageObjectElement('page2', 'a')).toBeNull();
  });
});

describe('populate', () => {
  it('should populate the elements after constructor call', () => {
    const elements = pagesHandler.elements;
    expect(elements).toHaveLength(2);
    expect(elements[0].objects).toHaveLength(2);
    expect(elements[1].objects).toHaveLength(1);
  });

  it('should not concat elements after repopulating', () => {
    pagesHandler.populate(__dirname, settings.pages);
    const elements = pagesHandler.elements;
    expect(elements).toHaveLength(2);
    expect(elements[0].objects).toHaveLength(2);
    expect(elements[1].objects).toHaveLength(1);
  });

  it('should correctly populate the page from file', () => {
    const page = pagesHandler.elements[0];
    expect(page.id).toContain('page');
    expect(page.text).toStrictEqual('page');
    expect(page.desc).toContain('var a = 1');
    expect(page.def['uri']).toContain('page.objects.js');
  });

  it('should correctly populate the page Objects from file', () => {
    const pageObject1 = pagesHandler.elements[0].objects[0];
    const pageObject2 = pagesHandler.elements[0].objects[1];
    const pageObject3 = pagesHandler.elements[1].objects[0];
    expect(pageObject1.id).toContain('pageObject');
    expect(pageObject1.id).not.toStrictEqual(pageObject2.id);
    expect(pageObject1.text).toStrictEqual('a');
    expect(pageObject1.def['uri']).toContain('page.objects.js');
    expect(pageObject1.def['range'].start.line).toStrictEqual(5);
    expect(pageObject2.id).toContain('pageObject');
    expect(pageObject2.text).toStrictEqual('b');
    expect(pageObject2.def['uri']).toContain('page.objects.js');
    expect(pageObject2.def['range'].start.line).toStrictEqual(6);
    expect(pageObject3.id).toContain('pageObject');
    expect(pageObject3.text).toStrictEqual('variable');
    expect(pageObject3.def['uri']).toContain('page.objects.java');
    expect(pageObject3.def['range'].start.line).toStrictEqual(1);
  });
});

describe('validate', () => {
  it('should not return Diagnostic for correct lines', () => {
    expect(
      pagesHandler.validate('When I click "page"."a" or "page2"."variable"', 2)
    ).toHaveLength(0);
  });
  it('should return correct Diagnostic for non-existent page', () => {
    const d = pagesHandler.validate('I use "pag"."a"', 2);
    expect(d).toHaveLength(1);
    expect(d[0]).toStrictEqual({
      severity: 2,
      range: {
        start: { line: 2, character: 7 },
        end: { line: 2, character: 10 },
      },
      message: 'Was unable to find page "pag"',
      source: 'cucumberautocomplete',
    });
  });
  it('should return corrext Diagnostic for non-existent page object', () => {
    const d = pagesHandler.validate('I use "page"."c"', 2);
    expect(d).toHaveLength(1);
    expect(d[0]).toStrictEqual({
      severity: 2,
      range: {
        start: { line: 2, character: 14 },
        end: { line: 2, character: 15 },
      },
      message: 'Was unable to find page object "c" for page "page"',
      source: 'cucumberautocomplete',
    });
  });
  it('it should return diagnostic for several same non-existent pages', () => {
    const d = pagesHandler.validate('I use "pag"."a" and "pag"."a"', 2);
    expect(d).toHaveLength(2);
    expect(d[0].range.start.character).toStrictEqual(7);
    expect(d[0].range.end.character).toStrictEqual(10);
    expect(d[1].range.start.character).toStrictEqual(21);
    expect(d[1].range.end.character).toStrictEqual(24);
  });
  const invalidLines = [
    'When I click "page"." a"',
    'When I click "page "."a"',
    'When I click "".""',
    'When I click "page".""',
  ];
  invalidLines.forEach((l) => {
    it(`should return diagnostic for "${l}" line`, () => {
      expect(pagesHandler.validate(l, 0).length).toBeGreaterThan(0);
    });
  });
});

describe('getFeaturePosition', () => {
  it('should correctly determine feature line position', () => {
    const line = '  When I use use "page1"."object1" and "page2"."object2"';
    expect(pagesHandler.getFeaturePosition(line, 5)).toBeNull();
    expect(pagesHandler.getFeaturePosition(line, 18)).toStrictEqual({
      page: 'page1',
    });
    expect(pagesHandler.getFeaturePosition(line, 26)).toStrictEqual({
      page: 'page1',
      object: 'object1',
    });
    expect(pagesHandler.getFeaturePosition(line, 36)).toBeNull();
    expect(pagesHandler.getFeaturePosition(line, 41)).toStrictEqual({
      page: 'page2',
    });
    expect(pagesHandler.getFeaturePosition(line, 49)).toStrictEqual({
      page: 'page2',
      object: 'object2',
    });
  });
});

describe('getDefinition', () => {
  it('should correctly get page definition', () => {
    const line = 'When I use "page"."a"';
    const page = pagesHandler.getPageElement('page');
    expect(page).not.toBeNull();
    expect(pagesHandler.getDefinition(line, 13)).toStrictEqual(page!['def']);
  });
  it('should correctly get page object definition', () => {
    const line = 'When I use "page"."a"';
    const pageObject = pagesHandler.getPageObjectElement('page', 'a');
    expect(pageObject).not.toBeNull();
    expect(pagesHandler.getDefinition(line, 20)).toStrictEqual(pageObject!['def']);
  });
  it('should not return definition for wrong cases', () => {
    expect(pagesHandler.getDefinition('When I use "page"."a"', 2)).toBeNull();
    expect(pagesHandler.getDefinition('When I use "pagx"."a"', 13)).toBeNull();
    expect(pagesHandler.getDefinition('When I use "page"."e"', 20)).toBeNull();
    expect(pagesHandler.getDefinition('When I use "pagx"."a"', 20)).toBeNull();
  });
});

describe('getCompletion', () => {
  it('should return all the pages', () => {
    const line = 'When I use "';
    expect(
      pagesHandler.getCompletion(line, { character: 12, line: 2 })
    ).toHaveLength(2);
  });
  it('should return correct page objects', () => {
    const page1Line = 'When I use "page"."a';
    const page2Line = 'When I use "page2"."';
    expect(
      pagesHandler.getCompletion(page1Line, { character: 21, line: 2 })
    ).toHaveLength(2);
    expect(
      pagesHandler.getCompletion(page2Line, { character: 20, line: 2 })
    ).toHaveLength(1);
  });
  it('should return usual string for stab=ndard page', () => {
    const line = 'When I use "".""';
    const pageCompletion = pagesHandler.getCompletion(line, {
      character: 12,
      line: 2,
    })![0];
    expect(pageCompletion).not.toHaveProperty('insertText');
  });
  it('should return smart page if string ends with "', () => {
    const line = 'When I use ""';
    const pageCompletion = pagesHandler.getCompletion(line, {
      character: 12,
      line: 2,
    })![0];
    expect(pageCompletion)
      .toHaveProperty('insertText', 'page".');
    expect(pageCompletion).toHaveProperty('command');
  });
  it('should return correct insertText for pageObject differs from string', () => {
    const poCompletion1 = pagesHandler.getCompletion('When I use "page"."', {
      character: 19,
      line: 2,
    })![0];
    const poCompletion2 = pagesHandler.getCompletion('When I use "page".""', {
      character: 19,
      line: 2,
    })![0];
    expect(poCompletion1).toHaveProperty('insertText', 'a" ');
    expect(poCompletion2).toHaveProperty('insertText', 'a');
  });
});
