function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

// step 2: get the sheet spec
function getFormResponsesSheet(feedbackFormUrl) {
  const form = FormApp.openByUrl(feedbackFormUrl);
  const formEditUrl = form.getEditUrl();
  
  const spreadsheet = SpreadsheetApp.openById(form.getDestinationId());
  const sheets = spreadsheet.getSheets();

  const linkedSheets = sheets.filter(function(s) { return s.getFormUrl() === formEditUrl; });
  if (linkedSheets.length > 1) {
    throw "too many sheets are linked to this form";
  }
  if (linkedSheets.length < 1) {
    throw "form is sending responses to an unknown sheet"
  }
  const formResponseSheet = linkedSheets[0];
   
  const columnHeaders = formResponseSheet.getRange("A1:1").getValues()[0].filter(function(c) { return c !== ""; });
  return {
    sheetName: formResponseSheet.getName(),
    columnHeaders: columnHeaders,
  };
}



function getSheetSpec(feedbackFormUrl) {
  var spreadsheet = SpreadsheetApp.openById(FormApp.openByUrl(feedbackFormUrl).getDestinationId());
  var sheets = spreadsheet.getSheets();

  var breakdownPages = {};
  sheets.filter(isBreakdownPage).map(function(s) {
    breakdownPages[s.getName()] = { rows: s.getRange("A2:B100").getValues().filter(isNonEmptyRow) };
  });

  var rawResponsePages = {};
  sheets.filter(isRawResponsePage).map(function(s) {
    const columnHeaders = s.getRange("A1:1").getValues()[0].filter(function(c) { return c !== ""; });
    var page = { columnHeaders: columnHeaders };
    const l = s.getFormUrl();
    if (l) { page["linkedForm"] = l; }
    rawResponsePages[s.getName()] = page;
  });

  return {
    title: spreadsheet.getName(),
    allSheets: sheets.map(function(s) { return s.getName(); }),
    breakdownPages: breakdownPages,
    rawResponsePages: rawResponsePages
  };
}


function updateSheet(updateInfo) {
  var formUrl = updateInfo.formUrl;
  var changes = updateInfo.changes;

  var spreadsheet = SpreadsheetApp.openById(FormApp.openByUrl(formUrl).getDestinationId());
  
  changes.forEach(function(change) {
    var sheet = spreadsheet.getSheetByName(change.sheetName);
    var cell = sheet.getRange(change.column + change.row);
    var actualValue = cell.getValue().toString();
    if (actualValue !== change.currentValue) {
      throw "actual value of cell doesn't match what was expected"; 
    }
    //cell.setValue(change.newValue)
  });
  return changes;
}

function getFormSpec(feedbackFormUrl) {
  var form = FormApp.openByUrl(feedbackFormUrl);

  var formLastModified = DriveApp.getFileById(form.getId()).getLastUpdated();
  var formData = readForm(form);

  return formData;
}

function isBreakdownPage(sheet) {
  var name = sheet.getName();
  var headers = getA1B1(sheet);
  return (headers[0] === name) && (headers[1] === "Skill Level");
}

function isRawResponsePage(sheet) {
  var headers = getA1B1(sheet);
  return (headers[0] === "Timestamp") && (headers[1] === "Email Address");
}

function getA1B1(sheet) {
  return sheet.getRange("A1:B1").getValues()[0];
}

function isNonEmptyRow(row) {
  return row.every(function(cell) { return (cell !== "") });
}

function skillFromRow(row) {
  return { description: row[0], level: row[1] }
}



function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

function getFormAndSheetMetadata(feedbackFormUrl) {
  var form = FormApp.openByUrl(feedbackFormUrl);
  var sheet = SpreadsheetApp.openById(form.getDestinationId());
  return {
    formTitle: form.getTitle(),
    sheetTitle: sheet.getName(),
  };
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('frontend/index').evaluate().setTitle("Feedback Form Validator");
}

function readForm(form) {
  return {
    id: form.getId(),
    destinationId: form.getDestinationId(),  // spreadsheet id
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
      destinationType: form.getDestinationType().toString(),  // SPREADSHEET
      hasProgressBar: form.hasProgressBar(),  // false
      isPublishingSummary: form.isPublishingSummary(),  // false
      isQuiz: form.isQuiz(),    // false
    },
    items: form.getItems().map(function(item) {
      var itemSpec = {
        index: item.getIndex(),
        id: item.getId(),
        type: item.getType().toString(),
      }
      setIfNotEmpty(itemSpec, "helpText", item.getHelpText());
      setIfNotEmpty(itemSpec, "title", item.getTitle());
      switch (item.getType()) {
        case FormApp.ItemType.CHECKBOX_GRID:
          var grid = item.asCheckboxGridItem();
          itemSpec['isRequired'] = grid.isRequired();
          itemSpec['columns'] = grid.getColumns();
          itemSpec['rows'] = grid.getRows();
          break;
        case FormApp.ItemType.LIST:
          var list = item.asListItem();
          itemSpec['isRequired'] = list.isRequired();
          itemSpec['choices'] = list.getChoices().map(function(c) {
            var choiceSpec = {
              pageNavigationType: c.getPageNavigationType().toString(),
              value: c.getValue(),
            };
            if (c.getPageNavigationType() == FormApp.PageNavigationType.GO_TO_PAGE) {
              var gotoPage = c.getGotoPage()
              choiceSpec['gotoPage'] = {
                id: gotoPage.getId(),
                title: gotoPage.getTitle(),
              }
            }
            return choiceSpec;
          });
          break;
        case FormApp.ItemType.PAGE_BREAK:
          var pageBreak = item.asPageBreakItem();
          itemSpec['pageNavigationType'] = pageBreak.getPageNavigationType().toString();
          if (pageBreak.getPageNavigationType() == FormApp.PageNavigationType.GO_TO_PAGE) {
            var gotoPage = pageBreak.getGoToPage()
            itemSpec['gotoPage'] = {
              id: gotoPage.getId(),
              title: gotoPage.getTitle(),
            }
          }
          break;
        case FormApp.ItemType.PARAGRAPH_TEXT:
          var paragraphText = item.asParagraphTextItem();
          itemSpec['isRequired'] = paragraphText.isRequired();
          break;
        case FormApp.ItemType.SECTION_HEADER:
          break;
        default:
          throw "unexpected item type " + itemSpec.type;
      }
      return itemSpec;
    })
  };
}

function setIfNotEmpty(obj, fieldName, fieldValue) {
  if (fieldValue.length > 0) {
    obj[fieldName] = fieldValue
  }
}
