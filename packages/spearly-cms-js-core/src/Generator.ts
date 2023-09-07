import { HTMLElement, Node, parse } from 'node-html-parser';
import { FieldTypeTags, SpearlyApiClient } from '@spearly/sdk-js';
import getFieldsValuesDefinitions, { generateGetParamsFromAPIOptions, getCustomDateString, ReplaceDefinition } from './Utils.js'
import type { AnalyticsPostParams, Content, FieldTypeContentType, List } from '@spearly/sdk-js'

/**
 * FakeSpearlyApiClient is a fake implementation of SpearlyApiClient.
 *  We can inject api client for using local file system, like markdown files.
 */
export interface FakeSpearlyApiClient {
    analytics: {
        pageView: (params: any) => Promise<void>;
    };
    getList(contentTypeId: string, params?: any): Promise<List>;
    getContent(contentTypeId: string, contentId: string, params?: any): Promise<Content>;
    getContentPreview(contentTypeId: string, contentId: string, previewToken: string): Promise<Content>;
}

export type DateFormatter = (date: Date, dateOnly?: boolean) => string

export type SpearlyJSGeneratorOption = {
    linkBaseUrl: string | undefined;
    dateFormatter: DateFormatter | undefined;
}

export type GetContentOption = {
    patternName: string,
    previewToken?: string,
}

export type GeneratedContent = {
    alias : string,
    generatedHtml: string,
    tag: string[],
}

export type GeneratedListContent = {
    generatedHtml: string,
    tag: string
}

export type APIOption = Map<string, string | Date | number | string[] | { [key: string]: string | string[] } >

type SpearlyJSGeneratorInternalOption = {
    linkBaseUrl: string;
    dateFormatter: DateFormatter;
}

export class SpearlyJSGenerator {
    client: SpearlyApiClient | FakeSpearlyApiClient
    options: SpearlyJSGeneratorInternalOption

    constructor(apiKey: string, domain: string, analyticsDomain: string, options: SpearlyJSGeneratorOption | undefined = undefined) {
        this.client = new SpearlyApiClient(apiKey, domain, analyticsDomain)
        this.options = {
            linkBaseUrl: options?.linkBaseUrl || "",
            dateFormatter: options?.dateFormatter || function japaneseDateFormatter(date: Date, dateOnly?: boolean) {
                return getCustomDateString(`YYYY年MM月DD日${!dateOnly ? " hh時mm分ss秒" : ""}`, date)
            }
        }
    }

    injectFakeApiClient(fakeClient: FakeSpearlyApiClient) {
        this.client = fakeClient;
    }

    convertFromFieldsValueDefinitions(templateHtml: string, replacementArray: ReplaceDefinition[], content: Content, contentType: string, insertDebugInfo: boolean): string {
        let result = templateHtml
        replacementArray.forEach(r => {
            // e.g.,<span data-spear="${contentTypeId}--${contentId}--${fieldId}">${value}</span>
            if (insertDebugInfo) {
                const contentId = content.attributes.contentAlias || content.attributes.publicUid
                const fieldId = r.debugInfo?.fieldId || ""
                // If matching the "${r.definitionString}" or '${r.definitionString}', replace it to
                // `"${r.fieldValue}" data-spear="${contentTypeId}--${contentId}--${fieldId}"`.
                // I.g., add data-spear attribute to the parent element.
                result = result
                    .split(`"${r.definitionString}"`).join(`"${r.fieldValue}" data-spear="${contentType}--${contentId}--${fieldId}"`)
                    .split(`'${r.definitionString}'`).join(`'${r.fieldValue}' data-spear='${contentType}--${contentId}--${fieldId}'`)
                    .split(r.definitionString).join(`<span data-spear="${contentType}--${contentId}--${fieldId}">${r.fieldValue}</span>`)
            } else {
                result = result.split(r.definitionString).join(r.fieldValue)
            }
        })

        // Especially convert for {%= <ContentType>_#url %} and {%= <ContentType>_#link $}
        // This mean replacing the specifying link to content url.
        const alias = content.attributes.contentAlias
        const urlMatchResult = result.match(`{%= ${contentType}_#url %}`)
        if (!!urlMatchResult && urlMatchResult.length > 0) {
            result = result.split(urlMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + alias);
        }

        const linkMatchResult = result.match(`{%= ${contentType}_#link %}`)
        if (!!linkMatchResult && linkMatchResult.length > 0) {
            result = result.split(linkMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + alias);
        }

        const aliasMatchResult = result.match(`{%= ${contentType}_#alias %}`)
        if (!!aliasMatchResult && aliasMatchResult.length > 0) {
            result = result.split(aliasMatchResult[0]).join(alias);
        }

        const uidMatchResult = result.match(`{%= ${contentType}_#uid %}`)
        if (!!uidMatchResult && uidMatchResult.length > 0) {
            result = result.split(uidMatchResult[0]).join(content.attributes.publicUid);
        }

        const contentTypeResult = result.match(`{%= ${contentType}_#content_type %}`)
        if (!!contentTypeResult && contentTypeResult.length > 0) {
            result = result.split(contentTypeResult[0]).join(contentType);
        }

        // Special converting for {%= <ContentType>_#published_at %} and {%= <ContentType>_#updated_at %}.
        const publishedAtResult = result.match(`{%= ${contentType}_#published_at %}`)
        if (!!publishedAtResult && publishedAtResult.length > 0) {
            result = result.split(publishedAtResult[0]).join(this.options.dateFormatter(content.attributes.publishedAt))
        }
        const updatedAtResult = result.match(`{%= ${contentType}_#updated_at %}`)
        if (!!updatedAtResult && updatedAtResult.length > 0) {
            result = result.split(updatedAtResult[0]).join(this.options.dateFormatter(content.attributes.updatedAt))
        }

        return result
    }

    async generateContent(templateHtml: string, contentType: string, contentId: string, option: GetContentOption, insertDebugInfo: boolean): Promise<[html: string, uid: string, patternName: string | null]> {
        try {
            const result = option.previewToken
                ? await this.client.getContentPreview(contentType, contentId, option.previewToken)
                : await this.client.getContent(contentType, contentId,
                    option.patternName
                        ? {
                            patternName: option.patternName
                        }
                        : {}
                );
            const replacementArray = getFieldsValuesDefinitions(result.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);
            const uid = result.attributes.publicUid;
            const patternName = result.attributes.patternName;
            let html = this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, result, contentType, insertDebugInfo);
            if (html.includes("cms-loop"))  {
                html = await this.generateSubLoop(html, contentType, insertDebugInfo, result)
            }
            return [html, uid, patternName]
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    getElementDepth(targetElement: HTMLElement, topElement: HTMLElement) {
        let depth = 0
        let currentElement = targetElement
        while (currentElement !== topElement) {
            depth++
            currentElement = currentElement.parentNode as HTMLElement
        }
        return depth
    }

    async generateSubLoop(nodeHTML: string, contentTypeId: string, insertDebugInfo: boolean, parentData: Content): Promise<string> {
        const node = parse(nodeHTML);
        const cmsLoopNodes = node.querySelectorAll("[cms-loop]");

        if (cmsLoopNodes.length) {
            // sort cms loop nodes by depth from top element with getElementDepth.
            const sortedCmsLoopNodes = cmsLoopNodes.sort((a, b) => {
                return this.getElementDepth(b, node) - this.getElementDepth(a, node)
            })
            for (const cmsLoopNode of sortedCmsLoopNodes) {
                const referenceFieldId = cmsLoopNode.getAttribute("cms-field")
                const variableName = cmsLoopNode.getAttribute("cms-variable")
                // Remove attributes
                cmsLoopNode.removeAttribute("cms-loop")
                cmsLoopNode.removeAttribute("cms-field")
                cmsLoopNode.removeAttribute("cms-variable")

                const contentTypeName = variableName || `${contentTypeId}_${referenceFieldId}`
                const targetData = parentData.attributes.fields.data.filter(field => field.attributes.identifier === referenceFieldId);
                if (targetData.length === 0) continue;

                // @ts-ignore
                const targetContents = (targetData[0] as FieldTypeContentType).attributes.value.data as Content[]
                let generatedHtml = ""
                for (const c of targetContents) {
                    const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentTypeName, 2, true, this.options.dateFormatter);
                    let html = this.convertFromFieldsValueDefinitions(cmsLoopNode.outerHTML, replacementArray, parentData, contentTypeId, insertDebugInfo);
                    generatedHtml += html;
                }
                cmsLoopNode.parentNode.innerHTML = cmsLoopNode.parentNode.innerHTML.replace(cmsLoopNode.outerHTML, generatedHtml);
            }
        }
        return node.outerHTML;
    }

    async generateList(templateHtml: string, contentType: string, variableName = "", apiOptions: APIOption, insertDebugInfo: boolean): Promise<string> {
        try {
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOptions))
            let resultHtml = ""
            for (const c of result.data) {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, variableName || contentType, 2, true, this.options.dateFormatter);
                let html = this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType, insertDebugInfo);
                // Searching sub-loop in html.
                if (html.includes("cms-loop")) {
                    html = await this.generateSubLoop(html, contentType, insertDebugInfo, c)
                }
                resultHtml += html
            }

            return resultHtml
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async generateListGroupByTag(templateHtml: string, contentType: string, apiOption, tagFieldName: string, variableName: string, insertDebugInfo: boolean): Promise<GeneratedListContent[]> {
        try {
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOption))
            let allTags = [] as string[]
            result.data.forEach(content => {
                const tags = content.attributes.fields.data.filter(field => field.attributes.identifier === tagFieldName) as FieldTypeTags[]
                if (tags && tags.length === 1)
                    allTags = allTags.concat(tags[0].attributes.value)
            })
            const tags = [...new Set(allTags.flat())]
            const contentsByTag: GeneratedListContent[] = []
            for (const tag of tags) {
                const targetContents: Content[] = []
                result.data.forEach(c => {
                    const searchTag = c.attributes.fields.data.filter(f => f.attributes.identifier === tagFieldName) as FieldTypeTags[]
                    if (!searchTag || searchTag.length > 2) return
                    if (searchTag[0].attributes.value.includes(tag)) {
                        targetContents.push(c)
                    }
                })
                for (const c of targetContents) {
                    const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, variableName || contentType, 2, true, this.options.dateFormatter);
                    // Special replacement string
                    replacementArray.push({
                        definitionString: `{%= ${contentType}_#tag %}`,
                        fieldValue: tag,
                    })
                    let html = this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType, insertDebugInfo)
                    // Searching sub-loop in html
                    if (html.includes("cms-loop")) {
                        html = await this.generateSubLoop(html, contentType, insertDebugInfo, c)
                    }
                    contentsByTag.push({
                        generatedHtml: html,
                        tag
                    })
                }
            }
            return contentsByTag
        } catch (e) {
            return Promise.reject(e)
        }
    }

    async generateEachContentFromList(templateHtml: string, contentType: string, apiOptions: APIOption, tagFieldName: string, insertDebugInfo: boolean): Promise<GeneratedContent[]> {
        try {
            const generatedContents: GeneratedContent[] = []
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOptions))
            for (const c of result.data) {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter)
                const tags = c.attributes.fields.data.filter(field => field.attributes.identifier === tagFieldName)
                let tag: string[] = []
                if (tags && tags.length > 0 && Array.isArray(tags[0].attributes.value)) {
                    tag = tag.concat(tags[0].attributes.value as [])
                }

                let html = this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType, insertDebugInfo)
                // Searching sub-loop in html
                if (html.includes("cms-loop")) {
                    html = await this.generateSubLoop(html, contentType, insertDebugInfo, c)
                }
                generatedContents.push({
                    alias: c.attributes.contentAlias || c.attributes.publicUid,
                    generatedHtml: html,
                    tag
                })
            }
            return generatedContents
        } catch (e: any) {
            return Promise.reject(e)
        }
    }

    async pageView(contentId: string, patternName: string, expires?: number) {
        this.client.analytics.pageView({
            contentId,
            patternName,
            expires
        } as AnalyticsPostParams)
    }
}
