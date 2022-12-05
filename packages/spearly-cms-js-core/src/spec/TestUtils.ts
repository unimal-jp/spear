import { SpearlyJSGenerator, SpearlyJSGeneratorOption } from '../Generator'

export type ATTR = {
    identifier: string;
    inputType: string;
    value: string;
}

export const generateServerContent = (attrs: ATTR[]) :any => {
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

export const generateServerList = (attrs: ATTR[], num: number = 1): any => {
    const template = {
        totalContentsCount: num,
        matchingContentsCount: num,
        limit: 10,
        offset: 0,
        next: 11,
        data: new Array(),
    }

    for (let i = 0; i < num; i++) {
        const c = generateServerContent(attrs)
        template.data.push(c)
    }

    return template
}