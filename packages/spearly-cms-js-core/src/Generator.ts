import { SpearlyApiClient } from '@spearly/sdk-js';
import getFieldsValuesDefinitions, { getCustomDateString, ReplaceDefinition } from './Utils.js'

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

export class SpearlyJSGenerator {
    client: SpearlyApiClient
    options: SpearlyJSGeneratorInternalOption

    constructor(apiKey: string, domain: string, options: SpearlyJSGeneratorOption | undefined = undefined) {
        this.client = new SpearlyApiClient(domain, apiKey)
        this.options = {
            linkBaseUrl: options?.linkBaseUrl || "",
            dateFormatter:  options?.dateFormatter || function japaneseDateFormatter(date: Date) {
                return getCustomDateString("YYYY年MM月DD日 hh時mm分ss秒", date)
            }
        }
    }

    convertFromFieldsValueDefinitions(templateHtml: string, replacementArray: ReplaceDefinition[], alias: string): string {
        let result = templateHtml
        replacementArray.forEach(r => {
            result = result.split(r.definitionString).join(r.fieldValue)

        })

        // Especially convert for {%= <ContentType>_#url %} and {%= <ContentType>_#link $}
        // This mean replacing the specifying link to content url.
        const urlMatchResult = result.match("{%.*_#url %}")
        if (!!urlMatchResult && urlMatchResult.length > 0) {
            result = result.split(urlMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + alias);
        }

        const linkMatchResult = templateHtml.match("{%.*_#link %}")
        if (!!linkMatchResult && linkMatchResult.length > 0) {
            result = result.split(linkMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + alias);                
        }

        return result
    }

    async generateContent(templateHtml: string, contentType: string, contentId: string): Promise<string> {
        try {
            const result = await this.client.getContent(contentId)
            const replacementArray = getFieldsValuesDefinitions(result.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);

            return this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, result.attributes.contentAlias)
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async generateList(templateHtml: string, contentType: string): Promise<string> {
        try {
            const result = await this.client.getList(contentType)
            let resultHtml = ""
            result.data.forEach(c => {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);
                resultHtml += this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c.attributes.contentAlias)
            })

            return resultHtml
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async generateEachContentFromList(templateHtml: string, contentType: string) : Promise<GeneratedContent[]> {
        try {
            const generatedContents: GeneratedContent[] = []
            const result = await this.client.getList(contentType)
            result.data.forEach(c => {
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter)

                generatedContents.push({
                    alias: c.attributes.contentAlias,
                    generatedHtml: this.convertFromFieldsValueDefinitions(templateHtml, replacementArray, c.attributes.contentAlias),
                })
            });
            return generatedContents
        } catch (e: any) {
            return Promise.reject(e)
        }
    }
}
