import { GetParams } from '@spearly/sdk-js';
import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { generateServerList } from './TestUtils';

const convertTestData = [
    { 
        testName: "Sanity Test",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerList([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "description", inputType: "text", value: "description"}
        ], 2),
        expected: "<h1>title</h1><div>description</div><h1>title</h1><div>description</div>"
    }
]

describe('SpearlyJSGenerator', () => {
    describe('generateContent-list: リスト生成', () => {        
        convertTestData.forEach(testData => {
            let generator = new SpearlyJSGenerator('apikey', 'domain', 'analyticsDomain', testData.options)
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
                    result = await generator.generateList(testData.template, testData.contentType, "", testData.apiOptions)
                } catch(e) {
                    console.log(e)
                }
                expect(result).toBe(testData.expected)
            })
        });
    })
})