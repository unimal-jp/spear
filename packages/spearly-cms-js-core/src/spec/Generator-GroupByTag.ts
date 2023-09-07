import { GetParams } from '@spearly/sdk-js';
import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { generateServerContent, generateServerListFromContent } from './TestUtils';

const convertTestData = [
    { 
        testName: "Sanity Test",
        template: "<h1>{%= blog_title %}</h1><div>{%= blog_description %}</div><p>{%= blog_#tag %}</p>",
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        tagFieldName: "tags",
        mockData: generateServerListFromContent([
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title" },
                {identifier: "description", inputType: "text", value: "description"},
                {identifier: "tags", inputType: "tags", value: ["tag1", "tag2"]},
            ], 'alias-1'),
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title2" },
                {identifier: "description", inputType: "text", value: "description2"},
                {identifier: "tags", inputType: "tags", value: ["tag2", "tag3"]},
            ], 'alias-2'),
        ]),
        expected: [
            "<h1>title</h1><div>description</div><p>tag1</p>",
            "<h1>title</h1><div>description</div><p>tag2</p>",
            "<h1>title2</h1><div>description2</div><p>tag2</p>",
            "<h1>title2</h1><div>description2</div><p>tag3</p>",
        ],
        expectedPageNum: 4
    },
    {
        testName: "Sub loop",
        template: 
            `<h1>{%= blog_title %}</h1><div cms-loop cms-field="ref"><h4>{%= blog_ref_author %}</h4></div><p>{%= blog_#tag %}</p>}`,
        options: {} as unknown as SpearlyJSGeneratorOption,
        apiOptions: new Map<string, string>(),
        contentType: "blog",
        tagFieldName: "tags",
        mockData: generateServerListFromContent([
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title1" },
                {identifier: "tags", inputType: "tags", value: ["tag1", "tag2"]},
                {identifier: "ref", inputType: "content_type", value: {
                    data: [
                        generateServerContent([
                            {identifier: "author", inputType: "text", value: "ref-title1"},
                        ], 'alias-sub-1'),
                    ]
                }}
            ], 'alias-1'),
            generateServerContent([
                {identifier: "title", inputType: "text", value: "title2" },
                {identifier: "tags", inputType: "tags", value: ["tag2", "tag3"]},
                {identifier: "ref", inputType: "content_type", value: {
                    data: [
                        generateServerContent([
                            {identifier: "author", inputType: "text", value: "ref-title2"},
                        ], 'alias-sub-2'),
                    ]
                }}
            ], 'alias-2'),
        ]),
        expected: [
            "<h1>title1</h1><div>ref-title1</div><p>tag1</p>",
            "<h1>title1</h1><div>ref-title1</div><p>tag2</p>",
            "<h1>title2</h1><div>ref-title2</div><p>tag2</p>",
            "<h1>title2</h1><div>ref-title2</div><p>tag3</p>",
        ],
        expectedPageNum: 4
    }
]

describe('generateListGroupByTag: タグごとのコンテンツ生成', () => {
    convertTestData.forEach(testData => {
        const generator = new SpearlyJSGenerator('apikey', 'domain', 'analyticsDomain', testData.options)
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
                result = await generator.generateListGroupByTag(testData.template, testData.contentType, testData.apiOptions, testData.tagFieldName, "", false)
            } catch(e) {
                console.log(e)
            }

            expect(result.length).toBe(testData.expectedPageNum)
            let i = 0;
            for (const expected of testData.expected) {
                expect(result[i].generatedHtml).toBe(expected)
                i++
            }
        })
    });
})
