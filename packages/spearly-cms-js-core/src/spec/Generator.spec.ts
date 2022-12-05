import { SpearlyJSGenerator } from '../Generator'

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
        contentType: "news",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "description", inputType: "text", value: "description"}
        ]),
        expected: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>"
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
        let generator = new SpearlyJSGenerator('apikey', 'domain')
        
        convertTestData.forEach(testData => {
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
                const result = await generator.generateContent(testData.template, testData.contentType, 'contentId')
                expect(result).toBe(testData.expected)
            })
        });
    })
})