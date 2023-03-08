import { HTMLElement, Node, parse } from 'node-html-parser';
import { SpearlyApiClient } from '@spearly/sdk-js';
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

    async generateEachContentFromList(templateHtml: string, contentType: string, apiOptions: APIOption) : Promise<GeneratedContent[]> {
        try {
            const generatedContents: GeneratedContent[] = []
            const result = await this.client.getList(contentType, generateGetParamsFromAPIOptions(apiOptions))
            result.data.forEach(c => {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter)

                generatedContents.push({
                    alias: c.attributes.contentAlias || c.attributes.publicUid,
                    generatedHtml: this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c, contentType),
                })
            });
            return generatedContents
        } catch (e: any) {
            return Promise.reject(e)
        }
    }
}
