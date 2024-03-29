import { GetContentOption, SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { generateServerContent } from './TestUtils';

const convertTestData = [
    { 
        testName: "Sanity Test",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "description", inputType: "text", value: "description"}
        ], 'alias'),
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
        ], 'alias'),
        expected: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>"
    },
    {
        testName: "Default date formatter",
        template: "<date>{%= blog_date %}</date>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" }
        ], 'alias'),
        expected: "<date>2022年12月05日 11時22分33秒</date>"
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
        ], 'alias'),
        expected: "<date>Mon Dec 05 2022 11:22:33 GMT+0900 (Japan Standard Time)</date>"
    },
    {
        testName: "Date only",
        template: "<date>{%= blog_date_#date_only %}</date>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" }
        ], 'alias'),
        expected: "<date>2022年12月05日</date>"
    },
    {
        testName: "Custom date formatter",
        template: "<p>{%= blog_#alias %}</p>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        contentType: "blog",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
        ], 'content-alias'),
        expected: "<p>content-alias</p>"
    },
    {
        testName: "Sub loop",
        template: 
            `<div><h1>{%= blog_title %}</h1><div cms-loop cms-field="ref"><h4>{%= blog_ref_author %}</h4></div></div>`,
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerContent([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "ref", inputType: "content_type", value: {
                data: [
                    generateServerContent([
                        {identifier: "author", inputType: "text", value: "ref-title"}
                    ], 'alias-sub-1')
                ]
            }}
        ], 'alias'),
        expected: `<div><h1>title</h1><div><h4>ref-title</h4></div></div>`
    }
]

describe('constructor: コンストラクタ', () => {
    it('コンストラクタが正常にオブジェクトを生成する', () => {
        const generator = new SpearlyJSGenerator('aaa', 'bbb', 'ccc')
        expect(generator).not.toBeNull()
    })
}),

describe('generateContent: コンテンツ生成', () => {        
    convertTestData.forEach(testData => {
        const generator = new SpearlyJSGenerator('apikey', 'domain', 'analyticsDomain', testData.options)
        it(`generateContent: ${testData.testName}`, async () => {
            // モック
            Object.defineProperty(generator, 'client', {
                value: {
                    getContent: (_: string) => {
                        return Promise.resolve(testData.mockData)
                    }
                }
            });

            // 変換
            let result, uid, patternName;
            try {
                [result, uid, patternName] = await generator.generateContent(testData.template, testData.contentType, 'contentId', {
                    patternName: 'patternName'
                } as GetContentOption, false)
            } catch(e) {
                console.log(e)
            }
            expect(result).toBe(testData.expected)
        })
    });
})

