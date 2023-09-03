import { FieldTypeAll, FieldTypeCalendar, FieldTypeContentType, FieldTypeImage, FieldTypeMap, FieldTypeNumber, FieldTypeRichText, FieldTypeTags, FieldTypeText, GetParams } from "@spearly/sdk-js";
import { APIOption } from "./Generator";


const isTextType = (fieldType: FieldTypeAll): fieldType is FieldTypeText => {
    return fieldType.attributes.inputType === 'text'
}
const isNumberType = (fieldType: FieldTypeAll): fieldType is FieldTypeNumber => {
    return fieldType.attributes.inputType === 'number'
}
const isRichTextType = (fieldType: FieldTypeAll): fieldType is FieldTypeRichText => {
    return fieldType.attributes.inputType === 'rich_text'
}
const isImageType = (fieldType: FieldTypeAll): fieldType is FieldTypeImage => {
    return fieldType.attributes.inputType === 'image'
}
const isCalendarType = (fieldType: FieldTypeAll): fieldType is FieldTypeCalendar => {
    return fieldType.attributes.inputType === 'calendar'
}
const isMapType = (fieldType: FieldTypeAll): fieldType is FieldTypeMap => {
    return fieldType.attributes.inputType === 'map'
}
const isTagType = (fieldType: FieldTypeAll): fieldType is FieldTypeTags => {
    return fieldType.attributes.inputType === 'tags'
}
const isContentType = (fieldType: FieldTypeAll): fieldType is FieldTypeContentType => {
    return fieldType.attributes.inputType === 'content_type'
}

export declare type ReplaceDefinition = {
    definitionString: string;
    fieldValue: string;
    debugInfo?: {
      fieldId: string;
    };
};

export default function getFieldsValuesDefinitions(
    fields: FieldTypeAll[], 
    prefix = "",
    depth = 0,
    disableContentType = false,
    dateFormatter: Function,
): ReplaceDefinition[] {
    if (depth >= 3) {
      return [];
    }
    const replaceDefinitions = Array<ReplaceDefinition>();
    fields.forEach(field => {
      if (field.attributes.value === null) return
      let key = field.attributes.identifier;
      if (isTextType(field)) {
        replaceDefinitions.push({
          definitionString: "{%= " + prefix + "_" + key + " %}",
          fieldValue: getEscapedString(field.attributes.value),
          debugInfo: {
            fieldId: field.attributes.identifier
          }
        });
      } else if (isNumberType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: field.attributes.value.toString(),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
        })
      } else if (isRichTextType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedStringRichText(field.attributes.value),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
        })
      } else if (isImageType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedString(field.attributes.value),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
        })
      } else if (isCalendarType(field)) {
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: dateFormatter(new Date(field.attributes.value)),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
        })

        replaceDefinitions.push({
          definitionString: "{%= " + prefix + "_" + key + "_#date_only %}",
          fieldValue: dateFormatter(new Date(field.attributes.value), true),
          debugInfo: {
            fieldId: field.attributes.identifier
          }
        })
      } else if (isTagType(field)) {
        // TODO: タグの取り扱いを今後変更する必要がある
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedString(field.attributes.value.join(',')),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
        })
      } else if (isMapType(field)) {
        const value = field.attributes.value
        if (value.address) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#address %}",
            fieldValue: encodeURIComponent(getEscapedString(value.address)),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
          });
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#address_decoded %}",
            fieldValue: getEscapedString(value.address),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
          });
        }
        if (value.latitude) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#latitude %}",
            fieldValue: value.latitude.toString(),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
          });
        }
        if (value.longitude) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#longitude %}",
            fieldValue: value.longitude.toString(),
            debugInfo: {
              fieldId: field.attributes.identifier
            }
          });
        }
      } else if (isContentType(field)) {
        if (disableContentType) return
        try {
            Array.prototype.push.apply(replaceDefinitions,
                getFieldsValuesDefinitions(
                    field.attributes.value,
                    `${prefix}_${key}`,
                    depth++,
                    disableContentType,
                    dateFormatter
                ));
        } catch(e) {
            console.log('Spearly found the non value of reference type', e)
            return
        }
      }
    });

    return replaceDefinitions;
}

const getEscapedString = (str: string): string => {
    if (str) {
        return str.replace(/[\\$'"]/g, "\\$&")
        .split("\n").join("\\n")
        .split("\r").join("\\r")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    }
    return ""
}
  
const getEscapedStringRichText = (str: string): string => {
    if (str) {
        return str.replace(/[\\$'"]/g, "\\$&")
        .split("\\\"").join("\"")
        .split("\n").join("\\n")
        .split("\r").join("\\r")
    }
    return ""
}

export function getCustomDateString(suffix: string, date: Date): string {
    let numberFormat =
        new Intl.NumberFormat('en-US',
                              { minimumIntegerDigits:2, useGrouping:false });

    return suffix
      .split('YYYY').join(date.getFullYear().toString())
      .split('MM').join(numberFormat.format(date.getMonth() + 1))
      .split('DD').join(numberFormat.format(date.getDate()))
      .split('hh').join(numberFormat.format(date.getHours()))
      .split('mm').join(numberFormat.format(date.getMinutes()))
      .split('ss').join(numberFormat.format(date.getSeconds()));
}

export function generateGetParamsFromAPIOptions(apiOptions: APIOption): GetParams {
  const params: GetParams = {}
  apiOptions.forEach((v, k) => {
    params[k] = v
  })
  return params
}
