import { SpearlyApiClient } from '@spearly/sdk-js';
import { parse } from "node-html-parser"
import getFieldsValuesDefinitions, { getCustomDateString } from './utils'

export type SpearlyJSGeneratorOption = {
    linkBaseUrl: string | undefined;
    dateFormatter: Function | undefined;
}

export class SpearlyJSGenerator {
    client: SpearlyApiClient
    options: SpearlyJSGeneratorOption

    constructor(apiKey: string, domain: string, options: SpearlyJSGeneratorOption | undefined = undefined) {
        this.client = new SpearlyApiClient(apiKey, domain)
        this.options = {
            linkBaseUrl: options?.linkBaseUrl || "",
            dateFormatter:  options?.dateFormatter || function japaneseDateFormatter(date: Date) {
                getCustomDateString("YYYY年MM月DD日 hh時mm分ss秒", date)
            }
        }
    }

    async generateContent(templateHtml: string, contentType: string, contentId: string): Promise<string> {
        try {
            const root = parse(templateHtml)
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
        console.log(templateHtml, contentType);
        return "";
    }
}
