import { FieldTypeAll, GetParams } from '@spearly/sdk-js';
import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'
import { generateServerContent, generateServerListFromContent } from './TestUtils';
import getFieldsValuesDefinitions, { ReplaceDefinition, getCustomDateString } from '../Utils';

const defaultDateFormatter = (date: Date, dateOnly?: boolean) => { return getCustomDateString(`YYYY年MM月DD日${!dateOnly ? " hh時mm分ss秒" : ""}`, date) }
const convertTestData = [
    { 
        testName: "Sanity Test",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "text",      inputType: "text",      value: "text value" } },
            { id: "2345", type: "field", attributes: { identifier: "number",    inputType: "number",    value: 123456  } },
            { id: "3456", type: "field", attributes: { identifier: "richText",  inputType: "rich_text", value: "<span>rich</span>" } },
            { id: "4567", type: "field", attributes: { identifier: "image",     inputType: "image",     value: "https://foobar.com/img.png" } },
            { id: "5678", type: "field", attributes: { identifier: "calendar",  inputType: "calendar",  value: "2023/07/07 14:37" } },
            { id: "8901", type: "field", attributes: { identifier: "tags",      inputType: "tags",      value: [ "tag1", "tag2" ] } },
            { id: "6789", type: "field", attributes: { identifier: "mapAddress",inputType: "map",       value: {
                preferredFormat: "address",
                address: "東京都渋谷区道玄坂",
                latitude: 35.6585805,
                longitude: 139.7019221,
            } } },
            { id: "7890", type: "field", attributes: { identifier: "mapCoord",  inputType: "map",       value: {
                preferredFormat: "coord",
                address: "東京都渋谷区道玄坂",
                latitude: 35.6585805,
                longitude: 139.7019221,
            } } },
            { id: "9012", type: "field", attributes: { identifier: "content_type",inputType: "content_type",value: {
                data: [
                    generateServerContent([
                        {identifier: "title", inputType: "text", value: "ref-title"}
                    ], 'alias-sub-1'),
                ]
            } } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 15,
        expected: [
            { definitionString: "{%= a_text %}", fieldValue: "text value", debugInfo: { fieldId: "text" } },
            { definitionString: "{%= a_number %}", fieldValue: "123456", debugInfo: { fieldId: "number" } },
            { definitionString: "{%= a_richText %}", fieldValue: "<span>rich</span>", debugInfo: { fieldId: "richText" } },
            { definitionString: "{%= a_image %}", fieldValue: "https://foobar.com/img.png", debugInfo: { fieldId: "image" } },
            { definitionString: "{%= a_calendar %}", fieldValue: "2023年07月07日 14時37分00秒", debugInfo: { fieldId: "calendar" } },
            { definitionString: "{%= a_calendar_#date_only %}", fieldValue: "2023年07月07日", debugInfo: { fieldId: "calendar" } },
            { definitionString: "{%= a_tags %}", fieldValue: "tag1,tag2", debugInfo: { fieldId: "tags" } },
            { definitionString: "{%= a_mapAddress_#address %}", fieldValue: "%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E9%81%93%E7%8E%84%E5%9D%82", debugInfo: { fieldId: "mapAddress" } },
            { definitionString: "{%= a_mapAddress_#address_decoded %}", fieldValue: "東京都渋谷区道玄坂", debugInfo: { fieldId: "mapAddress" } },
            { definitionString: "{%= a_mapAddress_#latitude %}", fieldValue: "35.6585805", debugInfo: { fieldId: "mapAddress" } },
            { definitionString: "{%= a_mapAddress_#longitude %}", fieldValue: "139.7019221", debugInfo: { fieldId: "mapAddress" } },
            { definitionString: "{%= a_mapCoord_#address %}", fieldValue: "%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA%E9%81%93%E7%8E%84%E5%9D%82", debugInfo: { fieldId: "mapCoord" } },
            { definitionString: "{%= a_mapCoord_#address_decoded %}", fieldValue: "東京都渋谷区道玄坂", debugInfo: { fieldId: "mapCoord" } },
            { definitionString: "{%= a_mapCoord_#latitude %}", fieldValue: "35.6585805", debugInfo: { fieldId: "mapCoord" } },
            { definitionString: "{%= a_mapCoord_#longitude %}", fieldValue: "139.7019221", debugInfo: { fieldId: "mapCoord" } },
        ] as ReplaceDefinition[],
    },
    { 
        testName: "escape (text)",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "text",      inputType: "text",      value: "<html>" } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 1,
        expected: [
            { definitionString: "{%= a_text %}", fieldValue: "&lt;html&gt;", debugInfo: { fieldId: "text" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: "escape (rich_text)",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "richText",  inputType: "rich_text", value: `<span>rich</span>\r\n"<hr>` } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 1,
        expected: [
            { definitionString: "{%= a_richText %}", fieldValue: `<span>rich</span>\\r\\n"<hr>`, debugInfo: { fieldId: "richText" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: "escape (image)",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "image",     inputType: "image",     value: "https://foobar.com/img.png&id=日本語" } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 1,
        expected: [
            // It's not encodeURIComponent().
            { definitionString: "{%= a_image %}", fieldValue: "https://foobar.com/img.png&id=日本語", debugInfo: { fieldId: "image" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: "content type(1st depth)",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "ref1",inputType: "content_type",value: {
                // @ts-ignore
                data: [
                    generateServerContent([
                        {identifier: "title", inputType: "text", value: "ref-title"}
                    ], 'alias-sub-1'),
                ]
            }}},
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: false,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 1,
        expected: [
            // TODO: This debug information is not correct. However, we can't use it.
            { definitionString: "{%= a_ref1_title %}", fieldValue: "ref-title", debugInfo: { fieldId: "title" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: "content type (2nd depth)",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "ref1",inputType: "content_type",value: {
                // @ts-ignore
                data: [
                    generateServerContent([
                        {identifier: "ref2", inputType: "content_type", value: {
                            // @ts-ignore
                            data: [
                                generateServerContent([
                                    {identifier: "title", inputType: "text", value: "ref-title"}
                                ], 'alias-sub-1'),
                            ]
                        }}
                    ], 'alias-sub-1'),
                ]
            }}},
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: false,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 1,
        expected: [
            { definitionString: "{%= a_ref1_ref2_title %}", fieldValue: "ref-title", debugInfo: { fieldId: "title" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: "content type (3rd depth) : We cannot get 3rd depth content type due to depth check",
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "ref1",inputType: "content_type",value: {
                // @ts-ignore
                data: [
                    generateServerContent([
                        {identifier: "ref2", inputType: "content_type", value: {
                            // @ts-ignore
                            data: [
                                generateServerContent([
                                    {identifier: "ref3", inputType: "content_type", value: {
                                        // @ts-ignore
                                        data: [
                                            generateServerContent([
                                                {identifier: "title", inputType: "text", value: "ref-title"}
                                            ], 'alias-sub-1'),
                                        ]
                                    }}
                                ], 'alias-sub-1'),
                            ]
                        }}
                    ], 'alias-sub-1'),
                ]
            }}},
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: false,
        dateFormatter: defaultDateFormatter,
        expectedAmount: 0,
        expected: [
        ] as ReplaceDefinition[],
    },
    {
        testName: 'date formatter (日本語フォーマット)',
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: (date: Date, dateOnly?: boolean) => { return getCustomDateString(`YYYY年MM月DD日${!dateOnly ? " hh時mm分ss秒" : ""}`, date) },
        expectedAmount: 2,
        expected: [
            { definitionString: "{%= a_date %}", fieldValue: "2022年12月05日 11時22分33秒", debugInfo: { fieldId: "date" } },
            { definitionString: "{%= a_date_#date_only %}", fieldValue: "2022年12月05日", debugInfo: { fieldId: "date" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: 'date formatter (YYYY-MM-DD hh:mm:ss)',
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: (date: Date, dateOnly?: boolean) => { return getCustomDateString(`YYYY-MM-DD${!dateOnly ? " hh:mm:ss" : ""}`, date) },
        expectedAmount: 2,
        expected: [
            { definitionString: "{%= a_date %}", fieldValue: "2022-12-05 11:22:33", debugInfo: { fieldId: "date" } },
            { definitionString: "{%= a_date_#date_only %}", fieldValue: "2022-12-05", debugInfo: { fieldId: "date" } },
        ] as ReplaceDefinition[],
    },
    {
        testName: 'date formatter throw Error',
        fields: [
            { id: "1234", type: "field", attributes: { identifier: "date", inputType: "calendar", value: "2022-12-05 11:22:33" } },
        ] as FieldTypeAll[],
        prefix: "a",
        depth: 0,
        disableContentType: true,
        dateFormatter: (date: Date, dateOnly?: boolean) => { throw new Error("error") },
        expectedAmount: 2,
        expected: [
            { definitionString: "{%= a_date %}", fieldValue: "[Fail to convert time]2022-12-05 11:22:33", debugInfo: { fieldId: "date" } },
            { definitionString: "{%= a_date_#date_only %}", fieldValue: "[Fail to convert time]2022-12-05 11:22:33", debugInfo: { fieldId: "date" } },
        ] as ReplaceDefinition[],
    }
]

describe('getFieldsValueDefinition: 置換文字列の配列生成', () => {
    convertTestData.forEach(testData => {
        it(`generateEachContentFromList: ${testData.testName}`, async () => {
            let result = getFieldsValuesDefinitions(testData.fields, testData.prefix, testData.depth, testData.disableContentType, testData.dateFormatter)

            expect(result.length).toBe(testData.expectedAmount)

            for (let i = 0; i < result.length; i++) {
                expect(JSON.stringify(result[i])).toBe(JSON.stringify(testData.expected[i]))
                expect(result[i].definitionString).toBe(testData.expected[i].definitionString)
                expect(result[i].fieldValue).toBe(testData.expected[i].fieldValue)
                expect(result[i].debugInfo?.fieldId).toBe(testData.expected[i].debugInfo?.fieldId)
            }
        })
    });
})
