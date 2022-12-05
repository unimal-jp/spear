import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'

type ATTR = {
    identifier: string;
    inputType: string;
    value: string;
}

const generateServerContent = (attrs: ATTR[]) :any => {
    const template = {
        attributes: {
            contentAlias: 'content-alias',
            createdAt: "2022-12-05 00:00:00",
            fields: {
                data: new Array(),
            },
            publicUid: 'content_1',
            publishedAt: '2022-12-04 00:00:00',
            updatedAt: '2022-12-04 00:00:00'
        },
        values: {}
    }
    attrs.forEach((attr, id) => {
        template.attributes.fields.data.push({
            attributes: {
                identifier: attr.identifier,
                inputType: attr.inputType,
                value: attr.value
            },
            id,
            type: 'field',
        })
        Object.defineProperty(template.values, attr.identifier, {
            value: attr.value
        })
    })
    return template
}

const convertTestData = [
    { 
        testName: "Sanity Test",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "description", inputType: "text", value: "description"}
        ]),
        expected: "<h1>title</h1><div>description</div>"
    },
    { 
        testName: "mismatch contentType",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "news",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "description", inputType: "text", value: "description"}
        ]),
        expected: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>"
    },
    {
        testName: "Default date formatter",
        template: "<date>{%= blog_date %}</date>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" }
        ]),
        expected: "<date>2022年12月5日 11時22分33秒</date>"
    },
    {
        testName: "Custom date formatter",
        template: "<date>{%= blog_date %}</date>",
        options: {
            dateFormatter: function originalDateFormatter(date: Date): string {
                return date.toString();
            }
        } as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" }
        ]),
        expected: "<date>2022-12-05 11:22:33</date>"
    }
]

describe('SpearlyJSGenerator', () => {
    describe('constructor: コンストラクタ', () => {
        it('コンストラクタが正常にオブジェクトを生成する', () => {
            const generator = new SpearlyJSGenerator('aaa', 'bbb')
            expect(generator).not.toBeNull()
        })
    }),

    describe('generateContent: コンテンツ生成', () => {        
        convertTestData.forEach(testData => {
            let generator = new SpearlyJSGenerator('apikey', 'domain', testData.options)
            it(`generateContent: ${testData.testName}`, async () => {
                // モック
                Object.defineProperty(generator, 'client', {
                    value: {
                        getContent: (_: string) => {
                            return Promise.resolve(convertTestData[0].mockData)
                        }
                    }
                });

                // 変換
                let result
                try {
                    result = await generator.generateContent(testData.template, testData.contentType, 'contentId')
                } catch(e) {
                    console.log(e)
                }
                expect(result).toBe(testData.expected)
            })
        });
    })
})