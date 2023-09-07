import { Content, ServerContent } from '@spearly/sdk-js'
import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { ReplaceDefinition, getCustomDateString } from '../Utils'
import { generateServerContent } from './TestUtils'

const convServerContentToContent = (serverContent: ServerContent): Content => {
    return {
        attributes: {
            contentAlias: serverContent.attributes.contentAlias,
            createdAt: new Date(serverContent.attributes.createdAt),
            fields: serverContent.attributes.fields,
            nextContent: serverContent.attributes.nextContent,
            patternName: serverContent.attributes.patternName,
            previousContent: serverContent.attributes.previousContent,
            publicUid: serverContent.attributes.publicUid,
            publishedAt: new Date(serverContent.attributes.publishedAt),
            updatedAt: new Date(serverContent.attributes.updatedAt),
        },
        id: serverContent.id,
        type: serverContent.type,
        values: serverContent.values,
    }
}
const convertTestData = [
    { 
        testName: "Sanity Test",
        testHtml: "<div>{%= abc_test1 %}(<span>{%= abc_test2 %}</span>)</div>",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [
            { definitionString: "{%= abc_test1 %}", fieldValue: "text value1", debugInfo: { fieldId: "test1" } },
            { definitionString: "{%= abc_test2 %}", fieldValue: "text value2", debugInfo: { fieldId: "test2" } },
        ] as ReplaceDefinition[],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: false,
        expected: "<div>text value1(<span>text value2</span>)</div>"
    },
    {
        testName: "Extra convert(#url/#link)",
        testHtml: "{%= abc_#url %}, {%= abc_#link %}",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: false,
        expected: "./?contentId=a, ./?contentId=a"
    },
    {
        testName: "Extra convert(#url/#link) with base link url.",
        testHtml: "{%= abc_#url %}, {%= abc_#link %}",
        internalOption: { linkBaseUrl: "item.html" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: false,
        expected: "./item.html?contentId=a, ./item.html?contentId=a"
    },
    {
        testName: "Extra convert(#alias/#uid)",
        testHtml: "{%= abc_#alias %}, {%= abc_#uid %}",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: false,
        expected: "a, a"
    },
    {
        testName: "Extra convert(#content_type)",
        testHtml: "{%= abc_#content_type %}",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: false,
        expected: "abc"
    },
    {
        testName: "Extra convert(#published_at)",
        testHtml: "{%= abc_#published_at %}",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a', { publishedAt: "2025-01-01 00:00:00" })),
        insertDebugInfo: false,
        expected: "2025年01月01日 00時00分00秒"
    },
    {
        testName: "Extra convert(#updated_at)",
        testHtml: "{%= abc_#updated_at %}",
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a', { updatedAt: "2030-01-01 00:00:00" })),
        insertDebugInfo: false,
        expected: "2030年01月01日 00時00分00秒"
    },
    {
        testName: "Injecting debug information(with span element)",
        testHtml: `<div>{%= abc_test1 %}</div>`,
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [ { definitionString: "{%= abc_test1 %}", fieldValue: "text value1", debugInfo: { fieldId: "test1" } }] as ReplaceDefinition[],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: true,
        expected: `<div><span data-spear="abc--a--test1">text value1</span></div>`
    },
    {
        testName: "Injecting debug information in attribute with dobule quote",
        testHtml: `<div id="{%= abc_test1 %}">test</div>`,
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [ { definitionString: "{%= abc_test1 %}", fieldValue: "text value1", debugInfo: { fieldId: "test1" } }] as ReplaceDefinition[],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: true,
        expected: `<div id="text value1" data-spear="abc--a--test1">test</div>`
    },
    {
        testName: "Injecting debug information in attribute with single quote",
        testHtml: `<div id='{%= abc_test1 %}'>test</div>`,
        internalOption: { linkBaseUrl: "" } as SpearlyJSGeneratorOption,
        replacementArray: [ { definitionString: "{%= abc_test1 %}", fieldValue: "text value1", debugInfo: { fieldId: "test1" } }] as ReplaceDefinition[],
        contentType: "abc",
        content: convServerContentToContent(generateServerContent([], 'a')),
        insertDebugInfo: true,
        expected: `<div id='text value1' data-spear='abc--a--test1'>test</div>`
    }
]

describe('getFieldsValueDefinition: 置換文字列の配列生成', () => {
    convertTestData.forEach(testData => {
        it(`generateEachContentFromList: ${testData.testName}`, async () => {
            const jsGenerator = new SpearlyJSGenerator("", "", "", testData.internalOption)
            let result = jsGenerator.convertFromFieldsValueDefinitions(testData.testHtml, testData.replacementArray, testData.content, testData.contentType, testData.insertDebugInfo)

            expect(result).toBe(testData.expected)
        })
    })
})
