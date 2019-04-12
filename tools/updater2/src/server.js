export function doGet (e) {
  return HtmlService.createTemplateFromFile('build/index').evaluate().setTitle('Feedback Form Validator')
}

export function getFormSpec (feedbackFormUrl) {
  const form = FormApp.openByUrl(feedbackFormUrl)

  const formData = readForm(form)

  return formData
}

function isBreakdownPage (sheet) {
  const name = sheet.getName()
  const headers = getA1B1(sheet)
  return (headers[0] === name) && (headers[1] === 'Skill Level')
}

function isRawResponsePage (sheet) {
  const headers = getA1B1(sheet)
  return (headers[0] === 'Timestamp') && (headers[1] === 'Email Address')
}

function getA1B1 (sheet) {
  return sheet.getRange('A1:B1').getValues()[0]
}

function isNonEmptyRow (row) {
  return row.every(cell => (cell !== ''))
}

export function getSheetSpec (feedbackFormUrl) {
  const spreadsheet = SpreadsheetApp.openById(FormApp.openByUrl(feedbackFormUrl).getDestinationId())
  const sheets = spreadsheet.getSheets()

  const breakdownPages = {}
  sheets.filter(isBreakdownPage).forEach((s) => {
    breakdownPages[s.getName()] = { rows: s.getRange('A2:B100').getValues().filter(isNonEmptyRow) }
  })

  const rawResponsePages = {}
  sheets.filter(isRawResponsePage).forEach((s) => {
    const columnHeaders = s.getRange('A1:1').getValues()[0].filter(c => c !== '')
    const page = { columnHeaders }
    const l = s.getFormUrl()
    if (l) { page.linkedForm = l }
    rawResponsePages[s.getName()] = page
  })

  return {
    title: spreadsheet.getName(),
    allSheets: sheets.map(s => s.getName()),
    breakdownPages,
    rawResponsePages,
  }
}

export function getUserEmail () {
  return Session.getActiveUser().getEmail()
}

export function getFormAndSheetMetadata (feedbackFormUrl) {
  const form = FormApp.openByUrl(feedbackFormUrl)
  const sheet = SpreadsheetApp.openById(form.getDestinationId())
  return {
    formTitle: form.getTitle(),
    sheetTitle: sheet.getName(),
  }
}

function readForm (form) {
  return {
    id: form.getId(),
    destinationId: form.getDestinationId(), // spreadsheet id
    access: {
      canEditResponses: form.canEditResponse(),
      hasLimitOneResponsePerUser: form.hasLimitOneResponsePerUser(),
      isAcceptingResponses: form.isAcceptingResponses(),
      requiresLogin: form.requiresLogin(),
      collectsEmail: form.collectsEmail(),
    },
    formMessages: {
      title: form.getTitle(),
      confirmationMessage: form.getConfirmationMessage(),
      customClosedFormMessage: form.getCustomClosedFormMessage(),
      description: form.getDescription(),
      hasRespondAgainLink: form.hasRespondAgainLink(),
    },
    assertions: {
      destinationType: form.getDestinationType().toString(), // SPREADSHEET
      hasProgressBar: form.hasProgressBar(), // false
      isPublishingSummary: form.isPublishingSummary(), // false
      isQuiz: form.isQuiz(), // false
    },
    items: form.getItems().map((item) => {
      const itemSpec = {
        index: item.getIndex(),
        id: item.getId(),
        type: item.getType().toString(),
      }
      setIfNotEmpty(itemSpec, 'helpText', item.getHelpText())
      setIfNotEmpty(itemSpec, 'title', item.getTitle())
      switch (item.getType()) {
      case FormApp.ItemType.CHECKBOX_GRID: {
        const grid = item.asCheckboxGridItem()
        itemSpec.isRequired = grid.isRequired()
        itemSpec.columns = grid.getColumns()
        itemSpec.rows = grid.getRows()
        break
      }
      case FormApp.ItemType.LIST: {
        const list = item.asListItem()
        itemSpec.isRequired = list.isRequired()
        itemSpec.choices = list.getChoices().map((c) => {
          const choiceSpec = {
            pageNavigationType: c.getPageNavigationType().toString(),
            value: c.getValue(),
          }
          if (c.getPageNavigationType() === FormApp.PageNavigationType.GO_TO_PAGE) {
            const gotoPage = c.getGotoPage()
            choiceSpec.gotoPage = {
              id: gotoPage.getId(),
              title: gotoPage.getTitle(),
            }
          }
          return choiceSpec
        })
        break
      }
      case FormApp.ItemType.PAGE_BREAK: {
        const pageBreak = item.asPageBreakItem()
        itemSpec.pageNavigationType = pageBreak.getPageNavigationType().toString()
        if (pageBreak.getPageNavigationType() === FormApp.PageNavigationType.GO_TO_PAGE) {
          const gotoPage = pageBreak.getGoToPage()
          itemSpec.gotoPage = {
            id: gotoPage.getId(),
            title: gotoPage.getTitle(),
          }
        }
        break
      }
      case FormApp.ItemType.PARAGRAPH_TEXT:
        itemSpec.isRequired = item.asParagraphTextItem().isRequired()
        break
      case FormApp.ItemType.SECTION_HEADER:
        break
      default:
        throw new Error(`unexpected item type ${itemSpec.type}`)
      }
      return itemSpec
    }),
  }
}

function setIfNotEmpty (obj, fieldName, fieldValue) {
  if (fieldValue.length > 0) {
    obj[fieldName] = fieldValue
  }
}
