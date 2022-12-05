import { FieldTypeAll, FieldTypeCalendar, FieldTypeContentType, FieldTypeImage, FieldTypeMap, FieldTypeNumber, FieldTypeRichText, FieldTypeTags, FieldTypeText } from "@spearly/sdk-js";


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

declare type ReplaceDefinition = {
    definitionString: string;
    fieldValue: string;
};

export default function getFieldsValuesDefinitions(
    fields: FieldTypeAll[], 
    prefix = "",
    depth = 0,
    disableContentType = false,
    dateFormatter: Function
): ReplaceDefinition[] {
    if (depth >= 3) {
      return [];
    }
    const replaceDefinitions = Array<ReplaceDefinition>();
    fields.forEach(field => {
      let key = field.attributes.identifier;
      if (isTextType(field)) {
        console.log('isText')
        replaceDefinitions.push({
          definitionString: "{%= " + prefix + "_" + key + " %}",
          fieldValue: getEscapedString(field.attributes.value)
        });
      } else if (isNumberType(field)) {
        console.log('isNumber')
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: field.attributes.value.toString()
        })
      } else if (isRichTextType(field)) {
        console.log('irRitchText')
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedStringRichText(field.attributes.value)
        })
      } else if (isImageType(field)) {
        console.log('isImage')
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedString(field.attributes.value)
        })
      } else if (isCalendarType(field)) {
        console.log('isCalendarType')
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: dateFormatter(field.attributes.value)
        })
      } else if (isTagType(field)) {
        console.log('isTags')
        // TODO: タグの取り扱いを今後変更する必要がある
        replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + " %}",
            fieldValue: getEscapedString(field.attributes.value.join(','))
        })
      } else if (isMapType(field)) {
        console.log('isMap')
        const value = field.attributes.value
        if (value.address) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#address %}",
            fieldValue: encodeURIComponent(getEscapedString(value.address))
          });
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#address_decoded %}",
            fieldValue: getEscapedString(value.address)
          });
        }
        if (value.latitude) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#latitude %}",
            fieldValue: value.latitude.toString()
          });
        }
        if (value.longitude) {
          replaceDefinitions.push({
            definitionString: "{%= " + prefix + "_" + key + "_#longitude %}",
            fieldValue: value.longitude.toString()
          });
        }
      } else if (isContentType(field)) {
        console.log('isContentType')
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