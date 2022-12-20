import { SpearlyApiClient } from '@spearly/sdk-js';
import getFieldsValuesDefinitions, { getCustomDateString } from './Utils'

export type SpearlyJSGeneratorOption = {
    linkBaseUrl: string | undefined;
    dateFormatter: Function | undefined;
}
type SpearlyJSGeneratorInternalOption = {
    linkBaseUrl: string;
    dateFormatter: Function;
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

    async generateContent(templateHtml: string, contentType: string, contentId: string): Promise<string> {
        try {
            const result = await this.client.getContent(contentId)
            const replacementArray = getFieldsValuesDefinitions(result.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);
            replacementArray.forEach(r => {
                templateHtml = templateHtml.split(r.definitionString).join(r.fieldValue)
            })

            // Especially convert for {%= <ContentType>_#url %} and {%= <ContentType>_#link $}
            // This mean replacing the specifying link to content url.
            const urlMatchResult = templateHtml.match("{%.*_#url %}")
            if (!!urlMatchResult && urlMatchResult.length > 0) {
                templateHtml = templateHtml.split(urlMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + result.attributes.contentAlias);
            }

            const linkMatchResult = templateHtml.match("{%.*_#link %}")
            if (!!linkMatchResult && linkMatchResult.length > 0) {
                templateHtml = templateHtml.split(linkMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + result.attributes.contentAlias);                
            }

            return templateHtml
        } catch (e: any) {
            return Promise.reject(e);
        }
    }

    async generateList(templateHtml: string, contentType: string): Promise<string> {
        try {
            const result = await this.client.getList(contentType)
            let resultHtml = ""
            result.data.forEach(c => {
                let tempHtml = templateHtml
                const replacementArray = getFieldsValuesDefinitions(c.attributes.fields.data, contentType, 2, true, this.options.dateFormatter);
                replacementArray.forEach(r => {
                    tempHtml = tempHtml.split(r.definitionString).join(r.fieldValue)
                })
    
                // Especially convert for {%= <ContentType>_#url %} and {%= <ContentType>_#link $}
                // This mean replacing the specifying link to content url.
                const urlMatchResult = tempHtml.match("{%.*_#url %}")
                if (!!urlMatchResult && urlMatchResult.length > 0) {
                    tempHtml = tempHtml.split(urlMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + c.attributes.contentAlias);
                }
    
                const linkMatchResult = tempHtml.match("{%.*_#link %}")
                if (!!linkMatchResult && linkMatchResult.length > 0) {
                    tempHtml = tempHtml.split(linkMatchResult[0]).join("./" + this.options.linkBaseUrl + "?contentId=" + c.attributes.contentAlias);                
                }
                resultHtml += tempHtml
            })

            return resultHtml
        } catch (e: any) {
            return Promise.reject(e);
        }
    }
}
