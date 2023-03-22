import { HTMLElement, Node, parse } from 'node-html-parser';
import { FieldTypeAll, FieldTypeTags, SpearlyApiClient } from '@spearly/sdk-js';
import getFieldsValuesDefinitions, { generateGetParamsFromAPIOptions, getCustomDateString, ReplaceDefinition } from './Utils.js'
import type { Content } from '@spearly/sdk-js'

export type SpearlyJSGeneratorOption = {
    linkBaseUrl: string | undefined;
    dateFormatter: Function | undefined;
}
type SpearlyJSGeneratorInternalOption = {
    linkBaseUrl: string;
    dateFormatter: Function;
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

export class SpearlyJSGenerator {
    client: SpearlyApiClient
    options: SpearlyJSGeneratorInternalOption

    constructor(apiKey: string, domain: string, options: SpearlyJSGeneratorOption | undefined = undefined) {
        this.client = new SpearlyApiClient(apiKey, domain)
        this.options = {
            linkBaseUrl: options?.linkBaseUrl || "",
            dateFormatter:  options?.dateFormatter || function japaneseDateFormatter(date: Date) {
                return getCustomDateString("YYYY年MM月DD日 hh時mm分ss秒", date)
            }
        }
    }

    convertFromFieldsValueDefinitions(templateHtml: string, replacementArray: ReplaceDefinition[], content: Content, contentType: string): string {
        let result = templateHtml
        replacementArray.forEach(r => {
            result = result.split(r.definitionString).join(r.fieldValue)

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

    async generateContent(templateHtml: string, contentType: string, contentId: string): Promise<string> {
        try {
            const result = await this.client.getContent(contentId)
            const replacementArray = getFieldsValuesDefinitions(result.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);

            return this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, result, contentType)
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async traverseInjectionSubLoop(nodes: HTMLElement[], apiOptions: APIOption): Promise<Node[]> {
        const resultNode = parse("") as HTMLElement
        for (const node of nodes) {
            const isTextNode = node.nodeType === 3
            if (!isTextNode && node.hasAttribute("cms-loop")) {
                const contentType = node.getAttribute("cms-field")
                if (!contentType) {
                    // Error case.
                    return Promise.reject(new Error("cms-loop element doesn't have cms-field"))
                }
                const varName = node.getAttribute("cms-item-variable")
                node.removeAttribute("cms-loop")
                node.removeAttribute("cms-field")
                node.removeAttribute("cms-item-variable")
                const generatedStr = await this.generateList(node.outerHTML, contentType, varName || contentType, apiOptions)
                const generatedNode = parse(generatedStr) as HTMLElement
                resultNode.childNodes = generatedNode.childNodes
                continue
            }
            if (node.childNodes.length > 0) {
                node.childNodes = await this.traverseInjectionSubLoop(node.childNodes as HTMLElement[], apiOptions)
            } 
            resultNode.appendChild(node)
        }
        return resultNode.childNodes
    }

    async generateSubLoop(templateHtml: string, apiOptions: APIOption): Promise<string> {
        const parsedNode = parse(templateHtml)
        parsedNode.childNodes = await this.traverseInjectionSubLoop(parsedNode.childNodes as HTMLElement[], apiOptions)
        return parsedNode.outerHTML
    }

    async generateList(templateHtml: string, contentType: string, variableName = "", apiOptions: APIOption): Promise<string> {
        try {
            // Searching sub-loop in html.
            if (templateHtml.includes("cms-loop")) {
                templateHtml = await this.generateSubLoop(templateHtml, apiOptions)
            }
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOptions))
            let resultHtml = ""
            result.data.forEach(c => {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, variableName  || contentType, 2, true, this.options.dateFormatter);
                resultHtml += this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType)
            })

            return resultHtml
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async generateListGroupByTag(templateHtml: string, contentType: string, apiOption, tagFieldName: string, variableName?: string): Promise<GeneratedListContent[]> {
        try {
            // Searching sub-loop in html
            if (templateHtml.includes("cms-loop")) {
                templateHtml = await this.generateSubLoop(templateHtml, apiOption)
            }

            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOption))
            let allTags = [] as string[]
            result.data.forEach(content => {
                const tags = content.attributes.fields.data.filter(field => field.attributes.identifier === tagFieldName) as FieldTypeTags[]
                if (tags && tags.length === 1)
                    allTags = allTags.concat(tags[0].attributes.value)
            })
            const tags = [...new Set(allTags.flat())]
            const contentsByTag: GeneratedListContent[] = []
            tags.forEach(tag => {
                const targetContents: Content[] = []
                result.data.forEach(c => {
                    const searchTag = c.attributes.fields.data.filter(f => f.attributes.identifier === tagFieldName) as FieldTypeTags[]
                    if (!searchTag || searchTag.length > 2) return
                    if (searchTag[0].attributes.value.includes(tag)) {
                        targetContents.push(c)
                    }
                })
                let resultHtml = ""
                targetContents.forEach(c => {
                    const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, variableName  || contentType, 2, true, this.options.dateFormatter);
                    // Special replacement string
                    replacementArray.push({
                        definitionString: `{%= ${contentType}_#tag %}`,
                        fieldValue: tag,
                    })
                    resultHtml += this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType)
                })
                contentsByTag.push({
                    generatedHtml: resultHtml,
                    tag
                })
            })
            return contentsByTag
        } catch(e) {
            return Promise.reject(e)
        }
    }

    async generateEachContentFromList(templateHtml: string, contentType: string, apiOptions: APIOption, tagFieldName?: string) : Promise<GeneratedContent[]> {
        try {
            const generatedContents: GeneratedContent[] = []
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOptions))
            result.data.forEach(c => {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter)
                const tags = c.attributes.fields.data.filter(field => field.attributes.identifier === tagFieldName)
                let tag: string[] = []
                if (tags && tags.length > 0 && Array.isArray(tags[0].attributes.value)) {
                    tag = tag.concat(tags[0].attributes.value as [])
                }

                generatedContents.push({
                    alias: c.attributes.contentAlias || c.attributes.publicUid,
                    generatedHtml: this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType),
                    tag
                })
            });
            return generatedContents
        } catch (e: any) {
            return Promise.reject(e)
        }
    }
}
