import { GetParams } from '@spearly/sdk-js';
import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { generateServerContent, generateServerListFromContent } from './TestUtils';

const convertTestData = [
    { 
        testName: "Sanity Test",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerListFromContent([
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title" },
                {identifier: "description", inputType: "text", value: "description" },
            ], 'alias-1'),
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title2" },
                {identifier: "description", inputType: "text", value: "description2" },
            ], 'alias-2'),
        ]),
        expected: [
            "<h1>title</h1><div>description</div>",
            "<h1>title2</h1><div>description2</div>"
        ]
    },
    {
        testName: "Sub loop",
        template: 
            `<h1>{%= blog_title %}</h1><div cms-loop cms-field="ref"><h4>{%= blog_ref_author %}</h4></div>`,
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerListFromContent([
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title" },
                {identifier: "ref", inputType: "content_type", value: {
                    data: [
                        generateServerContent([
                            {identifier: "author", inputType: "text", value: "ref-title"}
                        ], 'alias-sub-1')
                    ]
                }}
            ], 'alias-1'),
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title2" },
                {identifier: "ref", inputType: "content_type", value: {
                    data: [
                        generateServerContent([
                            {identifier: "author", inputType: "text", value: "ref-title2"}
                        ], 'alias-sub-1')
                    ]
                }}
            ], 'alias-2'),
        ]),
        expected: [
            `<h1>title</h1><div><h4>ref-title</h4></div>`,
            `<h1>title2</h1><div><h4>ref-title2</h4></div>`
        ]
    }
]

describe('generateEachContentFromList: リストかこコンテンツ生成(リストのコンテンツ毎)', () => {
    convertTestData.forEach(testData => {
        let generator = new SpearlyJSGenerator('apikey', 'domain', 'analyticsDomain', testData.options)
        it(`generateEachContentFromList: ${testData.testName}`, async () => {
            // モック
            Object.defineProperty(generator, 'client', {
                value: {
                    getList: (_: string, param: GetParams | undefined) => {
                        return Promise.resolve(testData.mockData)
                    }
                }
            });

            // 変換
            let result
            try {
                result = await generator.generateEachContentFromList(testData.template, testData.contentType, testData.apiOptions, "", false)
            } catch(e) {
                console.log(e)
            }
            expect(result.length).toBe(2)
            for (let i = 0; i < result.length; i++) {
                expect(result[i].generatedHtml).toBe(testData.expected[i])
                expect(result[i].alias).toBe(`alias-${i+1}`)
            }
        })
    });
})
