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
        expected: "<h1>title</h1><div>description</div><h1>title2</h1><div>description2</div>"
    },
    { 
        testName: "cms-loop reference sub loop",
        template: `<h1>{%= blog_title %}</h1><div cms-loop cms-field="ref">{%= blog_ref_author %}</div>`,
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerListFromContent([
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title1" },
                {identifier: "ref", inputType: "content_type", value: {
                    data: [
                        generateServerContent([
                            {identifier: "author", inputType: "text", value: "ref-title1"}
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
                        ], 'alias-sub-2')
                    ]
                }}
            ], 'alias-2'),
        ]),
        expected: "<h1>title1</h1><div>ref-title1</div><h1>title2</h1><div>ref-title2</div>"
    }
]

describe('generateList: リスト生成', () => {        
    convertTestData.forEach(testData => {
        const generator = new SpearlyJSGenerator('apikey', 'domain', 'analyticsDomain', testData.options)
        it(`generateContent: ${testData.testName}`, async () => {
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
                result = await generator.generateList(testData.template, testData.contentType, "", testData.apiOptions, false)
            } catch(e) {
                console.log(e)
            }
            expect(result).toBe(testData.expected)
        })
    });
})
