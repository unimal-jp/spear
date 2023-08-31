import fs from 'node:fs/promises'
import fm from 'front-matter'
import { remark } from 'remark';
import html from 'remark-html';
import type { HookApi } from '@spearly/spear-cli';
import type { Content } from '@spearly/sdk-js';
import type { UsePlugin } from 'unified';

// Generate hash from string in order to generate unique field id
const generateHashFromString = (str) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// Generate field object from name and value.
const generateField = (fieldName, fieldValue) => {
    return {
        id: generateHashFromString(fieldValue),
        type: "field",
        attributes: {
            identifier: fieldName,
            inputType: fieldName === "body" ? "rich_text" : "text",
            value: fieldValue
        }
    }
}

// Generate content object from fields.
const generateContent = (fields, contentId, fileCreatedAt, fileUpdatedAt) => {
    const fieldsData = fields.map(field => {
        return generateField(field.key, field.value)
    });
    return {
        id: contentId,
        type: "content",
        values: {},
        attributes: {
            contentAlias: contentId,
            createdAt: fileCreatedAt,
            nextContentId: null,
            patternName: "a",
            previousContentId: null,
            publicUid: contentId,
            publishedAt: fileUpdatedAt,
            updatedAt: fileUpdatedAt,
            fields: {
                data: fieldsData
            }
        }
    }
}

// Generate list object from contents.
const generateLisit = (contents) => {
    return {
        totalContentsCount: contents.length,
        matchingContentsCount: contents.length,
        limit: contents.length,
        offset: 0,
        next: null,
        data: contents
    }
}

/**
 * Markdown plugin options
 */
export type MarkdownPluginSettings = {
    // Directory path of markdown files
    directory: string,
    // Markdown file extension
    markdownExtension: string,
    // Markdown processor, user can specify own remark plugin
    processor: UsePlugin,
    // Post processor for markdown body string
    bodyPostProcessor: (body: string) => string,
};

/**
 * Generate markdown plugin
 * @param settings 
 * @returns 
 */
export const markdownPlugin = (settings: MarkdownPluginSettings) => {
    settings.directory = settings.directory || "data";
    settings.markdownExtension = settings.markdownExtension || ".mdx";
    settings.processor = settings.processor || remark().use(html);
    settings.bodyPostProcessor = settings.bodyPostProcessor || ((body) => body.replaceAll(/\n/g, ''));
    return {
        "pluginName": "markdown-client",
        "configuration": null,
        "beforeBuild": async (state) => {
            try {
                state.jsGenerator.injectFakeApiClient({
                    analytics: {
                        pageView: () => {
                            console.log("Unimplemented");
                            return Promise.resolve();
                        },
                    },
                    getList: async (contentTypeId) => {
                        console.log("Unimplemented");
                        const dirs = await fs.readdir(`./${settings.directory}/${contentTypeId}`);
                        const contents = [];
                        for (const dir of dirs) {
                            const contentId = dir.replace(settings.markdownExtension, "");
                            const fileStat = await fs.stat(`./${settings.directory}/${contentTypeId}/${dir}`);
                            const file = await fs.readFile(`./${settings.directory}/${contentTypeId}/${dir}`);
                            const { attributes, body } = fm(file.toString());
                            const bodyHTML = await settings.processor.process(body);
                            const fields = [];
                            for (const key of Object.keys(attributes)) {
                                fields.push({
                                    key,
                                    value: attributes[key]
                                });
                            }
                            fields.push({
                                key: "body",
                                value: settings.bodyPostProcessor(bodyHTML.toString())
                            });
                            contents.push(generateContent(fields, contentId, fileStat.birthtime, fileStat.mtime));
                        }
                        return generateLisit(contents);
                    },
                    // Generate content from markdown files
                    getContent: async (contentTypeId, contentId) => {
                        const fileStat = await fs.stat(`./${settings.directory}/${contentTypeId}/${contentId}${settings.markdownExtension}`)
                        const file = await fs.readFile(`./${settings.directory}/${contentTypeId}/${contentId}${settings.markdownExtension}`)
                        const { attributes, body } = fm(file.toString())
                        const bodyHtml = await settings.processor.process(body);
                        const fields = [];
                        for (const key of Object.keys(attributes)) {
                            fields.push({
                                key,
                                value: attributes[key]
                            })
                        }
                        fields.push({
                            key: "body",
                            value: settings.bodyPostProcessor(bodyHtml.toString())
                        })

                        return generateContent(fields, contentId, fileStat.birthtime, fileStat.mtime) as unknown as Content;
                    },
                    getContentPreview: () => {
                        console.log("Unimplemented");
                        return Promise.resolve(null);
                    },
                })
                return state;
            } catch (e) {
                console.error(e)
            }
        },
        "afterBuild": null,
        "bundle": null,
    } as HookApi;
}

