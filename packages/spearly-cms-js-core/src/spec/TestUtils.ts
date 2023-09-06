import type { FieldType, FieldTypeAll, MapValue, ServerContent, ServerList } from '@spearly/sdk-js'

export type ATTR = {
    identifier: string;
    inputType: 'text' | 'number' | 'rich_text' | 'image' | 'calendar' | 'map' | 'content_type' | 'tags';
    value: string | number | Date | MapValue | string[] | { data: ServerContent[] };
}

export const generateServerContent = (attrs: ATTR[], alias: string, dateOptions?: { createdAt?: string, publishedAt?: string, updatedAt?: string}) :ServerContent => {
    const fields = [] as FieldTypeAll[]
    attrs.forEach((attr, id) => {
        fields.push({
            attributes: {
                identifier: attr.identifier,
                inputType: attr.inputType,
                // @spealry/sdk-js doesn't define reference as content
                // @ts-ignore
                value: attr.value,
            },
            id: id.toString(),
            type: 'field',
        })
    })
    const template = {
        attributes: {
            contentAlias: alias || 'content-alias',
            createdAt: dateOptions?.createdAt || "2022-12-05 00:00:00",
            fields: {
                data: fields,
            },
            publicUid: alias || 'content_1',
            publishedAt: dateOptions?.publishedAt || '2022-12-04 00:00:00',
            updatedAt: dateOptions?.updatedAt || '2022-12-04 00:00:00'
        },
        values: {}
    } as ServerContent
    return template
}

export const generateServerListFromContent = (contents: ServerContent[]): ServerList => {
    const template = {
        totalContentsCount: contents.length,
        matchingContentsCount: contents.length,
        limit: 10,
        offset: 0,
        next: 11,
        data: contents
    } as ServerList

    return template
}