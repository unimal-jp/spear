[日本語](./README_ja.md)

# Spearly CMS JS Core module

## Feature

- Generate converted html string from specified html template string.
- Fetch content data.

## Concept : DO NOT MANIPULATE THE DOM

- This module **SHOULD NOT** use Browser DOM Manipulation.
  - This module should out of DOM world.
  - This module should use pure JavaScript.
  - Internally, this core library use html parser in order to search sub-loop element.

## Spec

### `generateContent`

`generateContent` will generate the one content html string from fetched data.

Params:

- templateHtml : template html string which using generate the html. This html string **SHOULD NOT** contain `cms-item` attributes. This mean that pass the innerHTML of element which has `cms-item`.
- contentId : Specify the content id want to fetch. or You can specify alias id.

Return:

- Generated content as html string.

Error:

- Throws Error when generator doesn't fetch or convert.
