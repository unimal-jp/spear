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
        expected: "<h1>title</h1><div>description</div>"
    },
    {
        testName: "Sub loop",
        template: 
            `<h1>{%= blog_title %}</h1>
              <div cms-loop cms-field="ref">
                <h4>{%= blog_ref_author %}</h4>
              </div>`,
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        mockData: generateServerList([
            {identifier: "title", inputType: "text", value: "title" },
            {identifier: "ref", inputType: "reference", value: "ref"},
        ], 2),
        expected: `<h1>title</h1>`
    }
]

describe('SpearlyJSGenerator', () => {
    describe('generateEachContentFromList: リスト生成', () => {
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
                expect(result[0].generatedHtml).toBe(testData.expected)
                expect(result[0].alias).toBe("content-alias")
            })
        });
    })
})